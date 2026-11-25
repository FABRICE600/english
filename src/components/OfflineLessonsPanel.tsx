import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Download,
  HardDriveDownload,
  Trash2,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from './OfflineIndicator.tsx';
import {
  getOfflineLessons,
  removeOfflineLesson,
  type OfflineLessonRecord,
} from '../utils/offlineLessons.ts';
import { exportIndividualLessonPdf } from '../utils/pdfExport.ts';
import { speakPhrase } from '../utils/speech.ts';
import type { PageRoute } from '../types.ts';

interface OfflineLessonsPanelProps {
  onNavigate: (route: PageRoute) => void;
}

export function OfflineLessonsPanel({ onNavigate }: OfflineLessonsPanelProps) {
  const isOnline = useOnlineStatus();
  const [lessons, setLessons] = useState<OfflineLessonRecord[]>([]);
  const [filterSkill, setFilterSkill] = useState<'all' | 'vocabulary' | 'grammar'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCache = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getOfflineLessons();
      setLessons(
        items.filter((item) => item.skillType === 'vocabulary' || item.skillType === 'grammar')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCache();
  }, [refreshCache]);

  const handleRemove = async (lessonId: string) => {
    await removeOfflineLesson(lessonId);
    setLessons((prev) => prev.filter((item) => item._id !== lessonId));
  };

  const visibleLessons = lessons.filter((item) =>
    filterSkill === 'all' ? true : item.skillType === filterSkill
  );

  return (
    <section
      aria-labelledby="offline-library-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HardDriveDownload className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="offline-library-heading"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Offline Vocabulary &amp; Grammar Library
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                {isOnline ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                )}
                {isOnline ? 'Connected · Service Worker Ready' : 'Offline Mode Active'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {lessons.length} cached {lessons.length === 1 ? 'lesson' : 'lessons'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(['all', 'vocabulary', 'grammar'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterSkill(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                  filterSkill === tab
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/vocabulary')}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Vocabulary Lab
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/grammar')}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Grammar Lab
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
          Checking Service Worker Cache Storage...
        </p>
      ) : visibleLessons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No {filterSkill === 'all' ? 'vocabulary or grammar' : filterSkill} lessons downloaded for offline access yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Open the Vocabulary or Grammar studio while online and click &ldquo;Save Offline&rdquo; on any lesson card to store its study notes, examples, and worksheet in your browser cache.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('/vocabulary')}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Browse Vocabulary Lessons
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/grammar')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Browse Grammar Lessons
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleLessons.map((lesson) => {
            const isExpanded = expandedId === lesson._id;
            return (
              <div
                key={lesson._id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                      {lesson.language} · {lesson.skillType} · {lesson.level}
                    </p>
                    <h3 className="mt-0.5 font-display text-base font-bold text-slate-900 dark:text-white truncate">
                      {lesson.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(lesson._id)}
                    aria-label={`Remove ${lesson.title} from offline storage`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-900 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {lesson.summary || lesson.content}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : lesson._id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {isExpanded ? 'Hide Notes' : 'Read Offline'}
                    </button>
                    <button
                      type="button"
                      onClick={() => speakPhrase(lesson.content, lesson.language, 0.95)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Listen
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportIndividualLessonPdf(lesson)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export PDF
                  </button>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <p className="leading-relaxed whitespace-pre-line">{lesson.content}</p>
                    {Array.isArray(lesson.examples) && lesson.examples.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="font-semibold text-slate-900 dark:text-white">Examples:</p>
                        {lesson.examples.map((ex, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
                          >
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {ex.phrase}{' '}
                              <span className="font-mono font-normal text-blue-700 dark:text-blue-400">
                                {ex.phonetic}
                              </span>
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">{ex.translation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
