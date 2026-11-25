import { useAuth } from '../context/AuthContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import type { PageRoute } from '../types.ts';

interface FooterProps {
  onNavigate: (route: PageRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { user } = useAuth();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white font-display font-bold text-sm">
                LL
              </span>
              <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
                LinguaLearn
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs">
              Structured English and French online instruction aligned with CEFR A1–C2 benchmarks for students, educators, and academic institutions.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              admissions@lingualearn.edu · +44 20 7946 0821
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Language Tracks</h3>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button type="button" onClick={() => onNavigate('/english')} className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                  English Learning Hub
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/french')} className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                  French Learning Hub
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/courses')} className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                  All Courses (A1–C2)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/videos')} className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                  Video Lessons
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/exams')} className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                  Online Examinations
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Skill Studios</h3>
            <ul className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button type="button" onClick={() => onNavigate('/grammar')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  Grammar
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/vocabulary')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  Vocabulary
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/listening')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  Listening
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/speaking')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  Speaking
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/reading')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  Reading
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/writing')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  Writing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Academy & Account</h3>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button type="button" onClick={() => onNavigate('/about')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  About LinguaLearn
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('/contact')} className="hover:text-blue-700 dark:hover:text-blue-400">
                  Contact & Support
                </button>
              </li>
              {user ? (
                <li>
                  <button type="button" onClick={() => onNavigate('/profile')} className="hover:text-blue-700 dark:hover:text-blue-400">
                    My Profile ({user.name})
                  </button>
                </li>
              ) : (
                <>
                  <li>
                    <button type="button" onClick={() => onNavigate('/login')} className="hover:text-blue-700 dark:hover:text-blue-400">
                      Sign In
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate('/register')} className="hover:text-blue-700 dark:hover:text-blue-400">
                      Create Account
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500">
          <p>© {new Date().getFullYear()} LinguaLearn Academy. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <PWAInstallButton compact />
            <p>London · Paris · Online Bilingual Instruction</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
