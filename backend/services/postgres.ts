import type { Pool } from 'pg';
import { computeDailyStreak, toDateKey } from './gamification.ts';
import type {
  AssignmentRecord,
  ContactMessageRecord,
  CourseRecord,
  DatabaseSchema,
  EnrollmentRecord,
  LessonRecord,
  NotificationRecord,
  ProgressRecord,
  QuestionRecord,
  QuizRecord,
  ResultRecord,
  StudyBuddyGroupRecord,
  StudyForumPostRecord,
  StudyForumReply,
  SubmissionRecord,
  UserRecord,
} from '../types.ts';

function iso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function asArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

function mapUserRow(row: Record<string, unknown>): UserRecord {
  return {
    _id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role as UserRecord['role'],
    teacherApproved: Boolean(row.teacher_approved),
    preferredLanguage: (row.preferred_language as UserRecord['preferredLanguage']) || 'both',
    bio: String(row.bio || ''),
    expertise: String(row.expertise || ''),
    avatarUrl: String(row.avatar_url || ''),
    dailyGoal: (row.daily_goal as UserRecord['dailyGoal']) || undefined,
    studySchedule: Array.isArray(row.study_schedule)
      ? (row.study_schedule as UserRecord['studySchedule'])
      : undefined,
    createdAt: iso(row.created_at),
  };
}

function mapCourseRow(row: Record<string, unknown>): CourseRecord {
  return {
    _id: String(row.id),
    title: String(row.title),
    language: row.language as CourseRecord['language'],
    level: row.level as CourseRecord['level'],
    category: String(row.category),
    description: String(row.description),
    teacherId: String(row.teacher_id),
    teacherName: String(row.teacher_name),
    thumbnailUrl: String(row.thumbnail_url || ''),
    published: Boolean(row.published),
    durationHours: Number(row.duration_hours || 6),
    createdAt: iso(row.created_at),
  };
}

function mapLessonRow(row: Record<string, unknown>): LessonRecord {
  return {
    _id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title),
    language: row.language as LessonRecord['language'],
    level: row.level as LessonRecord['level'],
    skillType: row.skill_type as LessonRecord['skillType'],
    order: Number(row.lesson_order || 1),
    summary: String(row.summary || ''),
    content: String(row.content),
    videoUrl: String(row.video_url || ''),
    pdfTitle: String(row.pdf_title || ''),
    pdfContent: String(row.pdf_content || ''),
    examples: asArray(row.examples),
    createdAt: iso(row.created_at),
  };
}

function mapEnrollmentRow(row: Record<string, unknown>): EnrollmentRecord {
  return {
    _id: String(row.id),
    studentId: String(row.student_id),
    courseId: String(row.course_id),
    language: row.language as EnrollmentRecord['language'],
    status: (row.status as EnrollmentRecord['status']) || 'active',
    completionPercent: Number(row.completion_percent || 0),
    enrolledAt: iso(row.enrolled_at),
  };
}

function mapAssignmentRow(row: Record<string, unknown>): AssignmentRecord {
  return {
    _id: String(row.id),
    courseId: String(row.course_id),
    teacherId: String(row.teacher_id),
    title: String(row.title),
    language: row.language as AssignmentRecord['language'],
    level: row.level as AssignmentRecord['level'],
    instructions: String(row.instructions),
    dueDate: String(row.due_date || ''),
    maxScore: Number(row.max_score || 100),
    createdAt: iso(row.created_at),
  };
}

function mapQuizRow(row: Record<string, unknown>): QuizRecord {
  return {
    _id: String(row.id),
    courseId: String(row.course_id),
    teacherId: String(row.teacher_id),
    title: String(row.title),
    description: String(row.description || ''),
    language: row.language as QuizRecord['language'],
    level: row.level as QuizRecord['level'],
    isExam: Boolean(row.is_exam),
    timeLimitMinutes: Number(row.time_limit_minutes || 20),
    passingScore: Number(row.passing_score || 70),
    createdAt: iso(row.created_at),
  };
}

function mapQuestionRow(row: Record<string, unknown>): QuestionRecord {
  return {
    _id: String(row.id),
    quizId: String(row.quiz_id),
    type: row.type as QuestionRecord['type'],
    prompt: String(row.prompt),
    options: asArray<string>(row.options),
    pairs: asArray(row.pairs),
    wordBank: asArray<string>(row.word_bank),
    correctAnswer: String(row.correct_answer),
    explanation: String(row.explanation || ''),
    points: Number(row.points || 10),
  };
}

function mapSubmissionRow(row: Record<string, unknown>): SubmissionRecord {
  return {
    _id: String(row.id),
    assignmentId: String(row.assignment_id),
    courseId: String(row.course_id),
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    content: String(row.content),
    attachmentName: String(row.attachment_name || ''),
    status: (row.status as SubmissionRecord['status']) || 'submitted',
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    feedback: String(row.feedback || ''),
    submittedAt: iso(row.submitted_at),
    gradedAt: row.graded_at ? iso(row.graded_at) : null,
    gradedBy: row.graded_by ? String(row.graded_by) : null,
  };
}

