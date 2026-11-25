import type {
  CourseRecord,
  EnrollmentRecord,
  LessonRecord,
  ProgressRecord,
  QuestionRecord,
  QuizRecord,
  ResultRecord,
  SubmissionRecord,
  UserRecord,
} from '../types.ts';

export interface StreakDayItem {
  date: string;
  label: string;
  active: boolean;
  isToday: boolean;
}

export interface StudyStreakSummary {
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  activeDaysTotal: number;
  recentDays: StreakDayItem[];
}

export interface QuizScoreStreakSummary {
  currentHighScoreStreak: number;
  bestHighScoreStreak: number;
  threshold: number;
}

export type BadgeCategory = 'milestone' | 'consistency' | 'quiz_streak' | 'mastery';
export type BadgeIcon =
  | 'book'
  | 'graduation'
  | 'globe'
  | 'flame'
  | 'award'
  | 'zap'
  | 'trophy'
  | 'pen';

export interface StudentBadge {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  icon: BadgeIcon;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
  earnedAt: string | null;
}

export function toDateKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function addDaysToKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function getWeekdayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()] || '';
}

export function collectActivityDateSet(
  progressList: ProgressRecord[],
  resultsList: ResultRecord[]
): Set<string> {
  const dates = new Set<string>();

  for (const r of resultsList) {
    if (r.completedAt) {
      dates.add(toDateKey(r.completedAt));
    }
  }

  for (const p of progressList) {
    if (Array.isArray(p.activityDates)) {
      for (const d of p.activityDates) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          dates.add(d);
        }
      }
    }

    if (p.lastActivityAt && (p.completedLessonIds.length > 0 || p.quizAverage > 0)) {
      const lastKey = toDateKey(p.lastActivityAt);
      dates.add(lastKey);

      // Backfill seeded streak continuity when explicit activityDates have not been recorded yet
      const recordedCount = p.activityDates?.length ?? 0;
      if (recordedCount === 0 && p.streakDays > 1) {
        for (let i = 1; i < p.streakDays; i++) {
          dates.add(addDaysToKey(lastKey, -i));
        }
      }
    }
  }

  return dates;
}

export function computeDailyStreak(
  progressList: ProgressRecord[],
  resultsList: ResultRecord[],
  now = new Date()
): StudyStreakSummary {
  const todayKey = toDateKey(now);
  const yesterdayKey = addDaysToKey(todayKey, -1);
  const activeDates = collectActivityDateSet(progressList, resultsList);
  const completedToday = activeDates.has(todayKey);

  // Determine current consecutive streak ending today (or yesterday if not yet completed today)
  let currentStreak = 0;
  let cursor: string | null = completedToday
    ? todayKey
    : activeDates.has(yesterdayKey)
      ? yesterdayKey
      : null;

  while (cursor && activeDates.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysToKey(cursor, -1);
  }

  // Compute longest consecutive streak across all recorded dates
  const sortedDates = Array.from(activeDates).sort();
  let longestStreak = 0;
  let running = 0;
  let prevKey: string | null = null;

  for (const key of sortedDates) {
    if (prevKey && addDaysToKey(prevKey, 1) === key) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > longestStreak) longestStreak = running;
    prevKey = key;
  }

  const maxStoredStreak = progressList.reduce((max, p) => Math.max(max, p.streakDays || 0), 0);
  longestStreak = Math.max(longestStreak, currentStreak, maxStoredStreak);

  // Build 7-day activity window ending today
  const recentDays: StreakDayItem[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const key = addDaysToKey(todayKey, offset);
    recentDays.push({
      date: key,
      label: getWeekdayShort(key),
      active: activeDates.has(key),
      isToday: offset === 0,
    });
  }

  return {
    currentStreak,
    longestStreak,
    completedToday,
    activeDaysTotal: activeDates.size,
    recentDays,
  };
}

export function computeQuizScoreStreak(
  resultsList: ResultRecord[],
  threshold = 80
): QuizScoreStreakSummary {
  const ordered = [...resultsList].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  let best = 0;
  let running = 0;

  for (const r of ordered) {
    if (r.percentage >= threshold) {
      running += 1;
      if (running > best) best = running;
    } else {
      running = 0;
    }
  }

  return {
    currentHighScoreStreak: running,
    bestHighScoreStreak: best,
    threshold,
  };
}

