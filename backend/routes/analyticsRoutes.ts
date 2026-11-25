import { Router } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { generateId, getStore } from '../services/store.ts';
import { repo } from '../services/repository.ts';
import {
  computeDailyGoalProgress,
  computeDailyStreak,
  computeGlobalLeaderboard,
  computeLearningPatterns,
  computeQuizScoreStreak,
  computeStudentBadges,
} from '../services/gamification.ts';
import type { SkillType, StudyDayOfWeek, StudySessionPlan } from '../types.ts';

const router = Router();

// Public platform summary stats for Home & About pages
router.get('/public-stats', async (_req, res) => {
  const db = await getStore();
  res.json({
    totalStudents: db.users.filter((u) => u.role === 'student').length,
    totalTeachers: db.users.filter((u) => u.role === 'teacher' && u.teacherApproved).length,
    availableCourses: db.courses.filter((c) => c.published).length,
    totalLessons: db.lessons.length,
    totalQuizzes: db.quizzes.length,
  });
});

// Role-specific Dashboard Stats & Charts
router.get('/dashboard', authenticate, async (req: AuthRequest, res) => {
  const db = await getStore();
  const userId = req.user!.userId;
  const role = req.user!.role;

  const totalStudents = db.users.filter((u) => u.role === 'student').length;
  const totalTeachers = db.users.filter((u) => u.role === 'teacher' && u.teacherApproved).length;
  const pendingTeachers = db.users.filter((u) => u.role === 'teacher' && !u.teacherApproved).length;
  const availableCourses = db.courses.length;
  const myNotifications = db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (role === 'student') {
    const myEnrollments = db.enrollments.filter((e) => e.studentId === userId);
    const myProgress = db.progress.filter((p) => p.studentId === userId);
    const completedLessonsCount = myProgress.reduce((sum, p) => sum + p.completedLessonIds.length, 0);
    const myResults = db.results.filter((r) => r.studentId === userId);
    const avgQuizScore =
      myResults.length > 0
        ? Math.round(myResults.reduce((s, r) => s + r.percentage, 0) / myResults.length)
        : 0;
    const totalStudyMinutes = myProgress.reduce((sum, p) => sum + p.studyMinutes, 0);

    const enrolledCourses = myEnrollments.map((enr) => {
      const course = db.courses.find((c) => c._id === enr.courseId);
      const totalCourseLessons = db.lessons.filter((l) => l.courseId === enr.courseId).length;
      const prog = myProgress.find((p) => p.courseId === enr.courseId);
      const done = prog ? prog.completedLessonIds.length : 0;
      const pct = totalCourseLessons > 0 ? Math.min(100, Math.round((done / totalCourseLessons) * 100)) : enr.completionPercent;
      return {
        ...enr,
        course,
        doneLessons: done,
        totalLessons: totalCourseLessons,
        completionPercent: pct,
      };
    });

    const computeLanguageProgress = (lang: 'english' | 'french') => {
      const langEnrolled = enrolledCourses.filter((e) => e.course?.language === lang);
      const langAvailable = db.courses.filter((c) => c.language === lang);
      const doneLessons = langEnrolled.reduce((sum, e) => sum + e.doneLessons, 0);
      const totalEnrolledLessons = langEnrolled.reduce((sum, e) => sum + e.totalLessons, 0);
      const totalTrackLessons = langAvailable.reduce(
        (sum, c) => sum + db.lessons.filter((l) => l.courseId === c._id).length,
        0
      );
      const completedCourses = langEnrolled.filter((e) => e.completionPercent === 100).length;
      const completionPercent =
        totalEnrolledLessons > 0 ? Math.min(100, Math.round((doneLessons / totalEnrolledLessons) * 100)) : 0;

      return {
        language: lang,
        enrolledCourses: langEnrolled.length,
        totalTrackCourses: langAvailable.length,
        completedCourses,
        doneLessons,
        totalEnrolledLessons,
        totalTrackLessons,
        completionPercent,
      };
    };

    const languageProgress = {
      english: computeLanguageProgress('english'),
      french: computeLanguageProgress('french'),
    };

    const chartData = [
      { label: 'Grammar', english: 84, french: 78 },
      { label: 'Vocabulary', english: 88, french: 82 },
      { label: 'Listening', english: 76, french: 72 },
      { label: 'Speaking', english: 80, french: 74 },
      { label: 'Reading', english: 90, french: 85 },
      { label: 'Writing', english: 82, french: 79 },
    ];

    const scoreHistory = myResults.map((r, i) => ({
      name: r.quizTitle.length > 18 ? `${r.quizTitle.slice(0, 18)}…` : r.quizTitle,
      score: r.percentage,
      attempt: i + 1,
    }));

    const recentActivities = [
      ...myResults.slice(0, 4).map((r) => ({
        id: r._id,
        title: `Completed ${r.quizTitle}`,
        detail: `Scored ${r.score}/${r.totalPoints} (${r.percentage}%)`,
        date: r.completedAt,
      })),
      ...db.submissions
        .filter((s) => s.studentId === userId)
        .slice(0, 3)
        .map((s) => ({
          id: s._id,
          title: s.status === 'graded' ? `Assignment graded (${s.score}/100)` : 'Submitted assignment',
          detail: s.content.slice(0, 72) + '…',
          date: s.submittedAt,
        })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const mySubmissions = db.submissions.filter((s) => s.studentId === userId);
    const studyStreak = computeDailyStreak(myProgress, myResults);
    const quizScoreStreak = computeQuizScoreStreak(myResults, 80);
    const badges = computeStudentBadges({
      progressList: myProgress,
      enrollments: enrolledCourses,
      resultsList: myResults,
      submissionsList: mySubmissions,
      studyStreak,
      quizStreak: quizScoreStreak,
    });

    const leaderboard = computeGlobalLeaderboard({
      users: db.users,
      progressList: db.progress,
      resultsList: db.results,
      currentUserId: userId,
    });

    const currentUser = db.users.find((u) => u._id === userId) || null;
    const dailyGoal = computeDailyGoalProgress({
      user: currentUser,
      progressList: myProgress,
      resultsList: myResults,
    });

    const learningPatterns = computeLearningPatterns({
      resultsList: myResults,
      questionsList: db.questions,
      quizzesList: db.quizzes,
      lessonsList: db.lessons,
      progressList: myProgress,
      submissionsList: mySubmissions,
    });

    res.json({
      role,
      kpis: {
        enrolledCourses: myEnrollments.length,
        completedLessons: completedLessonsCount,
        avgQuizScore,
        studyMinutes: totalStudyMinutes,
        availableCourses,
        totalTeachers,
      },
      languageProgress,
      studyStreak,
      quizScoreStreak,
      badges,
      leaderboard,
      dailyGoal,
      learningPatterns,
      studySchedule: currentUser?.studySchedule || [],
      enrolledCourses,
      results: myResults,
      chartData,
      scoreHistory,
      recentActivities,
      notifications: myNotifications,
    });
    return;
  }

  if (role === 'teacher') {
    const myCourses = db.courses.filter((c) => c.teacherId === userId);
    const myCourseIds = new Set(myCourses.map((c) => c._id));
    const myLessons = db.lessons.filter((l) => myCourseIds.has(l.courseId));
    const myQuizzes = db.quizzes.filter((q) => myCourseIds.has(q.courseId));
    const myEnrollments = db.enrollments.filter((e) => myCourseIds.has(e.courseId));
    const mySubmissions = db.submissions.filter((s) => myCourseIds.has(s.courseId));
    const pendingGrades = mySubmissions.filter((s) => s.status === 'submitted').length;
    const courseResults = db.results.filter((r) => myCourseIds.has(r.courseId));
    const avgClassScore =
      courseResults.length > 0
        ? Math.round(courseResults.reduce((s, r) => s + r.percentage, 0) / courseResults.length)
        : 86;

    const performanceByCourse = myCourses.map((c) => {
      const enrCount = db.enrollments.filter((e) => e.courseId === c._id).length;
      const resList = db.results.filter((r) => r.courseId === c._id);
      const avg =
        resList.length > 0 ? Math.round(resList.reduce((s, r) => s + r.percentage, 0) / resList.length) : 84;
      return {
        name: c.title.split(':')[0],
        enrolled: enrCount,
        averageScore: avg,
      };
    });

    const recentActivities = [
      ...mySubmissions.slice(0, 5).map((s) => ({
        id: s._id,
        title: `${s.studentName} submitted assignment`,
        detail: s.status === 'graded' ? `Graded ${s.score}/100` : 'Awaiting your grading',
        date: s.submittedAt,
      })),
      ...courseResults.slice(0, 4).map((r) => ({
        id: r._id,
        title: `${r.studentName} completed ${r.quizTitle}`,
        detail: `Score: ${r.percentage}%`,
        date: r.completedAt,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      role,
      kpis: {
        myCourses: myCourses.length,
        myLessons: myLessons.length,
        myQuizzes: myQuizzes.length,
        enrolledStudents: myEnrollments.length,
        pendingGrades,
        avgClassScore,
        totalStudents,
        totalTeachers,
        availableCourses,
      },
      myCourses,
      myLessons,
      performanceByCourse,
      recentActivities,
      notifications: myNotifications,
    });
    return;
  }

  // ADMIN DASHBOARD
  const avgQuizScore =
    db.results.length > 0
      ? Math.round(db.results.reduce((s, r) => s + r.percentage, 0) / db.results.length)
      : 0;

  const platformChart = [
    {
      language: 'English',
      courses: db.courses.filter((c) => c.language === 'english').length,
      lessons: db.lessons.filter((l) => l.language === 'english').length,
      enrollments: db.enrollments.filter((e) => e.language === 'english').length,
    },
    {
      language: 'French',
      courses: db.courses.filter((c) => c.language === 'french').length,
      lessons: db.lessons.filter((l) => l.language === 'french').length,
      enrollments: db.enrollments.filter((e) => e.language === 'french').length,
    },
  ];

  const recentActivities = [
    ...db.results.slice(0, 4).map((r) => ({
      id: r._id,
      title: `${r.studentName} completed ${r.quizTitle}`,
      detail: `${r.percentage}% (${r.passed ? 'Passed' : 'Needs Review'})`,
      date: r.completedAt,
    })),
    ...db.submissions.slice(0, 4).map((s) => ({
      id: s._id,
      title: `Submission from ${s.studentName}`,
      detail: s.status === 'graded' ? `Graded ${s.score}/100` : 'Pending teacher review',
      date: s.submittedAt,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    role,
    kpis: {
      totalStudents,
      totalTeachers,
      pendingTeachers,
      availableCourses,
      totalLessons: db.lessons.length,
      totalEnrollments: db.enrollments.length,
      avgQuizScore,
      contactMessagesCount: db.contactMessages.length,
    },
    platformChart,
    recentActivities,
    contactMessages: db.contactMessages,
    notifications: myNotifications,
  });
});

// Notifications endpoints
router.get('/notifications', authenticate, async (req: AuthRequest, res) => {
  const db = await getStore();
  const notifications = db.notifications
    .filter((n) => n.userId === req.user!.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ notifications });
});

router.patch('/notifications/:id/read', authenticate, async (req: AuthRequest, res) => {
  await repo.markNotificationRead(req.params.id, req.user!.userId);
  res.json({ ok: true });
});

// Contact form endpoint
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  };

  if (!name || name.trim().length < 2) {
    res.status(400).json({ message: 'Please enter your name.' });
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: 'Please enter a valid email address.' });
    return;
  }
  if (!subject || !message || message.trim().length < 10) {
    res.status(400).json({ message: 'Please enter a subject and a message (at least 10 characters).' });
    return;
  }

  const saved = await repo.createContactMessage({
    name: name.trim(),
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim(),
  });

  res.status(201).json({ message: 'Thank you for contacting LinguaLearn. Our academic team will reply within 1 business day.', contact: saved });
});

