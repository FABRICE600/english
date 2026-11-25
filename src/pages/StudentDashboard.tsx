import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bell, BookOpen, Check, ClipboardCheck, LogOut, Share2, UserCheck } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { DailyStudyStreak, type StudyStreakData } from '../components/DailyStudyStreak.tsx';
import {
  BadgesShowcase,
  type QuizScoreStreakData,
  type StudentBadgeItem,
} from '../components/BadgesShowcase.tsx';
import {
  GlobalLeaderboard,
  type GlobalLeaderboardData,
} from '../components/GlobalLeaderboard.tsx';
import {
  DailyGoalTracker,
  type DailyGoalProgressData,
} from '../components/DailyGoalTracker.tsx';
import {
  WeeklyStudyCalendar,
  type StudySessionPlan,
} from '../components/WeeklyStudyCalendar.tsx';
import { OfflineLessonsPanel } from '../components/OfflineLessonsPanel.tsx';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';
import { LanguageTutorWidget } from '../components/LanguageTutorWidget.tsx';
import {
  LearningPatterns,
  type LearningPatternsData,
} from '../components/LearningPatterns.tsx';
import { AccessibilityAuditPanel } from '../components/AccessibilityAuditPanel.tsx';
import { StudyBuddiesPanel } from '../components/StudyBuddiesPanel.tsx';
import { ShareProgressModal } from '../components/ShareProgressModal.tsx';
import type { Course, NotificationItem, PageRoute, QuizResult, Submission } from '../types.ts';

interface StudentDashboardProps {
  onNavigate: (route: PageRoute) => void;
  onSelectCourse: (courseId: string) => void;
}

interface LanguageTrackProgress {
  language: 'english' | 'french';
  enrolledCourses: number;
  totalTrackCourses: number;
  completedCourses: number;
  doneLessons: number;
  totalEnrolledLessons: number;
  totalTrackLessons: number;
  completionPercent: number;
}

interface StudentDashboardData {
  kpis: {
    enrolledCourses: number;
    completedLessons: number;
    avgQuizScore: number;
    studyMinutes: number;
    availableCourses: number;
    totalTeachers: number;
  };
  languageProgress: {
    english: LanguageTrackProgress;
    french: LanguageTrackProgress;
  };
  studyStreak: StudyStreakData;
  quizScoreStreak: QuizScoreStreakData;
  badges: StudentBadgeItem[];
  leaderboard: GlobalLeaderboardData;
  dailyGoal?: DailyGoalProgressData;
  learningPatterns?: LearningPatternsData;
  studySchedule?: StudySessionPlan[];
  enrolledCourses: Array<{
    _id: string;
    courseId: string;
    completionPercent: number;
    doneLessons: number;
    totalLessons: number;
    course?: Course;
  }>;
  results: QuizResult[];
  chartData: Array<{ label: string; english: number; french: number }>;
  recentActivities: Array<{ id: string; title: string; detail: string; date: string }>;
  notifications: NotificationItem[];
}