export function computeStudentBadges(params: {
  progressList: ProgressRecord[];
  enrollments: Array<EnrollmentRecord & { completionPercent: number; doneLessons: number; totalLessons: number; course?: CourseRecord }>;
  resultsList: ResultRecord[];
  submissionsList: SubmissionRecord[];
  studyStreak: StudyStreakSummary;
  quizStreak: QuizScoreStreakSummary;
}): StudentBadge[] {
  const { progressList, enrollments, resultsList, submissionsList, studyStreak, quizStreak } = params;

  const totalCompletedLessons = progressList.reduce((sum, p) => sum + p.completedLessonIds.length, 0);
  const completedCoursesCount = enrollments.filter((e) => e.completionPercent >= 100).length;
  const maxCoursePct = enrollments.reduce((max, e) => Math.max(max, e.completionPercent), 0);

  const engLessons = enrollments
    .filter((e) => e.course?.language === 'english')
    .reduce((sum, e) => sum + e.doneLessons, 0);
  const freLessons = enrollments
    .filter((e) => e.course?.language === 'french')
    .reduce((sum, e) => sum + e.doneLessons, 0);
  const languagesPracticed = (engLessons > 0 ? 1 : 0) + (freLessons > 0 ? 1 : 0);

  const highScoreResults = [...resultsList]
    .filter((r) => r.percentage >= 85)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  const examHonorsResults = [...resultsList]
    .filter((r) => r.isExam && r.passed && r.percentage >= 85)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  const gradedHighSubmissions = [...submissionsList]
    .filter((s) => s.status === 'graded' && (s.score ?? 0) >= 85)
    .sort((a, b) => (a.gradedAt || a.submittedAt).localeCompare(b.gradedAt || b.submittedAt));

  const orderedResults = [...resultsList].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  let streakEarnedAt: string | null = null;
  let consecutiveHigh = 0;
  for (const r of orderedResults) {
    if (r.percentage >= quizStreak.threshold) {
      consecutiveHigh += 1;
      if (consecutiveHigh >= 2 && !streakEarnedAt) {
        streakEarnedAt = r.completedAt;
      }
    } else {
      consecutiveHigh = 0;
    }
  }

  const latestProgressDate =
    progressList.map((p) => p.lastActivityAt).sort().pop() || null;

  return [
    {
      id: 'first-lesson',
      title: 'First Step',
      description: 'Complete your first English or French lesson.',
      category: 'milestone',
      icon: 'book',
      earned: totalCompletedLessons >= 1,
      progressCurrent: Math.min(1, totalCompletedLessons),
      progressTarget: 1,
      progressLabel: `${Math.min(1, totalCompletedLessons)} / 1 lesson`,
      earnedAt: totalCompletedLessons >= 1 ? latestProgressDate : null,
    },
    {
      id: 'bilingual-explorer',
      title: 'Bilingual Explorer',
      description: 'Complete lessons across both English and French courses.',
      category: 'milestone',
      icon: 'globe',
      earned: engLessons >= 1 && freLessons >= 1,
      progressCurrent: languagesPracticed,
      progressTarget: 2,
      progressLabel: `${languagesPracticed} / 2 languages practiced`,
      earnedAt: engLessons >= 1 && freLessons >= 1 ? latestProgressDate : null,
    },
    {
      id: 'five-day-streak',
      title: '5-Day Study Streak',
      description: 'Study at least one lesson or quiz for 5 consecutive days.',
      category: 'consistency',
      icon: 'flame',
      earned: studyStreak.longestStreak >= 5,
      progressCurrent: Math.min(5, studyStreak.longestStreak),
      progressTarget: 5,
      progressLabel: `${Math.min(5, studyStreak.longestStreak)} / 5 consecutive days`,
      earnedAt: studyStreak.longestStreak >= 5 ? latestProgressDate : null,
    },
    {
      id: 'high-score-streak',
      title: 'High Score Streak',
      description: 'Score 80% or higher on 2 consecutive quizzes or exams.',
      category: 'quiz_streak',
      icon: 'zap',
      earned: quizStreak.bestHighScoreStreak >= 2,
      progressCurrent: Math.min(2, quizStreak.bestHighScoreStreak),
      progressTarget: 2,
      progressLabel: `${Math.min(2, quizStreak.bestHighScoreStreak)} / 2 consecutive quizzes ≥ 80%`,
      earnedAt: streakEarnedAt,
    },
    {
      id: 'quiz-ace',
      title: 'Quiz High-Scorer',
      description: 'Achieve 85% or higher on any LinguaLearn quiz.',
      category: 'mastery',
      icon: 'award',
      earned: highScoreResults.length >= 1,
      progressCurrent: highScoreResults.length >= 1 ? 1 : 0,
      progressTarget: 1,
      progressLabel: highScoreResults.length >= 1 ? '1 / 1 quiz ≥ 85%' : '0 / 1 quiz ≥ 85%',
      earnedAt: highScoreResults[0]?.completedAt || null,
    },
    {
      id: 'course-finisher',
      title: 'Course Graduate',
      description: 'Reach 100% lesson completion in an enrolled course.',
      category: 'milestone',
      icon: 'graduation',
      earned: completedCoursesCount >= 1,
      progressCurrent: completedCoursesCount >= 1 ? 100 : maxCoursePct,
      progressTarget: 100,
      progressLabel:
        completedCoursesCount >= 1
          ? `${completedCoursesCount} course completed`
          : `Best course at ${maxCoursePct}%`,
      earnedAt: completedCoursesCount >= 1 ? latestProgressDate : null,
    },
    {
      id: 'exam-honors',
      title: 'Certification Honors',
      description: 'Pass a timed certification examination with 85%+.',
      category: 'mastery',
      icon: 'trophy',
      earned: examHonorsResults.length >= 1,
      progressCurrent: examHonorsResults.length >= 1 ? 1 : 0,
      progressTarget: 1,
      progressLabel: examHonorsResults.length >= 1 ? '1 / 1 exam honors' : '0 / 1 exam ≥ 85%',
      earnedAt: examHonorsResults[0]?.completedAt || null,
    },
    {
      id: 'graded-writer',
      title: 'Distinguished Writer',
      description: 'Earn 85/100 or higher on a teacher-graded writing assignment.',
      category: 'mastery',
      icon: 'pen',
      earned: gradedHighSubmissions.length >= 1,
      progressCurrent: gradedHighSubmissions.length >= 1 ? 1 : 0,
      progressTarget: 1,
      progressLabel:
        gradedHighSubmissions.length >= 1 ? '1 / 1 essay ≥ 85' : '0 / 1 graded essay ≥ 85',
      earnedAt:
        gradedHighSubmissions[0]?.gradedAt || gradedHighSubmissions[0]?.submittedAt || null,
    },
  ];
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  preferredLanguage: 'english' | 'french' | 'both';
  cumulativeQuizScore: number;
  quizzesCompleted: number;
  avgQuizScore: number;
  currentStreak: number;
  longestStreak: number;
  completedLessons: number;
  rankingPoints: number;
  isCurrentUser: boolean;
}

