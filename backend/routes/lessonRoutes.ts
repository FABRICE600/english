import { Router } from 'express';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { getStore } from '../services/store.ts';
import { repo } from '../services/repository.ts';
import type { LessonExample, SkillType } from '../types.ts';

const router = Router();

// List lessons filtered by language, level, skillType, or courseId
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  const db = await getStore();
  const { language, level, skillType, courseId } = req.query as {
    language?: string;
    level?: string;
    skillType?: string;
    courseId?: string;
  };

  let lessons = db.lessons;
  if (language && language !== 'all') lessons = lessons.filter((l) => l.language === language);
  if (level && level !== 'all') lessons = lessons.filter((l) => l.level === level);
  if (skillType && skillType !== 'all') lessons = lessons.filter((l) => l.skillType === skillType);
  if (courseId) lessons = lessons.filter((l) => l.courseId === courseId);

  const completedIds = new Set<string>();
  if (req.user) {
    db.progress
      .filter((p) => p.studentId === req.user!.userId)
      .forEach((p) => p.completedLessonIds.forEach((id) => completedIds.add(id)));
  }

  const enriched = lessons
    .sort((a, b) => a.order - b.order)
    .map((l) => {
      const course = db.courses.find((c) => c._id === l.courseId);
      return {
        ...l,
        courseTitle: course?.title || '',
        teacherId: course?.teacherId || '',
        completed: completedIds.has(l._id),
      };
    });

  res.json({ lessons: enriched });
});

// Download PDF study guide text/file for a lesson
router.get('/:id/pdf', async (req, res) => {
  const db = await getStore();
  const lesson = db.lessons.find((l) => l._id === req.params.id);
  if (!lesson) {
    res.status(404).json({ message: 'Lesson not found.' });
    return;
  }

  const filename = (lesson.pdfTitle || `${lesson.title.replace(/\s+/g, '_')}.txt`).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const body = [
    `LINGUALEARN STUDY MATERIAL`,
    `Title: ${lesson.title}`,
    `Language: ${lesson.language.toUpperCase()} | Level: ${lesson.level.toUpperCase()} | Skill: ${lesson.skillType.toUpperCase()}`,
    `--------------------------------------------------`,
    ``,
    lesson.summary,
    ``,
    lesson.content,
    ``,
    `Notes & Supplementary PDF Content:`,
    lesson.pdfContent || 'Practice the examples aloud and review key vocabulary.',
    ``,
    `Examples:`,
    ...(lesson.examples || []).map((ex) => `- ${ex.phrase} ${ex.phonetic ? `(${ex.phonetic})` : ''} — ${ex.translation}`),
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\.pdf$/i, '.txt')}"`);
  res.send(body);
});

// Teacher or Admin: create lesson (supports PDF learning material text/title & video URL)
router.post('/', authenticate, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const actor = await repo.findUserById(req.user!.userId);
  if (!actor) {
    res.status(401).json({ message: 'User not found.' });
    return;
  }
  if (actor.role === 'teacher' && !actor.teacherApproved) {
    res.status(403).json({ message: 'Pending teacher approval.' });
    return;
  }

  const { courseId, title, skillType, summary, content, videoUrl, pdfTitle, pdfContent, examples } = req.body as {
    courseId?: string;
    title?: string;
    skillType?: SkillType;
    summary?: string;
    content?: string;
    videoUrl?: string;
    pdfTitle?: string;
    pdfContent?: string;
    examples?: LessonExample[];
  };

  const db = await getStore();
  const course = db.courses.find((c) => c._id === courseId);
  if (!course) {
    res.status(404).json({ message: 'Target course not found.' });
    return;
  }
  if (actor.role === 'teacher' && course.teacherId !== actor._id) {
    res.status(403).json({ message: 'Teachers can only add lessons to their own courses.' });
    return;
  }
  if (!title || !content) {
    res.status(400).json({ message: 'Lesson title and content are required.' });
    return;
  }

  const existingCount = db.lessons.filter((l) => l.courseId === course._id).length;
  const lesson = await repo.createLesson({
    courseId: course._id,
    title: title.trim(),
    language: course.language,
    level: course.level,
    skillType: skillType || 'grammar',
    order: existingCount + 1,
    summary: summary?.trim() || content.slice(0, 110),
    content: content.trim(),
    videoUrl: videoUrl?.trim() || '',
    pdfTitle: pdfTitle?.trim() || '',
    pdfContent: pdfContent?.trim() || '',
    examples: Array.isArray(examples) ? examples : [],
  });

  res.status(201).json({ lesson });
});

// Student marks lesson completed
router.post('/:id/complete', authenticate, requireRole('student'), async (req: AuthRequest, res) => {
  const db = await getStore();
  const lesson = db.lessons.find((l) => l._id === req.params.id);
  if (!lesson) {
    res.status(404).json({ message: 'Lesson not found.' });
    return;
  }

  // Auto-enroll if not yet enrolled so progress tracking always works seamlessly
  await repo.createEnrollment({
    studentId: req.user!.userId,
    courseId: lesson.courseId,
    language: lesson.language,
    status: 'active',
    completionPercent: 0,
  });

  const progress = await repo.upsertProgress(req.user!.userId, lesson.courseId, lesson._id);
  res.json({ progress, lessonId: lesson._id });
});

// Teacher or Admin: delete lesson
router.delete('/:id', authenticate, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  const db = await getStore();
  const lesson = db.lessons.find((l) => l._id === req.params.id);
  if (!lesson) {
    res.status(404).json({ message: 'Lesson not found.' });
    return;
  }
  const course = db.courses.find((c) => c._id === lesson.courseId);
  if (req.user!.role === 'teacher' && course && course.teacherId !== req.user!.userId) {
    res.status(403).json({ message: 'Teachers can only remove lessons from their own courses.' });
    return;
  }
  await repo.deleteLesson(lesson._id);
  res.json({ message: 'Lesson deleted.' });
});

export default router;
