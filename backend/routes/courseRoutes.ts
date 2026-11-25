import { Router } from 'express';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { getStore } from '../services/store.ts';
import { repo } from '../services/repository.ts';

const router = Router();

// List courses with optional language/level/search filter & lesson/enrollment counts
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getStore();
  const { language, level, q, teacherId } = req.query as {
    language?: string;
    level?: string;
    q?: string;
    teacherId?: string;
  };

  let courses = db.courses;
  if (language && language !== 'all') {
    courses = courses.filter((c) => c.language === language);
  }
  if (level && level !== 'all') {
    courses = courses.filter((c) => c.level === level);
  }
  if (teacherId) {
    courses = courses.filter((c) => c.teacherId === teacherId);
  }
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    courses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.teacherName.toLowerCase().includes(term)
    );
  }

  const enriched = courses.map((c) => {
    const lessonsCount = db.lessons.filter((l) => l.courseId === c._id).length;
    const enrolledCount = db.enrollments.filter((e) => e.courseId === c._id).length;
    const quizzesCount = db.quizzes.filter((qz) => qz.courseId === c._id).length;
    const isEnrolled = req.user
      ? db.enrollments.some((e) => e.courseId === c._id && e.studentId === req.user!.userId)
      : false;

    return {
      ...c,
      lessonsCount,
      enrolledCount,
      quizzesCount,
      isEnrolled,
    };
  });

  res.json({ courses: enriched });
});

// Get course details including lessons, quizzes, assignments
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getStore();
  const course = db.courses.find((c) => c._id === req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found.' });
    return;
  }

  const lessons = db.lessons
    .filter((l) => l.courseId === course._id)
    .sort((a, b) => a.order - b.order);
  const quizzes = db.quizzes.filter((q) => q.courseId === course._id);
  const assignments = db.assignments.filter((a) => a.courseId === course._id);
  const enrolledCount = db.enrollments.filter((e) => e.courseId === course._id).length;
  const enrollment = req.user
    ? db.enrollments.find((e) => e.courseId === course._id && e.studentId === req.user!.userId) || null
    : null;
  const progress = req.user
    ? db.progress.find((p) => p.courseId === course._id && p.studentId === req.user!.userId) || null
    : null;

  res.json({
    course: { ...course, enrolledCount, lessonsCount: lessons.length },
    lessons,
    quizzes,
    assignments,
    enrollment,
    progress,
  });
});

// Teacher or Admin: create course
router.post('/', authenticate, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const actor = await repo.findUserById(req.user!.userId);
  if (!actor) {
    res.status(401).json({ message: 'User not found.' });
    return;
  }
  if (actor.role === 'teacher' && !actor.teacherApproved) {
    res.status(403).json({ message: 'Your teacher account is pending administrator approval.' });
    return;
  }

  const { title, language, level, category, description, durationHours } = req.body as {
    title?: string;
    language?: 'english' | 'french';
    level?: 'beginner' | 'intermediate' | 'advanced';
    category?: string;
    description?: string;
    durationHours?: number;
  };

  if (!title || title.trim().length < 4 || !description || description.trim().length < 10) {
    res.status(400).json({ message: 'Course title and detailed description are required.' });
    return;
  }

  const lang = language === 'french' ? 'french' : 'english';
  const lvl = ['beginner', 'intermediate', 'advanced'].includes(level || '') ? level! : 'beginner';

  const course = await repo.createCourse({
    title: title.trim(),
    language: lang,
    level: lvl,
    category: category?.trim() || (lang === 'english' ? 'English Track' : 'Parcours Français'),
    description: description.trim(),
    teacherId: actor._id,
    teacherName: actor.name,
    thumbnailUrl:
      lang === 'english'
        ? '/src/assets/images/track_english_study_1794824176995.jpg'
        : '/src/assets/images/track_french_study_1794824178386.jpg',
    published: true,
    durationHours: Number(durationHours) > 0 ? Number(durationHours) : 12,
  });

  res.status(201).json({ course });
});

// Teacher (owner) or Admin: delete course
router.delete('/:id', authenticate, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const db = await getStore();
  const course = db.courses.find((c) => c._id === req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found.' });
    return;
  }
  if (req.user!.role === 'teacher' && course.teacherId !== req.user!.userId) {
    res.status(403).json({ message: 'Teachers can only manage their own courses.' });
    return;
  }
  await repo.deleteCourse(course._id);
  res.json({ message: 'Course deleted successfully.' });
});

// Student enrolls in course
router.post('/:id/enroll', authenticate, requireRole('student'), async (req: AuthRequest, res) => {
  const db = await getStore();
  const course = db.courses.find((c) => c._id === req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found.' });
    return;
  }

  const enrollment = await repo.createEnrollment({
    studentId: req.user!.userId,
    courseId: course._id,
    language: course.language,
    status: 'active',
    completionPercent: 0,
  });

  await repo.upsertProgress(req.user!.userId, course._id, '');
  await repo.createNotification({
    userId: req.user!.userId,
    title: 'Course Enrollment Confirmed',
    message: `You are now enrolled in "${course.title}".`,
    type: 'success',
  });

  res.status(201).json({ enrollment });
});

export default router;
