import React, { useState } from 'react';
import { Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { extractErrorMessage } from '../api/client.ts';
import type { PageRoute } from '../types.ts';

interface LoginPageProps {
  onNavigate: (route: PageRoute) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { login, loginWithGoogle } = useAuth();
  const { showSuccess, showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigateByRole = (role: string) => {
    if (role === 'admin') onNavigate('/dashboard/admin');
    else if (role === 'teacher') onNavigate('/dashboard/teacher');
    else onNavigate('/dashboard/student');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      showSuccess(`Welcome back, ${loggedUser.name}.`);
      navigateByRole(loggedUser.role);
    } catch (err) {
      showError(extractErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { user: googleUser, isNewUser } = await loginWithGoogle();
      showSuccess(
        isNewUser
          ? `Welcome to LinguaLearn, ${googleUser.name}!`
          : `Welcome back, ${googleUser.name}.`
      );
      navigateByRole(googleUser.role);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        showError('Google sign-in was cancelled.');
      } else if (code === 'auth/popup-blocked') {
        showError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else {
        showError(extractErrorMessage(err, 'Google sign-in failed.'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] bg-slate-50 dark:bg-slate-950 py-14 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Sign in to LinguaLearn
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Access your English and French courses, assignments, and examinations.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5"
        >
          <button
            type="button"
            disabled={googleLoading || submitting}
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            {googleLoading ? 'Connecting to Google...' : 'Log in with Google'}
          </button>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="mx-3 shrink text-xs text-slate-500 dark:text-slate-400">
              or sign in with email
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@lingualearn.edu"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || googleLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-slate-600 dark:text-slate-400">
            New to LinguaLearn?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/register')}
              className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Create an account
            </button>
          </p>
        </form>

        {/* Demo Account Quick-Fill for Verification */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Quick Demo Credentials (One-Click Fill)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('amina.kone@lingualearn.edu', 'Student@123')}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => fillDemo('eleanor.vance@lingualearn.edu', 'Teacher@123')}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@lingualearn.edu', 'Admin@123')}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Admin
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Select any role above to populate valid credentials, then click Sign In.
          </p>
        </div>
      </div>
    </div>
  );
}