export interface GlobalLeaderboardData {
  entries: LeaderboardEntry[];
  totalStudents: number;
  currentUserRank: number | null;
}

export function computeGlobalLeaderboard(params: {
  users: UserRecord[];
  progressList: ProgressRecord[];
  resultsList: ResultRecord[];
  currentUserId: string;
}): GlobalLeaderboardData {
  const { users, progressList, resultsList, currentUserId } = params;
  const students = users.filter((u) => u.role === 'student');

  const rawRows = students.map((student) => {
    const sProgress = progressList.filter((p) => p.studentId === student._id);
    const sResults = resultsList.filter((r) => r.studentId === student._id);
    const streak = computeDailyStreak(sProgress, sResults);

    const cumulativeQuizScore = sResults.reduce((sum, r) => sum + (r.percentage || 0), 0);
    const quizzesCompleted = sResults.length;
    const avgQuizScore =
      quizzesCompleted > 0 ? Math.round(cumulativeQuizScore / quizzesCompleted) : 0;
    const completedLessons = sProgress.reduce((sum, p) => sum + p.completedLessonIds.length, 0);

    // Combined leaderboard score: cumulative quiz percentages + 15 pts per consecutive study streak day
    const rankingPoints = cumulativeQuizScore + streak.currentStreak * 15;

    return {
      studentId: student._id,
      studentName: student.name,
      preferredLanguage: student.preferredLanguage,
      cumulativeQuizScore,
      quizzesCompleted,
      avgQuizScore,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      completedLessons,
      rankingPoints,
      isCurrentUser: student._id === currentUserId,
    };
  });

  rawRows.sort((a, b) => {
    if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
    if (b.cumulativeQuizScore !== a.cumulativeQuizScore) {
      return b.cumulativeQuizScore - a.cumulativeQuizScore;
    }
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
    return b.completedLessons - a.completedLessons;
  });

  const entries: LeaderboardEntry[] = rawRows.slice(0, 15).map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }));

  const currentIdx = rawRows.findIndex((r) => r.studentId === currentUserId);

  return {
    entries,
    totalStudents: rawRows.length,
    currentUserRank: currentIdx !== -1 ? currentIdx + 1 : null,
  };
}

