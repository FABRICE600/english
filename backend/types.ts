export type UserRole = 'student' | 'teacher' | 'admin';
export type LanguageChoice = 'english' | 'french';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type SkillType =
  | 'alphabet'
  | 'pronunciation'
  | 'grammar'
  | 'vocabulary'
  | 'speaking'
  | 'listening'
  | 'reading'
  | 'writing';

export type QuestionType = 'mcq' | 'fill_blank' | 'matching' | 'sentence_build';

export type StudyDayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface StudySessionPlan {
  id: string;
  dayOfWeek: StudyDayOfWeek;
  language: LanguageChoice;
  skill: SkillType;
  startTime: string;
  durationMinutes: number;
  note: string;
  completed: boolean;
  createdAt: string;
}

export interface DailyGoalConfig {
  type: 'minutes' | 'modules';
  target: number;
  updatedAt: string;
}

export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  teacherApproved: boolean;
  preferredLanguage: 'english' | 'french' | 'both';
  bio: string;
  expertise: string;
  avatarUrl: string;
  dailyGoal?: DailyGoalConfig;
  studySchedule?: StudySessionPlan[];
  createdAt: string;
}

export interface CourseRecord {
  _id: string;
  title: string;
  language: LanguageChoice;
  level: CourseLevel;
  category: string;
  description: string;
  teacherId: string;
  teacherName: string;
  thumbnailUrl: string;
  published: boolean;
  durationHours: number;
  createdAt: string;
}

export interface LessonExample {
  phrase: string;
  phonetic: string;
  translation: string;
}

export interface LessonRecord {
  _id: string;
  courseId: string;
  title: string;
  language: LanguageChoice;
  level: CourseLevel;
  skillType: SkillType;
  order: number;
  summary: string;
  content: string;
  videoUrl: string;
  pdfTitle: string;
  pdfContent: string;
  examples: LessonExample[];
  createdAt: string;
}

export interface EnrollmentRecord {
  _id: string;
  studentId: string;
  courseId: string;
  language: LanguageChoice;
  status: 'active' | 'completed';
  completionPercent: number;
  enrolledAt: string;
}

export interface AssignmentRecord {
  _id: string;
  courseId: string;
  teacherId: string;
  title: string;
  language: LanguageChoice;
  level: CourseLevel;
  instructions: string;
  dueDate: string;
  maxScore: number;
  createdAt: string;
}

export interface QuizRecord {
  _id: string;
  courseId: string;
  teacherId: string;
  title: string;
  description: string;
  language: LanguageChoice;
  level: CourseLevel;
  isExam: boolean;
  timeLimitMinutes: number;
  passingScore: number;
  createdAt: string;
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface QuestionRecord {
  _id: string;
  quizId: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  pairs: MatchingPair[];
  wordBank: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface SubmissionRecord {
  _id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  content: string;
  attachmentName: string;
  status: 'submitted' | 'graded';
  score: number | null;
  feedback: string;
  submittedAt: string;
  gradedAt: string | null;
  gradedBy: string | null;
}

export interface AnswerReview {
  questionId: string;
  prompt: string;
  type: QuestionType;
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  explanation: string;
}

export interface ResultRecord {
  _id: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  language: LanguageChoice;
  isExam: boolean;
  studentId: string;
  studentName: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  answers: AnswerReview[];
  completedAt: string;
}

export interface NotificationRecord {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

export interface ProgressRecord {
  _id: string;
  studentId: string;
  courseId: string;
  completedLessonIds: string[];
  quizAverage: number;
  studyMinutes: number;
  streakDays: number;
  lastActivityAt: string;
  activityDates?: string[];
  dailyActivityLog?: Record<string, { minutes: number; modules: number }>;
}

export interface ContactMessageRecord {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface StudyBuddyGroupRecord {
  _id: string;
  name: string;
  language: LanguageChoice;
  level: CourseLevel;
  focusSkill: SkillType;
  description: string;
  meetingCadence: string;
  maxMembers: number;
  creatorId: string;
  creatorName: string;
  memberIds: string[];
  createdAt: string;
}

export interface StudyForumReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface StudyForumPostRecord {
  _id: string;
  groupId: string | null;
  language: LanguageChoice;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  replies: StudyForumReply[];
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  courses: CourseRecord[];
  lessons: LessonRecord[];
  enrollments: EnrollmentRecord[];
  assignments: AssignmentRecord[];
  quizzes: QuizRecord[];
  questions: QuestionRecord[];
  submissions: SubmissionRecord[];
  results: ResultRecord[];
  notifications: NotificationRecord[];
  progress: ProgressRecord[];
  contactMessages: ContactMessageRecord[];
  studyGroups: StudyBuddyGroupRecord[];
  forumPosts: StudyForumPostRecord[];
}
