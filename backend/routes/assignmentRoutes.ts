import { Router } from 'express';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { getStore } from '../services/store.ts';
import { repo } from '../services/repository.ts';

const router = Router();

// List assignments (optionally filtered by courseId or language)
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getStore();
  const { courseId, language } = req.query as { courseId?: string; language?: string };

  let assignments = db.assignments;
  if (courseId) assignments = assignments.filter((a) => a.courseId === courseId);
  if (language && language !== 'all') assignments = assignments.filter((a) => a.language === language);

  const enriched = assignments.map((a) => {
    const course = db.courses.find((c) => c._id === a.courseId);
    const mySubmission = req.user
      ? db.submissions.find((s) => s.assignmentId === a._id && s.studentId === req.user!.userId) || null
      : null;
    const totalSubmissions = db.submissions.filter((s) => s.assignmentId === a._id).length;

    return {
      ...a,
      courseTitle: course?.title || '',
      mySubmission,
      totalSubmissions,
    };
  });

  res.json({ assignments: enriched });
});

// Teacher or Admin: create assignment
router.post('/', authenticate, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const actor = await repo.findUserById(req.user!.userId);
  if (!actor) {
    res.status(401).json({ message: 'User not found.' });
    return;
  }
  if (actor.role === 'teacher' && !actor.teacherApproved) {
    res.status(403).json({ message: 'Pending administrator approval.' });
    return;
  }

  const { courseId, title, instructions, dueDate, maxScore } = req.body as {
    courseId?: string;
    title?: string;
    instructions?: string;
    dueDate?: string;
    maxScore?: number;
  };

  const db = await getStore();
  const course = db.courses.find((c) => c._id === courseId);
  if (!course) {
    res.status(404).json({ message: 'Course not found.' });
    return;
  }
  if (actor.role === 'teacher' && course.teacherId !== actor._id) {
    res.status(403).json({ message: 'Teachers can only create assignments for their own courses.' });
    return;
  }
  if (!title || !instructions) {
    res.status(400).json({ message: 'Title and instructions are required.' });
    return;
  }

  const assignment = await repo.createAssignment({
    courseId: course._id,
    teacherId: actor._id,
    title: title.trim(),
    language: course.language,
    level: course.level,
    instructions: instructions.trim(),
    dueDate: dueDate || '2026-12-15',
    maxScore: Number(maxScore) || 100,
  });

  res.status(201).json({ assignment });
});

// Student: submit assignment
router.post('/:id/submit', authenticate, requireRole('student'), async (req: AuthRequest, res) => {
  const db = await getStore();
  const assignment = db.assignments.find((a) => a._id === req.params.id);
  if (!assignment) {
    res.status(404).json({ message: 'Assignment not found.' });
    return;
  }

  const { content, attachmentName } = req.body as { content?: string; attachmentName?: string };
  if (!content || content.trim().length < 20) {
    res.status(400).json({ message: 'Please write at least 20 characters before submitting.' });
    return;
  }

  const student = await repo.findUserById(req.user!.userId);
  const submission = await repo.createSubmission({
    assignmentId: assignment._id,
    courseId: assignment.courseId,
    studentId: req.user!.userId,
    studentName: student?.name || 'Student',
    content: content.trim(),
    attachmentName: attachmentName?.trim() || '',
    status: 'submitted',
    score: null,
    feedback: '',
    gradedAt: null,
    gradedBy: null,
  });

  await repo.createNotification({
    userId: assignment.teacherId,
    title: 'New Assignment Submission',
    message: `${student?.name || 'A student'} submitted "${assignment.title}".`,
    type: 'info',
  });

  res.status(201).json({ submission });
});

// Teacher or Admin: view submissions (filtered to teacher's courses if role === 'teacher')
router.get('/submissions/all', authenticate, requireRole('teacher', 'admin', 'student'), async (req: AuthRequest, res) => {
  const db = await getStore();
  let submissions = db.submissions;

  if (req.user!.role === 'student') {
    submissions = submissions.filter((s) => s.studentId === req.user!.userId);
  } else if (req.user!.role === 'teacher') {
    const teacherCourseIds = new Set(db.courses.filter((c) => c.teacherId === req.user!.userId).map((c) => c._id));
    submissions = submissions.filter((s) => teacherCourseIds.has(s.courseId));
  }

  const enriched = submissions
    .map((s) => {
      const assignment = db.assignments.find((a) => a._id === s.assignmentId);
      const course = db.courses.find((c) => c._id === s.courseId);
      return {
        ...s,
        assignmentTitle: assignment?.title || '',
        maxScore: assignment?.maxScore || 100,
        courseTitle: course?.title || '',
        language: course?.language || 'english',
      };
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  res.json({ submissions: enriched });
});

// Teacher or Admin: grade student submission
router.patch('/submissions/:id/grade', authenticate, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const db = await getStore();
  const existing = db.submissions.find((s) => s._id === req.params.id);
  if (!existing) {
    res.status(404).json({ message: 'Submission not found.' });
    return;
  }

  const course = db.courses.find((c) => c._id === existing.courseId);
  if (req.user!.role === 'teacher' && course && course.teacherId !== req.user!.userId) {
    res.status(403).json({ message: 'Teachers can only grade submissions for their own courses.' });
    return;
  }

  const { score, feedback } = req.body as { score?: number; feedback?: string };
  if (typeof score !== 'number' || Number.isNaN(score) || score < 0 || score > 100) {
    res.status(400).json({ message: 'Score must be a valid number between 0 and 100.' });
    return;
  }

  const graded = await repo.gradeSubmission(existing._id, score, feedback?.trim() || '', req.user!.userId);
  await repo.createNotification({
    userId: existing.studentId,
    title: `Assignment Graded (${score}/100)`,
    message: `Your submission for "${course?.title || 'Course'}" received ${score}/100.`,
    type: 'success',
  });

  res.json({ submission: graded });
});

export default router;
