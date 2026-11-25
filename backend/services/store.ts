import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import type { DatabaseSchema } from '../types.ts';
import { buildSeedData } from './seed.ts';
import {
  getPostgresPool,
  isMongoConnected,
  isPostgresConnected,
} from '../config/db.ts';
import { getPostgresStore, seedPostgresIfEmpty } from './postgres.ts';
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

const DATA_DIR = path.resolve(process.cwd(), 'backend', 'data');
const STORE_PATH = path.join(DATA_DIR, 'lingualearn-db.json');

let memoryStore: DatabaseSchema | null = null;

export function generateId(): string {
  return new mongoose.Types.ObjectId().toString();
}

export async function initializeStore(): Promise<void> {
  if (isPostgresConnected()) {
    const pool = getPostgresPool()!;
    const seed = await buildSeedData();
    await seedPostgresIfEmpty(pool, seed);
    return;
  }

  if (isMongoConnected()) {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const seed = await buildSeedData();
      await UserModel.insertMany(seed.users);
      await CourseModel.insertMany(seed.courses);
      await LessonModel.insertMany(seed.lessons);
      await EnrollmentModel.insertMany(seed.enrollments);
      await AssignmentModel.insertMany(seed.assignments);
      await QuizModel.insertMany(seed.quizzes);
      await QuestionModel.insertMany(seed.questions);
      await SubmissionModel.insertMany(seed.submissions);
      await ResultModel.insertMany(seed.results);
      await NotificationModel.insertMany(seed.notifications);
      await ProgressModel.insertMany(seed.progress);
      await StudyBuddyGroupModel.insertMany(seed.studyGroups);
      await StudyForumPostModel.insertMany(seed.forumPosts);
      console.log('[LinguaLearn] Seeded MongoDB Atlas collections');
    } else {
      const groupCount = await StudyBuddyGroupModel.countDocuments();
      if (groupCount === 0) {
        const seed = await buildSeedData();
        await StudyBuddyGroupModel.insertMany(seed.studyGroups);
        await StudyForumPostModel.insertMany(seed.forumPosts);
      }
    }
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      memoryStore = JSON.parse(raw) as DatabaseSchema;
      const seed = await buildSeedData();
      const existingTitles = new Set(memoryStore.lessons.map((l) => l.title));
      let added = false;
      for (const seedLesson of seed.lessons) {
        if (!existingTitles.has(seedLesson.title)) {
          const seedCourse = seed.courses.find((c) => c._id === seedLesson.courseId);
          const targetCourse =
            memoryStore.courses.find((c) => seedCourse && c.title === seedCourse.title) ||
            memoryStore.courses.find((c) => c.language === seedLesson.language && c.level === seedLesson.level);
          if (targetCourse) {
            memoryStore.lessons.push({ ...seedLesson, courseId: targetCourse._id });
            added = true;
          }
        }
      }
      if (!Array.isArray(memoryStore.studyGroups) || memoryStore.studyGroups.length === 0) {
        memoryStore.studyGroups = seed.studyGroups;
        added = true;
      }
      if (!Array.isArray(memoryStore.forumPosts) || memoryStore.forumPosts.length === 0) {
        memoryStore.forumPosts = seed.forumPosts;
        added = true;
      }
      if (added) {
        fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
      }
      return;
    } catch {
      // Rebuild if corrupted
    }
  }

  memoryStore = await buildSeedData();
  fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  console.log('[LinguaLearn] Initialized persistent local store with English & French seed data');
}

export async function getStore(): Promise<DatabaseSchema> {
  if (isPostgresConnected()) {
    return getPostgresStore(getPostgresPool()!);
  }

  if (isMongoConnected()) {
    const [
      users,
      courses,
      lessons,
      enrollments,
      assignments,
      quizzes,
      questions,
      submissions,
      results,
      notifications,
      progress,
      contactMessages,
      studyGroups,
      forumPosts,
    ] = await Promise.all([
      UserModel.find().lean(),
      CourseModel.find().lean(),
      LessonModel.find().lean(),
      EnrollmentModel.find().lean(),
      AssignmentModel.find().lean(),
      QuizModel.find().lean(),
      QuestionModel.find().lean(),
      SubmissionModel.find().lean(),
      ResultModel.find().lean(),
      NotificationModel.find().lean(),
      ProgressModel.find().lean(),
      ContactMessageModel.find().lean(),
      StudyBuddyGroupModel.find().lean(),
      StudyForumPostModel.find().lean(),
    ]);
    const normalize = <T extends Record<string, unknown>>(arr: T[]) =>
      arr.map((doc) => ({ ...doc, _id: String(doc._id) }));

    return {
      users: normalize(users) as unknown as DatabaseSchema['users'],
      courses: normalize(courses) as unknown as DatabaseSchema['courses'],
      lessons: normalize(lessons) as unknown as DatabaseSchema['lessons'],
      enrollments: normalize(enrollments) as unknown as DatabaseSchema['enrollments'],
      assignments: normalize(assignments) as unknown as DatabaseSchema['assignments'],
      quizzes: normalize(quizzes) as unknown as DatabaseSchema['quizzes'],
      questions: normalize(questions) as unknown as DatabaseSchema['questions'],
      submissions: normalize(submissions) as unknown as DatabaseSchema['submissions'],
      results: normalize(results) as unknown as DatabaseSchema['results'],
      notifications: normalize(notifications) as unknown as DatabaseSchema['notifications'],
      progress: normalize(progress) as unknown as DatabaseSchema['progress'],
      contactMessages: normalize(contactMessages) as unknown as DatabaseSchema['contactMessages'],
      studyGroups: normalize(studyGroups) as unknown as DatabaseSchema['studyGroups'],
      forumPosts: normalize(forumPosts) as unknown as DatabaseSchema['forumPosts'],
    };
  }

  if (!memoryStore) {
    await initializeStore();
  }
  return memoryStore!;
}

export async function persistLocalStore(updated: DatabaseSchema): Promise<void> {
  memoryStore = updated;
  if (!isMongoConnected() && !isPostgresConnected()) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  }
}
