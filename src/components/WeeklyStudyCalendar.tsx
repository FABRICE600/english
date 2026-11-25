import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useToast } from '../context/ToastContext.tsx';
import type { LanguageChoice, PageRoute, SkillType } from '../types.ts';

export type StudyDayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface StudySessionPlan {
  id: string;
  dayOfWeek: StudyDayOfWeek;
  language: LanguageChoice;
  skill: SkillType;
  startTime: string;
  durationMinutes: number;
  note: string;
  completed: boolean;
  createdAt: string;
}

interface WeeklyStudyCalendarProps {
  sessions: StudySessionPlan[];
  onChange: (nextSessions: StudySessionPlan[]) => void;
  onNavigate: (route: PageRoute) => void;
}

const DAYS: Array<{ key: StudyDayOfWeek; short: string; label: string; jsDay: number }> = [
  { key: 'mon', short: 'Mon', label: 'Monday', jsDay: 1 },
  { key: 'tue', short: 'Tue', label: 'Tuesday', jsDay: 2 },
  { key: 'wed', short: 'Wed', label: 'Wednesday', jsDay: 3 },
  { key: 'thu', short: 'Thu', label: 'Thursday', jsDay: 4 },
  { key: 'fri', short: 'Fri', label: 'Friday', jsDay: 5 },
  { key: 'sat', short: 'Sat', label: 'Saturday', jsDay: 6 },
  { key: 'sun', short: 'Sun', label: 'Sunday', jsDay: 0 },
];

const SKILLS: Array<{ value: SkillType; label: string; route: PageRoute }> = [
  { value: 'grammar', label: 'Grammar', route: '/grammar' },
  { value: 'vocabulary', label: 'Vocabulary', route: '/vocabulary' },
  { value: 'speaking', label: 'Speaking', route: '/speaking' },
  { value: 'listening', label: 'Listening', route: '/listening' },
  { value: 'reading', label: 'Reading', route: '/reading' },
  { value: 'writing', label: 'Writing', route: '/writing' },
  { value: 'pronunciation', label: 'Pronunciation', route: '/speaking' },
  { value: 'alphabet', label: 'Alphabet', route: '/english' },
];

const DURATION_PRESETS = [15, 30, 45, 60];

