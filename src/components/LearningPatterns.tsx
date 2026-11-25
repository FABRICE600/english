import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Clock, Target } from 'lucide-react';
import type { PageRoute } from '../types.ts';

export interface LearningActivityEvent {
  timestamp: string;
  percentage: number;
  title: string;
  language: 'english' | 'french';
  source: 'quiz' | 'assignment';
}

export interface SkillPatternMetric {
  skill: string;
  accuracy: number;
  errorRate: number;
  attempts: number;
  incorrectCount: number;
  status: 'Needs Focus' | 'Developing' | 'Strong';
  route: '/grammar' | '/vocabulary' | '/listening' | '/reading' | '/writing' | '/speaking';
  recommendation: string;
}

export interface LearningPatternsData {
  hasQuizHistory: boolean;
  totalAssessmentsAnalyzed: number;
  totalQuestionsAnalyzed: number;
  activityEvents: LearningActivityEvent[];
  skillBreakdown: SkillPatternMetric[];
  mostChallengingSkill: SkillPatternMetric | null;
}

interface LearningPatternsProps {
  patterns: LearningPatternsData;
  onNavigate: (route: PageRoute) => void;
}

interface TimeBucketDef {
  id: string;
  label: string;
  rangeLabel: string;
  startHour: number;
  endHour: number;
}

const TIME_WINDOWS: TimeBucketDef[] = [
  { id: '06-09', label: '06–09h', rangeLabel: '06:00 – 09:00', startHour: 6, endHour: 9 },
  { id: '09-12', label: '09–12h', rangeLabel: '09:00 – 12:00', startHour: 9, endHour: 12 },
  { id: '12-15', label: '12–15h', rangeLabel: '12:00 – 15:00', startHour: 12, endHour: 15 },
  { id: '15-18', label: '15–18h', rangeLabel: '15:00 – 18:00', startHour: 15, endHour: 18 },
  { id: '18-21', label: '18–21h', rangeLabel: '18:00 – 21:00', startHour: 18, endHour: 21 },
  { id: '21-24', label: '21–24h', rangeLabel: '21:00 – 00:00', startHour: 21, endHour: 24 },
];

