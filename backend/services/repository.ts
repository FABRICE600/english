import { getPostgresPool, isMongoConnected, isPostgresConnected } from '../config/db.ts';
import {
  UserModel,
  CourseModel,
  LessonModel,
  EnrollmentModel,
  AssignmentModel,
  QuizModel,
  QuestionModel,
  SubmissionModel,
  ResultModel,
  NotificationModel,
  ProgressModel,
  ContactMessageModel,
  StudyBuddyGroupModel,
  StudyForumPostModel,
} from '../models/index.ts';
import { computeDailyStreak, toDateKey } from './gamification.ts';
import { createPostgresRepo } from './postgres.ts';
import type {
  UserRecord,
  CourseRecord,
  LessonRecord,
  EnrollmentRecord,
  AssignmentRecord,
  QuizRecord,
  QuestionRecord,
  SubmissionRecord,
  ResultRecord,
  NotificationRecord,
  ProgressRecord,
  ContactMessageRecord,
  StudyBuddyGroupRecord,
  StudyForumPostRecord,
  StudyForumReply,
} from '../types.ts';
import { generateId, getStore, persistLocalStore } from './store.ts';

function getPgRepo() {
  const pool = getPostgresPool();
  if (!pool) return null;
  return createPostgresRepo(pool, generateId);
}

export function sanitizeUser(u: UserRecord) {
  const { passwordHash: _removed, ...safe } = u;
  return safe;
}

