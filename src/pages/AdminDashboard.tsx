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
import { CheckCircle2, LogOut, Trash2, UserCheck, UserX } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Course, Lesson, PageRoute, User } from '../types.ts';

interface AdminDashboardProps {
  onNavigate: (route: PageRoute) => void;
}

interface AdminStats {
  kpis: {
    totalStudents: number;
    totalTeachers: number;
    pendingTeachers: number;
    availableCourses: number;
    totalLessons: number;
    totalEnrollments: number;
    avgQuizScore: number;
    contactMessagesCount: number;
  };
  platformChart: Array<{ language: string; courses: number; lessons: number; enrollments: number }>;
  recentActivities: Array<{ id: string; title: string; detail: string; date: string }>;
  contactMessages: Array<{ _id: string; name: string; email: string; subject: string; message: string; createdAt: string }>;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();

  const [tab, setTab] = useState<'overview' | 'users' | 'courses' | 'lessons'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes, coursesRes, lessonsRes] = await Promise.all([
        api.get<AdminStats>('/dashboard'),
        api.get<{ users: User[] }>('/users'),
        api.get<{ courses: Course[] }>('/courses'),
        api.get<{ lessons: Lesson[] }>('/lessons'),
      ]);
      setStats(dashRes.data);
      setUsers(Array.isArray(usersRes.data?.users) ? usersRes.data.users : []);
      setCourses(Array.isArray(coursesRes.data?.courses) ? coursesRes.data.courses : []);
      setLessons(Array.isArray(lessonsRes.data?.lessons) ? lessonsRes.data.lessons : []);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const toggleTeacherApproval = async (target: User) => {
    try {
      await api.patch(`/users/${target._id}`, { teacherApproved: !target.teacherApproved });
      showSuccess(
        !target.teacherApproved
          ? `${target.name} approved as an active instructor.`
          : `${target.name} instructor status paused.`
      );
      await loadAll();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const deleteUser = async (target: User) => {
    try {
      await api.delete(`/users/${target._id}`);
      showSuccess(`Removed ${target.name}.`);
      await loadAll();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await api.delete(`/courses/${id}`);
      showSuccess('Course removed from platform.');
      await loadAll();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const deleteLesson = async (id: string) => {
    try {
      await api.delete(`/lessons/${id}`);
      showSuccess('Lesson removed.');
      await loadAll();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  if (loading || !stats) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-10 min-h-[calc(100vh-14rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Platform Administration Console
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {user?.name}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('/profile')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                onNavigate('/');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Students', value: stats.kpis.totalStudents },
            { label: 'Approved Teachers', value: stats.kpis.totalTeachers },
            { label: 'Pending Approvals', value: stats.kpis.pendingTeachers },
            { label: 'Available Courses', value: stats.kpis.availableCourses },
            { label: 'Total Lessons', value: stats.kpis.totalLessons },
            { label: 'Avg Quiz Score', value: `${stats.kpis.avgQuizScore}%` },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(
            [
              ['overview', 'Platform Statistics & Logs'],
              ['users', `Users & Teacher Approvals (${users.length})`],
              ['courses', `Courses (${courses.length})`],
              ['lessons', `Lessons (${lessons.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                tab === id
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
                English vs. French Platform Distribution
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.platformChart} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                    <XAxis dataKey="language" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="courses" name="Courses" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lessons" name="Lessons" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="enrollments" name="Enrollments" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Platform Activities &amp; Inquiries
              </h2>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {stats.recentActivities.map((act) => (
                  <div key={act.id} className="py-3">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{act.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{act.detail}</p>
                  </div>
                ))}
                {stats.contactMessages.map((msg) => (
                  <div key={msg._id} className="py-3">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                      Inquiry from {msg.name} ({msg.email})
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {msg.subject}: {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <th className="py-3.5 px-5 font-semibold">Name</th>
                  <th className="py-3.5 px-5 font-semibold">Email</th>
                  <th className="py-3.5 px-5 font-semibold">Role</th>
                  <th className="py-3.5 px-5 font-semibold">Status</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">{u.name}</td>
                    <td className="py-3 px-5 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="py-3 px-5 capitalize">{u.role}</td>
                    <td className="py-3 px-5">
                      {u.role === 'teacher' ? (
                        u.teacherApproved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                            Pending Approval
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-slate-500">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right space-x-2 whitespace-nowrap">
                      {u.role === 'teacher' && (
                        <button
                          type="button"
                          onClick={() => toggleTeacherApproval(u)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {u.teacherApproved ? (
                            <>
                              <UserX className="h-3.5 w-3.5 text-amber-600" />
                              Pause
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                              Approve
                            </>
                          )}
                        </button>
                      )}
                      {u._id !== user?._id && (
                        <button
                          type="button"
                          onClick={() => deleteUser(u)}
                          aria-label={`Delete ${u.name}`}
                          className="inline-flex items-center rounded-md p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'courses' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <th className="py-3.5 px-5 font-semibold">Course Title</th>
                  <th className="py-3.5 px-5 font-semibold">Language</th>
                  <th className="py-3.5 px-5 font-semibold">Level</th>
                  <th className="py-3.5 px-5 font-semibold">Instructor</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Enrolled</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {courses.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">{c.title}</td>
                    <td className="py-3 px-5 capitalize">{c.language}</td>
                    <td className="py-3 px-5 capitalize">{c.level}</td>
                    <td className="py-3 px-5">{c.teacherName}</td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums">{c.enrolledCount ?? 0}</td>
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteCourse(c._id)}
                        aria-label={`Delete ${c.title}`}
                        className="text-rose-600 hover:text-rose-700 p-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'lessons' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <th className="py-3.5 px-5 font-semibold">Lesson Title</th>
                  <th className="py-3.5 px-5 font-semibold">Course</th>
                  <th className="py-3.5 px-5 font-semibold">Language</th>
                  <th className="py-3.5 px-5 font-semibold">Skill</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {lessons.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">{l.title}</td>
                    <td className="py-3 px-5 text-slate-600 dark:text-slate-300">{l.courseTitle}</td>
                    <td className="py-3 px-5 capitalize">{l.language}</td>
                    <td className="py-3 px-5 capitalize">{l.skillType}</td>
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteLesson(l._id)}
                        aria-label={`Delete ${l.title}`}
                        className="text-rose-600 hover:text-rose-700 p-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