export function LearningPatterns({ patterns, onNavigate }: LearningPatternsProps) {
  const [langFilter, setLangFilter] = useState<'all' | 'english' | 'french'>('all');

  const filteredEvents = useMemo(
    () =>
      patterns.activityEvents.filter((ev) =>
        langFilter === 'all' ? true : ev.language === langFilter
      ),
    [patterns.activityEvents, langFilter]
  );

  const hourlyData = useMemo(() => {
    const lateNightEvents = filteredEvents.filter((ev) => {
      const hr = new Date(ev.timestamp).getHours();
      return !Number.isNaN(hr) && hr < 6;
    });

    const windows: TimeBucketDef[] =
      lateNightEvents.length > 0
        ? [{ id: '00-06', label: '00–06h', rangeLabel: '00:00 – 06:00', startHour: 0, endHour: 6 }, ...TIME_WINDOWS]
        : TIME_WINDOWS;

    return windows.map((win) => {
      const matches = filteredEvents.filter((ev) => {
        const hr = new Date(ev.timestamp).getHours();
        return !Number.isNaN(hr) && hr >= win.startHour && hr < win.endHour;
      });
      const sessions = matches.length;
      const avgScore =
        sessions > 0
          ? Math.round(matches.reduce((sum, m) => sum + m.percentage, 0) / sessions)
          : 0;

      return {
        window: win.label,
        rangeLabel: win.rangeLabel,
        avgScore,
        sessions,
      };
    });
  }, [filteredEvents]);

  const peakWindow = useMemo(() => {
    const active = hourlyData.filter((d) => d.sessions > 0);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => {
      // Rank peak productivity by score weighted with session volume
      const aWeight = a.avgScore + Math.min(a.sessions, 5) * 2;
      const bWeight = b.avgScore + Math.min(b.sessions, 5) * 2;
      if (bWeight !== aWeight) return bWeight - aWeight;
      return b.avgScore - a.avgScore;
    })[0];
  }, [hourlyData]);

  const challenging = patterns.mostChallengingSkill;

  const getSkillBarColor = (accuracy: number) => {
    if (accuracy < 75) return '#dc2626';
    if (accuracy < 88) return '#d97706';
    return '#1d4ed8';
  };

  return (
    <section
      aria-labelledby="learning-patterns-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Adaptive Study Insights ·{' '}
            <span className="font-mono tabular-nums">
              {patterns.totalAssessmentsAnalyzed} assessment{patterns.totalAssessmentsAnalyzed === 1 ? '' : 's'}
            </span>{' '}
            ·{' '}
            <span className="font-mono tabular-nums">
              {patterns.totalQuestionsAnalyzed} question{patterns.totalQuestionsAnalyzed === 1 ? '' : 's'} analyzed
            </span>
          </p>
          <h2
            id="learning-patterns-heading"
            className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white"
          >
            Learning Patterns &amp; Focus Analysis
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Tracks your highest-performing study hours and highlights skill areas needing targeted review.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start md:self-auto">
          {(['all', 'english', 'french'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setLangFilter(filterKey)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                langFilter === filterKey
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {filterKey === 'all' ? 'All Tracks' : filterKey}
            </button>
          ))}
        </div>
      </div>

      {!patterns.hasQuizHistory ? (
        <div className="py-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No completed quiz history yet to chart your study rhythm.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Complete a practice quiz or timed examination to unlock peak productivity hour tracking and question-level skill diagnostics.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/exams')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            Start a Practice Quiz
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Key Takeaways Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                  Peak Productivity Window
                </p>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {peakWindow ? peakWindow.rangeLabel : 'No sessions in filter'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {peakWindow
                    ? `Highest quiz focus (${peakWindow.avgScore}% avg across ${peakWindow.sessions} session${peakWindow.sessions === 1 ? '' : 's'})`
                    : 'Switch to All Tracks to inspect overall peak study hours.'}
                </p>
              </div>
              {peakWindow && (
                <span className="font-mono text-xl font-bold text-blue-700 dark:text-blue-400 tabular-nums shrink-0">
                  {peakWindow.avgScore}%
                </span>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  Priority Skill to Strengthen
                </p>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {challenging ? challenging.skill : 'Balanced Performance'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {challenging
                    ? challenging.recommendation
                    : 'All attempted skill domains are performing consistently well.'}
                </p>
              </div>
              {challenging && (
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`font-mono text-xl font-bold tabular-nums ${
                      challenging.accuracy < 75
                        ? 'text-red-600 dark:text-red-400'
                        : challenging.accuracy < 88
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {challenging.accuracy}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate(challenging.route)}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                  >
                    Practice →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Synchronized Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
            {/* Peak Productivity Hours Chart */}
            <div className="lg:col-span-6 space-y-3">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Quiz Accuracy &amp; Volume by Time of Day
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bars show average quiz score (%) per 3-hour window; line tracks completed assessments.
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={hourlyData}
                    margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                    <XAxis dataKey="window" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                      hide
                    />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'avgScore'
                          ? [`${value ?? 0}%`, 'Avg Score']
                          : [`${value ?? 0}`, 'Assessments']
                      }
                      labelFormatter={(_label, payload) =>
                        payload?.[0]?.payload?.rangeLabel || String(_label ?? '')
                      }
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="avgScore"
                      name="avgScore"
                      radius={[4, 4, 0, 0]}
                    >
                      {hourlyData.map((entry) => (
                        <Cell
                          key={entry.window}
                          fill={
                            peakWindow && entry.window === peakWindow.window
                              ? '#1d4ed8'
                              : entry.sessions > 0
                                ? '#0284c7'
                                : '#cbd5e1'
                          }
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sessions"
                      name="sessions"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#0f172a' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Most Challenging Skill Areas Chart */}
            <div className="lg:col-span-6 space-y-3">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Skill Accuracy &amp; Challenge Ranking
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ordered from lowest accuracy (most challenging) to strongest based on historical responses.
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={patterns.skillBreakdown}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={120}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <Tooltip
                      formatter={(value) => [`${value ?? 0}%`, 'Accuracy']}
                    />
                    <Bar dataKey="accuracy" name="Accuracy (%)" radius={[0, 4, 4, 0]}>
                      {patterns.skillBreakdown.map((item) => (
                        <Cell key={item.skill} fill={getSkillBarColor(item.accuracy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Skill Action Breakdown Table */}
          {patterns.skillBreakdown.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {patterns.skillBreakdown.map((item) => (
                <div
                  key={item.skill}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {item.skill}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span
                        className={`font-semibold ${
                          item.status === 'Needs Focus'
                            ? 'text-red-600 dark:text-red-400'
                            : item.status === 'Developing'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.status}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {item.attempts} sample{item.attempts === 1 ? '' : 's'} / {item.incorrectCount} missed
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.recommendation}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {item.accuracy}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.route)}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                      Open Module →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
