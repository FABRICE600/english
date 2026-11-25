import { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import type { PageRoute } from '../types.ts';

interface NavbarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
}

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardRoute: PageRoute =
    user?.role === 'admin'
      ? '/dashboard/admin'
      : user?.role === 'teacher'
      ? '/dashboard/teacher'
      : '/dashboard/student';

  const isLearnActive = [
    '/english',
    '/french',
    '/grammar',
    '/vocabulary',
    '/listening',
    '/speaking',
    '/reading',
    '/writing',
    '/videos',
  ].includes(currentRoute);

  const go = (route: PageRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => go('/')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white font-display font-bold text-sm">
            LL
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            LinguaLearn
          </span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => go('/')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentRoute === '/'
                ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => go('/courses')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentRoute === '/courses'
                ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Courses
          </button>
          <button
            type="button"
            onClick={() => go('/english')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              isLearnActive
                ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Learn
          </button>
          <button
            type="button"
            onClick={() => go('/exams')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentRoute === '/exams'
                ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Exams
          </button>
          <button
            type="button"
            onClick={() => go('/about')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              currentRoute === '/about'
                ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            About
          </button>
        </nav>

        {/* Zone 3: Primary action + clean utility */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => go(dashboardRoute)}
              className="hidden md:inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go('/login')}
              className="hidden md:inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(
              [
                ['Home', '/'],
                ['Courses', '/courses'],
                ['English Lab', '/english'],
                ['French Lab', '/french'],
                ['Grammar', '/grammar'],
                ['Vocabulary', '/vocabulary'],
                ['Listening', '/listening'],
                ['Speaking', '/speaking'],
                ['Reading', '/reading'],
                ['Writing', '/writing'],
                ['Video Lessons', '/videos'],
                ['Exams', '/exams'],
                ['About Us', '/about'],
                ['Contact', '/contact'],
              ] as Array<[string, PageRoute]>
            ).map(([label, route]) => (
              <button
                key={route}
                type="button"
                onClick={() => go(route)}
                className={`text-left rounded-lg px-3 py-2.5 font-medium ${
                  currentRoute === route
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <PWAInstallButton compact />
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(dashboardRoute)}
                  className="rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    go('/');
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go('/register')}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => go('/login')}
                  className="rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
