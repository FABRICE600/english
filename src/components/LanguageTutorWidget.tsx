import React, { useEffect, useRef, useState } from 'react';
import {
  GraduationCap,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Volume2,
  X,
} from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { speakPhrase } from '../utils/speech.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  language: 'english' | 'french' | 'both';
}

const QUICK_PROMPTS: Array<{
  label: string;
  question: string;
  language: 'english' | 'french' | 'both';
}> = [
  {
    label: 'Passé Composé vs. Imparfait',
    question: 'When should I use Passé Composé instead of Imparfait in French? Give 2 short examples.',
    language: 'french',
  },
  {
    label: 'Present Perfect vs. Past Simple',
    question: 'Explain the difference between Present Perfect and Past Simple in English with examples.',
    language: 'english',
  },
  {
    label: 'French Subjunctive Triggers',
    question: 'What are the most common French expressions that require the subjunctive mood?',
    language: 'french',
  },
  {
    label: 'Business English Collocations',
    question: 'Share 5 useful workplace vocabulary collocations in English with short example sentences.',
    language: 'english',
  },
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  language: 'both',
  text: 'Bonjour and hello! Ask me any question about English or French grammar, verb tenses, vocabulary nuances, or example sentences.',
};

export function LanguageTutorWidget() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<'both' | 'english' | 'french'>('both');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const sendMessage = async (
    rawText: string,
    overrideLanguage?: 'both' | 'english' | 'french'
  ) => {
    const text = rawText.trim();
    if (!text || sending) return;

    const activeLang = overrideLanguage || language;
    if (overrideLanguage) setLanguage(overrideLanguage);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      language: activeLang,
    };

    const conversationHistory = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const res = await api.post<{ reply: string }>('/tutor/chat', {
        message: text,
        language: activeLang,
        history: conversationHistory,
      });

      const replyText = res.data?.reply?.trim();
      if (!replyText) {
        throw new Error('Language Tutor returned an empty response.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: replyText,
          language: activeLang,
        },
      ]);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not reach the Language Tutor. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setInput('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="Language Tutor Chat"
          className="w-[calc(100vw-2.5rem)] sm:w-[400px] max-h-[75vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-blue-700 dark:bg-blue-800 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold leading-tight truncate">
                  Language Tutor
                </h2>
                <p className="text-[11px] text-blue-100 truncate">
                  English &amp; French Grammar &amp; Vocabulary
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                title="Reset conversation"
                aria-label="Reset tutor conversation"
                className="p-1.5 rounded-lg text-blue-100 hover:bg-white/15 hover:text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close tutor"
                aria-label="Close Language Tutor"
                className="p-1.5 rounded-lg text-blue-100 hover:bg-white/15 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Language Focus Switcher */}
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Tutor Focus:
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800">
              {(['both', 'english', 'french'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-colors ${
                    language === lang
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[380px] bg-white dark:bg-slate-900"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {!isUser && msg.id !== 'welcome' && (
                    <button
                      type="button"
                      onClick={() =>
                        speakPhrase(
                          msg.text,
                          msg.language === 'french' ? 'french' : 'english',
                          0.95
                        )
                      }
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400"
                    >
                      <Volume2 className="h-3 w-3" />
                      Listen
                    </button>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="flex items-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-700 dark:text-blue-400" />
                  Tutor is preparing an explanation...
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 p-3 text-xs text-rose-800 dark:text-rose-200">
                {error}
              </div>
            )}
          </div>

          {/* Starter Prompts (shown when conversation hasn't started yet) */}
          {messages.length <= 1 && !sending && (
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Suggested Questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    type="button"
                    onClick={() => void sendMessage(qp.question, qp.language)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-left"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder={
                language === 'french'
                  ? 'Ask about French grammar or vocabulary...'
                  : language === 'english'
                    ? 'Ask about English grammar or vocabulary...'
                    : 'Ask about English or French grammar...'
              }
              className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send question to Language Tutor"
              className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? 'Close Language Tutor chat' : 'Open Language Tutor chat'}
        className="inline-flex items-center gap-2 rounded-full bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        <span>{open ? 'Hide Tutor' : 'Language Tutor'}</span>
      </button>
    </div>
  );
}
