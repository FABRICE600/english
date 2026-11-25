import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, Film, Play, Search } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { LearnSubNav } from '../components/LearnSubNav.tsx';
import { VideoLessonPlayer } from '../components/VideoLessonPlayer.tsx';
import type { CourseLevel, Lesson, PageRoute } from '../types.ts';

interface VideoLibraryPageProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
}

export function VideoLibraryPage({ currentRoute, onNavigate }: VideoLibraryPageProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'all' | 'english' | 'french'>('all');
  const [level, setLevel] = useState<'all' | CourseLevel>('all');
  const [search, setSearch] = useState('');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ lessons: Lesson[] }>('/lessons', {
        params: { language, level },
      });
      const safeLessons = Array.isArray(res.data?.lessons) ? res.data.lessons : [];
      setLessons(safeLessons);
      setActiveLesson((prev) => {
        if (prev && safeLessons.some((l) => l._id === prev._id)) return prev;
        return safeLessons[0] || null;
      });
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [language, level, showError]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const filtered = (Array.isArray(lessons) ? lessons : []).filter((l) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      l.title.toLowerCase().includes(term) ||
      l.skillType.toLowerCase().includes(term) ||
      (l.courseTitle || '').toLowerCase().includes(term)
    );
  });

  const handleMarkComplete = async (lessonId: string) => {
    if (!user || user.role !== 'student') {
      showError('Sign in as a student to mark video lessons completed.');
      return;
    }
    try {
      await api.post(`/lessons/${lessonId}/complete`);
      showSuccess('Video lesson marked as completed.');
      setLessons((prev) => prev.map((l) => (l._id === lessonId ? { ...l, completed: true } : l)));
      setActiveLesson((prev) => (prev && prev._id === lessonId ? { ...prev, completed: true } : prev));
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-14rem)]">
      <LearnSubNav currentRoute={currentRoute} onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Bilingual Video Studio
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              English &amp; French Video Lessons
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Watch narrated lessons with synchronized English and French voiceovers, phonetic slides, adjustable playback speeds, and downloadable study sheets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
              {(['all', 'english', 'french'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                    language === lang
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'all' ? 'All Languages' : lang}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                    level === lvl
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lvl === 'all' ? 'All Levels' : lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Active Video Theater */}
            <div className="lg:col-span-8 space-y-5">
              {activeLesson ? (
                <>
                  <VideoLessonPlayer
                    title={activeLesson.title}
                    language={activeLesson.language}
                    level={activeLesson.level}
                    skillType={activeLesson.skillType}
                    summary={activeLesson.summary}
                    content={activeLesson.content}
                    examples={activeLesson.examples}
                    videoUrl={activeLesson.videoUrl}
                  />

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {activeLesson.language} · {activeLesson.level} · {activeLesson.skillType} · {activeLesson.courseTitle}
                        </p>
                        <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                          {activeLesson.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMarkComplete(activeLesson._id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shrink-0 ${
                          activeLesson.completed
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-700 text-white hover:bg-blue-800'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {activeLesson.completed ? 'Completed' : 'Mark Video Complete'}
                      </button>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeLesson.content}
                    </p>

                    {activeLesson.pdfTitle && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Companion PDF Study Material: {activeLesson.pdfTitle}
                        </span>
                        <a
                          href={`/api/lessons/${activeLesson._id}/pdf`}
                          download
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Guide
                        </a>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-500">
                  No video lessons matched your filter.
                </div>
              )}
            </div>

            {/* Video Playlist Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter video lessons..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 max-h-[640px] overflow-y-auto">
                <div className="px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950">
                  <span className="inline-flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                    Video Playlist
                  </span>
                  <span className="font-mono tabular-nums">{filtered.length} videos</span>
                </div>

                {filtered.map((lesson) => {
                  const isActive = activeLesson?._id === lesson._id;
                  return (
                    <button
                      key={lesson._id}
                      type="button"
                      onClick={() => setActiveLesson(lesson)}
                      className={`w-full p-4 text-left transition-colors flex items-start justify-between gap-3 ${
                        isActive
                          ? 'bg-blue-50/80 dark:bg-blue-950/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                          {lesson.language} · {lesson.level} · {lesson.skillType}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 line-clamp-2">
                          {lesson.title}
                        </p>
                      </div>
                      <span className="mt-1 shrink-0 text-blue-700 dark:text-blue-400">
                        {lesson.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
