import { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  Globe,
  GraduationCap,
  Lock,
  PenTool,
  Share2,
  Trophy,
  Zap,
} from 'lucide-react';

export type BadgeCategory = 'milestone' | 'consistency' | 'quiz_streak' | 'mastery';
export type BadgeIcon =
  | 'book'
  | 'graduation'
  | 'globe'
  | 'flame'
  | 'award'
  | 'zap'
  | 'trophy'
  | 'pen';

export interface StudentBadgeItem {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  icon: BadgeIcon;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
  earnedAt: string | null;
}

export interface QuizScoreStreakData {
  currentHighScoreStreak: number;
  bestHighScoreStreak: number;
  threshold: number;
}

interface BadgesShowcaseProps {
  badges: StudentBadgeItem[];
  quizScoreStreak: QuizScoreStreakData;
  onShare?: () => void;
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  milestone: 'Course Milestone',
  consistency: 'Study Streak',
  quiz_streak: 'Quiz Streak',
  mastery: 'Assessment Mastery',
};

function renderBadgeIcon(icon: BadgeIcon, className: string) {
  switch (icon) {
    case 'book':
      return <BookOpen className={className} />;
    case 'graduation':
      return <GraduationCap className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'pen':
      return <PenTool className={className} />;
    case 'award':
    default:
      return <Award className={className} />;
  }
}

export function BadgesShowcase({ badges, quizScoreStreak, onShare }: BadgesShowcaseProps) {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  const earnedCount = badges.filter((b) => b.earned).length;
  const filteredBadges = badges.filter((b) => {
    if (filter === 'earned') return b.earned;
    if (filter === 'locked') return !b.earned;
    return true;
  });

  return (
    <section
      aria-labelledby="badges-showcase-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            <h2
              id="badges-showcase-heading"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Achievement Badges &amp; Quiz Score Streak
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Unlock digital credentials by completing course milestones, daily streaks, and consecutive high-scoring quizzes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
            <span className="font-bold text-blue-700 dark:text-blue-400">
              {earnedCount}/{badges.length}
            </span>{' '}
            earned · Quiz Streak ({quizScoreStreak.threshold}%+):{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {quizScoreStreak.currentHighScoreStreak}
            </span>{' '}
            (Best: {quizScoreStreak.bestHighScoreStreak})
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'earned', label: 'Earned' },
                { id: 'locked', label: 'In Progress' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Summary
            </button>
          )}
        </div>
      </div>

      {filteredBadges.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {filter === 'earned'
            ? 'No badges unlocked yet. Complete your first lesson or quiz to earn your first badge.'
            : 'Congratulations — you have earned every available badge!'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => {
            const pct =
              badge.progressTarget > 0
                ? Math.min(100, Math.round((badge.progressCurrent / badge.progressTarget) * 100))
                : 0;

            return (
              <article
                key={badge.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-4 transition-colors ${
                  badge.earned
                    ? 'border-blue-200 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center border shrink-0 ${
                        badge.earned
                          ? 'bg-blue-700 dark:bg-blue-600 border-blue-700 dark:border-blue-500 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {renderBadgeIcon(badge.icon, 'h-5 w-5')}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        badge.earned
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {badge.earned ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Earned
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          Locked
                        </>
                      )}
                    </span>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                      {CATEGORY_LABELS[badge.category]}
                    </p>
                    <h3 className="mt-0.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                      {badge.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.earned
                          ? 'bg-emerald-600 dark:bg-emerald-400'
                          : 'bg-blue-700 dark:bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>{badge.progressLabel}</span>
                    {badge.earned && badge.earnedAt && (
                      <span>{new Date(badge.earnedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