function mapResultRow(row: Record<string, unknown>): ResultRecord {
  return {
    _id: String(row.id),
    quizId: String(row.quiz_id),
    quizTitle: String(row.quiz_title),
    courseId: String(row.course_id),
    language: row.language as ResultRecord['language'],
    isExam: Boolean(row.is_exam),
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    score: Number(row.score || 0),
    totalPoints: Number(row.total_points || 0),
    percentage: Number(row.percentage || 0),
    passed: Boolean(row.passed),
    answers: asArray(row.answers),
    completedAt: iso(row.completed_at),
  };
}

function mapNotificationRow(row: Record<string, unknown>): NotificationRecord {
  return {
    _id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    message: String(row.message),
    type: (row.type as NotificationRecord['type']) || 'info',
    read: Boolean(row.read),
    createdAt: iso(row.created_at),
  };
}

function mapProgressRow(row: Record<string, unknown>): ProgressRecord {
  return {
    _id: String(row.id),
    studentId: String(row.student_id),
    courseId: String(row.course_id),
    completedLessonIds: asArray<string>(row.completed_lesson_ids),
    quizAverage: Number(row.quiz_average || 0),
    studyMinutes: Number(row.study_minutes || 0),
    streakDays: Number(row.streak_days || 1),
    lastActivityAt: iso(row.last_activity_at),
    activityDates: asArray<string>(row.activity_dates),
    dailyActivityLog:
      (row.daily_activity_log as Record<string, { minutes: number; modules: number }>) || {},
  };
}

function mapContactRow(row: Record<string, unknown>): ContactMessageRecord {
  return {
    _id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    subject: String(row.subject),
    message: String(row.message),
    createdAt: iso(row.created_at),
  };
}

function mapStudyGroupRow(row: Record<string, unknown>): StudyBuddyGroupRecord {
  return {
    _id: String(row.id),
    name: String(row.name),
    language: row.language as StudyBuddyGroupRecord['language'],
    level: row.level as StudyBuddyGroupRecord['level'],
    focusSkill: row.focus_skill as StudyBuddyGroupRecord['focusSkill'],
    description: String(row.description || ''),
    meetingCadence: String(row.meeting_cadence || ''),
    maxMembers: Number(row.max_members || 6),
    creatorId: String(row.creator_id),
    creatorName: String(row.creator_name),
    memberIds: asArray<string>(row.member_ids),
    createdAt: iso(row.created_at),
  };
}

function mapForumPostRow(row: Record<string, unknown>): StudyForumPostRecord {
  return {
    _id: String(row.id),
    groupId: row.group_id ? String(row.group_id) : null,
    language: row.language as StudyForumPostRecord['language'],
    title: String(row.title),
    content: String(row.content),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    replies: asArray<StudyForumReply>(row.replies),
    createdAt: iso(row.created_at),
  };
}