export interface DailyGoalProgressSummary {
  type: 'minutes' | 'modules';
  target: number;
  todayMinutes: number;
  todayModules: number;
  currentValue: number;
  progressPercent: number;
  goalMet: boolean;
  updatedAt: string;
}

export function computeDailyGoalProgress(params: {
  user?: UserRecord | null;
  progressList: ProgressRecord[];
  resultsList: ResultRecord[];
  now?: Date;
}): DailyGoalProgressSummary {
  const { user, progressList, resultsList, now = new Date() } = params;
  const todayKey = toDateKey(now);

  const goalType: 'minutes' | 'modules' =
    user?.dailyGoal?.type === 'modules' ? 'modules' : 'minutes';
  const defaultTarget = goalType === 'modules' ? 2 : 30;
  const target =
    typeof user?.dailyGoal?.target === 'number' && user.dailyGoal.target > 0
      ? user.dailyGoal.target
      : defaultTarget;

  let loggedMinutes = 0;
  let loggedModules = 0;
  for (const p of progressList) {
    const dayLog = p.dailyActivityLog?.[todayKey];
    if (dayLog) {
      loggedMinutes += dayLog.minutes || 0;
      loggedModules += dayLog.modules || 0;
    }
  }

  const todayQuizzes = resultsList.filter((r) => toDateKey(r.completedAt) === todayKey).length;
  // Seeded fallback: if activity occurred today in lastActivityAt without dailyActivityLog yet
  const hadSeededActivityToday = progressList.some(
    (p) =>
      p.lastActivityAt &&
      toDateKey(p.lastActivityAt) === todayKey &&
      !p.dailyActivityLog?.[todayKey] &&
      p.completedLessonIds.length > 0
  );

  const todayMinutes =
    loggedMinutes > 0
      ? loggedMinutes
      : todayQuizzes * 15 + (hadSeededActivityToday ? 20 : 0);
  const todayModules =
    loggedModules > 0
      ? loggedModules
      : todayQuizzes + (hadSeededActivityToday ? 1 : 0);

  const currentValue = goalType === 'modules' ? todayModules : todayMinutes;
  const progressPercent = Math.min(100, Math.round((currentValue / target) * 100));

  return {
    type: goalType,
    target,
    todayMinutes,
    todayModules,
    currentValue,
    progressPercent,
    goalMet: currentValue >= target,
    updatedAt: user?.dailyGoal?.updatedAt || now.toISOString(),
  };
}

export interface LearningActivityEvent {
  timestamp: string;
  percentage: number;
  title: string;
  language: 'english' | 'french';
  source: 'quiz' | 'assignment';
}

export interface SkillPatternMetric {
  skill: string;
  accuracy: number;
  errorRate: number;
  attempts: number;
  incorrectCount: number;
  status: 'Needs Focus' | 'Developing' | 'Strong';
  route: '/grammar' | '/vocabulary' | '/listening' | '/reading' | '/writing' | '/speaking';
  recommendation: string;
}

export interface LearningPatternsData {
  hasQuizHistory: boolean;
  totalAssessmentsAnalyzed: number;
  totalQuestionsAnalyzed: number;
  activityEvents: LearningActivityEvent[];
  skillBreakdown: SkillPatternMetric[];
  mostChallengingSkill: SkillPatternMetric | null;
}

