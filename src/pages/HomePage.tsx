import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, GraduationCap, Headphones, Mail, MapPin, Phone } from 'lucide-react';
import { api } from '../api/client.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';
import type { Course, PageRoute, User } from '../types.ts';

interface HomePageProps {
  onNavigate: (route: PageRoute) => void;
  onSelectCourse: (courseId: string) => void;
}

interface PublicStats {
  totalStudents: number;
  totalTeachers: number;
  availableCourses: number;
  totalLessons: number;
}

export function HomePage({ onNavigate, onSelectCourse }: HomePageProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [stats, setStats] = useState<PublicStats>({
    totalStudents: 2,
    totalTeachers: 2,
    availableCourses: 6,
    totalLessons: 18,
  });

  useEffect(() => {
    void (async () => {
      try {
        const [coursesRes, teachersRes, statsRes] = await Promise.allSettled([
          api.get<{ courses: Course[] }>('/courses'),
          api.get<{ teachers: User[] }>('/users/teachers'),
          api.get<PublicStats>('/public-stats'),
        ]);
        if (coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value.data?.courses)) {
          setCourses(coursesRes.value.data.courses);
        }
        if (teachersRes.status === 'fulfilled' && Array.isArray(teachersRes.value.data?.teachers)) {
          setTeachers(teachersRes.value.data.teachers);
        }
        if (
          statsRes.status === 'fulfilled' &&
          statsRes.value.data &&
          typeof statsRes.value.data.totalStudents === 'number'
        ) {
          setStats(statsRes.value.data);
        }
      } catch {
        // Keep initial empty/default state gracefully
      }
    })();
  }, []);

  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];
  const englishCourses = safeCourses.filter((c) => c.language === 'english').slice(0, 3);
  const frenchCourses = safeCourses.filter((c) => c.language === 'french').slice(0, 3);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 1. Hero Section */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-wide text-blue-700 dark:text-blue-400 mb-3">
                English &amp; French Academic Language Platform
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] text-balance">
                Learn English and French with structure, native audio, and real feedback.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                LinguaLearn connects certified language instructors with learners across Beginner, Intermediate, and Advanced levels—combining interactive skill labs, downloadable guides, and graded examinations.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('/english')}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Start Learning
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/courses')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Courses
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] sm:min-h-[360px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                <ResilientImage
                  src="/src/assets/images/hero_lingualearn_studio_1794824176731.jpg"
                  alt="LinguaLearn bilingual study workspace with notebooks and audio headphones"
                  className="h-full w-full object-cover"
                  fallbackTitle="LinguaLearn Bilingual Studio"
                />
              </div>
            </div>
          </div>

          {/* Full-width Metric Strip below Hero Split */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                {stats.availableCourses}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Structured English &amp; French courses
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                {stats.totalLessons}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Interactive skill lessons &amp; PDFs
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                {stats.totalTeachers}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Certified bilingual instructors
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                8 Skills
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Alphabet through academic writing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. English & French Course Sections */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Two Curated Language Tracks
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
              Progress cleanly through Beginner (A1–A2), Intermediate (B1–B2), and Advanced (C1–C2) pathways in either language.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigate('/videos')}
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              Watch Video Lessons
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/courses')}
              className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              View full catalog →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* English Track */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            <div className="aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <ResilientImage
                src="/src/assets/images/track_english_study_1794824176995.jpg"
                alt="English language study desk"
                className="h-full w-full object-cover"
                fallbackTitle="English Curriculum"
              />
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                English Track · Beginner, Intermediate &amp; Advanced
              </p>
              <h3 className="mt-1.5 font-display text-xl font-bold text-slate-900 dark:text-white">
                English Mastery Curriculum
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Build clear phonemic awareness, tense precision, workplace collocations, seminar listening, and structured academic essays.
              </p>

              <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
                {englishCourses.map((course) => (
                  <button
                    key={course._id}
                    type="button"
                    onClick={() => onSelectCourse(course._id)}
                    className="w-full py-3.5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 -mx-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {course.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                        {course.level} · {course.lessonsCount ?? 0} lessons · {course.durationHours}h
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onNavigate('/english')}
                  className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Open English Learning Hub
                </button>
              </div>
            </div>
          </div>

          {/* French Track */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            <div className="aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <ResilientImage
                src="/src/assets/images/track_french_study_1794824178386.jpg"
                alt="French language study desk in sunlit Parisian balcony"
                className="h-full w-full object-cover"
                fallbackTitle="Parcours Français"
              />
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                French Track · Débutant, Intermédiaire &amp; Avancé
              </p>
              <h3 className="mt-1.5 font-display text-xl font-bold text-slate-900 dark:text-white">
                French Fluency &amp; DELF Preparation
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Practice French diacritics, nasal vowels and liaisons, Passé Composé vs. Imparfait storytelling, and persuasive DALF writing.
              </p>

              <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
                {frenchCourses.map((course) => (
                  <button
                    key={course._id}
                    type="button"
                    onClick={() => onSelectCourse(course._id)}
                    className="w-full py-3.5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 -mx-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {course.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                        {course.level} · {course.lessonsCount ?? 0} lessons · {course.durationHours}h
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onNavigate('/french')}
                  className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Open French Learning Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Choose Us & How It Works */}
      <section className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Why Choose Us */}
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Why Students &amp; Teachers Choose LinguaLearn
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Every course pairs self-paced audio practice with real educator grading—no passive flashcards without feedback.
              </p>

              <ul className="mt-8 space-y-5">
                <li className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                    <Headphones className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Native-Voice Audio &amp; Phonetics
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Listen to English and French examples at 0.75x or standard pace with IPA phonetic transcription.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Downloadable Study Guides &amp; Video Modules
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Every lesson includes concise notes, downloadable study reference sheets, and instructor explanations.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Auto-Graded Quizzes &amp; Teacher Feedback
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Instant scoring with detailed grammar explanations on exams, plus rubric grading on written essays.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* How It Works */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 sm:p-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  How It Works
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">01.</p>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Choose Your Track &amp; Level
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Select English or French across Beginner, Intermediate, or Advanced courses and enroll in one click.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">02.</p>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Practice Across All 8 Skills
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Move through Alphabet, Pronunciation, Grammar, Vocabulary, Listening, Speaking, Reading, and Writing studios.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">03.</p>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Complete Assignments &amp; Exams
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Submit writing tasks for instructor review and test yourself on timed multiple-choice, matching, and syntax exams.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">04.</p>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Monitor Measurable Progress
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Review lesson completion rates, score trajectories, and instructor comments inside your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Featured Teachers & Student Testimonials (Claim-to-Proof Adjacency) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-6">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Featured Instructors
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Every course and written assignment is authored and reviewed by verified language faculty.
            </p>

            <div className="mt-6 space-y-4">
              {safeTeachers.slice(0, 3).map((teacher) => (
                <div
                  key={teacher._id}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                >
                  <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                    <ResilientImage
                      src={teacher.avatarUrl}
                      alt={teacher.name}
                      className="h-full w-full object-cover"
                      fallbackTitle={teacher.name}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {teacher.name}
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                      {teacher.expertise}
                    </p>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {teacher.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Student Outcomes
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Verified learners building academic and workplace fluency in English and French.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  “Before joining LinguaLearn, I hesitated between Past Simple and Present Perfect in client reports. After six weeks of Dr. Vance’s grammar drills and essay feedback, my score rose from 68% to 92% and I passed my B2 workplace assessment.”
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Amina Koné · Graduate Architecture Applicant
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5" /> Verified Learner
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  “The French pronunciation lab and DELF mock examinations helped me stop translating word-for-word. Hearing slowed audio liaisons alongside Prof. Moreau’s written notes cut my exam errors in half within one semester.”
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Lucas Martin · Product Engineering Lead
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                    <Check className="h-3.5 w-3.5" /> Verified Learner
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Contact Information & Call to Action */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Questions About Courses or Faculty Enrollment?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Reach our academic advisors for placement guidance, institutional accounts, or teacher onboarding.
              </p>
              <div className="flex flex-wrap gap-6 pt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  admissions@lingualearn.edu
                </span>
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  +44 20 7946 0821
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  London &amp; Paris Academic Hubs
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Contact Admissions
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/register')}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                Create Free Account
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
