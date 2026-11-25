import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { LearnSubNav } from '../components/LearnSubNav.tsx';
import type { PageRoute, Question, Quiz, QuizResult } from '../types.ts';

interface ExamsPageProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
}

export function ExamsPage({ currentRoute, onNavigate }: ExamsPageProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [languageFilter, setLanguageFilter] = useState<'all' | 'english' | 'french'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'true' | 'false'>('all');
  const [loading, setLoading] = useState(true);

  // Active exam runner state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [matchingSelections, setMatchingSelections] = useState<Record<string, Record<string, string>>>({});
  const [sentenceSelections, setSentenceSelections] = useState<Record<string, string[]>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<QuizResult | null>(null);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ quizzes: Quiz[] }>('/quizzes', {
        params: {
          language: languageFilter,
          isExam: typeFilter === 'all' ? undefined : typeFilter,
        },
      });
      setQuizzes(Array.isArray(res.data?.quizzes) ? res.data.quizzes : []);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuizzes();
  }, [languageFilter, typeFilter]);

  useEffect(() => {
    if (!activeQuiz || examResult || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, examResult, secondsLeft]);

  const startQuiz = async (quiz: Quiz) => {
    if (!user) {
      showError('Please sign in to take quizzes and record your examination score.');
      onNavigate('/login');
      return;
    }
    try {
      const res = await api.get<{ quiz: Quiz; questions: Question[] }>(`/quizzes/${quiz._id}`);
      setActiveQuiz(res.data.quiz);
      setQuestions(Array.isArray(res.data?.questions) ? res.data.questions : []);
      setAnswers({});
      setMatchingSelections({});
      setSentenceSelections({});
      setExamResult(null);
      setSecondsLeft((res.data.quiz?.timeLimitMinutes || 15) * 60);
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const handleMatchingChange = (questionId: string, leftKey: string, rightVal: string) => {
    setMatchingSelections((prev) => {
      const nextMap = { ...(prev[questionId] || {}), [leftKey]: rightVal };
      const encoded = Object.entries(nextMap)
        .filter(([, v]) => Boolean(v))
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
      setAnswers((ans) => ({ ...ans, [questionId]: encoded }));
      return { ...prev, [questionId]: nextMap };
    });
  };

  const handleAddWord = (questionId: string, word: string) => {
    setSentenceSelections((prev) => {
      const current = prev[questionId] || [];
      const next = [...current, word];
      setAnswers((ans) => ({ ...ans, [questionId]: next.join(' ') }));
      return { ...prev, [questionId]: next };
    });
  };

  const handleRemoveWord = (questionId: string, index: number) => {
    setSentenceSelections((prev) => {
      const current = prev[questionId] || [];
      const next = current.filter((_, i) => i !== index);
      setAnswers((ans) => ({ ...ans, [questionId]: next.join(' ') }));
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ result: QuizResult }>(`/quizzes/${activeQuiz._id}/submit`, {
        answers,
      });
      setExamResult(res.data.result);
      showSuccess(`Submitted! You scored ${res.data.result.percentage}%.`);
      void loadQuizzes();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (activeQuiz) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-14rem)]">
        <LearnSubNav currentRoute={currentRoute} onNavigate={onNavigate} />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveQuiz(null);
                setExamResult(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Examinations
            </button>

            {!examResult && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 font-mono text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                <Clock className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                {formatTimer(secondsLeft)}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              {activeQuiz.language} · {activeQuiz.level} · {activeQuiz.isExam ? 'Online Examination' : 'Practice Quiz'} · Passing Score {activeQuiz.passingScore}%
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {activeQuiz.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{activeQuiz.description}</p>
          </div>

          {examResult ? (
            <div className="space-y-6">
              <div
                className={`rounded-xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  examResult.passed
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50'
                    : 'border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/50'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                    {examResult.passed ? 'Passed' : 'Review Recommended'}
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {examResult.percentage}% ({examResult.score}/{examResult.totalPoints} pts)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => startQuiz(activeQuiz)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 self-start sm:self-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Answer Review &amp; Explanations
                </h3>
                {examResult.answers.map((rev, idx) => (
                  <div
                    key={rev.questionId}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {idx + 1}. {rev.prompt}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                          rev.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {rev.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {rev.pointsEarned}/{rev.pointsPossible}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Your answer: <span className="font-semibold">{rev.submittedAnswer}</span> · Correct answer:{' '}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{rev.correctAnswer}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                      Explanation: {rev.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {questions.map((qn, idx) => {
                const chosenWords = sentenceSelections[qn._id] || [];
                const remainingWords = [...qn.wordBank];
                for (const w of chosenWords) {
                  const found = remainingWords.indexOf(w);
                  if (found !== -1) remainingWords.splice(found, 1);
                }

                return (
                  <div
                    key={qn._id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        {idx + 1}. {qn.prompt}
                      </h2>
                      <span className="font-mono text-xs text-slate-500 shrink-0 tabular-nums">
                        {qn.points} pts
                      </span>
                    </div>

                    {qn.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {qn.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [qn._id]: opt }))}
                            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                              answers[qn._id] === opt
                                ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-semibold'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {qn.type === 'fill_blank' && (
                      <input
                        type="text"
                        value={answers[qn._id] || ''}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [qn._id]: e.target.value }))}
                        placeholder="Type your answer..."
                        className="w-full sm:max-w-md rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                      />
                    )}

                    {qn.type === 'matching' && (
                      <div className="space-y-3">
                        {qn.pairs.map((pair) => {
                          const rightOptions = qn.pairs.map((p) => p.right);
                          return (
                            <div key={pair.left} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium">
                                {pair.left}
                              </div>
                              <select
                                value={matchingSelections[qn._id]?.[pair.left] || ''}
                                onChange={(e) => handleMatchingChange(qn._id, pair.left, e.target.value)}
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                              >
                                <option value="">Select matching definition...</option>
                                {rightOptions.map((rOpt) => (
                                  <option key={rOpt} value={rOpt}>
                                    {rOpt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {qn.type === 'sentence_build' && (
                      <div className="space-y-3">
                        <div className="min-h-[48px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 flex flex-wrap gap-2">
                          {chosenWords.length === 0 ? (
                            <span className="text-xs text-slate-400">Click words below in the correct order...</span>
                          ) : (
                            chosenWords.map((word, wIdx) => (
                              <button
                                key={`${word}-${wIdx}`}
                                type="button"
                                onClick={() => handleRemoveWord(qn._id, wIdx)}
                                className="rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-800"
                              >
                                {word} ×
                              </button>
                            ))
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {remainingWords.map((word, wIdx) => (
                            <button
                              key={`${word}-${wIdx}`}
                              type="button"
                              onClick={() => handleAddWord(qn._id, word)}
                              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {word}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitQuiz}
                  className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Grading...' : 'Submit & Calculate Score'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-14rem)]">
      <LearnSubNav currentRoute={currentRoute} onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Online Assessment Center
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Quizzes &amp; Online Examinations
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Test multiple-choice, fill-in-the-blank, word matching, and sentence construction with automatic grading and detailed explanations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
              {(['all', 'english', 'french'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguageFilter(lang)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                    languageFilter === lang
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'all' ? 'All Languages' : lang}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
              {(
                [
                  ['all', 'All'],
                  ['true', 'Official Exams'],
                  ['false', 'Practice Quizzes'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTypeFilter(val)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                    typeFilter === val
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {quiz.language} · {quiz.level} · {quiz.isExam ? 'Timed Examination' : 'Practice Quiz'} · {quiz.timeLimitMinutes} min
                  </p>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {quiz.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {quiz.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {quiz.questionCount} questions · {quiz.totalPoints} pts
                    {quiz.latestResult && (
                      <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                        Last: {quiz.latestResult.percentage}%
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startQuiz(quiz)}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
                  >
                    {quiz.isExam ? 'Start Exam' : 'Start Quiz'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
