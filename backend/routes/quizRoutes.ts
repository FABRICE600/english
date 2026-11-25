import { Router } from 'express';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { getStore } from '../services/store.ts';
import { repo } from '../services/repository.ts';
import type { AnswerReview, QuestionType } from '../types.ts';

const router = Router();

// List all quizzes & exams with question counts
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getStore();
  const { language, level, isExam } = req.query as {
    language?: string;
    level?: string;
    isExam?: string;
  };

  let quizzes = db.quizzes;
  if (language && language !== 'all') quizzes = quizzes.filter((q) => q.language === language);
  if (level && level !== 'all') quizzes = quizzes.filter((q) => q.level === level);
  if (isExam === 'true') quizzes = quizzes.filter((q) => q.isExam);
  if (isExam === 'false') quizzes = quizzes.filter((q) => !q.isExam);

  const enriched = quizzes.map((q) => {
    const questions = db.questions.filter((qn) => qn.quizId === q._id);
    const course = db.courses.find((c) => c._id === q.courseId);
    const totalPoints = questions.reduce((sum, item) => sum + item.points, 0);
    const userLatestResult = req.user
      ? db.results
          .filter((r) => r.quizId === q._id && r.studentId === req.user!.userId)
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] || null
      : null;

    return {
      ...q,
      courseTitle: course?.title || '',
      questionCount: questions.length,
      totalPoints,
      latestResult: userLatestResult,
    };
  });

  res.json({ quizzes: enriched });
});

// Get single quiz and its questions (without exposing correct answers during active attempt for students)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getStore();
  const quiz = db.quizzes.find((q) => q._id === req.params.id);
  if (!quiz) {
    res.status(404).json({ message: 'Quiz or examination not found.' });
    return;
  }

  const questions = db.questions
    .filter((qn) => qn.quizId === quiz._id)
    .map((qn) => {
      if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
        return qn;
      }
      const { correctAnswer: _hidden, explanation: _exp, ...safeQuestion } = qn;
      return safeQuestion;
    });

  res.json({ quiz, questions });
});

// Get student's quiz/exam results
router.get('/results/mine', authenticate, async (req: AuthRequest, res) => {
  const db = await getStore();
  const results =
    req.user!.role === 'student'
      ? db.results.filter((r) => r.studentId === req.user!.userId)
      : db.results;
  res.json({
    results: [...results].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
  });
});

function normalizeText(val: string): string {
  return val.trim().toLowerCase().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
}

// Submit quiz or examination attempt -> automatic grading + detailed explanations
router.post('/:id/submit', authenticate, async (req: AuthRequest, res) => {
  const db = await getStore();
  const quiz = db.quizzes.find((q) => q._id === req.params.id);
  if (!quiz) {
    res.status(404).json({ message: 'Quiz or examination not found.' });
    return;
  }

  const questions = db.questions.filter((qn) => qn.quizId === quiz._id);
  const { answers } = req.body as { answers?: Record<string, string> };
  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ message: 'Submitted answers are required.' });
    return;
  }

  let score = 0;
  let totalPoints = 0;
  const reviews: AnswerReview[] = [];

  for (const qn of questions) {
    totalPoints += qn.points;
    const rawSubmitted = String(answers[qn._id] ?? '');
    let isCorrect = false;

    if (qn.type === 'matching') {
      // Compare sorted key=value pairs
      const expectedParts = qn.correctAnswer.split('|').map((s) => normalizeText(s)).sort();
      const submittedParts = rawSubmitted.split('|').map((s) => normalizeText(s)).sort();
      isCorrect =
        expectedParts.length === submittedParts.length &&
        expectedParts.every((part, i) => part === submittedParts[i]);
    } else {
      isCorrect = normalizeText(rawSubmitted) === normalizeText(qn.correctAnswer);
    }

    const pointsEarned = isCorrect ? qn.points : 0;
    score += pointsEarned;

    reviews.push({
      questionId: qn._id,
      prompt: qn.prompt,
      type: qn.type,
      submittedAnswer: rawSubmitted || '(No answer)',
      correctAnswer: qn.correctAnswer,
      isCorrect,
      pointsEarned,
      pointsPossible: qn.points,
      explanation: qn.explanation,
    });
  }

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed = percentage >= quiz.passingScore;
  const student = await repo.findUserById(req.user!.userId);

  const result = await repo.createResult({
    quizId: quiz._id,
    quizTitle: quiz.title,
    courseId: quiz.courseId,
    language: quiz.language,
    isExam: quiz.isExam,
    studentId: req.user!.userId,
    studentName: student?.name || 'Student',
    score,
    totalPoints,
    percentage,
    passed,
    answers: reviews,
  });

  if (req.user!.role === 'student') {
    const allStudentResults = [...db.results.filter((r) => r.studentId === req.user!.userId), result];
    const avg = Math.round(
      allStudentResults.reduce((sum, r) => sum + r.percentage, 0) / allStudentResults.length
    );
    await repo.upsertProgress(req.user!.userId, quiz.courseId, '', avg);
    await repo.createNotification({
      userId: req.user!.userId,
      title: `${quiz.isExam ? 'Exam' : 'Quiz'} Result: ${percentage}%`,
      message: `You scored ${score}/${totalPoints} (${percentage}%) on "${quiz.title}".`,
      type: passed ? 'success' : 'warning',
    });
  }

  res.status(201).json({ result });
});

// Teacher or Admin: create new quiz/exam with questions
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

  const { courseId, title, description, isExam, timeLimitMinutes, passingScore, questions } = req.body as {
    courseId?: string;
    title?: string;
    description?: string;
    isExam?: boolean;
    timeLimitMinutes?: number;
    passingScore?: number;
    questions?: Array<{
      type: QuestionType;
      prompt: string;
      options?: string[];
      pairs?: Array<{ left: string; right: string }>;
      wordBank?: string[];
      correctAnswer: string;
      explanation: string;
      points?: number;
    }>;
  };

  const db = await getStore();
  const course = db.courses.find((c) => c._id === courseId);
  if (!course) {
    res.status(404).json({ message: 'Course not found.' });
    return;
  }
  if (actor.role === 'teacher' && course.teacherId !== actor._id) {
    res.status(403).json({ message: 'Teachers can only create quizzes for their own courses.' });
    return;
  }
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ message: 'Quiz title and at least one question are required.' });
    return;
  }

  const { quiz, questions: createdQuestions } = await repo.createQuizWithQuestions(
    {
      courseId: course._id,
      teacherId: actor._id,
      title: title.trim(),
      description: description?.trim() || '',
      language: course.language,
      level: course.level,
      isExam: Boolean(isExam),
      timeLimitMinutes: Number(timeLimitMinutes) || 20,
      passingScore: Number(passingScore) || 70,
    },
    questions.map((q) => ({
      type: q.type || 'mcq',
      prompt: q.prompt.trim(),
      options: q.options || [],
      pairs: q.pairs || [],
      wordBank: q.wordBank || [],
      correctAnswer: q.correctAnswer.trim(),
      explanation: q.explanation?.trim() || 'Review the corresponding course lesson for details.',
      points: Number(q.points) || 10,
    }))
  );

  res.status(201).json({ quiz, questions: createdQuestions });
});

export default router;