// Student daily goal preference update
router.put('/dashboard/daily-goal', authenticate, requireRole('student'), async (req: AuthRequest, res) => {
  const { type, target } = req.body as {
    type?: string;
    target?: number;
  };

  const goalType = type === 'modules' ? 'modules' : type === 'minutes' ? 'minutes' : null;
  if (!goalType) {
    res.status(400).json({ message: 'Goal type must be either "minutes" or "modules".' });
    return;
  }

  const parsedTarget = Math.round(Number(target));
  if (goalType === 'minutes' && (!Number.isFinite(parsedTarget) || parsedTarget < 5 || parsedTarget > 240)) {
    res.status(400).json({ message: 'Daily study duration target must be between 5 and 240 minutes.' });
    return;
  }
  if (goalType === 'modules' && (!Number.isFinite(parsedTarget) || parsedTarget < 1 || parsedTarget > 20)) {
    res.status(400).json({ message: 'Daily module count target must be between 1 and 20 modules.' });
    return;
  }

  const updatedUser = await repo.updateUser(req.user!.userId, {
    dailyGoal: {
      type: goalType,
      target: parsedTarget,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!updatedUser) {
    res.status(404).json({ message: 'Student account not found.' });
    return;
  }

  const db = await getStore();
  const myProgress = db.progress.filter((p) => p.studentId === req.user!.userId);
  const myResults = db.results.filter((r) => r.studentId === req.user!.userId);
  const dailyGoal = computeDailyGoalProgress({
    user: updatedUser,
    progressList: myProgress,
    resultsList: myResults,
  });

  res.json({ dailyGoal });
});

const VALID_DAYS: StudyDayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const VALID_SKILLS: SkillType[] = [
  'alphabet',
  'pronunciation',
  'grammar',
  'vocabulary',
  'speaking',
  'listening',
  'reading',
  'writing',
];

router.post('/dashboard/study-schedule', authenticate, requireRole('student'), async (req: AuthRequest, res) => {
  const { dayOfWeek, language, skill, startTime, durationMinutes, note } = req.body as {
    dayOfWeek?: string;
    language?: string;
    skill?: string;
    startTime?: string;
    durationMinutes?: number;
    note?: string;
  };

  if (!dayOfWeek || !VALID_DAYS.includes(dayOfWeek as StudyDayOfWeek)) {
    res.status(400).json({ message: 'Please choose a valid day of the week.' });
    return;
  }
  if (language !== 'english' && language !== 'french') {
    res.status(400).json({ message: 'Language must be either "english" or "french".' });
    return;
  }
  if (!skill || !VALID_SKILLS.includes(skill as SkillType)) {
    res.status(400).json({ message: 'Please choose a valid language skill.' });
    return;
  }
  const cleanTime = typeof startTime === 'string' && /^\d{2}:\d{2}$/.test(startTime) ? startTime : '18:00';
  const duration = Math.round(Number(durationMinutes));
  if (!Number.isFinite(duration) || duration < 10 || duration > 240) {
    res.status(400).json({ message: 'Session duration must be between 10 and 240 minutes.' });
    return;
  }

  const user = await repo.findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ message: 'Student account not found.' });
    return;
  }

  const session: StudySessionPlan = {
    id: generateId(),
    dayOfWeek: dayOfWeek as StudyDayOfWeek,
    language,
    skill: skill as SkillType,
    startTime: cleanTime,
    durationMinutes: duration,
    note: typeof note === 'string' ? note.trim().slice(0, 120) : '',
    completed: false,
    createdAt: new Date().toISOString(),
  };

  const nextSchedule = [...(user.studySchedule || []), session];
  const updated = await repo.updateUser(user._id, { studySchedule: nextSchedule });
  res.status(201).json({ studySchedule: updated?.studySchedule || nextSchedule });
});