export function WeeklyStudyCalendar({
  sessions,
  onChange,
  onNavigate,
}: WeeklyStudyCalendarProps) {
  const { showError, showSuccess } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [langFilter, setLangFilter] = useState<'all' | LanguageChoice>('all');
  const [dayOfWeek, setDayOfWeek] = useState<StudyDayOfWeek>(() => {
    const jsToday = new Date().getDay();
    return DAYS.find((d) => d.jsDay === jsToday)?.key || 'mon';
  });
  const [language, setLanguage] = useState<LanguageChoice>('english');
  const [skill, setSkill] = useState<SkillType>('vocabulary');
  const [startTime, setStartTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const todayJs = new Date().getDay();

  const filteredSessions = useMemo(() => {
    return safeSessions.filter((s) => (langFilter === 'all' ? true : s.language === langFilter));
  }, [safeSessions, langFilter]);

  const stats = useMemo(() => {
    const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const completedCount = filteredSessions.filter((s) => s.completed).length;
    const englishMinutes = safeSessions
      .filter((s) => s.language === 'english')
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const frenchMinutes = safeSessions
      .filter((s) => s.language === 'french')
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const combinedMinutes = englishMinutes + frenchMinutes;

    const skillTotals = new Map<SkillType, number>();
    for (const item of filteredSessions) {
      skillTotals.set(item.skill, (skillTotals.get(item.skill) || 0) + item.durationMinutes);
    }
    const topSkills = Array.from(skillTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      totalCount: filteredSessions.length,
      completedCount,
      totalMinutes,
      englishMinutes,
      frenchMinutes,
      englishPct: combinedMinutes > 0 ? Math.round((englishMinutes / combinedMinutes) * 100) : 50,
      frenchPct: combinedMinutes > 0 ? Math.round((frenchMinutes / combinedMinutes) * 100) : 50,
      topSkills,
    };
  }, [filteredSessions, safeSessions]);

  const openForDay = (day: StudyDayOfWeek) => {
    setDayOfWeek(day);
    setShowForm(true);
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<{ studySchedule: StudySessionPlan[] }>(
        '/dashboard/study-schedule',
        {
          dayOfWeek,
          language,
          skill,
          startTime,
          durationMinutes,
          note,
        }
      );
      onChange(Array.isArray(res.data?.studySchedule) ? res.data.studySchedule : safeSessions);
      setNote('');
      setShowForm(false);
      showSuccess('Study session added to weekly calendar.');
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompleted = async (session: StudySessionPlan) => {
    setBusyId(session.id);
    try {
      const res = await api.patch<{ studySchedule: StudySessionPlan[] }>(
        `/dashboard/study-schedule/${session.id}`,
        { completed: !session.completed }
      );
      onChange(Array.isArray(res.data?.studySchedule) ? res.data.studySchedule : safeSessions);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setBusyId(sessionId);
    try {
      const res = await api.delete<{ studySchedule: StudySessionPlan[] }>(
        `/dashboard/study-schedule/${sessionId}`
      );
      onChange(Array.isArray(res.data?.studySchedule) ? res.data.studySchedule : safeSessions);
      showSuccess('Planned session removed.');
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const getSkillRoute = (skillName: SkillType, lang: LanguageChoice): PageRoute => {
    if (skillName === 'alphabet') return lang === 'french' ? '/french' : '/english';
    return SKILLS.find((s) => s.value === skillName)?.route || '/courses';
  };

  return (
    <section
      aria-labelledby="weekly-calendar-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="weekly-calendar-heading"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Weekly Study Calendar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Plan dedicated English and French skill sessions across Monday–Sunday ·{' '}
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                {stats.totalCount} {stats.totalCount === 1 ? 'session' : 'sessions'} · {stats.totalMinutes} min planned · {stats.completedCount} done
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(['all', 'english', 'french'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLangFilter(opt)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                  langFilter === opt
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {opt === 'all' ? 'All Languages' : opt}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Close Planner' : 'Schedule Session'}
          </button>
        </div>
      </div>

      {/* Inline Add Session Form */}
      {showForm && (
        <form
          onSubmit={handleAddSession}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as StudyDayOfWeek)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageChoice)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              >
                <option value="english">English</option>
                <option value="french">French</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Focus Skill
              </label>
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value as SkillType)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              >
                {SKILLS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Duration (min)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  required
                  className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  {DURATION_PRESETS.slice(0, 3).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2 py-1.5 text-[11px] font-mono rounded border transition-colors ${
                        durationMinutes === mins
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <input
              type="text"
              value={note}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional study objective (e.g., Irregular past participles or 15 flashcards)..."
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save to Calendar'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 7-Day Visual Schedule Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const isToday = day.jsDay === todayJs;
          const dayItems = filteredSessions
            .filter((s) => s.dayOfWeek === day.key)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const dayMinutes = dayItems.reduce((sum, s) => sum + s.durationMinutes, 0);

          return (
            <div
              key={day.key}
              className={`rounded-xl border p-3 flex flex-col justify-between min-h-[210px] transition-colors ${
                isToday
                  ? 'border-blue-400 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
              }`}
            >
              <div className="space-y-3">
                {/* Day Column Header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        {day.short}
                      </span>
                      {isToday && (
                        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                          · Today
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {dayMinutes} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openForDay(day.key)}
                    aria-label={`Add study session on ${day.label}`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Sessions Stack */}
                {dayItems.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    No sessions planned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map((item) => {
                      const isFrench = item.language === 'french';
                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg border p-2.5 space-y-1.5 transition-colors ${
                            item.completed
                              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              <Clock className="h-3 w-3" />
                              {item.startTime} · {item.durationMinutes}m
                            </span>
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => void handleToggleCompleted(item)}
                              aria-label={
                                item.completed
                                  ? 'Mark planned session incomplete'
                                  : 'Mark planned session complete'
                              }
                              className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50"
                            >
                              {item.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <div>
                            <p
                              className={`text-[11px] font-semibold capitalize ${
                                isFrench
                                  ? 'text-sky-700 dark:text-sky-400'
                                  : 'text-blue-700 dark:text-blue-400'
                              }`}
                            >
                              {item.language} · {item.skill}
                            </p>
                            {item.note && (
                              <p
                                className={`mt-0.5 text-[11px] leading-snug line-clamp-2 ${
                                  item.completed
                                    ? 'text-slate-500 dark:text-slate-400 line-through'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {item.note}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => onNavigate(getSkillRoute(item.skill, item.language))}
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline"
                            >
                              Practice
                              <ArrowUpRight className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => void handleDeleteSession(item.id)}
                              aria-label="Delete planned study session"
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Language & Skill Distribution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Weekly Language Split
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              English {stats.englishMinutes}m ({stats.englishPct}%) / French {stats.frenchMinutes}m ({stats.frenchPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div
              className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${stats.englishPct}%` }}
            />
            <div
              className="h-full bg-sky-500 dark:bg-sky-400 transition-all duration-300"
              style={{ width: `${stats.frenchPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Targeted Skill Allocation
          </p>
          {stats.topSkills.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add study sessions above to visualize skill allocation.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {stats.topSkills.map(([skillName, mins]) => (
                <span key={skillName} className="capitalize">
                  {skillName}:{' '}
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {mins}m
                  </strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
