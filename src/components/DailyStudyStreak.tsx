import { CalendarCheck2, Check, Flame, Share2, Sparkles } from 'lucide-react';
import type { PageRoute } from '../types.ts';

export interface StreakDayItem {
  date: string;
  label: string;
  active: boolean;
  isToday: boolean;
}

export interface StudyStreakData {
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  activeDaysTotal: number;
  recentDays: StreakDayItem[];
}

interface DailyStudyStreakProps {
  streak: StudyStreakData;
  onNavigate: (route: PageRoute) => void;
  onShare?: () => void;
}

export function DailyStudyStreak({ streak, onNavigate, onShare }: DailyStudyStreakProps) {
  const hasActiveStreak = streak.currentStreak > 0;

  return (
    <section
      aria-labelledby="daily-study-streak-heading"
      className="h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${
              hasActiveStreak
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Consistency Tracker · Daily Study Streak
            </p>
            <div className="mt-1 flex items-baseline gap-2.5">
              <h2
                id="daily-study-streak-heading"
                className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums"
              >
                {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                consecutive streak
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {streak.completedToday
                ? 'Today’s goal is complete — you finished a lesson or quiz today.'
                : 'Complete at least one lesson or quiz today to extend your consecutive streak.'}
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
            Best: {streak.longestStreak} {streak.longestStreak === 1 ? 'day' : 'days'}
          </span>
          <span className="font-mono tabular-nums">
            {streak.activeDaysTotal} active study day{streak.activeDaysTotal === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* 7-Day Activity Strip */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <CalendarCheck2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
            Last 7 Days Activity
          </span>
          <span
            className={`font-medium ${
              streak.completedToday
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {streak.completedToday ? 'Today secured' : 'Today pending'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {streak.recentDays.map((day) => (
            <div
              key={day.date}
              title={`${day.date} — ${day.active ? 'Lesson or quiz completed' : 'No completed lesson or quiz'}`}
              aria-label={`${day.label} ${day.date}: ${day.active ? 'Completed' : 'Inactive'}`}
              className={`rounded-lg border px-2 py-2.5 flex flex-col items-center justify-center gap-1.5 transition-colors ${
                day.active
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200'
                  : day.isToday
                    ? 'border-amber-300 dark:border-amber-700 border-dashed bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                {day.isToday ? 'Today' : day.label}
              </span>
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono ${
                  day.active
                    ? 'bg-blue-700 dark:bg-blue-500 text-white'
                    : day.isToday
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                }`}
              >
                {day.active ? <Check className="h-3.5 w-3.5" /> : day.date.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
          Lessons and quizzes both count toward your daily streak.
        </span>
        <div className="flex items-center gap-2">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('/courses')}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Study Lesson
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/exams')}
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
          >
            Take Quiz
          </button>
        </div>
      </div>
    </section>
  );
}
