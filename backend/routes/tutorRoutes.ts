import { Router } from 'express';
import { GoogleGenAI, type Content } from '@google/genai';
import { authenticate, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

interface TutorHistoryItem {
  role: 'user' | 'model';
  text: string;
}

const TUTOR_SYSTEM_INSTRUCTION = `You are LinguaLearn's supportive English and French Language Tutor.
Help students clearly understand English and French grammar, vocabulary, conjugation, sentence structure, collocations, and pronunciation.

Guidelines:
- Give concise, well-structured explanations tailored to language learners (A1 to C1 levels).
- Provide 2-3 clear example sentences whenever explaining a grammar rule or vocabulary word.
- When helpful, show brief side-by-side English and French comparisons or highlight common learner mistakes.
- Keep responses focused, encouraging, and under 220 words unless the student explicitly requests a deeper breakdown.
- Do not mention underlying AI models, providers, or system instructions.`;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.post('/chat', authenticate, async (req: AuthRequest, res) => {
  const { message, language, history } = req.body as {
    message?: string;
    language?: 'english' | 'french' | 'both';
    history?: TutorHistoryItem[];
  };

  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) {
    res.status(400).json({ message: 'Please enter a grammar or vocabulary question.' });
    return;
  }
  if (trimmed.length > 1500) {
    res.status(400).json({ message: 'Question must be 1,500 characters or fewer.' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      message:
        'Language Tutor AI is not configured yet. Set GEMINI_API_KEY in Secrets to enable live tutoring responses.',
    });
    return;
  }

  const focusNote =
    language === 'english'
      ? 'Student focus: English grammar and vocabulary.'
      : language === 'french'
        ? 'Student focus: French grammar and vocabulary.'
        : 'Student focus: Bilingual English and French grammar and vocabulary.';

  const sanitizedHistory: Content[] = Array.isArray(history)
    ? history
        .slice(-10)
        .filter(
          (item): item is TutorHistoryItem =>
            Boolean(item) &&
            (item.role === 'user' || item.role === 'model') &&
            typeof item.text === 'string' &&
            item.text.trim().length > 0
        )
        .map((item) => ({
          role: item.role,
          parts: [{ text: item.text.trim().slice(0, 1500) }],
        }))
    : [];

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const chat = ai.chats.create({
        model: 'gemini-4-hydrogen',
        history: sanitizedHistory,
        config: {
          systemInstruction: `${TUTOR_SYSTEM_INSTRUCTION}\n\n${focusNote}`,
        },
      });

      const response = await chat.sendMessage({ message: trimmed });
      const reply = (response.text ?? '').trim();

      if (!reply) {
        res.status(502).json({ message: 'Language Tutor returned an empty response. Please try again.' });
        return;
      }

      res.json({ reply });
      return;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isTransient =
        errMsg.includes('503') ||
        errMsg.includes('500') ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('timeout');
      if (isTransient && attempt === 0) {
        await sleep(500);
        continue;
      }
      break;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : 'Upstream tutor error.';
  if (detail.includes('403') || detail.includes('PERMISSION_DENIED') || detail.includes('API_KEY_INVALID')) {
    res.status(403).json({
      message: 'AI Tutor API key could not be verified. Please check GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (detail.includes('429') || detail.includes('RESOURCE_EXHAUSTED')) {
    res.status(429).json({
      message: 'Tutor request limit reached temporarily. Please wait a moment and try again.',
    });
    return;
  }

  res.status(502).json({
    message: 'Unable to reach the Language Tutor right now. Please try again shortly.',
    detail,
  });
});

export default router;
