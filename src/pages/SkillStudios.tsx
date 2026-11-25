import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Film,
  FileDown,
  HardDriveDownload,
  Mic,
  MicOff,
  Printer,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Volume2,
  WifiOff,
} from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { LearnSubNav } from '../components/LearnSubNav.tsx';
import { VideoLessonPlayer } from '../components/VideoLessonPlayer.tsx';
import { VocabularyFlashcards, type FlashcardItem } from '../components/VocabularyFlashcards.tsx';
import { useOnlineStatus } from '../components/OfflineIndicator.tsx';
import {
  downloadLessonForOffline,
  downloadManyLessonsForOffline,
  getDownloadedLessonIdSet,
  getOfflineLessons,
  removeOfflineLesson,
} from '../utils/offlineLessons.ts';
import {
  exportIndividualLessonPdf,
  exportSkillModulePdf,
  type GrammarReferenceRow,
} from '../utils/pdfExport.ts';
import { speakPhrase, stopSpeaking } from '../utils/speech.ts';
import type { Assignment, CourseLevel, LanguageChoice, Lesson, PageRoute, SkillType } from '../types.ts';

interface SkillStudioProps {
  skill: 'grammar' | 'vocabulary' | 'listening' | 'speaking' | 'reading' | 'writing';
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
}

const GRAMMAR_DRILLS: Record<
  LanguageChoice,
  Array<{ prompt: string; options: string[]; answer: string; explanation: string }>
> = {
  english: [
    {
      prompt: 'Choose the correct form: "She ___ in London since 2021."',
      options: ['lives', 'has lived', 'lived', 'is living'],
      answer: 'has lived',
      explanation: '"Since 2021" marks a period continuing into the present, requiring Present Perfect.',
    },
    {
      prompt: 'Choose the correct form: "We ___ the quarterly briefing yesterday afternoon."',
      options: ['completed', 'have completed', 'complete', 'had complete'],
      answer: 'completed',
      explanation: '"Yesterday afternoon" is a finished past time expression, so Past Simple is used.',
    },
  ],
  french: [
    {
      prompt: 'Complétez au passé composé : "Elle ___ partie à huit heures."',
      options: ['a', 'est', 'fait', 'va'],
      answer: 'est',
      explanation: '"Partir" est un verbe de mouvement qui utilise l’auxiliaire "être" au passé composé.',
    },
    {
      prompt: 'Choisissez le mode correct : "Bien qu’il ___ tard, nous continuons la leçon."',
      options: ['est', 'soit', 'sera', 'était'],
      answer: 'soit',
      explanation: 'La conjonction "bien que" exige toujours le subjonctif ("soit").',
    },
  ],
};

const GRAMMAR_REFERENCE_ROWS: Record<LanguageChoice, GrammarReferenceRow[]> = {
  english: [
    {
      structure: 'Past Simple',
      usage: 'Finished past time',
      example: 'She visited Paris in 2024.',
    },
    {
      structure: 'Present Perfect',
      usage: 'Ongoing or unanchored past',
      example: 'She has lived here since 2022.',
    },
    {
      structure: 'Conditional II',
      usage: 'Hypothetical situation',
      example: 'If I studied daily, I would advance faster.',
    },
  ],
  french: [
    {
      structure: 'Passé Composé',
      usage: 'Action achevée',
      example: 'Nous sommes arrivés à midi.',
    },
    {
      structure: 'Imparfait',
      usage: 'Décor, habitude',
      example: 'Il faisait beau chaque matin.',
    },
    {
      structure: 'Subjonctif',
      usage: 'Nécessité, concession',
      example: 'Bien qu’il soit tard, il lit.',
    },
  ],
};

const VOCAB_CARDS: Record<LanguageChoice, FlashcardItem[]> = {
  english: [
    {
      term: 'Meet a deadline',
      phonetic: '/miːt ə ˈded.laɪn/',
      meaning: 'Complete a task on or before the agreed date',
      example: 'Our engineering team met every deadline this quarter.',
      category: 'Business Collocation',
    },
    {
      term: 'Conduct research',
      phonetic: '/kənˈdʌkt rɪˈsɜːtʃ/',
      meaning: 'Carry out systematic investigation',
      example: 'Linguists conducted research on bilingual memory.',
      category: 'Academic',
    },
    {
      term: 'Draw a conclusion',
      phonetic: '/drɔː ə kənˈkluː.ʒən/',
      meaning: 'Arrive at a reasoned judgment from evidence',
      example: 'Review the data before drawing a conclusion.',
      category: 'Academic',
    },
    {
      term: 'Cohesion',
      phonetic: '/kəʊˈhiː.ʒən/',
      meaning: 'Logical linking between ideas in speech or writing',
      example: 'Transitional phrases improve paragraph cohesion.',
      category: 'Writing Craft',
    },
    {
      term: 'Articulate',
      phonetic: '/ɑːˈtɪk.jə.lət/',
      meaning: 'Able to express thoughts and ideas clearly and effectively',
      example: 'She gave an articulate summary during the panel discussion.',
      category: 'Communication',
    },
    {
      term: 'Mitigate',
      phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
      meaning: 'Make something less severe, harmful, or painful',
      example: 'Early preparation helps mitigate exam anxiety.',
      category: 'Advanced C1',
    },
  ],
  french: [
    {
      term: 'Passer un examen',
      phonetic: '/pa.se œ̃.n‿ɛɡ.za.mɛ̃/',
      meaning: 'To sit / take an examination',
      example: 'Je vais passer mon examen DELF B1 vendredi.',
      category: 'Éducation',
    },
    {
      term: 'Actuellement',
      phonetic: '/ak.tɥɛl.mɑ̃/',
      meaning: 'Currently, at present (not "actually")',
      example: 'Actuellement, elle étudie la grammaire française.',
      category: 'Faux Amis',
    },
    {
      term: 'Assister à',
      phonetic: '/a.sis.te a/',
      meaning: 'To attend (a lecture, seminar, or event)',
      example: 'Nous assistons à une conférence à la Sorbonne.',
      category: 'Faux Amis',
    },
    {
      term: 'Sobriété énergétique',
      phonetic: '/sɔ.bʁi.e.te/',
      meaning: 'Energy sufficiency / mindful conservation',
      example: 'La sobriété énergétique guide l’architecture moderne.',
      category: 'Société',
    },
    {
      term: 'Par ailleurs',
      phonetic: '/paʁ a.jœʁ/',
      meaning: 'Moreover / furthermore (formal essay connector)',
      example: 'Par ailleurs, la pratique quotidienne renforce la fluidité.',
      category: 'Connecteurs',
    },
    {
      term: 'Prendre conscience de',
      phonetic: '/pʁɑ̃dʁ kɔ̃.sjɑ̃s də/',
      meaning: 'To become aware of / realize something important',
      example: 'Il a pris conscience de ses progrès en prononciation.',
      category: 'Expression',
    },
  ],
};

