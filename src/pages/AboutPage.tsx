import { useEffect, useState } from 'react';
import { api } from '../api/client.ts';
import type { PageRoute } from '../types.ts';

interface AboutPageProps {
  onNavigate: (route: PageRoute) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const [stats, setStats] = useState({
    totalStudents: 2,
    totalTeachers: 2,
    availableCourses: 6,
    totalLessons: 18,
    totalQuizzes: 4,
  });

  useEffect(() => {
    void api
      .get('/public-stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">About LinguaLearn</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
            Rigorous Bilingual Instruction for Modern Learners
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            LinguaLearn was founded by applied linguists and bilingual educators to bridge the gap between casual vocabulary apps and formal university language instruction. Every course aligns with the Common European Framework of Reference (CEFR A1 through C2).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {stats.availableCourses}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active Courses</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {stats.totalLessons}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Structured Lessons</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {stats.totalTeachers}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified Faculty</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {stats.totalQuizzes}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quizzes &amp; Exams</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
            <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">01.</p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Balanced Skill Mastery
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Learners build alphabet, phonetic, grammatical, lexical, listening, speaking, reading, and writing competencies together rather than in isolation.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
            <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">02.</p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Teacher-Led Oversight
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Approved teachers design courses, publish PDF reference guides, author examinations, and grade student essays with actionable feedback.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
            <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">03.</p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Transparent Assessment
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every quiz and examination shows exact score percentages alongside question-by-question explanations so errors become lasting lessons.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => onNavigate('/courses')}
            className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            Browse Courses
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/contact')}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Contact Our Team
          </button>
        </div>
      </div>
    </div>
  );
}