export function StudentDashboard({ onNavigate, onSelectCourse }: StudentDashboardProps) {
  const { user, logout } = useAuth();
  const { showError } = useToast();

  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseLangFilter, setCourseLangFilter] = useState<'all' | 'english' | 'french'>('all');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, subRes] = await Promise.all([
        api.get<StudentDashboardData>('/dashboard'),
        api.get<{ submissions: Submission[] }>('/assignments/submissions/all'),
      ]);
      setData(dashRes.data);
      setSubmissions(Array.isArray(subRes.data?.submissions) ? subRes.data.submissions : []);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
            }
          : prev
      );
    } catch {
      // ignore
    }
  };

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="h-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
      </div>
    );
  }

  const trackCards: Array<{
    key: 'english' | 'french';
    title: string;
    subtitle: string;
    route: PageRoute;
    barClass: string;
    accentClass: string;
    stats: LanguageTrackProgress;
  }> = [
    {
      key: 'english',
      title: 'English Courses Completion',
      subtitle: 'Grammar, business communication, and academic fluency tracks',
      route: '/english',
      barClass: 'bg-blue-700 dark:bg-blue-500',
      accentClass: 'text-blue-700 dark:text-blue-400',
      stats: data.languageProgress.english,
    },
    {
      key: 'french',
      title: 'French Courses Completion',
      subtitle: 'Pronunciation, conversation, and DELF/DALF preparation tracks',
      route: '/french',
      barClass: 'bg-sky-600 dark:bg-sky-400',
      accentClass: 'text-sky-700 dark:text-sky-400',
      stats: data.languageProgress.french,
    },
  ];

  const filteredEnrolledCourses = data.enrolledCourses.filter((item) =>
    courseLangFilter === 'all' ? true : item.course?.language === courseLangFilter
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-10 min-h-[calc(100vh-14rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Student Workspace · {user?.preferredLanguage === 'both' ? 'English & French' : user?.preferredLanguage}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {user?.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('/courses')}
              className="rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
            >
              Browse Courses
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/exams')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Take Examination
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/speaking')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Speaking Lab
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/writing')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Assignments
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 whitespace-nowrap"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Progress
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/profile')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                onNavigate('/');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
            <PWAInstallButton compact />
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Enrolled Courses', value: data.kpis.enrolledCourses },
            { label: 'Completed Lessons', value: data.kpis.completedLessons },
            { label: 'Average Quiz Score', value: `${data.kpis.avgQuizScore}%` },
            { label: 'Available Courses', value: data.kpis.availableCourses },
            { label: 'Certified Teachers', value: data.kpis.totalTeachers },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Daily Study Goal Tracker */}
        <DailyGoalTracker
          goal={
            data.dailyGoal || {
              type: 'minutes',
              target: 30,
              todayMinutes: 0,
              todayModules: 0,
              currentValue: 0,
              progressPercent: 0,
              goalMet: false,
              updatedAt: new Date().toISOString(),
            }
          }
          onUpdated={(nextGoal) =>
            setData((prev) => (prev ? { ...prev, dailyGoal: nextGoal } : prev))
          }
        />

        {/* Daily Study Streak & English/French Course Completion Progress */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          <div className="xl:col-span-5 flex flex-col">
            <DailyStudyStreak
              streak={data.studyStreak}
              onNavigate={onNavigate}
              onShare={() => setShareModalOpen(true)}
            />
          </div>

          <section
            aria-labelledby="language-completion-heading"
            className="xl:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
          >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2
                id="language-completion-heading"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                Course Completion Progress by Language
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live completion rate across your enrolled English and French curriculum lessons
              </p>
            </div>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {data.kpis.studyMinutes} min studied total
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trackCards.map((track) => {
              const { stats } = track;
              const pct = stats.completionPercent;
              const statusLabel =
                stats.enrolledCourses === 0
                  ? 'Not enrolled yet'
                  : pct === 100
                    ? 'Track completed'
                    : pct >= 50
                      ? 'On track'
                      : 'In progress';

              return (
                <div
                  key={track.key}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-xs font-semibold ${track.accentClass}`}>
                        {track.key === 'english' ? 'English Curriculum' : 'French Curriculum'} · {statusLabel}
                      </p>
                      <h3 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-white">
                        {track.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {track.subtitle}
                      </p>
                    </div>
                    <span className={`font-mono text-2xl font-bold tabular-nums ${track.accentClass}`}>
                      {pct}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-2">
                    <div
                      role="progressbar"
                      aria-label={`${track.title} completion rate`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${track.barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-mono tabular-nums">
                        {stats.enrolledCourses > 0
                          ? `${stats.doneLessons} / ${stats.totalEnrolledLessons} enrolled lessons completed`
                          : `0 / ${stats.totalTrackLessons} track lessons started`}
                      </span>
                      <span className="font-mono tabular-nums">
                        {stats.enrolledCourses}/{stats.totalTrackCourses} courses enrolled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {stats.completedCourses} completed course{stats.completedCourses === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(track.route)}
                      className={`text-xs font-semibold hover:underline ${track.accentClass}`}
                    >
                      {stats.enrolledCourses > 0 ? `Open ${track.key === 'english' ? 'English' : 'French'} Studio →` : `Explore ${track.key === 'english' ? 'English' : 'French'} Courses →`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>

        {/* Achievement Badges & High Quiz Score Streak */}
        <BadgesShowcase
          badges={data.badges}
          quizScoreStreak={data.quizScoreStreak}
          onShare={() => setShareModalOpen(true)}
        />

        {/* Progress Chart & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-1">
              English &amp; French Skill Mastery Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Performance breakdown across grammar, vocabulary, listening, speaking, reading, and writing
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="english" name="English (%)" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="french" name="French (%)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                Notifications
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {data.notifications.filter((n) => !n.read).length} unread
              </span>
            </div>

            {data.notifications.length === 0 ? (
              <p className="text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {data.notifications.map((n) => (
                  <div key={n._id} className="py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold ${n.read ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markRead(n._id)}
                          aria-label="Mark notification read"
                          className="text-blue-700 dark:text-blue-400 hover:underline text-[11px] shrink-0"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enrolled Courses & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                My Enrolled Courses
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  {(['all', 'english', 'french'] as const).map((langFilter) => (
                    <button
                      key={langFilter}
                      type="button"
                      onClick={() => setCourseLangFilter(langFilter)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                        courseLangFilter === langFilter
                          ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {langFilter}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/courses')}
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  + Enroll in More
                </button>
              </div>
            </div>

            {filteredEnrolledCourses.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-slate-500">
                  {data.enrolledCourses.length === 0
                    ? 'You have not enrolled in any courses yet.'
                    : `No enrolled ${courseLangFilter} courses yet.`}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('/courses')}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white"
                >
                  Explore Courses
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredEnrolledCourses.map((item) => {
                  const isFrench = item.course?.language === 'french';
                  return (
                    <div key={item._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          <span className={isFrench ? 'font-semibold text-sky-700 dark:text-sky-400' : 'font-semibold text-blue-700 dark:text-blue-400'}>
                            {item.course?.language}
                          </span>{' '}
                          · {item.course?.level} ·{' '}
                          <span className="font-mono tabular-nums">
                            {item.doneLessons}/{item.totalLessons} lessons
                          </span>
                        </p>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.course?.title}
                        </h3>
                        <div
                          role="progressbar"
                          aria-label={`${item.course?.title || 'Course'} completion`}
                          aria-valuenow={item.completionPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="h-2.5 w-full max-w-md rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFrench ? 'bg-sky-600 dark:bg-sky-400' : 'bg-blue-700 dark:bg-blue-500'
                            }`}
                            style={{ width: `${item.completionPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                          {item.completionPercent}%
                        </span>
                        {item.course && (
                          <button
                            type="button"
                            onClick={() => onSelectCourse(item.course!._id)}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              Quiz Results &amp; Submissions
            </h2>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.results.slice(0, 4).map((r) => (
                <div key={r._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.quizTitle}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {r.language} · {r.passed ? 'Passed' : 'Needs Review'}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                    {r.percentage}%
                  </span>
                </div>
              ))}
              {submissions.slice(0, 3).map((s) => (
                <div key={s._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {s.assignmentTitle || 'Writing Assignment'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      Status: {s.status === 'graded' ? `Graded (${s.score}/100)` : 'Pending Teacher Review'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Learning Patterns Analysis (Peak Productivity Hours & Challenging Skills) */}
        {data.learningPatterns && (
          <LearningPatterns patterns={data.learningPatterns} onNavigate={onNavigate} />
        )}

        {/* Global Leaderboard */}
        <GlobalLeaderboard
          leaderboard={
            data.leaderboard || {
              entries: [],
              totalStudents: 0,
              currentUserRank: null,
            }
          }
        />

        {/* Study Buddies Peer Groups & Discussion Forums */}
        <StudyBuddiesPanel />

        {/* Weekly Study Calendar */}
        <WeeklyStudyCalendar
          sessions={data.studySchedule || []}
          onChange={(nextSchedule) =>
            setData((prev) => (prev ? { ...prev, studySchedule: nextSchedule } : prev))
          }
          onNavigate={onNavigate}
        />

        {/* Offline Vocabulary & Grammar Library */}
        <OfflineLessonsPanel onNavigate={onNavigate} />

        {/* Live Accessibility Audit Tool */}
        <AccessibilityAuditPanel />
      </div>

      {/* Share Progress Summary Modal */}
      <ShareProgressModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        studentName={user?.name || 'LinguaLearn Student'}
        studyStreak={data.studyStreak}
        quizScoreStreak={data.quizScoreStreak}
        badges={data.badges}
        englishCompletion={data.languageProgress.english.completionPercent}
        frenchCompletion={data.languageProgress.french.completionPercent}
        completedLessons={data.kpis.completedLessons}
        avgQuizScore={data.kpis.avgQuizScore}
      />

      {/* Floating AI Language Tutor Widget */}
      <LanguageTutorWidget />
    </div>
  );
}
