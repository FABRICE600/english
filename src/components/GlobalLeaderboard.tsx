import { useState } from 'react';
import { Award, Flame, Medal, Trophy } from 'lucide-react';

export interface LeaderboardEntryItem {
  rank: number;
  studentId: string;
  studentName: string;
  preferredLanguage: 'english' | 'french' | 'both';
  cumulativeQuizScore: number;
  quizzesCompleted: number;
  avgQuizScore: number;
  currentStreak: number;
  longestStreak: number;
  completedLessons: number;
  rankingPoints: number;
  isCurrentUser: boolean;
}

export interface GlobalLeaderboardData {
  entries: LeaderboardEntryItem[];
  totalStudents: number;
  currentUserRank: number | null;
}

interface GlobalLeaderboardProps {
  leaderboard: GlobalLeaderboardData;
}

export function GlobalLeaderboard({ leaderboard }: GlobalLeaderboardProps) {
  const [sortBy, setSortBy] = useState<'combined' | 'quiz' | 'streak'>('combined');

  const entries = Array.isArray(leaderboard?.entries) ? leaderboard.entries : [];
  const sortedEntries = [...entries].sort((a, b) => {
    if (sortBy === 'quiz') {
      if (b.cumulativeQuizScore !== a.cumulativeQuizScore) {
        return b.cumulativeQuizScore - a.cumulativeQuizScore;
      }
      return b.avgQuizScore - a.avgQuizScore;
    }
    if (sortBy === 'streak') {
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      return b.longestStreak - a.longestStreak;
    }
    return a.rank - b.rank;
  });

  const renderRankBadge = (position: number) => {
    if (position === 1) {
      return (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Trophy className="h-3.5 w-3.5" />
        </span>
      );
    }
    if (position === 2) {
      return (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
          <Medal className="h-3.5 w-3.5" />
        </span>
      );
    }
    if (position === 3) {
      return (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
          <Award className="h-3.5 w-3.5" />
        </span>
      );
    }
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center font-mono text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
        #{position}
      </span>
    );
  };

  return (
    <section
      aria-labelledby="global-leaderboard-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            <h2
              id="global-leaderboard-heading"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Global Leaderboard
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ranked by cumulative quiz scores plus 15 leaderboard points per consecutive study streak day.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {leaderboard?.currentUserRank && (
            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
              Your Rank: #{leaderboard.currentUserRank} of {leaderboard.totalStudents}
            </span>
          )}

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'combined', label: 'Overall' },
                { id: 'quiz', label: 'Quiz Score' },
                { id: 'streak', label: 'Study Streak' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSortBy(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  sortBy === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No student rankings available yet. Complete a quiz or lesson to appear on the leaderboard.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-3">Rank</th>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3 text-right">Cumulative Quiz Score</th>
                <th className="py-2.5 px-3 text-right">Study Streak</th>
                <th className="py-2.5 px-3 text-right">Lessons</th>
                <th className="py-2.5 pl-3 text-right">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {sortedEntries.map((entry, idx) => {
                const displayRank = sortBy === 'combined' ? entry.rank : idx + 1;
                const trackLabel =
                  entry.preferredLanguage === 'both'
                    ? 'English & French'
                    : entry.preferredLanguage === 'french'
                      ? 'French Track'
                      : 'English Track';

                return (
                  <tr
                    key={entry.studentId}
                    className={
                      entry.isCurrentUser
                        ? 'bg-blue-50/70 dark:bg-blue-950/35'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {renderRankBadge(displayRank)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {entry.studentName}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                            · You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{trackLabel}</p>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                        {entry.cumulativeQuizScore}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {entry.quizzesCompleted} quiz{entry.quizzesCompleted === 1 ? '' : 'zes'} · {entry.avgQuizScore}% avg
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1 font-mono font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                        <Flame className="h-3.5 w-3.5" />
                        {entry.currentStreak}d
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Best {entry.longestStreak}d
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {entry.completedLessons}
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <span className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                        {entry.rankingPoints}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">pts</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
