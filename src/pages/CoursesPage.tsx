import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileText, Search, Volume2 } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { VideoLessonPlayer } from '../components/VideoLessonPlayer.tsx';
import { speakPhrase } from '../utils/speech.ts';
import type { Assignment, Course, Lesson, PageRoute, Quiz } from '../types.ts';

interface CoursesPageProps {
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string | null) => void;
  onNavigate: (route: PageRoute) => void;
}

export function CoursesPage({ selectedCourseId, onSelectCourse, onNavigate }: CoursesPageProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [languageFilter, setLanguageFilter] = useState<'all' | 'english' | 'french'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [search, setSearch] = useState('');

  // Detail view state
  const [detailLoading, setDetailLoading] = useState(false);
  const [courseDetail, setCourseDetail] = useState<{
    course: Course;
    lessons: Lesson[];
    quizzes: Quiz[];
    assignments: Assignment[];
    enrolled: boolean;
    completedLessonIds: string[];
  } | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ courses: Course[] }>('/courses', {
        params: { language: languageFilter, level: levelFilter, q: search },
      });
      setCourses(Array.isArray(res.data?.courses) ? res.data.courses : []);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [languageFilter, levelFilter, search, showError]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const res = await api.get<{
          course: Course;
          lessons: Lesson[];
          quizzes: Quiz[];
          assignments: Assignment[];
          enrollment: unknown;
          progress: { completedLessonIds?: string[] } | null;
        }>(`/courses/${id}`);
        const detailLessons = Array.isArray(res.data?.lessons) ? res.data.lessons : [];
        setCourseDetail({
          course: res.data.course,
          lessons: detailLessons,
          quizzes: Array.isArray(res.data?.quizzes) ? res.data.quizzes : [],
          assignments: Array.isArray(res.data?.assignments) ? res.data.assignments : [],
          enrolled: Boolean(res.data?.enrollment),
          completedLessonIds: Array.isArray(res.data?.progress?.completedLessonIds)
            ? res.data.progress!.completedLessonIds!
            : [],
        });
        setActiveLesson(detailLessons[0] || null);
      } catch (err) {
        showError(extractErrorMessage(err));
        onSelectCourse(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [onSelectCourse, showError]
  );

  useEffect(() => {
    if (selectedCourseId) {
      void loadDetail(selectedCourseId);
    } else {
      setCourseDetail(null);
      setActiveLesson(null);
    }
  }, [selectedCourseId, loadDetail]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      showError('Please sign in as a student to enroll in courses.');
      onNavigate('/login');
      return;
    }
    if (user.role !== 'student') {
      showError('Only student accounts can enroll in courses.');
      return;
    }

    try {
      await api.post(`/courses/${courseId}/enroll`);
      showSuccess('Enrolled in course successfully.');
      await loadCourses();
      if (selectedCourseId === courseId) {
        await loadDetail(courseId);
      }
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  const handleCompleteLesson = async (lessonId: string) => {
    if (!user || user.role !== 'student') {
      showError('Sign in as a student to record lesson completion.');
      return;
    }
    try {
      await api.post(`/lessons/${lessonId}/complete`);
      showSuccess('Lesson marked as completed.');
      if (selectedCourseId) await loadDetail(selectedCourseId);
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  };

  if (selectedCourseId) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 py-10 min-h-[calc(100vh-14rem)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onSelectCourse(null)}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Courses
          </button>

          {detailLoading || !courseDetail ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 animate-pulse space-y-4">
              <div className="h-6 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Course Header */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {courseDetail.course.language} · {courseDetail.course.level} · Instructor: {courseDetail.course.teacherName} · {courseDetail.course.durationHours} hours
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {courseDetail.course.title}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {courseDetail.course.description}
                  </p>
                </div>

                <div className="shrink-0 flex flex-wrap gap-3">
                  {courseDetail.enrolled ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Enrolled
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEnroll(courseDetail.course._id)}
                      className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
                    >
                      Enroll in Course
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate('/exams')}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Course Quizzes ({courseDetail.quizzes.length})
                  </button>
                </div>
              </div>

              {/* Lesson Player & Syllabus */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-3">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Course Lessons ({courseDetail.lessons.length})
                  </h2>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                    {courseDetail.lessons.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">No lessons published yet.</p>
                    ) : (
                      courseDetail.lessons.map((lesson, idx) => {
                        const isDone = courseDetail.completedLessonIds.includes(lesson._id);
                        const isActive = activeLesson?._id === lesson._id;
                        return (
                          <button
                            key={lesson._id}
                            type="button"
                            onClick={() => setActiveLesson(lesson)}
                            className={`w-full p-4 text-left transition-colors flex items-start justify-between gap-3 ${
                              isActive
                                ? 'bg-blue-50/70 dark:bg-blue-950/40'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                Lesson {idx + 1} · {lesson.skillType}
                              </p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                                {lesson.title}
                              </p>
                            </div>
                            {isDone && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8">
                  {activeLesson ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-400 capitalize font-medium">
                            {activeLesson.language} · {activeLesson.level} · {activeLesson.skillType}
                          </p>
                          <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                            {activeLesson.title}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {activeLesson.summary}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCompleteLesson(activeLesson._id)}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                            courseDetail.completedLessonIds.includes(activeLesson._id)
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-700 text-white hover:bg-blue-800'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {courseDetail.completedLessonIds.includes(activeLesson._id)
                            ? 'Completed'
                            : 'Mark Completed'}
                        </button>
                      </div>

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

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Lesson Notes
                          </h3>
                          <button
                            type="button"
                            onClick={() => speakPhrase(activeLesson.content, activeLesson.language, 0.95)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Volume2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                            Listen Aloud
                          </button>
                        </div>
                        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {activeLesson.content}
                        </p>
                      </div>

                      {activeLesson.examples && activeLesson.examples.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Spoken Examples &amp; Phonetics
                          </h3>
                          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
                            {activeLesson.examples.map((ex, idx) => (
                              <div key={idx} className="p-3.5 flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {ex.phrase}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {ex.phonetic && <span className="font-mono mr-2">{ex.phonetic}</span>}
                                    {ex.translation}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => speakPhrase(ex.phrase, activeLesson.language, 0.9)}
                                  aria-label={`Play audio for ${ex.phrase}`}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 shrink-0"
                                >
                                  <Volume2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeLesson.pdfTitle && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {activeLesson.pdfTitle}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Printable PDF / Study Guide Material
                              </p>
                            </div>
                          </div>
                          <a
                            href={`/api/lessons/${activeLesson._id}/pdf`}
                            download
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download Material
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
                      Select a lesson from the left to begin studying.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-12 min-h-[calc(100vh-14rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Course Catalog</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              English &amp; French Courses
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Organized into Beginner, Intermediate, and Advanced levels with structured lessons, downloadable materials, and examinations.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {(['all', 'english', 'french'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguageFilter(lang)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    languageFilter === lang
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'all' ? 'All Languages' : lang}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    levelFilter === lvl
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lvl === 'all' ? 'All Levels' : lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses or teachers..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No courses matched your current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setLanguageFilter('all');
                setLevelFilter('all');
                setSearch('');
              }}
              className="mt-4 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course._id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
              >
                <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <ResilientImage
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="h-full w-full object-cover"
                    fallbackTitle={course.title}
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {course.language} · {course.level} · {course.durationHours}h
                  </p>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {course.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-3 flex-1">
                    {course.description}
                  </p>
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    Instructor: <span className="font-medium text-slate-800 dark:text-slate-200">{course.teacherName}</span> · {course.lessonsCount ?? 0} lessons
                  </p>

                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectCourse(course._id)}
                      className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Open Course
                    </button>
                    {course.isEnrolled ? (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Enrolled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(course._id)}
                        className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
                      >
                        Enroll
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