const LISTENING_EXERCISES: Record<
  LanguageChoice,
  {
    title: string;
    script: string;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }
> = {
  english: {
    title: 'University Seminar Relocation Notice',
    script:
      'Good morning everyone. Before we begin Thursday’s design review, please note that the seminar has moved from Room 204 to the North Auditorium at ten thirty AM. Submit your annotated slides by Wednesday at noon so Doctor Vance can prepare feedback.',
    question: 'Where will Thursday’s seminar take place, and when are slides due?',
    options: [
      'Room 204 · Thursday morning',
      'North Auditorium · Slides due Wednesday at noon',
      'South Hall · Slides due Friday at noon',
    ],
    answer: 'North Auditorium · Slides due Wednesday at noon',
    explanation: 'The speaker explicitly announces a move to the North Auditorium and a Wednesday noon slide deadline.',
  },
  french: {
    title: 'Annonce SNCF à la Gare de Lyon',
    script:
      'Mesdames et messieurs, le TGV numéro six mille deux cent quatorze à destination de Lyon Part-Dieu, initialement prévu voie H, partira exceptionnellement de la voie M à quatorze heures vingt.',
    question: 'De quelle voie et à quelle heure partira le train pour Lyon ?',
    options: [
      'Voie H à 14h00',
      'Voie M à 14h20',
      'Voie M à 16h20',
    ],
    answer: 'Voie M à 14h20',
    explanation: 'Le train partira exceptionnellement de la voie M à quatorze heures vingt (14h20).',
  },
};

interface SpeakingPromptItem {
  level: string;
  phrase: string;
  phonetic: string;
  translation: string;
  tip: string;
}

