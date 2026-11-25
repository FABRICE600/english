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

export type PageRoute =
  | '/'
  | '/about'
  | '/courses'
  | '/english'
  | '/french'
  | '/grammar'
  | '/vocabulary'
  | '/listening'
  | '/speaking'
  | '/reading'
  | '/writing'
  | '/videos'
  | '/exams'
  | '/dashboard/student'
  | '/dashboard/teacher'
  | '/dashboard/admin'
  | '/login'
  | '/register'
  | '/profile'
  | '/contact';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  teacherApproved: boolean;
  preferredLanguage: 'english' | 'french' | 'both';
  bio: string;
  expertise: string;
  avatarUrl: string;
  createdAt: string;
}

export interface Course {
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
  lessonsCount?: number;
  enrolledCount?: number;
  quizzesCount?: number;
  isEnrolled?: boolean;
  createdAt: string;
}

export interface LessonExample {
  phrase: string;
  phonetic: string;
  translation: string;
}

export interface Lesson {
  _id: string;
  courseId: string;
  courseTitle?: string;
  teacherId?: string;
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
  completed?: boolean;
  createdAt: string;
}

export interface Quiz {
  _id: string;
  courseId: string;
  courseTitle?: string;
  teacherId: string;
  title: string;
  description: string;
  language: LanguageChoice;
  level: CourseLevel;
  isExam: boolean;
  timeLimitMinutes: number;
  passingScore: number;
  questionCount?: number;
  totalPoints?: number;
  latestResult?: QuizResult | null;
  createdAt: string;
}

export interface Question {
  _id: string;
  quizId: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  pairs: Array<{ left: string; right: string }>;
  wordBank: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
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

export interface QuizResult {
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

export interface Assignment {
  _id: string;
  courseId: string;
  courseTitle?: string;
  teacherId: string;
  title: string;
  language: LanguageChoice;
  level: CourseLevel;
  instructions: string;
  dueDate: string;
  maxScore: number;
  mySubmission?: Submission | null;
  totalSubmissions?: number;
  createdAt: string;
}

export interface Submission {
  _id: string;
  assignmentId: string;
  assignmentTitle?: string;
  maxScore?: number;
  courseId: string;
  courseTitle?: string;
  language?: LanguageChoice;
  studentId: string;
  studentName: string;
  content: string;
  attachmentName: string;
  status: 'submitted' | 'graded';
  score: number | null;
  feedback: string;
  submittedAt: string;
  gradedAt: string | null;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}