type PatternSkillKey =
  | 'Grammar'
  | 'Vocabulary'
  | 'Sentence Structure'
  | 'Reading & Context'
  | 'Listening'
  | 'Writing';

const SKILL_META: Record<
  PatternSkillKey,
  {
    route: SkillPatternMetric['route'];
    recommendation: (accuracy: number) => string;
  }
> = {
  Grammar: {
    route: '/grammar',
    recommendation: (acc) =>
      acc < 80
        ? 'Review verb tense rules and subject-verb agreement drills in Grammar Studio.'
        : 'Maintain accuracy with advanced tense contrast exercises.',
  },
  Vocabulary: {
    route: '/vocabulary',
    recommendation: (acc) =>
      acc < 80
        ? 'Practice collocations and false friends using active recall flashcards.'
        : 'Expand idiomatic expressions with intermediate vocabulary decks.',
  },
  'Sentence Structure': {
    route: '/grammar',
    recommendation: (acc) =>
      acc < 80
        ? 'Work on word order and clause connectors in sentence construction tasks.'
        : 'Keep refining complex multi-clause word order.',
  },
  'Reading & Context': {
    route: '/reading',
    recommendation: (acc) =>
      acc < 80
        ? 'Practice fill-in-the-blank context clues with graded reading passages.'
        : 'Challenge yourself with B2/C1 critical reading briefs.',
  },
  Listening: {
    route: '/listening',
    recommendation: (acc) =>
      acc < 80
        ? 'Replay slow-speed audio dialogues and verify detail comprehension notes.'
        : 'Practice unscripted briefing comprehension in Listening Studio.',
  },
  Writing: {
    route: '/writing',
    recommendation: (acc) =>
      acc < 80
        ? 'Focus on structured transitions and rubric feedback on written prompts.'
        : 'Continue polishing formal register and lexical variety.',
  },
};

function classifyQuestionSkill(
  prompt: string,
  type: QuestionRecord['type']
): PatternSkillKey {
  const lower = prompt.toLowerCase();
  if (
    type === 'matching' ||
    /\b(meaning|synonym|antonym|faux ami|false friend|collocation|vocabulary|greeting|phrase)\b/.test(lower)
  ) {
    return 'Vocabulary';
  }
  if (type === 'sentence_build' || /\b(arrange|word order|build the sentence|order)\b/.test(lower)) {
    return 'Sentence Structure';
  }
  if (
    /\b(tense|verb|auxiliary|passé composé|imparfait|present|past|subjunctive|agreement|plural|article|preposition|pronoun|grammar|modal)\b/.test(
      lower
    )
  ) {
    return 'Grammar';
  }
  if (type === 'fill_blank') {
    return 'Reading & Context';
  }
  return 'Grammar';
}