const SPEAKING_PROMPTS: Record<LanguageChoice, SpeakingPromptItem[]> = {
  english: [
    {
      level: 'Beginner · Everyday',
      phrase: 'Good morning, could I have a cup of coffee and the menu please?',
      phonetic: '/ɡʊd ˈmɔːrnɪŋ kʊd aɪ hæv ə kʌp əv ˈkɒfi/',
      translation: 'Polite café ordering with rising question intonation',
      tip: 'Link "cup of" smoothly and soften the "r" in "morning".',
    },
    {
      level: 'Intermediate · Workplace',
      phrase: 'Could you clarify the timeline for our next review?',
      phonetic: '/kʊd juː ˈklær.ɪ.faɪ ðə ˈtaɪm.laɪn/',
      translation: 'Polite workplace clarification request',
      tip: 'Stress the first syllable of "clarify" and "timeline".',
    },
    {
      level: 'Intermediate · Fluency',
      phrase: 'She has worked on bilingual curriculum design since twenty twenty-two.',
      phonetic: '/ʃiː hæz wɜːrkt ɒn baɪˈlɪŋ.ɡwəl/',
      translation: 'Present Perfect fluency drill with consonant clusters',
      tip: 'Keep the final "-ed" in "worked" crisp as a /t/ sound before "on".',
    },
    {
      level: 'Advanced · Presentation',
      phrase: 'Although the schedule is tight, we will deliver the final report by Friday.',
      phonetic: '/ɔːlˈðoʊ ðə ˈʃedjuːl ɪz taɪt/',
      translation: 'Concessive clause pacing with clear stress on contrast words',
      tip: 'Pause briefly after "tight" before delivering the main commitment.',
    },
  ],
  french: [
    {
      level: 'Débutant · Quotidien',
      phrase: 'Bonjour, je voudrais réserver une table pour deux personnes.',
      phonetic: '/bɔ̃.ʒuʁ ʒə vu.dʁɛ ʁe.zɛʁ.ve/',
      translation: 'Hello, I would like to reserve a table for two people.',
      tip: 'Round your lips on "bonjour" (/ɔ̃/) and keep "une" crisp (/y/).',
    },
    {
      level: 'Intermédiaire · Voyage',
      phrase: 'Nous avons visité le musée avant de prendre le train.',
      phonetic: '/nu.z‿a.vɔ̃ vi.zi.te lə my.ze/',
      translation: 'We visited the museum before taking the train.',
      tip: 'Articulate the liaison in "nous avons" (/nu.z‿a.vɔ̃/) and nasal /ɛ̃/ in "train".',
    },
    {
      level: 'Intermédiaire · Travail',
      phrase: 'Pourriez-vous confirmer la date de notre prochaine réunion ?',
      phonetic: '/pu.ʁje.vu kɔ̃.fiʁ.me la dat/',
      translation: 'Could you confirm the date of our next meeting?',
      tip: 'Keep equal syllable timing across "con-fir-mer" and raise pitch at the end.',
    },
    {
      level: 'Avancé · Argumentation',
      phrase: 'Bien que le projet soit complexe, notre équipe avance avec méthode.',
      phonetic: '/bjɛ̃ kə lə pʁɔ.ʒɛ swa kɔ̃.plɛks/',
      translation: 'Although the project is complex, our team progresses methodically.',
      tip: 'Pronounce the nasal vowel in "bien" cleanly and avoid dropping the /ks/ in "complexe".',
    },
  ],
};

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function normalizeToken(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`-]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

interface WordEvaluation {
  display: string;
  matched: boolean;
}

interface PronunciationEvaluation {
  accuracy: number;
  matchedCount: number;
  totalCount: number;
  words: WordEvaluation[];
  missedWords: string[];
  feedbackTitle: string;
  feedbackDetail: string;
  tier: 'excellent' | 'good' | 'practice';
}

function evaluatePronunciation(targetPhrase: string, spokenText: string): PronunciationEvaluation {
  const rawTargets = targetPhrase.trim().split(/\s+/).filter(Boolean);
  const spokenTokens = spokenText
    .trim()
    .split(/[\s’'`-]+/)
    .map(normalizeToken)
    .filter(Boolean);

  // Track ordered consumption plus flexible fallback match for minor speech-to-text reordering
  const usedIndices = new Set<number>();
  let cursor = 0;

  const words: WordEvaluation[] = rawTargets.map((rawWord) => {
    const cleanTarget = normalizeToken(rawWord);
    if (!cleanTarget) {
      return { display: rawWord, matched: true };
    }

    let matchedIdx = -1;
    // First search near cursor (within next 3 tokens) to respect word order
    for (let i = cursor; i < Math.min(spokenTokens.length, cursor + 4); i++) {
      if (!usedIndices.has(i) && spokenTokens[i] === cleanTarget) {
        matchedIdx = i;
        break;
      }
    }
    // Fallback anywhere in spoken tokens
    if (matchedIdx === -1) {
      for (let i = 0; i < spokenTokens.length; i++) {
        if (!usedIndices.has(i) && spokenTokens[i] === cleanTarget) {
          matchedIdx = i;
          break;
        }
      }
    }

    if (matchedIdx !== -1) {
      usedIndices.add(matchedIdx);
      if (matchedIdx >= cursor) cursor = matchedIdx + 1;
      return { display: rawWord, matched: true };
    }

    return { display: rawWord, matched: false };
  });

  const countable = words.filter((w) => normalizeToken(w.display).length > 0);
  const matchedCount = countable.filter((w) => w.matched).length;
  const totalCount = countable.length;
  const accuracy = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
  const missedWords = countable
    .filter((w) => !w.matched)
    .map((w) => w.display.replace(/[.,!?;:«»"()]/g, ''));

  if (accuracy >= 90) {
    return {
      accuracy,
      matchedCount,
      totalCount,
      words,
      missedWords,
      tier: 'excellent',
      feedbackTitle: 'Strong pronunciation & clarity',
      feedbackDetail:
        missedWords.length === 0
          ? 'Every target word was clearly recognized at natural phrasing accuracy.'
          : `Nearly complete recognition. Lightly emphasize: ${missedWords.join(', ')}.`,
    };
  }

  if (accuracy >= 60) {
    return {
      accuracy,
      matchedCount,
      totalCount,
      words,
      missedWords,
      tier: 'good',
      feedbackTitle: 'Good rhythm — refine highlighted words',
      feedbackDetail: `Replay the slow (0.75x) model and articulate these missed words clearly: ${missedWords.join(', ')}.`,
    };
  }

  return {
    accuracy,
    matchedCount,
    totalCount,
    words,
    missedWords,
    tier: 'practice',
    feedbackTitle: 'Keep practicing — slow down & enunciate',
    feedbackDetail:
      spokenTokens.length === 0
        ? 'No clear words were captured yet. Speak steadily toward your microphone.'
        : `Focus on pacing and clear vowel sounds for: ${missedWords.slice(0, 5).join(', ')}.`,
  };
}

const READING_PASSAGES: Record<
  LanguageChoice,
  {
    title: string;
    passage: string;
    glossary: Array<{ word: string; definition: string }>;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }
> = {
  english: {
    title: 'Urban Bilingualism & Executive Attention',
    passage:
      'Longitudinal cognitive studies indicate that adults who regularly alternate between two grammatical systems strengthen executive attention—the mental mechanism responsible for filtering distractions and switching tasks efficiently. While early childhood immersion eases accent acquisition, disciplined adult learners frequently surpass younger learners in syntactic precision and vocabulary retention because they leverage explicit analytical frameworks.',
    glossary: [
      { word: 'Longitudinal', definition: 'Research observing the same subjects over an extended period.' },
      { word: 'Executive attention', definition: 'Cognitive control that suppresses distractions and shifts focus.' },
      { word: 'Syntactic precision', definition: 'Accuracy in sentence structure and grammatical rules.' },
    ],
    question: 'According to the passage, why do disciplined adult learners often excel in syntax?',
    options: [
      'They rely solely on passive immersion without analysis.',
      'They apply explicit analytical frameworks to language structure.',
      'They acquire native accents faster than young children.',
    ],
    answer: 'They apply explicit analytical frameworks to language structure.',
    explanation: 'The final sentence directly credits explicit analytical frameworks for adult syntactic precision.',
  },
  french: {
    title: 'L’Architecture Durable à Paris',
    passage:
      'Depuis une décennie, les urbanistes parisiens réinventent l’îlot haussmannien en conciliant préservation patrimoniale et sobriété énergétique. Plutôt que de démolir les immeubles anciens, les architectes privilégient l’isolation biosourcée, la végétalisation des cours intérieures et la transformation des toitures en espaces partagés.',
    glossary: [
      { word: 'Patrimoniale', definition: 'Relating to architectural and cultural heritage.' },
      { word: 'Biosourcée', definition: 'Derived from renewable biological materials (wood, hemp, straw).' },
      { word: 'Végétalisation', definition: 'Introducing plants and greenery to cool urban spaces.' },
    ],
    question: 'Quelle approche les architectes parisiens privilégient-ils ?',
    options: [
      'La démolition complète des bâtiments haussmanniens.',
      'La rénovation écologique tout en préservant le patrimoine existant.',
      'La suppression des cours intérieures.',
    ],
    answer: 'La rénovation écologique tout en préservant le patrimoine existant.',
    explanation: 'Le texte indique qu’ils évitent la démolition et combinent préservation et isolation biosourcée.',
  },
};

export function SkillStudioPage({ skill, currentRoute, onNavigate }: SkillStudioProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isOnline = useOnlineStatus();

  const [language, setLanguage] = useState<LanguageChoice>('english');
  const [level, setLevel] = useState<'all' | CourseLevel>('all');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(() => getDownloadedLessonIdSet());
  const [servingOfflineCache, setServingOfflineCache] = useState(false);
  const [savingOfflineId, setSavingOfflineId] = useState<string | null>(null);
  const [savingAllOffline, setSavingAllOffline] = useState(false);
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Grammar & Reading & Listening check state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  // Listening state
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showTranscript, setShowTranscript] = useState(false);

  // Speaking state (Web Speech API live voice-to-text + pronunciation feedback)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<Record<string, string>>({});
  const [spokenResult, setSpokenResult] = useState<Record<string, string>>({});
  const [interimResult, setInterimResult] = useState<Record<string, string>>({});
  const [listeningKey, setListeningKey] = useState<string | null>(null);
  const [speechLocale, setSpeechLocale] = useState<Record<LanguageChoice, string>>({
    english: 'en-US',
    french: 'fr-FR',
  });
  const [customPhrase, setCustomPhrase] = useState<Record<LanguageChoice, string>>({
    english: 'I am practicing clear pronunciation using real-time speech recognition.',
    french: 'Je pratique ma prononciation française avec la reconnaissance vocale en direct.',
  });
  const [speechError, setSpeechError] = useState<string | null>(null);
  const speechSupported = Boolean(getSpeechRecognitionCtor());

  // Writing assignment submission state
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [freeDraft, setFreeDraft] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
      recognitionRef.current = null;
    }
    setListeningKey(null);
  };

  useEffect(() => {
    setSelectedAnswers({});
    setChecked({});
    setShowTranscript(false);
    setSpeechError(null);
    stopSpeaking();
    stopSpeechRecognition();

    const skillParam: SkillType = skill;
    const supportsOfflineLessons = skill === 'vocabulary' || skill === 'grammar';
    setServingOfflineCache(false);

    if (supportsOfflineLessons) {
      void getOfflineLessons().then((cached) => {
        setDownloadedIds(new Set(cached.map((item) => item._id)));
      });
    }

    const loadLessons = async () => {
      if (supportsOfflineLessons && typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await getOfflineLessons({ language, skillType: skillParam, level });
        setLessons(cached);
        setServingOfflineCache(true);
        return;
      }

      try {
        const res = await api.get<{ lessons: Lesson[] }>('/lessons', {
          params: { language, level, skillType: skillParam },
        });
        setLessons(Array.isArray(res.data?.lessons) ? res.data.lessons : []);
        setServingOfflineCache(false);
      } catch {
        if (supportsOfflineLessons) {
          const cached = await getOfflineLessons({ language, skillType: skillParam, level });
          setLessons(cached);
          setServingOfflineCache(true);
        }
      }
    };

    void loadLessons();

    if (skill === 'writing') {
      void api
        .get<{ assignments: Assignment[] }>('/assignments', { params: { language } })
        .then((res) => setAssignments(Array.isArray(res.data?.assignments) ? res.data.assignments : []))
        .catch(() => {});
    }

    return () => {
      stopSpeechRecognition();
    };
  }, [skill, language, level, isOnline]);

  const supportsOfflineCache = skill === 'vocabulary' || skill === 'grammar';

  const handleToggleOfflineLesson = async (lesson: Lesson) => {
    setSavingOfflineId(lesson._id);
    try {
      if (downloadedIds.has(lesson._id)) {
        await removeOfflineLesson(lesson._id);
        setDownloadedIds((prev) => {
          const next = new Set(prev);
          next.delete(lesson._id);
          return next;
        });
        showSuccess(`Removed "${lesson.title}" from offline storage.`);
      } else {
        await downloadLessonForOffline(lesson);
        setDownloadedIds((prev) => {
          const next = new Set(prev);
          next.add(lesson._id);
          return next;
        });
        showSuccess(`Saved "${lesson.title}" for offline study.`);
      }
    } catch {
      showError('Could not update offline lesson cache.');
    } finally {
      setSavingOfflineId(null);
    }
  };

  const handleSaveAllOffline = async () => {
    if (lessons.length === 0) return;
    setSavingAllOffline(true);
    try {
      const count = await downloadManyLessonsForOffline(lessons);
      setDownloadedIds((prev) => {
        const next = new Set(prev);
        for (const item of lessons) next.add(item._id);
        return next;
      });
      showSuccess(`Saved ${count} ${skill} lessons for offline access.`);
    } catch {
      showError('Could not save lessons offline.');
    } finally {
      setSavingAllOffline(false);
    }
  };

  const handleMarkCompleted = async (lessonId: string) => {
    if (!user || user.role !== 'student') {
      showError('Sign in as a student to track lesson progress.');
      return;
    }
    try {
      await api.post(`/lessons/${lessonId}/complete`);
      setLessons((prev) => prev.map((l) => (l._id === lessonId ? { ...l, completed: true } : l)));
      showSuccess('Lesson marked as completed.');
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const startSpeechRecognition = (promptKey: string) => {
    if (listeningKey === promptKey) {
      stopSpeechRecognition();
      return;
    }

    const SpeechRec = getSpeechRecognitionCtor();
    if (!SpeechRec) {
      setSpeechError(
        'Web Speech API microphone recognition is unavailable in this browser. Use Chrome/Edge or test below with manual text evaluation.'
      );
      showError('Live microphone recognition is unavailable in this browser.');
      return;
    }

    stopSpeechRecognition();
    stopSpeaking();
    setSpeechError(null);
    finalTranscriptRef.current[promptKey] = '';
    setSpokenResult((prev) => ({ ...prev, [promptKey]: '' }));
    setInterimResult((prev) => ({ ...prev, [promptKey]: '' }));

    try {
      const recognition = new SpeechRec();
      recognition.lang = speechLocale[language];
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      setListeningKey(promptKey);

      recognition.onresult = (event) => {
        let newFinals = finalTranscriptRef.current[promptKey] || '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result[0]?.transcript || '';
          if (result.isFinal) {
            newFinals = `${newFinals} ${chunk}`.trim();
          } else {
            interim = `${interim} ${chunk}`.trim();
          }
        }

        finalTranscriptRef.current[promptKey] = newFinals;
        const combined = [newFinals, interim].filter(Boolean).join(' ').trim();
        setInterimResult((prev) => ({ ...prev, [promptKey]: interim }));
        setSpokenResult((prev) => ({ ...prev, [promptKey]: combined }));
      };

      recognition.onerror = (event) => {
        recognitionRef.current = null;
        setListeningKey(null);
        const msg =
          event.error === 'not-allowed'
            ? 'Microphone permission was denied. Allow microphone access in your browser settings to use live voice-to-text.'
            : event.error === 'no-speech'
              ? 'No speech was detected. Check your microphone and try speaking clearly.'
              : 'Could not capture microphone audio. Please verify your microphone device.';
        setSpeechError(msg);
        showError(msg);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setListeningKey((current) => (current === promptKey ? null : current));
        setInterimResult((prev) => ({ ...prev, [promptKey]: '' }));
      };

      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListeningKey(null);
      setSpeechError('Microphone recognition could not start in this environment.');
      showError('Microphone recognition could not start.');
    }
  };

  const clearSpeakingAttempt = (promptKey: string) => {
    if (listeningKey === promptKey) {
      stopSpeechRecognition();
    }
    finalTranscriptRef.current[promptKey] = '';
    setSpokenResult((prev) => ({ ...prev, [promptKey]: '' }));
    setInterimResult((prev) => ({ ...prev, [promptKey]: '' }));
  };

  const handleSubmitAssignment = async (e: React.FormEvent, assignmentId: string) => {
    e.preventDefault();
    if (!user || user.role !== 'student') {
      showError('Please sign in with a Student account to submit assignments.');
      onNavigate('/login');
      return;
    }
    const content = drafts[assignmentId] || '';
    if (content.trim().length < 20) {
      showError('Please write at least 20 characters before submitting.');
      return;
    }

    setSubmittingId(assignmentId);
    try {
      await api.post(`/assignments/${assignmentId}/submit`, {
        content,
        attachmentName: `${user.name.toLowerCase().replace(/\s+/g, '_')}_writing.txt`,
      });
      showSuccess('Assignment submitted for teacher review.');
      const res = await api.get<{ assignments: Assignment[] }>('/assignments', { params: { language } });
      setAssignments(Array.isArray(res.data?.assignments) ? res.data.assignments : []);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmittingId(null);
    }
  };

  const titles: Record<SkillStudioProps['skill'], { title: string; subtitle: string }> = {
    grammar: {
      title: 'Grammar Studio',
      subtitle: 'Master tense selection, sentence structure, and agreement with immediate diagnostic checks.',
    },
    vocabulary: {
      title: 'Vocabulary & Collocations Studio',
      subtitle: 'Build active recall with spoken English and French expressions, phonetics, and contextual usage.',
    },
    listening: {
      title: 'Listening Comprehension Lab',
      subtitle: 'Listen to realistic announcements at adjustable speeds and verify your comprehension.',
    },
    speaking: {
      title: 'Speaking & Fluency Practice',
      subtitle: 'Shadow native-rate prompts, inspect phonetic guides, and test spoken delivery.',
    },
    reading: {
      title: 'Reading Comprehension Studio',
      subtitle: 'Study authentic English and French passages with inline glossaries and inference questions.',
    },
    writing: {
      title: 'Writing Workshop & Course Submissions',
      subtitle: 'Draft structured paragraphs with live word counts and submit course essays directly to instructors.',
    },
  };

  const freeWordCount = freeDraft.trim() ? freeDraft.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-14rem)]">
      <LearnSubNav currentRoute={currentRoute} onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Studio Header & Language/Level Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 capitalize">
              {language} · {skill} Module
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {titles[skill].title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {titles[skill].subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
              {(['english', 'french'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                    language === lang
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    level === lvl
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lvl === 'all' ? 'All Levels' : lvl}
                </button>
              ))}
            </div>

            {(skill === 'vocabulary' || skill === 'grammar') && (
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => {
                    exportSkillModulePdf({
                      language,
                      skill,
                      levelLabel: level === 'all' ? 'All Levels' : level,
                      vocabCards: skill === 'vocabulary' ? VOCAB_CARDS[language] : undefined,
                      grammarRows: skill === 'grammar' ? GRAMMAR_REFERENCE_ROWS[language] : undefined,
                      grammarDrills: skill === 'grammar' ? GRAMMAR_DRILLS[language] : undefined,
                      lessons,
                    });
                    showSuccess(`Exported printable ${language} ${skill} PDF study guide.`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export Lesson PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SKILL-SPECIFIC INTERACTIVE SANDBOX */}
        {skill === 'grammar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {language === 'english' ? 'English Core Tense Reference' : 'Référence des Temps Français'}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Structure</th>
                      <th className="py-2 pr-3 font-semibold">Usage</th>
                      <th className="py-2 font-semibold">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {language === 'english' ? (
                      <>
                        <tr>
                          <td className="py-3 pr-3 font-medium">Past Simple</td>
                          <td className="py-3 pr-3">Finished past time</td>
                          <td className="py-3">She visited Paris in 2024.</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-3 font-medium">Present Perfect</td>
                          <td className="py-3 pr-3">Ongoing or unanchored past</td>
                          <td className="py-3">She has lived here since 2022.</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-3 font-medium">Conditional II</td>
                          <td className="py-3 pr-3">Hypothetical situation</td>
                          <td className="py-3">If I studied daily, I would advance faster.</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td className="py-3 pr-3 font-medium">Passé Composé</td>
                          <td className="py-3 pr-3">Action achevée</td>
                          <td className="py-3">Nous sommes arrivés à midi.</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-3 font-medium">Imparfait</td>
                          <td className="py-3 pr-3">Décor, habitude</td>
                          <td className="py-3">Il faisait beau chaque matin.</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-3 font-medium">Subjonctif</td>
                          <td className="py-3 pr-3">Nécessité, concession</td>
                          <td className="py-3">Bien qu’il soit tard, il lit.</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Instant Grammar Check
              </h2>
              <div className="space-y-6">
                {GRAMMAR_DRILLS[language].map((item, idx) => {
                  const chosen = selectedAnswers[idx];
                  const isChecked = checked[idx];
                  const isCorrect = chosen === item.answer;
                  return (
                    <div key={idx} className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-5 last:border-none last:pb-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.prompt}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {item.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSelectedAnswers((prev) => ({ ...prev, [idx]: opt }));
                              setChecked((prev) => ({ ...prev, [idx]: true }));
                            }}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                              chosen === opt
                                ? isCorrect
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                                  : 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {isChecked && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{isCorrect ? 'Correct:' : `Answer: ${item.answer} —`}</span>{' '}
                          {item.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {skill === 'vocabulary' && (
          <div className="space-y-8">
            <VocabularyFlashcards language={language} cards={VOCAB_CARDS[language]} />

            <div className="space-y-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Quick Reference Lexicon
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Full word bank with phonetic transcriptions and audio playback
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {VOCAB_CARDS[language].map((card) => (
                  <div
                    key={card.term}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {card.category && (
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            {card.category}
                          </p>
                        )}
                        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                          {card.term}
                        </h2>
                        <p className="font-mono text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                          {card.phonetic}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakPhrase(`${card.term}. ${card.example}`, language, 0.92)}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0"
                        aria-label={`Hear pronunciation for ${card.term}`}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{card.meaning}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                      Example: {card.example}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {skill === 'listening' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Audio Playback Console</p>
                <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                  {LISTENING_EXERCISES[language].title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => speakPhrase(LISTENING_EXERCISES[language].script, language, speechRate)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <Volume2 className="h-4 w-4" />
                  Play Audio ({speechRate}x)
                </button>
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </button>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  {[0.75, 1.0, 1.15].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSpeechRate(rate)}
                      className={`px-2.5 py-1 text-xs font-mono rounded ${
                        speechRate === rate
                          ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowTranscript((prev) => !prev)}
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {showTranscript ? 'Hide Transcript' : 'Show Audio Transcript'}
                </button>
                {showTranscript && (
                  <p className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {LISTENING_EXERCISES[language].script}
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Comprehension Check
              </h2>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {LISTENING_EXERCISES[language].question}
              </p>
              <div className="space-y-2.5">
                {LISTENING_EXERCISES[language].options.map((opt) => {
                  const chosen = selectedAnswers[0];
                  const isCorrect = opt === LISTENING_EXERCISES[language].answer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedAnswers({ 0: opt });
                        setChecked({ 0: true });
                      }}
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        chosen === opt
                          ? isCorrect
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                            : 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {checked[0] && (
                <p className="text-xs text-slate-600 dark:text-slate-300 pt-2">
                  <span className="font-semibold">
                    {selectedAnswers[0] === LISTENING_EXERCISES[language].answer ? 'Correct:' : 'Explanation:'}
                  </span>{' '}
                  {LISTENING_EXERCISES[language].explanation}
                </p>
              )}
            </div>
          </div>
        )}

        {skill === 'speaking' && (
          <div className="space-y-6">
            {/* Voice-to-Text Controls & Dialect Selector */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mic className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  Real-Time Voice-to-Text Pronunciation Lab
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Press <span className="font-semibold">Start Speaking</span>, read the phrase aloud, and inspect live word-by-word accuracy feedback as you speak.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  Recognition Accent:
                  <select
                    value={speechLocale[language]}
                    onChange={(e) =>
                      setSpeechLocale((prev) => ({ ...prev, [language]: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {language === 'english' ? (
                      <>
                        <option value="en-US">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                      </>
                    ) : (
                      <>
                        <option value="fr-FR">French (France)</option>
                        <option value="fr-CA">French (Canada)</option>
                      </>
                    )}
                  </select>
                </label>

                {listeningKey && (
                  <button
                    type="button"
                    onClick={stopSpeechRecognition}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Stop Mic
                  </button>
                )}
              </div>
            </div>

            {(!speechSupported || speechError) && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    {speechError || 'Browser SpeechRecognition API is not supported in this browser.'}
                  </p>
                  <p className="text-amber-800/90 dark:text-amber-300/90">
                    For live microphone transcription, use Google Chrome, Microsoft Edge, or Safari with microphone permissions enabled. You can also type or paste a spoken transcription inside any prompt card to test pronunciation feedback.
                  </p>
                </div>
              </div>
            )}

            {/* Custom Phrase Sandbox */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Custom Sentence Practice
                  </p>
                  <h3 className="mt-0.5 font-display text-base font-bold text-slate-900 dark:text-white">
                    Test Any {language === 'english' ? 'English' : 'French'} Sentence Aloud
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => speakPhrase(customPhrase[language], language, 0.95)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                    Hear Model
                  </button>
                  <button
                    type="button"
                    onClick={() => startSpeechRecognition(`${language}-custom`)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition-colors ${
                      listeningKey === `${language}-custom`
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-blue-700 hover:bg-blue-800'
                    }`}
                  >
                    {listeningKey === `${language}-custom` ? (
                      <>
                        <MicOff className="h-3.5 w-3.5" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" />
                        Speak Custom Phrase
                      </>
                    )}
                  </button>
                  {spokenResult[`${language}-custom`] && (
                    <button
                      type="button"
                      onClick={() => clearSpeakingAttempt(`${language}-custom`)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={customPhrase[language]}
                onChange={(e) =>
                  setCustomPhrase((prev) => ({ ...prev, [language]: e.target.value }))
                }
                placeholder={
                  language === 'english'
                    ? 'Enter any English phrase to practice...'
                    : 'Saisissez une phrase en français à pratiquer...'
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />

              {(() => {
                const customKey = `${language}-custom`;
                const spoken = spokenResult[customKey] || '';
                const isActive = listeningKey === customKey;
                const evalRes = spoken ? evaluatePronunciation(customPhrase[language], spoken) : null;

                return (isActive || spoken) ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isActive ? 'Listening live via Web Speech API...' : 'Live Pronunciation Analysis'}
                      </span>
                      {evalRes && (
                        <span
                          className={`font-mono text-xs font-bold tabular-nums ${
                            evalRes.tier === 'excellent'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : evalRes.tier === 'good'
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          Accuracy: {evalRes.accuracy}% ({evalRes.matchedCount}/{evalRes.totalCount} words)
                        </span>
                      )}
                    </div>

                    {evalRes && (
                      <div className="flex flex-wrap gap-1.5 text-sm leading-relaxed">
                        {evalRes.words.map((w, wIdx) => (
                          <span
                            key={`${w.display}-${wIdx}`}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                              w.matched
                                ? 'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200'
                                : 'bg-amber-100/80 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                            }`}
                          >
                            {w.display}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Captured text: </span>
                      {spoken || (isActive ? 'Speak clearly into your microphone...' : '')}
                      {interimResult[customKey] && (
                        <span className="text-slate-400 italic"> (streaming)</span>
                      )}
                    </p>

                    {evalRes && (
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{evalRes.feedbackTitle}: </span>
                        {evalRes.feedbackDetail}
                      </p>
                    )}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Guided Speaking Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SPEAKING_PROMPTS[language].map((item, idx) => {
                const promptKey = `${language}-${idx}`;
                const isListening = listeningKey === promptKey;
                const spoken = spokenResult[promptKey] || '';
                const interim = interimResult[promptKey] || '';
                const evaluation = spoken ? evaluatePronunciation(item.phrase, spoken) : null;

                return (
                  <div
                    key={promptKey}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                          {item.level} · {item.translation}
                        </p>
                        <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          “{item.phrase}”
                        </h2>
                        <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {item.phonetic}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                          Tip: {item.tip}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => speakPhrase(item.phrase, language, 1.0)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                          Model 1.0x
                        </button>
                        <button
                          type="button"
                          onClick={() => speakPhrase(item.phrase, language, 0.75)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Slow 0.75x
                        </button>
                        <button
                          type="button"
                          onClick={() => startSpeechRecognition(promptKey)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors ${
                            isListening ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-700 hover:bg-blue-800'
                          }`}
                        >
                          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          {isListening ? 'Stop Speaking' : 'Start Speaking'}
                        </button>
                        {spoken && (
                          <button
                            type="button"
                            onClick={() => clearSpeakingAttempt(promptKey)}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry
                          </button>
                        )}
                      </div>

                      {/* Real-time Voice-to-Text Transcript & Pronunciation Diff */}
                      {(isListening || spoken) && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {isListening ? 'Listening in real time...' : 'Pronunciation Feedback'}
                            </span>
                            {evaluation && (
                              <span
                                className={`font-mono text-xs font-bold tabular-nums ${
                                  evaluation.tier === 'excellent'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : evaluation.tier === 'good'
                                      ? 'text-blue-700 dark:text-blue-400'
                                      : 'text-amber-700 dark:text-amber-400'
                                }`}
                              >
                                {evaluation.accuracy}% match ({evaluation.matchedCount}/{evaluation.totalCount})
                              </span>
                            )}
                          </div>

                          {evaluation && (
                            <>
                              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    evaluation.tier === 'excellent'
                                      ? 'bg-emerald-600 dark:bg-emerald-400'
                                      : evaluation.tier === 'good'
                                        ? 'bg-blue-700 dark:bg-blue-400'
                                        : 'bg-amber-500 dark:bg-amber-400'
                                  }`}
                                  style={{ width: `${evaluation.accuracy}%` }}
                                />
                              </div>

                              <div className="flex flex-wrap gap-1.5 text-xs">
                                {evaluation.words.map((w, wordIdx) => (
                                  <span
                                    key={`${w.display}-${wordIdx}`}
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                                      w.matched
                                        ? 'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200'
                                        : 'bg-amber-100/80 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                                    }`}
                                  >
                                    {w.matched && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                    {w.display}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}

                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Voice-to-text:{' '}
                            </span>
                            <span className="text-slate-900 dark:text-white">
                              {spoken || 'Speak into your microphone to see live transcription...'}
                            </span>
                            {interim && (
                              <span className="ml-1 text-blue-600 dark:text-blue-400 italic">
                                (live)
                              </span>
                            )}
                          </div>

                          {evaluation && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
                              <span className="font-semibold">{evaluation.feedbackTitle}: </span>
                              {evaluation.feedbackDetail}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Optional fallback / quick text self-test */}
                    {!speechSupported && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Fallback Transcript Check (type what you spoke):
                        </label>
                        <input
                          type="text"
                          value={spoken}
                          onChange={(e) =>
                            setSpokenResult((prev) => ({ ...prev, [promptKey]: e.target.value }))
                          }
                          placeholder="Type phrase to verify word matching..."
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {skill === 'reading' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  {READING_PASSAGES[language].title}
                </h2>
                <button
                  type="button"
                  onClick={() => speakPhrase(READING_PASSAGES[language].passage, language, 0.95)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  <Volume2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                  Read Aloud
                </button>
              </div>
              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {READING_PASSAGES[language].passage}
              </p>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                  Key Glossary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {READING_PASSAGES[language].glossary.map((g) => (
                    <div
                      key={g.word}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-900 dark:text-white">{g.word}</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">{g.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Reading Comprehension Check
              </h2>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {READING_PASSAGES[language].question}
              </p>
              <div className="space-y-2.5">
                {READING_PASSAGES[language].options.map((opt) => {
                  const chosen = selectedAnswers[0];
                  const isCorrect = opt === READING_PASSAGES[language].answer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedAnswers({ 0: opt });
                        setChecked({ 0: true });
                      }}
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        chosen === opt
                          ? isCorrect
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                            : 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {checked[0] && (
                <p className="text-xs text-slate-600 dark:text-slate-300 pt-2">
                  {READING_PASSAGES[language].explanation}
                </p>
              )}
            </div>
          </div>
        )}

        {skill === 'writing' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Course Writing Assignments ({assignments.length})
              </h2>
              {assignments.length === 0 ? (
                <p className="text-sm text-slate-500">No assignments posted for this language yet.</p>
              ) : (
                assignments.map((assign) => (
                  <form
                    key={assign._id}
                    onSubmit={(e) => handleSubmitAssignment(e, assign._id)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
                  >
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {assign.courseTitle} · Due {assign.dueDate} · Max {assign.maxScore} pts
                      </p>
                      <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                        {assign.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {assign.instructions}
                      </p>
                    </div>

                    {assign.mySubmission ? (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50 p-4 space-y-2 text-sm">
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                          {assign.mySubmission.status === 'graded'
                            ? `Graded: ${assign.mySubmission.score}/${assign.maxScore}`
                            : 'Submitted — Awaiting Teacher Grading'}
                        </p>
                        <p className="text-slate-700 dark:text-slate-300">{assign.mySubmission.content}</p>
                        {assign.mySubmission.feedback && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                            Instructor Feedback: {assign.mySubmission.feedback}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <textarea
                          rows={5}
                          value={drafts[assign._id] || ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [assign._id]: e.target.value }))}
                          placeholder={
                            language === 'french'
                              ? 'Rédigez votre réponse ici (minimum 20 caractères)...'
                              : 'Write your structured response here (minimum 20 characters)...'
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                        />
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-mono text-xs text-slate-500 tabular-nums">
                            {(drafts[assign._id] || '').trim()
                              ? (drafts[assign._id] || '').trim().split(/\s+/).length
                              : 0}{' '}
                            words
                          </span>
                          <button
                            type="submit"
                            disabled={submittingId === assign._id}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {submittingId === assign._id ? 'Submitting...' : 'Submit Assignment'}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                ))
              )}
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 self-start">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Guided Free-Writing Scratchpad
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'english'
                  ? 'Prompt: Summarize why structured feedback accelerates bilingual fluency (target 80–120 words).'
                  : 'Sujet : Expliquez pourquoi l’écoute régulière améliore la prononciation française (80–120 mots).'}
              </p>
              <textarea
                rows={7}
                value={freeDraft}
                onChange={(e) => setFreeDraft(e.target.value)}
                placeholder="Draft your paragraph here..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono tabular-nums">Word count: {freeWordCount}</span>
                <span>Target: 80–120 words</span>
              </div>
            </div>
          </div>
        )}

        {/* BACKEND LESSON MODULES FOR THIS SKILL */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white capitalize">
                {language} {skill} Curriculum Lessons ({lessons.length})
              </h2>
              {supportsOfflineCache && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Save vocabulary and grammar lessons to your device cache to review them offline anytime.
                </p>
              )}
            </div>

            {supportsOfflineCache && lessons.length > 0 && isOnline && (
              <button
                type="button"
                disabled={savingAllOffline}
                onClick={() => void handleSaveAllOffline()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <HardDriveDownload className="h-3.5 w-3.5" />
                {savingAllOffline ? 'Saving Offline...' : `Save All ${skill} Offline`}
              </button>
            )}
          </div>

          {servingOfflineCache && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-100">
              <WifiOff className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>
                You are currently offline. Displaying your previously downloaded {language} {skill} lessons from Service Worker cache.
              </span>
            </div>
          )}

          {lessons.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {servingOfflineCache
                ? `No offline ${language} ${skill} lessons have been downloaded for this filter yet.`
                : 'No lessons matched this level filter. Select “All Levels” above to view all lessons.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lessons.map((lesson) => {
                const isSavedOffline = downloadedIds.has(lesson._id);
                return (
                  <div
                    key={lesson._id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {lesson.courseTitle} · {lesson.level}
                          {isSavedOffline ? ' · Available offline' : ''}
                        </p>
                        <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                          {lesson.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {supportsOfflineCache && (
                          <button
                            type="button"
                            disabled={savingOfflineId === lesson._id}
                            onClick={() => void handleToggleOfflineLesson(lesson)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                              isSavedOffline
                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <HardDriveDownload className="h-3.5 w-3.5" />
                            {savingOfflineId === lesson._id
                              ? 'Saving...'
                              : isSavedOffline
                                ? 'Saved Offline'
                                : 'Save Offline'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(lesson._id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 ${
                            lesson.completed
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {lesson.completed ? 'Done' : 'Complete'}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {lesson.content}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setOpenVideoId((prev) => (prev === lesson._id ? null : lesson._id))}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          <Film className="h-3.5 w-3.5" />
                          {openVideoId === lesson._id ? 'Hide Video Lesson' : 'Watch Video Lesson'}
                        </button>
                        <button
                          type="button"
                          onClick={() => speakPhrase(lesson.content, lesson.language, 0.95)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          Audio
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {supportsOfflineCache && (
                          <button
                            type="button"
                            onClick={() => {
                              exportIndividualLessonPdf(lesson);
                              showSuccess(`Exported "${lesson.title}" as printable PDF.`);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Export Lesson
                          </button>
                        )}
                        {lesson.pdfTitle && (
                          isOnline ? (
                            <a
                              href={`/api/lessons/${lesson._id}/pdf`}
                              download
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {lesson.pdfTitle}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                exportIndividualLessonPdf(lesson);
                                showSuccess(`Exported offline study guide "${lesson.title}".`);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {lesson.pdfTitle} (PDF)
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {openVideoId === lesson._id && (
                      <div className="pt-2">
                        <VideoLessonPlayer
                          title={lesson.title}
                          language={lesson.language}
                          level={lesson.level}
                          skillType={lesson.skillType}
                          summary={lesson.summary}
                          content={lesson.content}
                          examples={lesson.examples}
                          videoUrl={lesson.videoUrl}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
