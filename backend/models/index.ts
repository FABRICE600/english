import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    teacherApproved: { type: Boolean, default: true },
    preferredLanguage: { type: String, enum: ['english', 'french', 'both'], default: 'both' },
    bio: { type: String, default: '' },
    expertise: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    dailyGoal: {
      type: { type: String, enum: ['minutes', 'modules'], default: 'minutes' },
      target: { type: Number, default: 30 },
      updatedAt: { type: String },
    },
    studySchedule: [
      {
        id: String,
        dayOfWeek: { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
        language: { type: String, enum: ['english', 'french'] },
        skill: {
          type: String,
          enum: ['alphabet', 'pronunciation', 'grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'],
        },
        startTime: String,
        durationMinutes: Number,
        note: { type: String, default: '' },
        completed: { type: Boolean, default: false },
        createdAt: String,
      },
    ],
  },
  { timestamps: true }
);

const CourseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    language: { type: String, enum: ['english', 'french'], required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teacherName: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    published: { type: Boolean, default: true },
    durationHours: { type: Number, default: 12 },
  },
  { timestamps: true }
);

const LessonSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true },
    language: { type: String, enum: ['english', 'french'], required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    skillType: {
      type: String,
      enum: ['alphabet', 'pronunciation', 'grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'],
      required: true,
    },
    order: { type: Number, default: 1 },
    summary: { type: String, default: '' },
    content: { type: String, required: true },
    videoUrl: { type: String, default: '' },
    pdfTitle: { type: String, default: '' },
    pdfContent: { type: String, default: '' },
    examples: [
      {
        phrase: String,
        phonetic: String,
        translation: String,
      },
    ],
  },
  { timestamps: true }
);

const EnrollmentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    language: { type: String, enum: ['english', 'french'], required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    completionPercent: { type: Number, default: 0 },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
EnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const AssignmentSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    language: { type: String, enum: ['english', 'french'], required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    instructions: { type: String, required: true },
    dueDate: { type: String, required: true },
    maxScore: { type: Number, default: 100 },
  },
  { timestamps: true }
);

const QuizSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    language: { type: String, enum: ['english', 'french'], required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    isExam: { type: Boolean, default: false },
    timeLimitMinutes: { type: Number, default: 20 },
    passingScore: { type: Number, default: 70 },
  },
  { timestamps: true }
);

const QuestionSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: { type: String, enum: ['mcq', 'fill_blank', 'matching', 'sentence_build'], required: true },
    prompt: { type: String, required: true },
    options: [{ type: String }],
    pairs: [{ left: String, right: String }],
    wordBank: [{ type: String }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String, required: true },
    points: { type: Number, default: 10 },
  },
  { timestamps: true }
);

const SubmissionSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    content: { type: String, required: true },
    attachmentName: { type: String, default: '' },
    status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
    score: { type: Number, default: null },
    feedback: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const ResultSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    quizTitle: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    language: { type: String, enum: ['english', 'french'], required: true },
    isExam: { type: Boolean, default: false },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    score: { type: Number, required: true },
    totalPoints: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    answers: [
      {
        questionId: String,
        prompt: String,
        type: String,
        submittedAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean,
        pointsEarned: Number,
        pointsPossible: Number,
        explanation: String,
      },
    ],
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning'], default: 'info' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ProgressSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    completedLessonIds: [{ type: String }],
    quizAverage: { type: Number, default: 0 },
    studyMinutes: { type: Number, default: 0 },
    streakDays: { type: Number, default: 1 },
    lastActivityAt: { type: Date, default: Date.now },
    activityDates: [{ type: String }],
    dailyActivityLog: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
ProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const ContactMessageSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const StudyBuddyGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    language: { type: String, enum: ['english', 'french'], required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    focusSkill: {
      type: String,
      enum: ['alphabet', 'pronunciation', 'grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'],
      required: true,
    },
    description: { type: String, required: true },
    meetingCadence: { type: String, default: 'Twice weekly · Peer review' },
    maxMembers: { type: Number, default: 6 },
    creatorId: { type: String, required: true },
    creatorName: { type: String, required: true },
    memberIds: [{ type: String }],
  },
  { timestamps: true }
);

const StudyForumPostSchema = new Schema(
  {
    groupId: { type: String, default: null },
    language: { type: String, enum: ['english', 'french'], required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    replies: [
      {
        id: String,
        authorId: String,
        authorName: String,
        content: String,
        createdAt: String,
      },
    ],
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const CourseModel = mongoose.models.Course || mongoose.model('Course', CourseSchema);
export const LessonModel = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
export const EnrollmentModel = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
export const AssignmentModel = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
export const QuizModel = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
export const QuestionModel = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export const SubmissionModel = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
export const ResultModel = mongoose.models.Result || mongoose.model('Result', ResultSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const ProgressModel = mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);
export const ContactMessageModel = mongoose.models.ContactMessage || mongoose.model('ContactMessage', ContactMessageSchema);
export const StudyBuddyGroupModel = mongoose.models.StudyBuddyGroup || mongoose.model('StudyBuddyGroup', StudyBuddyGroupSchema);
export const StudyForumPostModel = mongoose.models.StudyForumPost || mongoose.model('StudyForumPost', StudyForumPostSchema);