export async function ensurePostgresSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      teacher_approved BOOLEAN NOT NULL DEFAULT FALSE,
      preferred_language TEXT NOT NULL DEFAULT 'both',
      bio TEXT NOT NULL DEFAULT '',
      expertise TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      daily_goal JSONB,
      study_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS study_schedule JSONB NOT NULL DEFAULT '[]'::jsonb;

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT TRUE,
      duration_hours INTEGER NOT NULL DEFAULT 6,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      level TEXT NOT NULL,
      skill_type TEXT NOT NULL,
      lesson_order INTEGER NOT NULL DEFAULT 1,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      video_url TEXT NOT NULL DEFAULT '',
      pdf_title TEXT NOT NULL DEFAULT '',
      pdf_content TEXT NOT NULL DEFAULT '',
      examples JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      language TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      completion_percent INTEGER NOT NULL DEFAULT 0,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      level TEXT NOT NULL,
      instructions TEXT NOT NULL,
      due_date TEXT NOT NULL DEFAULT '',
      max_score INTEGER NOT NULL DEFAULT 100,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL,
      level TEXT NOT NULL,
      is_exam BOOLEAN NOT NULL DEFAULT FALSE,
      time_limit_minutes INTEGER NOT NULL DEFAULT 20,
      passing_score INTEGER NOT NULL DEFAULT 70,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '[]'::jsonb,
      pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
      word_bank JSONB NOT NULL DEFAULT '[]'::jsonb,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      points INTEGER NOT NULL DEFAULT 10
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      content TEXT NOT NULL,
      attachment_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted',
      score INTEGER,
      feedback TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      graded_at TIMESTAMPTZ,
      graded_by TEXT
    );

    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      quiz_title TEXT NOT NULL,
      course_id TEXT NOT NULL,
      language TEXT NOT NULL,
      is_exam BOOLEAN NOT NULL DEFAULT FALSE,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_points INTEGER NOT NULL,
      percentage INTEGER NOT NULL,
      passed BOOLEAN NOT NULL DEFAULT FALSE,
      answers JSONB NOT NULL DEFAULT '[]'::jsonb,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      completed_lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      quiz_average INTEGER NOT NULL DEFAULT 0,
      study_minutes INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 1,
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      activity_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
      daily_activity_log JSONB NOT NULL DEFAULT '{}'::jsonb,
      UNIQUE (student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS study_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT NOT NULL,
      level TEXT NOT NULL,
      focus_skill TEXT NOT NULL,
      description TEXT NOT NULL,
      meeting_cadence TEXT NOT NULL DEFAULT '',
      max_members INTEGER NOT NULL DEFAULT 6,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS study_forum_posts (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      language TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      replies JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_student_id ON progress(student_id);
  `);
}

export async function seedPostgresIfEmpty(pool: Pool, seed: DatabaseSchema): Promise<void> {
  const countRes = await pool.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM users');
  if ((countRes.rows[0]?.count ?? 0) > 0) {
    const groupCountRes = await pool.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM study_groups');
    if ((groupCountRes.rows[0]?.count ?? 0) === 0 && seed.studyGroups.length > 0) {
      const existingUsers = await pool.query<{ id: string; email: string }>('SELECT id, email FROM users');
      const aminaRow = existingUsers.rows.find((u) => u.email.toLowerCase().includes('amina'));
      const lucasRow = existingUsers.rows.find((u) => u.email.toLowerCase().includes('lucas'));
      const fallbackId = existingUsers.rows[0]?.id || 'seed-user';
      const aminaId = aminaRow?.id || fallbackId;
      const lucasId = lucasRow?.id || aminaId;
      const seedAmina = seed.users.find((u) => u.email.includes('amina'))?._id;
      const seedLucas = seed.users.find((u) => u.email.includes('lucas'))?._id;
      const remap = (uid: string) => (uid === seedAmina ? aminaId : uid === seedLucas ? lucasId : fallbackId);

      for (const g of seed.studyGroups) {
        await pool.query(
          `INSERT INTO study_groups (id, name, language, level, focus_skill, description, meeting_cadence, max_members, creator_id, creator_name, member_ids, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
           ON CONFLICT (id) DO NOTHING`,
          [
            g._id,
            g.name,
            g.language,
            g.level,
            g.focusSkill,
            g.description,
            g.meetingCadence,
            g.maxMembers,
            remap(g.creatorId),
            g.creatorName,
            JSON.stringify(Array.from(new Set(g.memberIds.map(remap)))),
            g.createdAt,
          ]
        );
      }
      for (const fp of seed.forumPosts) {
        await pool.query(
          `INSERT INTO study_forum_posts (id, group_id, language, title, content, author_id, author_name, replies, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            fp._id,
            fp.groupId,
            fp.language,
            fp.title,
            fp.content,
            remap(fp.authorId),
            fp.authorName,
            JSON.stringify(fp.replies.map((r) => ({ ...r, authorId: remap(r.authorId) }))),
            fp.createdAt,
          ]
        );
      }
    }
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const u of seed.users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, teacher_approved, preferred_language, bio, expertise, avatar_url, daily_goal, study_schedule, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          u._id,
          u.name,
          u.email.toLowerCase(),
          u.passwordHash,
          u.role,
          u.teacherApproved,
          u.preferredLanguage,
          u.bio,
          u.expertise,
          u.avatarUrl,
          u.dailyGoal ? JSON.stringify(u.dailyGoal) : null,
          JSON.stringify(u.studySchedule || []),
          u.createdAt,
        ]
      );
    }

    for (const c of seed.courses) {
      await client.query(
        `INSERT INTO courses (id, title, language, level, category, description, teacher_id, teacher_name, thumbnail_url, published, duration_hours, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO NOTHING`,
        [
          c._id,
          c.title,
          c.language,
          c.level,
          c.category,
          c.description,
          c.teacherId,
          c.teacherName,
          c.thumbnailUrl,
          c.published,
          c.durationHours,
          c.createdAt,
        ]
      );
    }

    for (const l of seed.lessons) {
      await client.query(
        `INSERT INTO lessons (id, course_id, title, language, level, skill_type, lesson_order, summary, content, video_url, pdf_title, pdf_content, examples, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          l._id,
          l.courseId,
          l.title,
          l.language,
          l.level,
          l.skillType,
          l.order,
          l.summary,
          l.content,
          l.videoUrl,
          l.pdfTitle,
          l.pdfContent,
          JSON.stringify(l.examples || []),
          l.createdAt,
        ]
      );
    }

    for (const e of seed.enrollments) {
      await client.query(
        `INSERT INTO enrollments (id, student_id, course_id, language, status, completion_percent, enrolled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [e._id, e.studentId, e.courseId, e.language, e.status, e.completionPercent, e.enrolledAt]
      );
    }

    for (const a of seed.assignments) {
      await client.query(
        `INSERT INTO assignments (id, course_id, teacher_id, title, language, level, instructions, due_date, max_score, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          a._id,
          a.courseId,
          a.teacherId,
          a.title,
          a.language,
          a.level,
          a.instructions,
          a.dueDate,
          a.maxScore,
          a.createdAt,
        ]
      );
    }

    for (const q of seed.quizzes) {
      await client.query(
        `INSERT INTO quizzes (id, course_id, teacher_id, title, description, language, level, is_exam, time_limit_minutes, passing_score, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          q._id,
          q.courseId,
          q.teacherId,
          q.title,
          q.description,
          q.language,
          q.level,
          q.isExam,
          q.timeLimitMinutes,
          q.passingScore,
          q.createdAt,
        ]
      );
    }

    for (const qs of seed.questions) {
      await client.query(
        `INSERT INTO questions (id, quiz_id, type, prompt, options, pairs, word_bank, correct_answer, explanation, points)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          qs._id,
          qs.quizId,
          qs.type,
          qs.prompt,
          JSON.stringify(qs.options || []),
          JSON.stringify(qs.pairs || []),
          JSON.stringify(qs.wordBank || []),
          qs.correctAnswer,
          qs.explanation,
          qs.points,
        ]
      );
    }

    for (const s of seed.submissions) {
      await client.query(
        `INSERT INTO submissions (id, assignment_id, course_id, student_id, student_name, content, attachment_name, status, score, feedback, submitted_at, graded_at, graded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          s._id,
          s.assignmentId,
          s.courseId,
          s.studentId,
          s.studentName,
          s.content,
          s.attachmentName,
          s.status,
          s.score,
          s.feedback,
          s.submittedAt,
          s.gradedAt,
          s.gradedBy,
        ]
      );
    }

    for (const r of seed.results) {
      await client.query(
        `INSERT INTO results (id, quiz_id, quiz_title, course_id, language, is_exam, student_id, student_name, score, total_points, percentage, passed, answers, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          r._id,
          r.quizId,
          r.quizTitle,
          r.courseId,
          r.language,
          r.isExam,
          r.studentId,
          r.studentName,
          r.score,
          r.totalPoints,
          r.percentage,
          r.passed,
          JSON.stringify(r.answers || []),
          r.completedAt,
        ]
      );
    }

    for (const n of seed.notifications) {
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [n._id, n.userId, n.title, n.message, n.type, n.read, n.createdAt]
      );
    }

    for (const p of seed.progress) {
      await client.query(
        `INSERT INTO progress (id, student_id, course_id, completed_lesson_ids, quiz_average, study_minutes, streak_days, last_activity_at, activity_dates, daily_activity_log)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9::jsonb,$10::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [
          p._id,
          p.studentId,
          p.courseId,
          JSON.stringify(p.completedLessonIds || []),
          p.quizAverage,
          p.studyMinutes,
          p.streakDays,
          p.lastActivityAt,
          JSON.stringify(p.activityDates || []),
          JSON.stringify(p.dailyActivityLog || {}),
        ]
      );
    }

    for (const cm of seed.contactMessages) {
      await client.query(
        `INSERT INTO contact_messages (id, name, email, subject, message, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [cm._id, cm.name, cm.email, cm.subject, cm.message, cm.createdAt]
      );
    }

    for (const g of seed.studyGroups) {
      await client.query(
        `INSERT INTO study_groups (id, name, language, level, focus_skill, description, meeting_cadence, max_members, creator_id, creator_name, member_ids, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
         ON CONFLICT (id) DO NOTHING`,
        [
          g._id,
          g.name,
          g.language,
          g.level,
          g.focusSkill,
          g.description,
          g.meetingCadence,
          g.maxMembers,
          g.creatorId,
          g.creatorName,
          JSON.stringify(g.memberIds || []),
          g.createdAt,
        ]
      );
    }

    for (const fp of seed.forumPosts) {
      await client.query(
        `INSERT INTO study_forum_posts (id, group_id, language, title, content, author_id, author_name, replies, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          fp._id,
          fp.groupId,
          fp.language,
          fp.title,
          fp.content,
          fp.authorId,
          fp.authorName,
          JSON.stringify(fp.replies || []),
          fp.createdAt,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('[LinguaLearn] Seeded Neon PostgreSQL database with initial curriculum data');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getPostgresStore(pool: Pool): Promise<DatabaseSchema> {
  const [
    usersRes,
    coursesRes,
    lessonsRes,
    enrollmentsRes,
    assignmentsRes,
    quizzesRes,
    questionsRes,
    submissionsRes,
    resultsRes,
    notificationsRes,
    progressRes,
    contactRes,
    studyGroupsRes,
    forumPostsRes,
  ] = await Promise.all([
    pool.query('SELECT * FROM users ORDER BY created_at ASC'),
    pool.query('SELECT * FROM courses ORDER BY created_at ASC'),
    pool.query('SELECT * FROM lessons ORDER BY lesson_order ASC, created_at ASC'),
    pool.query('SELECT * FROM enrollments ORDER BY enrolled_at DESC'),
    pool.query('SELECT * FROM assignments ORDER BY created_at DESC'),
    pool.query('SELECT * FROM quizzes ORDER BY created_at DESC'),
    pool.query('SELECT * FROM questions'),
    pool.query('SELECT * FROM submissions ORDER BY submitted_at DESC'),
    pool.query('SELECT * FROM results ORDER BY completed_at DESC'),
    pool.query('SELECT * FROM notifications ORDER BY created_at DESC'),
    pool.query('SELECT * FROM progress ORDER BY last_activity_at DESC'),
    pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC'),
    pool.query('SELECT * FROM study_groups ORDER BY created_at DESC'),
    pool.query('SELECT * FROM study_forum_posts ORDER BY created_at DESC'),
  ]);

  return {
    users: usersRes.rows.map(mapUserRow),
    courses: coursesRes.rows.map(mapCourseRow),
    lessons: lessonsRes.rows.map(mapLessonRow),
    enrollments: enrollmentsRes.rows.map(mapEnrollmentRow),
    assignments: assignmentsRes.rows.map(mapAssignmentRow),
    quizzes: quizzesRes.rows.map(mapQuizRow),
    questions: questionsRes.rows.map(mapQuestionRow),
    submissions: submissionsRes.rows.map(mapSubmissionRow),
    results: resultsRes.rows.map(mapResultRow),
    notifications: notificationsRes.rows.map(mapNotificationRow),
    progress: progressRes.rows.map(mapProgressRow),
    contactMessages: contactRes.rows.map(mapContactRow),
    studyGroups: studyGroupsRes.rows.map(mapStudyGroupRow),
    forumPosts: forumPostsRes.rows.map(mapForumPostRow),
  };
}

export function createPostgresRepo(pool: Pool, generateId: () => string) {
  return {
    async findUserByEmail(email: string): Promise<UserRecord | null> {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [
        email.trim().toLowerCase(),
      ]);
      return res.rows[0] ? mapUserRow(res.rows[0]) : null;
    },

    async findUserById(id: string): Promise<UserRecord | null> {
      const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] ? mapUserRow(res.rows[0]) : null;
    },

    async listUsers(): Promise<UserRecord[]> {
      const res = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
      return res.rows.map(mapUserRow);
    },

    async createUser(input: Omit<UserRecord, '_id' | 'createdAt'>): Promise<UserRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, teacher_approved, preferred_language, bio, expertise, avatar_url, daily_goal, study_schedule, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13)
         RETURNING *`,
        [
          id,
          input.name,
          input.email.toLowerCase(),
          input.passwordHash,
          input.role,
          input.teacherApproved,
          input.preferredLanguage,
          input.bio,
          input.expertise,
          input.avatarUrl,
          input.dailyGoal ? JSON.stringify(input.dailyGoal) : null,
          JSON.stringify(input.studySchedule || []),
          now,
        ]
      );
      return mapUserRow(res.rows[0]);
    },

    async updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null> {
      const current = await this.findUserById(id);
      if (!current) return null;
      const merged: UserRecord = { ...current, ...patch };
      const res = await pool.query(
        `UPDATE users
         SET name = $2,
             email = $3,
             password_hash = $4,
             role = $5,
             teacher_approved = $6,
             preferred_language = $7,
             bio = $8,
             expertise = $9,
             avatar_url = $10,
             daily_goal = $11::jsonb,
             study_schedule = $12::jsonb
         WHERE id = $1
         RETURNING *`,
        [
          id,
          merged.name,
          merged.email.toLowerCase(),
          merged.passwordHash,
          merged.role,
          merged.teacherApproved,
          merged.preferredLanguage,
          merged.bio,
          merged.expertise,
          merged.avatarUrl,
          merged.dailyGoal ? JSON.stringify(merged.dailyGoal) : null,
          JSON.stringify(merged.studySchedule || []),
        ]
      );
      return res.rows[0] ? mapUserRow(res.rows[0]) : null;
    },

    async deleteUser(id: string): Promise<boolean> {
      const res = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    },

    async createCourse(input: Omit<CourseRecord, '_id' | 'createdAt'>): Promise<CourseRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO courses (id, title, language, level, category, description, teacher_id, teacher_name, thumbnail_url, published, duration_hours, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          id,
          input.title,
          input.language,
          input.level,
          input.category,
          input.description,
          input.teacherId,
          input.teacherName,
          input.thumbnailUrl,
          input.published,
          input.durationHours,
          now,
        ]
      );
      return mapCourseRow(res.rows[0]);
    },

    async updateCourse(id: string, patch: Partial<CourseRecord>): Promise<CourseRecord | null> {
      const currentRes = await pool.query('SELECT * FROM courses WHERE id = $1 LIMIT 1', [id]);
      if (!currentRes.rows[0]) return null;
      const current = mapCourseRow(currentRes.rows[0]);
      const merged = { ...current, ...patch };
      const res = await pool.query(
        `UPDATE courses
         SET title = $2,
             language = $3,
             level = $4,
             category = $5,
             description = $6,
             teacher_id = $7,
             teacher_name = $8,
             thumbnail_url = $9,
             published = $10,
             duration_hours = $11
         WHERE id = $1
         RETURNING *`,
        [
          id,
          merged.title,
          merged.language,
          merged.level,
          merged.category,
          merged.description,
          merged.teacherId,
          merged.teacherName,
          merged.thumbnailUrl,
          merged.published,
          merged.durationHours,
        ]
      );
      return res.rows[0] ? mapCourseRow(res.rows[0]) : null;
    },

    async deleteCourse(id: string): Promise<boolean> {
      const res = await pool.query('DELETE FROM courses WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    },

    async createLesson(input: Omit<LessonRecord, '_id' | 'createdAt'>): Promise<LessonRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO lessons (id, course_id, title, language, level, skill_type, lesson_order, summary, content, video_url, pdf_title, pdf_content, examples, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)
         RETURNING *`,
        [
          id,
          input.courseId,
          input.title,
          input.language,
          input.level,
          input.skillType,
          input.order,
          input.summary,
          input.content,
          input.videoUrl,
          input.pdfTitle,
          input.pdfContent,
          JSON.stringify(input.examples || []),
          now,
        ]
      );
      return mapLessonRow(res.rows[0]);
    },

    async deleteLesson(id: string): Promise<boolean> {
      const res = await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    },

    async createEnrollment(
      input: Omit<EnrollmentRecord, '_id' | 'enrolledAt'>
    ): Promise<EnrollmentRecord> {
      const existing = await pool.query(
        'SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2 LIMIT 1',
        [input.studentId, input.courseId]
      );
      if (existing.rows[0]) {
        return mapEnrollmentRow(existing.rows[0]);
      }
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO enrollments (id, student_id, course_id, language, status, completion_percent, enrolled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [id, input.studentId, input.courseId, input.language, input.status, input.completionPercent, now]
      );
      return mapEnrollmentRow(res.rows[0]);
    },

    async upsertProgress(
      studentId: string,
      courseId: string,
      lessonId: string,
      quizAverage?: number
    ): Promise<ProgressRecord> {
      const now = new Date().toISOString();
      const todayKey = toDateKey(now);

      const existingRes = await pool.query(
        'SELECT * FROM progress WHERE student_id = $1 AND course_id = $2 LIMIT 1',
        [studentId, courseId]
      );

      let current: ProgressRecord;
      if (!existingRes.rows[0]) {
        const id = generateId();
        const completedLessonIds = lessonId ? [lessonId] : [];
        const dailyLog = { [todayKey]: { minutes: 25, modules: 1 } };
        const insertRes = await pool.query(
          `INSERT INTO progress (id, student_id, course_id, completed_lesson_ids, quiz_average, study_minutes, streak_days, last_activity_at, activity_dates, daily_activity_log)
           VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9::jsonb,$10::jsonb)
           RETURNING *`,
          [
            id,
            studentId,
            courseId,
            JSON.stringify(completedLessonIds),
            quizAverage ?? 0,
            25,
            1,
            now,
            JSON.stringify([todayKey]),
            JSON.stringify(dailyLog),
          ]
        );
        current = mapProgressRow(insertRes.rows[0]);
      } else {
        const row = mapProgressRow(existingRes.rows[0]);
        const set = new Set<string>(row.completedLessonIds || []);
        const isNewLesson = Boolean(lessonId && !set.has(lessonId));
        if (lessonId) set.add(lessonId);
        const dateSet = new Set<string>(row.activityDates || []);
        dateSet.add(todayKey);
        const log = { ...(row.dailyActivityLog || {}) };
        const todayEntry = log[todayKey] || { minutes: 0, modules: 0 };
        log[todayKey] = {
          minutes: todayEntry.minutes + 15,
          modules: todayEntry.modules + (isNewLesson || typeof quizAverage === 'number' ? 1 : 0),
        };

        const updateRes = await pool.query(
          `UPDATE progress
           SET completed_lesson_ids = $2::jsonb,
               quiz_average = $3,
               study_minutes = $4,
               last_activity_at = $5,
               activity_dates = $6::jsonb,
               daily_activity_log = $7::jsonb
           WHERE id = $1
           RETURNING *`,
          [
            row._id,
            JSON.stringify(Array.from(set)),
            typeof quizAverage === 'number' ? quizAverage : row.quizAverage,
            row.studyMinutes + 15,
            now,
            JSON.stringify(Array.from(dateSet).sort()),
            JSON.stringify(log),
          ]
        );
        current = mapProgressRow(updateRes.rows[0]);
      }

      const [allProgRes, allResultsRes, courseLessonsRes] = await Promise.all([
        pool.query('SELECT * FROM progress WHERE student_id = $1', [studentId]),
        pool.query('SELECT * FROM results WHERE student_id = $1', [studentId]),
        pool.query('SELECT COUNT(*)::int AS count FROM lessons WHERE course_id = $1', [courseId]),
      ]);

      const streak = computeDailyStreak(
        allProgRes.rows.map(mapProgressRow),
        allResultsRes.rows.map(mapResultRow)
      );
      const nextStreak = Math.max(1, streak.currentStreak);
      await pool.query('UPDATE progress SET streak_days = $2 WHERE student_id = $1', [
        studentId,
        nextStreak,
      ]);
      current.streakDays = nextStreak;

      const totalCourseLessons = courseLessonsRes.rows[0]?.count ?? 0;
      if (totalCourseLessons > 0) {
        const pct = Math.min(100, Math.round((current.completedLessonIds.length / totalCourseLessons) * 100));
        await pool.query(
          `UPDATE enrollments
           SET completion_percent = $3,
               status = CASE WHEN $3 = 100 THEN 'completed' ELSE status END
           WHERE student_id = $1 AND course_id = $2`,
          [studentId, courseId, pct]
        );
      }

      return current;
    },

    async createQuizWithQuestions(
      quizInput: Omit<QuizRecord, '_id' | 'createdAt'>,
      questionsInput: Omit<QuestionRecord, '_id' | 'quizId'>[]
    ): Promise<{ quiz: QuizRecord; questions: QuestionRecord[] }> {
      const client = await pool.connect();
      const quizId = generateId();
      const now = new Date().toISOString();
      try {
        await client.query('BEGIN');
        const qRes = await client.query(
          `INSERT INTO quizzes (id, course_id, teacher_id, title, description, language, level, is_exam, time_limit_minutes, passing_score, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING *`,
          [
            quizId,
            quizInput.courseId,
            quizInput.teacherId,
            quizInput.title,
            quizInput.description,
            quizInput.language,
            quizInput.level,
            quizInput.isExam,
            quizInput.timeLimitMinutes,
            quizInput.passingScore,
            now,
          ]
        );
        const questions: QuestionRecord[] = [];
        for (const item of questionsInput) {
          const itemId = generateId();
          const itemRes = await client.query(
            `INSERT INTO questions (id, quiz_id, type, prompt, options, pairs, word_bank, correct_answer, explanation, points)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10)
             RETURNING *`,
            [
              itemId,
              quizId,
              item.type,
              item.prompt,
              JSON.stringify(item.options || []),
              JSON.stringify(item.pairs || []),
              JSON.stringify(item.wordBank || []),
              item.correctAnswer,
              item.explanation,
              item.points,
            ]
          );
          questions.push(mapQuestionRow(itemRes.rows[0]));
        }
        await client.query('COMMIT');
        return { quiz: mapQuizRow(qRes.rows[0]), questions };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async createResult(input: Omit<ResultRecord, '_id' | 'completedAt'>): Promise<ResultRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO results (id, quiz_id, quiz_title, course_id, language, is_exam, student_id, student_name, score, total_points, percentage, passed, answers, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)
         RETURNING *`,
        [
          id,
          input.quizId,
          input.quizTitle,
          input.courseId,
          input.language,
          input.isExam,
          input.studentId,
          input.studentName,
          input.score,
          input.totalPoints,
          input.percentage,
          input.passed,
          JSON.stringify(input.answers || []),
          now,
        ]
      );
      return mapResultRow(res.rows[0]);
    },

    async createAssignment(
      input: Omit<AssignmentRecord, '_id' | 'createdAt'>
    ): Promise<AssignmentRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO assignments (id, course_id, teacher_id, title, language, level, instructions, due_date, max_score, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          id,
          input.courseId,
          input.teacherId,
          input.title,
          input.language,
          input.level,
          input.instructions,
          input.dueDate,
          input.maxScore,
          now,
        ]
      );
      return mapAssignmentRow(res.rows[0]);
    },

    async createSubmission(
      input: Omit<SubmissionRecord, '_id' | 'submittedAt'>
    ): Promise<SubmissionRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO submissions (id, assignment_id, course_id, student_id, student_name, content, attachment_name, status, score, feedback, submitted_at, graded_at, graded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          id,
          input.assignmentId,
          input.courseId,
          input.studentId,
          input.studentName,
          input.content,
          input.attachmentName,
          input.status,
          input.score,
          input.feedback,
          now,
          input.gradedAt,
          input.gradedBy,
        ]
      );
      return mapSubmissionRow(res.rows[0]);
    },

    async gradeSubmission(
      id: string,
      score: number,
      feedback: string,
      gradedBy: string
    ): Promise<SubmissionRecord | null> {
      const now = new Date().toISOString();
      const res = await pool.query(
        `UPDATE submissions
         SET score = $2,
             feedback = $3,
             status = 'graded',
             graded_at = $4,
             graded_by = $5
         WHERE id = $1
         RETURNING *`,
        [id, score, feedback, now, gradedBy]
      );
      return res.rows[0] ? mapSubmissionRow(res.rows[0]) : null;
    },

    async createNotification(
      input: Omit<NotificationRecord, '_id' | 'createdAt' | 'read'>
    ): Promise<NotificationRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
         VALUES ($1,$2,$3,$4,$5,FALSE,$6)
         RETURNING *`,
        [id, input.userId, input.title, input.message, input.type, now]
      );
      return mapNotificationRow(res.rows[0]);
    },

    async markNotificationRead(id: string, userId: string): Promise<boolean> {
      const res = await pool.query(
        'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return (res.rowCount ?? 0) > 0;
    },

    async createContactMessage(
      input: Omit<ContactMessageRecord, '_id' | 'createdAt'>
    ): Promise<ContactMessageRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO contact_messages (id, name, email, subject, message, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [id, input.name, input.email, input.subject, input.message, now]
      );
      return mapContactRow(res.rows[0]);
    },

    async createStudyGroup(
      input: Omit<StudyBuddyGroupRecord, '_id' | 'createdAt'>
    ): Promise<StudyBuddyGroupRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO study_groups (id, name, language, level, focus_skill, description, meeting_cadence, max_members, creator_id, creator_name, member_ids, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
         RETURNING *`,
        [
          id,
          input.name,
          input.language,
          input.level,
          input.focusSkill,
          input.description,
          input.meetingCadence,
          input.maxMembers,
          input.creatorId,
          input.creatorName,
          JSON.stringify(input.memberIds || []),
          now,
        ]
      );
      return mapStudyGroupRow(res.rows[0]);
    },

    async toggleStudyGroupMembership(
      groupId: string,
      userId: string
    ): Promise<{ group: StudyBuddyGroupRecord | null; error?: string }> {
      const res = await pool.query('SELECT * FROM study_groups WHERE id = $1 LIMIT 1', [groupId]);
      if (!res.rows[0]) return { group: null, error: 'Study group not found.' };
      const group = mapStudyGroupRow(res.rows[0]);
      const isMember = group.memberIds.includes(userId);
      let nextMembers: string[];
      if (isMember) {
        nextMembers = group.memberIds.filter((id) => id !== userId);
      } else {
        if (group.memberIds.length >= group.maxMembers) {
          return { group, error: 'This peer group is currently full.' };
        }
        nextMembers = [...group.memberIds, userId];
      }
      const updated = await pool.query(
        'UPDATE study_groups SET member_ids = $2::jsonb WHERE id = $1 RETURNING *',
        [groupId, JSON.stringify(nextMembers)]
      );
      return { group: mapStudyGroupRow(updated.rows[0]) };
    },

    async createForumPost(
      input: Omit<StudyForumPostRecord, '_id' | 'createdAt' | 'replies'>
    ): Promise<StudyForumPostRecord> {
      const id = generateId();
      const now = new Date().toISOString();
      const res = await pool.query(
        `INSERT INTO study_forum_posts (id, group_id, language, title, content, author_id, author_name, replies, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'[]'::jsonb,$8)
         RETURNING *`,
        [id, input.groupId, input.language, input.title, input.content, input.authorId, input.authorName, now]
      );
      return mapForumPostRow(res.rows[0]);
    },

    async addForumReply(
      postId: string,
      replyInput: Omit<StudyForumReply, 'id' | 'createdAt'>
    ): Promise<StudyForumPostRecord | null> {
      const res = await pool.query('SELECT * FROM study_forum_posts WHERE id = $1 LIMIT 1', [postId]);
      if (!res.rows[0]) return null;
      const post = mapForumPostRow(res.rows[0]);
      const nextReply: StudyForumReply = {
        id: generateId(),
        ...replyInput,
        createdAt: new Date().toISOString(),
      };
      const nextReplies = [...post.replies, nextReply];
      const updated = await pool.query(
        'UPDATE study_forum_posts SET replies = $2::jsonb WHERE id = $1 RETURNING *',
        [postId, JSON.stringify(nextReplies)]
      );
      return mapForumPostRow(updated.rows[0]);
    },

    async deleteForumPost(postId: string, userId: string, isAdmin: boolean): Promise<boolean> {
      const res = isAdmin
        ? await pool.query('DELETE FROM study_forum_posts WHERE id = $1', [postId])
        : await pool.query('DELETE FROM study_forum_posts WHERE id = $1 AND author_id = $2', [
            postId,
            userId,
          ]);
      return (res.rowCount ?? 0) > 0;
    },
  };
}