router.patch('/dashboard/study-schedule/:sessionId', authenticate, requireRole('student'), async (req: AuthRequest, res) => {
  const { completed } = req.body as { completed?: boolean };
  const user = await repo.findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ message: 'Student account not found.' });
    return;
  }

  const existing = user.studySchedule || [];
  const targetIdx = existing.findIndex((s) => s.id === req.params.sessionId);
  if (targetIdx === -1) {
    res.status(404).json({ message: 'Planned study session not found.' });
    return;
  }

  const nextSchedule = existing.map((s) =>
    s.id === req.params.sessionId
      ? { ...s, completed: typeof completed === 'boolean' ? completed : !s.completed }
      : s
  );

  const updated = await repo.updateUser(user._id, { studySchedule: nextSchedule });
  res.json({ studySchedule: updated?.studySchedule || nextSchedule });
});

router.delete('/dashboard/study-schedule/:sessionId', authenticate, requireRole('student'), async (req: AuthRequest, res) => {
  const user = await repo.findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ message: 'Student account not found.' });
    return;
  }

  const nextSchedule = (user.studySchedule || []).filter((s) => s.id !== req.params.sessionId);
  const updated = await repo.updateUser(user._id, { studySchedule: nextSchedule });
  res.json({ studySchedule: updated?.studySchedule || nextSchedule });
});

export default router;
