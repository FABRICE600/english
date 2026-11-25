import React, { useCallback, useEffect, useState } from 'react';
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
import { CheckCircle2, LogOut, PlusCircle, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Course, CourseLevel, LanguageChoice, Lesson, NotificationItem, PageRoute, QuestionType, SkillType, Submission } from '../types.ts';

interface TeacherDashboardProps {
  onNavigate: (route: PageRoute) => void;
}

interface TeacherDashboardData {
  kpis: {
    myCourses: number;
    myLessons: number;
    myQuizzes: number;
    enrolledStudents: number;
    pendingGrades: number;
    avgClassScore: number;
  };
  myCourses: Course[];
  myLessons: Lesson[];
  performanceByCourse: Array<{ name: string; enrolled: number; averageScore: number }>;
  recentActivities: Array<{ id: string; title: string; detail: string; date: string }>;
  notifications: NotificationItem[];
}

export function TeacherDashboard({ onNavigate }: TeacherDashboardProps) {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();

  const [tab, setTab] = useState<'overview' | 'courses' | 'lessons' | 'quizzes' | 'grading'>('overview');
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Create course form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseLang, setCourseLang] = useState<LanguageChoice>('english');
  const [courseLevel, setCourseLevel] = useState<CourseLevel>('beginner');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseHours, setCourseHours] = useState('12');

  // Create lesson form
  const [lessonCourseId, setLessonCourseId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSkill, setLessonSkill] = useState<SkillType>('grammar');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonPdfTitle, setLessonPdfTitle] = useState('');
  const [lessonPdfContent, setLessonPdfContent] = useState('');

  // Create quiz form
  const [quizCourseId, setQuizCourseId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizIsExam, setQuizIsExam] = useState(false);
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qPrompt, setQPrompt] = useState('');
  const [qOptions, setQOptions] = useState('Option A, Option B, Option C, Option D');
  const [qAnswer, setQAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');

  // Create assignment + grading state
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('2026-12-15');
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: string; feedback: string }>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, subRes] = await Promise.all([
        api.get<TeacherDashboardData>('/dashboard'),
        api.get<{ submissions: Submission[] }>('/assignments/submissions/all'),
      ]);
      setData(dashRes.data);
      setSubmissions(Array.isArray(subRes.data?.submissions) ? subRes.data.submissions : []);
      const firstId = dashRes.data?.myCourses?.[0]?._id || '';
      setLessonCourseId((prev) => prev || firstId);
      setQuizCourseId((prev) => prev || firstId);
      setAssignCourseId((prev) => prev || firstId);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/courses', {
        title: courseTitle,
        language: courseLang,
        level: courseLevel,
        description: courseDesc,
        durationHours: Number(courseHours) || 12,
      });
      showSuccess('Course created successfully.');
      setCourseTitle('');
      setCourseDesc('');
      await loadData();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await api.delete(`/courses/${id}`);
      showSuccess('Course removed.');
      await loadData();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLessonPdfTitle(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLessonPdfContent(reader.result.slice(0, 5000));
      }
    };
    reader.readAsText(file);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/lessons', {
        courseId: lessonCourseId,
        title: lessonTitle,
        skillType: lessonSkill,
        content: lessonContent,
        videoUrl: lessonVideoUrl,
        pdfTitle: lessonPdfTitle,
        pdfContent: lessonPdfContent,
      });
      showSuccess('Lesson published.');
      setLessonTitle('');
      setLessonContent('');
      setLessonVideoUrl('');
      setLessonPdfTitle('');
      setLessonPdfContent('');
      await loadData();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/quizzes', {
        courseId: quizCourseId,
        title: quizTitle,
        isExam: quizIsExam,
        questions: [
          {
            type: qType,
            prompt: qPrompt,
            options: qType === 'mcq' ? qOptions.split(',').map((s) => s.trim()).filter(Boolean) : [],
            wordBank: qType === 'sentence_build' ? qOptions.split(',').map((s) => s.trim()).filter(Boolean) : [],
            correctAnswer: qAnswer,
            explanation: qExplanation || 'Refer to the course grammar lesson.',
            points: 10,
          },
        ],
      });
      showSuccess(`${quizIsExam ? 'Examination' : 'Quiz'} published.`);
      setQuizTitle('');
      setQPrompt('');
      setQAnswer('');
      setQExplanation('');
      await loadData();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/assignments', {
        courseId: assignCourseId,
        title: assignTitle,
        instructions: assignInstructions,
        dueDate: assignDueDate,
      });
      showSuccess('Assignment created.');
      setAssignTitle('');
      setAssignInstructions('');
      await loadData();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const handleGrade = async (submissionId: string) => {
    const entry = gradeInputs[submissionId];
    const score = Number(entry?.score);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      showError('Enter a valid numeric score between 0 and 100.');
      return;
    }
    try {
      await api.patch(`/assignments/submissions/${submissionId}/grade`, {
        score,
        feedback: entry?.feedback || 'Good work.',
      });
      showSuccess('Submission graded and student notified.');
      await loadData();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-10 min-h-[calc(100vh-14rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Teacher Studio · {user?.expertise || 'Language Instructor'}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {user?.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

        {!user?.teacherApproved && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 p-4 text-sm text-amber-900 dark:text-amber-200">
            Your teacher application is currently pending administrator approval. An admin can approve your account from the Admin Dashboard.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'My Courses', value: data.kpis.myCourses },
            { label: 'Lessons', value: data.kpis.myLessons },
            { label: 'Quizzes & Exams', value: data.kpis.myQuizzes },
            { label: 'Enrolled Students', value: data.kpis.enrolledStudents },
            { label: 'Pending Grading', value: data.kpis.pendingGrades },
            { label: 'Class Avg Score', value: `${data.kpis.avgClassScore}%` },
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
              ['overview', 'Analytics & Activity'],
              ['courses', 'Manage Courses'],
              ['lessons', 'Lessons & Materials'],
              ['quizzes', 'Quizzes & Exams'],
              ['grading', `Assignments & Grading (${data.kpis.pendingGrades})`],
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

        {/* TAB CONTENT */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
                Student Performance by Course
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.performanceByCourse} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="averageScore" name="Average Score (%)" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="enrolled" name="Enrolled Students" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Recent Student Activity
              </h2>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.recentActivities.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent student activity.</p>
                ) : (
                  data.recentActivities.map((act) => (
                    <div key={act.id} className="py-3">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{act.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{act.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleCreateCourse}
              className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 self-start"
            >
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Create New Course
              </h2>
              <div>
                <label className="block text-xs font-medium mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g., Business English Presentations"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Language</label>
                  <select
                    value={courseLang}
                    onChange={(e) => setCourseLang(e.target.value as LanguageChoice)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-sm"
                  >
                    <option value="english">English</option>
                    <option value="french">French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Level</label>
                  <select
                    value={courseLevel}
                    onChange={(e) => setCourseLevel(e.target.value as CourseLevel)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Hours</label>
                  <input
                    type="number"
                    min="1"
                    value={courseHours}
                    onChange={(e) => setCourseHours(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Course Description</label>
                <textarea
                  rows={3}
                  required
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Describe curriculum goals and outcomes..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <PlusCircle className="h-4 w-4" />
                Publish Course
              </button>
            </form>

            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                My Courses ({data.myCourses.length})
              </h2>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.myCourses.map((c) => (
                  <div key={c._id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.title}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {c.language} · {c.level} · {c.durationHours}h
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(c._id)}
                      aria-label={`Delete ${c.title}`}
                      className="text-rose-600 hover:text-rose-700 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'lessons' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleCreateLesson}
              className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Add Lesson, Video &amp; PDF Learning Material
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Course</label>
                  <select
                    value={lessonCourseId}
                    onChange={(e) => setLessonCourseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  >
                    {data.myCourses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Skill Module</label>
                  <select
                    value={lessonSkill}
                    onChange={(e) => setLessonSkill(e.target.value as SkillType)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm capitalize"
                  >
                    {['alphabet', 'pronunciation', 'grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Lesson Title</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Lesson title"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Lesson Content</label>
                <textarea
                  rows={4}
                  required
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Write detailed grammar explanation, dialogue, or passage..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Video Lesson Embed URL (optional)</label>
                <input
                  type="url"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">PDF Material Title</label>
                  <input
                    type="text"
                    value={lessonPdfTitle}
                    onChange={(e) => setLessonPdfTitle(e.target.value)}
                    placeholder="Grammar_Reference.pdf"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Upload Study File (.txt / .pdf)</label>
                  <input
                    type="file"
                    accept=".txt,.md,.pdf"
                    onChange={handlePdfUpload}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 py-1.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <PlusCircle className="h-4 w-4" />
                Publish Lesson
              </button>
            </form>

            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Published Lessons ({data.myLessons.length})
              </h2>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                {data.myLessons.map((l) => (
                  <div key={l._id} className="py-3">
                    <p className="text-xs text-slate-500 capitalize">
                      {l.language} · {l.level} · {l.skillType}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'quizzes' && (
          <form
            onSubmit={handleCreateQuiz}
            className="max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Create Quiz or Online Examination
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Course</label>
                <select
                  value={quizCourseId}
                  onChange={(e) => setQuizCourseId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  {data.myCourses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizIsExam}
                    onChange={(e) => setQuizIsExam(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Mark as Official Timed Examination
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Quiz / Exam Title</label>
              <input
                type="text"
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g., Unit 2 Grammar Check"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Question Type</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="fill_blank">Fill in the Blank</option>
                  <option value="sentence_build">Sentence Construction</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Correct Answer</label>
                <input
                  type="text"
                  required
                  value={qAnswer}
                  onChange={(e) => setQAnswer(e.target.value)}
                  placeholder="Exact expected answer"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Question Prompt</label>
              <input
                type="text"
                required
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="Write the question prompt..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            {(qType === 'mcq' || qType === 'sentence_build') && (
              <div>
                <label className="block text-xs font-medium mb-1">
                  {qType === 'mcq' ? 'Options (comma-separated)' : 'Word Bank Tokens (comma-separated)'}
                </label>
                <input
                  type="text"
                  value={qOptions}
                  onChange={(e) => setQOptions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Answer Explanation</label>
              <input
                type="text"
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                placeholder="Explain why this answer is correct..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Publish Quiz
            </button>
          </form>
        )}

        {tab === 'grading' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleCreateAssignment}
              className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 self-start"
            >
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Post New Writing Assignment
              </h2>
              <div>
                <label className="block text-xs font-medium mb-1">Course</label>
                <select
                  value={assignCourseId}
                  onChange={(e) => setAssignCourseId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  {data.myCourses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="Essay or written exercise title"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Instructions</label>
                <textarea
                  rows={4}
                  required
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  placeholder="Describe writing requirements and word count..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Create Assignment
              </button>
            </form>

            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Student Submissions ({submissions.length})
              </h2>

              {submissions.length === 0 ? (
                <p className="text-sm text-slate-500">No student submissions yet.</p>
              ) : (
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div
                      key={sub._id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {sub.studentName} · {sub.assignmentTitle}
                          </p>
                          <p className="text-xs text-slate-500">{sub.courseTitle}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            sub.status === 'graded'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {sub.status === 'graded' ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Graded: {sub.score}/100
                            </>
                          ) : (
                            'Needs Grading'
                          )}
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-md">
                        {sub.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Score /100"
                          value={gradeInputs[sub._id]?.score ?? (sub.score !== null ? String(sub.score) : '')}
                          onChange={(e) =>
                            setGradeInputs((prev) => ({
                              ...prev,
                              [sub._id]: {
                                score: e.target.value,
                                feedback: prev[sub._id]?.feedback ?? sub.feedback,
                              },
                            }))
                          }
                          className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Feedback for student..."
                          value={gradeInputs[sub._id]?.feedback ?? sub.feedback}
                          onChange={(e) =>
                            setGradeInputs((prev) => ({
                              ...prev,
                              [sub._id]: {
                                score: prev[sub._id]?.score ?? (sub.score !== null ? String(sub.score) : ''),
                                feedback: e.target.value,
                              },
                            }))
                          }
                          className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleGrade(sub._id)}
                          className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                        >
                          Save Grade
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