export function computeLearningPatterns(params: {
  resultsList: ResultRecord[];
  questionsList: QuestionRecord[];
  quizzesList: QuizRecord[];
  lessonsList: LessonRecord[];
  progressList: ProgressRecord[];
  submissionsList: SubmissionRecord[];
}): LearningPatternsData {
  const {
    resultsList,
    questionsList,
    quizzesList,
    lessonsList,
    progressList,
    submissionsList,
  } = params;

  const activityEvents: LearningActivityEvent[] = [];

  for (const r of resultsList) {
    if (r.completedAt) {
      activityEvents.push({
        timestamp: r.completedAt,
        percentage: r.percentage,
        title: r.quizTitle,
        language: r.language,
        source: 'quiz',
      });
    }
  }

  for (const s of submissionsList) {
    if (s.status === 'graded' && typeof s.score === 'number' && (s.gradedAt || s.submittedAt)) {
      activityEvents.push({
        timestamp: s.gradedAt || s.submittedAt,
        percentage: s.score,
        title: 'Graded Writing Assignment',
        language: 'english',
        source: 'assignment',
      });
    }
  }

  activityEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const skillBuckets = new Map<
    PatternSkillKey,
    { earned: number; possible: number; attempts: number; incorrectCount: number }
  >();

  const addSample = (
    skill: PatternSkillKey,
    earned: number,
    possible: number,
    incorrectIncrement: number
  ) => {
    const prev = skillBuckets.get(skill) || {
      earned: 0,
      possible: 0,
      attempts: 0,
      incorrectCount: 0,
    };
    prev.earned += earned;
    prev.possible += possible;
    prev.attempts += 1;
    prev.incorrectCount += incorrectIncrement;
    skillBuckets.set(skill, prev);
  };

  let totalQuestionsAnalyzed = 0;

  for (const result of resultsList) {
    if (Array.isArray(result.answers) && result.answers.length > 0) {
      for (const ans of result.answers) {
        const skill = classifyQuestionSkill(ans.prompt || result.quizTitle, ans.type);
        const possible = ans.pointsPossible > 0 ? ans.pointsPossible : 10;
        const earned = Math.max(0, Math.min(possible, ans.pointsEarned));
        addSample(skill, earned, possible, ans.isCorrect ? 0 : 1);
        totalQuestionsAnalyzed += 1;
      }
      continue;
    }

    // Fallback when a historical result record does not store individual AnswerReview items
    const quizQuestions = questionsList.filter((q) => q.quizId === result.quizId);
    const quizMeta = quizzesList.find((q) => q._id === result.quizId);
    if (quizQuestions.length > 0) {
      const ratio = Math.max(0, Math.min(1, result.percentage / 100));
      for (const q of quizQuestions) {
        const skill = classifyQuestionSkill(
          q.prompt || quizMeta?.title || result.quizTitle,
          q.type
        );
        const possible = q.points > 0 ? q.points : 10;
        addSample(skill, possible * ratio, possible, ratio < 0.85 ? 1 : 0);
        totalQuestionsAnalyzed += 1;
      }
    } else {
      const lowerTitle = (result.quizTitle || '').toLowerCase();
      const skill: PatternSkillKey = lowerTitle.includes('vocab')
        ? 'Vocabulary'
        : lowerTitle.includes('listen')
          ? 'Listening'
          : lowerTitle.includes('read')
            ? 'Reading & Context'
            : lowerTitle.includes('writ')
              ? 'Writing'
              : 'Grammar';
      addSample(
        skill,
        result.percentage,
        100,
        result.percentage < 80 ? 1 : 0
      );
      totalQuestionsAnalyzed += 1;
    }
  }

  // Incorporate graded writing submissions into Writing skill pattern
  for (const sub of submissionsList) {
    if (sub.status === 'graded' && typeof sub.score === 'number') {
      addSample('Writing', sub.score, 100, sub.score < 80 ? 1 : 0);
    }
  }

  // Incorporate Listening lesson progress vs quiz performance when quizzes exist
  if (resultsList.length > 0) {
    const completedSet = new Set(progressList.flatMap((p) => p.completedLessonIds));
    const listeningLessons = lessonsList.filter((l) => l.skillType === 'listening');
    if (listeningLessons.length > 0 && !skillBuckets.has('Listening')) {
      const doneListening = listeningLessons.filter((l) => completedSet.has(l._id)).length;
      const pct = Math.round((doneListening / listeningLessons.length) * 100);
      if (doneListening > 0 || pct > 0) {
        addSample('Listening', Math.max(55, pct), 100, pct < 75 ? 1 : 0);
      }
    }
  }

  const skillBreakdown: SkillPatternMetric[] = Array.from(skillBuckets.entries())
    .map(([skill, stats]) => {
      const accuracy =
        stats.possible > 0 ? Math.round((stats.earned / stats.possible) * 100) : 0;
      const errorRate = Math.max(0, 100 - accuracy);
      const status: SkillPatternMetric['status'] =
        accuracy < 75 ? 'Needs Focus' : accuracy < 88 ? 'Developing' : 'Strong';
      const meta = SKILL_META[skill];
      return {
        skill,
        accuracy,
        errorRate,
        attempts: stats.attempts,
        incorrectCount: stats.incorrectCount,
        status,
        route: meta.route,
        recommendation: meta.recommendation(accuracy),
      };
    })
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.incorrectCount - a.incorrectCount;
    });

  return {
    hasQuizHistory: activityEvents.length > 0,
    totalAssessmentsAnalyzed: activityEvents.length,
    totalQuestionsAnalyzed,
    activityEvents,
    skillBreakdown,
    mostChallengingSkill: skillBreakdown[0] || null,
  };
}