export const repo = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    if (isPostgresConnected()) {
      return getPgRepo()!.findUserByEmail(email);
    }
    const normalized = email.trim().toLowerCase();
    if (isMongoConnected()) {
      const doc = await UserModel.findOne({ email: normalized }).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as unknown as UserRecord) : null;
    }
    const db = await getStore();
    return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    if (isPostgresConnected()) {
      return getPgRepo()!.findUserById(id);
    }
    if (isMongoConnected()) {
      const doc = await UserModel.findById(id).lean();
      return doc ? ({ ...doc, _id: String(doc._id) } as unknown as UserRecord) : null;
    }
    const db = await getStore();
    return db.users.find((u) => u._id === id) || null;
  },

  async listUsers(): Promise<UserRecord[]> {
    if (isPostgresConnected()) {
      return getPgRepo()!.listUsers();
    }
    const db = await getStore();
    return db.users;
  },

  async createUser(input: Omit<UserRecord, '_id' | 'createdAt'>): Promise<UserRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createUser(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await UserModel.create(input);
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), createdAt: String(obj.createdAt || now) } as unknown as UserRecord;
    }
    const db = await getStore();
    const record: UserRecord = { ...input, _id: generateId(), createdAt: now };
    db.users.push(record);
    await persistLocalStore(db);
    return record;
  },

  async updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null> {
    if (isPostgresConnected()) {
      return getPgRepo()!.updateUser(id, patch);
    }
    if (isMongoConnected()) {
      const updated = await UserModel.findByIdAndUpdate(id, patch, { new: true }).lean();
      return updated ? ({ ...updated, _id: String(updated._id) } as unknown as UserRecord) : null;
    }
    const db = await getStore();
    const idx = db.users.findIndex((u) => u._id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...patch };
    await persistLocalStore(db);
    return db.users[idx];
  },

  async deleteUser(id: string): Promise<boolean> {
    if (isPostgresConnected()) {
      return getPgRepo()!.deleteUser(id);
    }
    if (isMongoConnected()) {
      const res = await UserModel.findByIdAndDelete(id);
      return Boolean(res);
    }
    const db = await getStore();
    const prev = db.users.length;
    db.users = db.users.filter((u) => u._id !== id);
    if (db.users.length !== prev) {
      await persistLocalStore(db);
      return true;
    }
    return false;
  },

  async createCourse(input: Omit<CourseRecord, '_id' | 'createdAt'>): Promise<CourseRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createCourse(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await CourseModel.create(input);
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), teacherId: String(obj.teacherId), createdAt: now } as unknown as CourseRecord;
    }
    const db = await getStore();
    const record: CourseRecord = { ...input, _id: generateId(), createdAt: now };
    db.courses.push(record);
    await persistLocalStore(db);
    return record;
  },

  async updateCourse(id: string, patch: Partial<CourseRecord>): Promise<CourseRecord | null> {
    if (isPostgresConnected()) {
      return getPgRepo()!.updateCourse(id, patch);
    }
    if (isMongoConnected()) {
      const updated = await CourseModel.findByIdAndUpdate(id, patch, { new: true }).lean();
      return updated ? ({ ...updated, _id: String(updated._id), teacherId: String(updated.teacherId) } as unknown as CourseRecord) : null;
    }
    const db = await getStore();
    const idx = db.courses.findIndex((c) => c._id === id);
    if (idx === -1) return null;
    db.courses[idx] = { ...db.courses[idx], ...patch };
    await persistLocalStore(db);
    return db.courses[idx];
  },

  async deleteCourse(id: string): Promise<boolean> {
    if (isPostgresConnected()) {
      return getPgRepo()!.deleteCourse(id);
    }
    if (isMongoConnected()) {
      const res = await CourseModel.findByIdAndDelete(id);
      await LessonModel.deleteMany({ courseId: id });
      return Boolean(res);
    }
    const db = await getStore();
    const prev = db.courses.length;
    db.courses = db.courses.filter((c) => c._id !== id);
    db.lessons = db.lessons.filter((l) => l.courseId !== id);
    if (db.courses.length !== prev) {
      await persistLocalStore(db);
      return true;
    }
    return false;
  },

  async createLesson(input: Omit<LessonRecord, '_id' | 'createdAt'>): Promise<LessonRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createLesson(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await LessonModel.create(input);
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), courseId: String(obj.courseId), createdAt: now } as unknown as LessonRecord;
    }
    const db = await getStore();
    const record: LessonRecord = { ...input, _id: generateId(), createdAt: now };
    db.lessons.push(record);
    await persistLocalStore(db);
    return record;
  },

  async deleteLesson(id: string): Promise<boolean> {
    if (isPostgresConnected()) {
      return getPgRepo()!.deleteLesson(id);
    }
    if (isMongoConnected()) {
      const res = await LessonModel.findByIdAndDelete(id);
      return Boolean(res);
    }
    const db = await getStore();
    const prev = db.lessons.length;
    db.lessons = db.lessons.filter((l) => l._id !== id);
    if (db.lessons.length !== prev) {
      await persistLocalStore(db);
      return true;
    }
    return false;
  },

  async createEnrollment(input: Omit<EnrollmentRecord, '_id' | 'enrolledAt'>): Promise<EnrollmentRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createEnrollment(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const existing = await EnrollmentModel.findOne({ studentId: input.studentId, courseId: input.courseId }).lean();
      if (existing) {
        return { ...existing, _id: String(existing._id), studentId: String(existing.studentId), courseId: String(existing.courseId) } as unknown as EnrollmentRecord;
      }
      const created = await EnrollmentModel.create({ ...input, enrolledAt: now });
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), studentId: String(obj.studentId), courseId: String(obj.courseId), enrolledAt: now } as unknown as EnrollmentRecord;
    }
    const db = await getStore();
    const existing = db.enrollments.find((e) => e.studentId === input.studentId && e.courseId === input.courseId);
    if (existing) return existing;
    const record: EnrollmentRecord = { ...input, _id: generateId(), enrolledAt: now };
    db.enrollments.push(record);
    await persistLocalStore(db);
    return record;
  },

  async upsertProgress(studentId: string, courseId: string, lessonId: string, quizAverage?: number): Promise<ProgressRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.upsertProgress(studentId, courseId, lessonId, quizAverage);
    }
    const now = new Date().toISOString();
    const todayKey = toDateKey(now);
    if (isMongoConnected()) {
      let doc = await ProgressModel.findOne({ studentId, courseId });
      if (!doc) {
        doc = await ProgressModel.create({
          studentId,
          courseId,
          completedLessonIds: lessonId ? [lessonId] : [],
          quizAverage: quizAverage ?? 0,
          studyMinutes: 25,
          streakDays: 1,
          lastActivityAt: now,
          activityDates: [todayKey],
          dailyActivityLog: { [todayKey]: { minutes: 25, modules: 1 } },
        });
      } else {
        const set = new Set<string>(doc.completedLessonIds || []);
        const isNewLesson = Boolean(lessonId && !set.has(lessonId));
        if (lessonId) set.add(lessonId);
        doc.completedLessonIds = Array.from(set);
        if (typeof quizAverage === 'number') doc.quizAverage = quizAverage;
        doc.studyMinutes = (doc.studyMinutes || 0) + 15;
        doc.lastActivityAt = new Date();
        const dateSet = new Set<string>(doc.activityDates || []);
        dateSet.add(todayKey);
        doc.activityDates = Array.from(dateSet).sort();
        const currentLog = (doc.dailyActivityLog as Record<string, { minutes: number; modules: number }> | undefined) || {};
        const todayEntry = currentLog[todayKey] || { minutes: 0, modules: 0 };
        doc.dailyActivityLog = {
          ...currentLog,
          [todayKey]: {
            minutes: todayEntry.minutes + 15,
            modules: todayEntry.modules + (isNewLesson || typeof quizAverage === 'number' ? 1 : 0),
          },
        };
        await doc.save();
      }
      const [allProg, allResults] = await Promise.all([
        ProgressModel.find({ studentId }).lean(),
        ResultModel.find({ studentId }).lean(),
      ]);
      const streak = computeDailyStreak(
        allProg.map((p) => ({
          ...p,
          _id: String(p._id),
          studentId: String(p.studentId),
          courseId: String(p.courseId),
          lastActivityAt: p.lastActivityAt ? new Date(p.lastActivityAt).toISOString() : now,
        })) as unknown as ProgressRecord[],
        allResults.map((r) => ({
          ...r,
          _id: String(r._id),
          quizId: String(r.quizId),
          courseId: String(r.courseId),
          studentId: String(r.studentId),
          completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : now,
        })) as unknown as ResultRecord[]
      );
      if (doc.streakDays !== streak.currentStreak) {
        doc.streakDays = Math.max(1, streak.currentStreak);
        await doc.save();
      }
      const obj = doc.toObject();
      return { ...obj, _id: String(obj._id), studentId: String(obj.studentId), courseId: String(obj.courseId), lastActivityAt: now } as unknown as ProgressRecord;
    }

    const db = await getStore();
    let rec = db.progress.find((p) => p.studentId === studentId && p.courseId === courseId);
    if (!rec) {
      rec = {
        _id: generateId(),
        studentId,
        courseId,
        completedLessonIds: lessonId ? [lessonId] : [],
        quizAverage: quizAverage ?? 0,
        studyMinutes: 25,
        streakDays: 1,
        lastActivityAt: now,
        activityDates: [todayKey],
        dailyActivityLog: { [todayKey]: { minutes: 25, modules: 1 } },
      };
      db.progress.push(rec);
    } else {
      const isNewLesson = Boolean(lessonId && !rec.completedLessonIds.includes(lessonId));
      if (lessonId && !rec.completedLessonIds.includes(lessonId)) {
        rec.completedLessonIds.push(lessonId);
      }
      if (typeof quizAverage === 'number') {
        rec.quizAverage = quizAverage;
      }
      rec.studyMinutes += 15;
      rec.lastActivityAt = now;
      const dateSet = new Set<string>(rec.activityDates || []);
      dateSet.add(todayKey);
      rec.activityDates = Array.from(dateSet).sort();
      rec.dailyActivityLog = rec.dailyActivityLog || {};
      const todayEntry = rec.dailyActivityLog[todayKey] || { minutes: 0, modules: 0 };
      rec.dailyActivityLog[todayKey] = {
        minutes: todayEntry.minutes + 15,
        modules: todayEntry.modules + (isNewLesson || typeof quizAverage === 'number' ? 1 : 0),
      };
    }

    const studentProgress = db.progress.filter((p) => p.studentId === studentId);
    const studentResults = db.results.filter((r) => r.studentId === studentId);
    const computedStreak = computeDailyStreak(studentProgress, studentResults);
    for (const p of studentProgress) {
      p.streakDays = Math.max(1, computedStreak.currentStreak);
    }

    const courseLessons = db.lessons.filter((l) => l.courseId === courseId);
    const enrollment = db.enrollments.find((e) => e.studentId === studentId && e.courseId === courseId);
    if (enrollment && courseLessons.length > 0) {
      enrollment.completionPercent = Math.min(100, Math.round((rec.completedLessonIds.length / courseLessons.length) * 100));
      if (enrollment.completionPercent === 100) enrollment.status = 'completed';
    }

    await persistLocalStore(db);
    return rec;
  },

  async createQuizWithQuestions(
    quizInput: Omit<QuizRecord, '_id' | 'createdAt'>,
    questionsInput: Omit<QuestionRecord, '_id' | 'quizId'>[]
  ): Promise<{ quiz: QuizRecord; questions: QuestionRecord[] }> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createQuizWithQuestions(quizInput, questionsInput);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const qDoc = await QuizModel.create(quizInput);
      const qObj = qDoc.toObject();
      const quizId = String(qObj._id);
      const createdQuestions = await QuestionModel.insertMany(
        questionsInput.map((item) => ({ ...item, quizId }))
      );
      return {
        quiz: { ...qObj, _id: quizId, courseId: String(qObj.courseId), teacherId: String(qObj.teacherId), createdAt: now } as unknown as QuizRecord,
        questions: createdQuestions.map((d) => {
          const o = d.toObject();
          return { ...o, _id: String(o._id), quizId } as unknown as QuestionRecord;
        }),
      };
    }

    const db = await getStore();
    const quiz: QuizRecord = { ...quizInput, _id: generateId(), createdAt: now };
    const questions: QuestionRecord[] = questionsInput.map((item) => ({
      ...item,
      _id: generateId(),
      quizId: quiz._id,
    }));
    db.quizzes.push(quiz);
    db.questions.push(...questions);
    await persistLocalStore(db);
    return { quiz, questions };
  },

  async createResult(input: Omit<ResultRecord, '_id' | 'completedAt'>): Promise<ResultRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createResult(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await ResultModel.create({ ...input, completedAt: now });
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), quizId: String(obj.quizId), courseId: String(obj.courseId), studentId: String(obj.studentId), completedAt: now } as unknown as ResultRecord;
    }
    const db = await getStore();
    const record: ResultRecord = { ...input, _id: generateId(), completedAt: now };
    db.results.push(record);
    await persistLocalStore(db);
    return record;
  },

  async createAssignment(input: Omit<AssignmentRecord, '_id' | 'createdAt'>): Promise<AssignmentRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createAssignment(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await AssignmentModel.create(input);
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), courseId: String(obj.courseId), teacherId: String(obj.teacherId), createdAt: now } as unknown as AssignmentRecord;
    }
    const db = await getStore();
    const record: AssignmentRecord = { ...input, _id: generateId(), createdAt: now };
    db.assignments.push(record);
    await persistLocalStore(db);
    return record;
  },

  async createSubmission(input: Omit<SubmissionRecord, '_id' | 'submittedAt'>): Promise<SubmissionRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createSubmission(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await SubmissionModel.create({ ...input, submittedAt: now });
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), assignmentId: String(obj.assignmentId), courseId: String(obj.courseId), studentId: String(obj.studentId), submittedAt: now } as unknown as SubmissionRecord;
    }
    const db = await getStore();
    const record: SubmissionRecord = { ...input, _id: generateId(), submittedAt: now };
    db.submissions.push(record);
    await persistLocalStore(db);
    return record;
  },

  async gradeSubmission(id: string, score: number, feedback: string, gradedBy: string): Promise<SubmissionRecord | null> {
    if (isPostgresConnected()) {
      return getPgRepo()!.gradeSubmission(id, score, feedback, gradedBy);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const updated = await SubmissionModel.findByIdAndUpdate(
        id,
        { score, feedback, status: 'graded', gradedAt: now, gradedBy },
        { new: true }
      ).lean();
      return updated ? ({ ...updated, _id: String(updated._id) } as unknown as SubmissionRecord) : null;
    }
    const db = await getStore();
    const idx = db.submissions.findIndex((s) => s._id === id);
    if (idx === -1) return null;
    db.submissions[idx] = {
      ...db.submissions[idx],
      score,
      feedback,
      status: 'graded',
      gradedAt: now,
      gradedBy,
    };
    await persistLocalStore(db);
    return db.submissions[idx];
  },

  async createNotification(input: Omit<NotificationRecord, '_id' | 'createdAt' | 'read'>): Promise<NotificationRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createNotification(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await NotificationModel.create({ ...input, read: false });
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), userId: String(obj.userId), createdAt: now } as unknown as NotificationRecord;
    }
    const db = await getStore();
    const record: NotificationRecord = { ...input, _id: generateId(), read: false, createdAt: now };
    db.notifications.unshift(record);
    await persistLocalStore(db);
    return record;
  },

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    if (isPostgresConnected()) {
      return getPgRepo()!.markNotificationRead(id, userId);
    }
    if (isMongoConnected()) {
      const res = await NotificationModel.updateOne({ _id: id, userId }, { read: true });
      return res.modifiedCount > 0;
    }
    const db = await getStore();
    const notif = db.notifications.find((n) => n._id === id && n.userId === userId);
    if (!notif) return false;
    notif.read = true;
    await persistLocalStore(db);
    return true;
  },

  async createContactMessage(input: Omit<ContactMessageRecord, '_id' | 'createdAt'>): Promise<ContactMessageRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createContactMessage(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await ContactMessageModel.create(input);
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), createdAt: now } as unknown as ContactMessageRecord;
    }
    const db = await getStore();
    const record: ContactMessageRecord = { ...input, _id: generateId(), createdAt: now };
    db.contactMessages.unshift(record);
    await persistLocalStore(db);
    return record;
  },

  async createStudyGroup(
    input: Omit<StudyBuddyGroupRecord, '_id' | 'createdAt'>
  ): Promise<StudyBuddyGroupRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createStudyGroup(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await StudyBuddyGroupModel.create(input);
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), createdAt: now } as unknown as StudyBuddyGroupRecord;
    }
    const db = await getStore();
    const record: StudyBuddyGroupRecord = { ...input, _id: generateId(), createdAt: now };
    db.studyGroups = [record, ...(db.studyGroups || [])];
    await persistLocalStore(db);
    return record;
  },

  async toggleStudyGroupMembership(
    groupId: string,
    userId: string
  ): Promise<{ group: StudyBuddyGroupRecord | null; error?: string }> {
    if (isPostgresConnected()) {
      return getPgRepo()!.toggleStudyGroupMembership(groupId, userId);
    }
    if (isMongoConnected()) {
      const doc = await StudyBuddyGroupModel.findById(groupId);
      if (!doc) return { group: null, error: 'Study group not found.' };
      const members = Array.isArray(doc.memberIds) ? [...doc.memberIds] : [];
      if (members.includes(userId)) {
        doc.memberIds = members.filter((id: string) => id !== userId);
      } else {
        if (members.length >= (doc.maxMembers || 6)) {
          const obj = doc.toObject();
          return {
            group: { ...obj, _id: String(obj._id) } as unknown as StudyBuddyGroupRecord,
            error: 'This peer group is currently full.',
          };
        }
        doc.memberIds = [...members, userId];
      }
      await doc.save();
      const obj = doc.toObject();
      return { group: { ...obj, _id: String(obj._id) } as unknown as StudyBuddyGroupRecord };
    }
    const db = await getStore();
    const group = (db.studyGroups || []).find((g) => g._id === groupId);
    if (!group) return { group: null, error: 'Study group not found.' };
    if (group.memberIds.includes(userId)) {
      group.memberIds = group.memberIds.filter((id) => id !== userId);
    } else {
      if (group.memberIds.length >= group.maxMembers) {
        return { group, error: 'This peer group is currently full.' };
      }
      group.memberIds.push(userId);
    }
    await persistLocalStore(db);
    return { group };
  },

  async createForumPost(
    input: Omit<StudyForumPostRecord, '_id' | 'createdAt' | 'replies'>
  ): Promise<StudyForumPostRecord> {
    if (isPostgresConnected()) {
      return getPgRepo()!.createForumPost(input);
    }
    const now = new Date().toISOString();
    if (isMongoConnected()) {
      const created = await StudyForumPostModel.create({ ...input, replies: [] });
      const obj = created.toObject();
      return { ...obj, _id: String(obj._id), createdAt: now } as unknown as StudyForumPostRecord;
    }
    const db = await getStore();
    const record: StudyForumPostRecord = {
      ...input,
      _id: generateId(),
      replies: [],
      createdAt: now,
    };
    db.forumPosts = [record, ...(db.forumPosts || [])];
    await persistLocalStore(db);
    return record;
  },

  async addForumReply(
    postId: string,
    replyInput: Omit<StudyForumReply, 'id' | 'createdAt'>
  ): Promise<StudyForumPostRecord | null> {
    if (isPostgresConnected()) {
      return getPgRepo()!.addForumReply(postId, replyInput);
    }
    const reply: StudyForumReply = {
      id: generateId(),
      ...replyInput,
      createdAt: new Date().toISOString(),
    };
    if (isMongoConnected()) {
      const doc = await StudyForumPostModel.findById(postId);
      if (!doc) return null;
      doc.replies = [...(doc.replies || []), reply];
      await doc.save();
      const obj = doc.toObject();
      return { ...obj, _id: String(obj._id) } as unknown as StudyForumPostRecord;
    }
    const db = await getStore();
    const post = (db.forumPosts || []).find((p) => p._id === postId);
    if (!post) return null;
    post.replies.push(reply);
    await persistLocalStore(db);
    return post;
  },

  async deleteForumPost(postId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    if (isPostgresConnected()) {
      return getPgRepo()!.deleteForumPost(postId, userId, isAdmin);
    }
    if (isMongoConnected()) {
      const filter = isAdmin ? { _id: postId } : { _id: postId, authorId: userId };
      const res = await StudyForumPostModel.findOneAndDelete(filter);
      return Boolean(res);
    }
    const db = await getStore();
    const prev = (db.forumPosts || []).length;
    db.forumPosts = (db.forumPosts || []).filter((p) =>
      p._id === postId ? !(isAdmin || p.authorId === userId) : true
    );
    if (db.forumPosts.length !== prev) {
      await persistLocalStore(db);
      return true;
    }
    return false;
  },
};
