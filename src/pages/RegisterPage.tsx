import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { extractErrorMessage } from '../api/client.ts';
import type { PageRoute } from '../types.ts';

interface RegisterPageProps {
  onNavigate: (route: PageRoute) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { register, loginWithGoogle } = useAuth();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [preferredLanguage, setPreferredLanguage] = useState<'english' | 'french' | 'both'>('both');
  const [expertise, setExpertise] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { user, isNewUser } = await loginWithGoogle({ role, preferredLanguage });
      if (user.role === 'teacher') {
        showSuccess(
          isNewUser
            ? 'Teacher account created with Google and queued for administrator approval.'
            : `Welcome back, ${user.name}.`
        );
        onNavigate('/dashboard/teacher');
      } else if (user.role === 'admin') {
        showSuccess(`Welcome back, ${user.name}.`);
        onNavigate('/dashboard/admin');
      } else {
        showSuccess(
          isNewUser ? `Welcome to LinguaLearn, ${user.name}!` : `Welcome back, ${user.name}.`
        );
        onNavigate('/dashboard/student');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        showError('Google sign-up was cancelled.');
      } else if (code === 'auth/popup-blocked') {
        showError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else {
        showError(extractErrorMessage(err, 'Google sign-up failed.'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      showError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        preferredLanguage,
        expertise: expertise.trim(),
        bio: bio.trim(),
      });
      if (user.role === 'teacher') {
        showSuccess('Teacher account created. Your profile is queued for administrator approval.');
        onNavigate('/dashboard/teacher');
      } else {
        showSuccess(`Welcome to LinguaLearn, ${user.name}!`);
        onNavigate('/dashboard/student');
      }
    } catch (err) {
      showError(extractErrorMessage(err, 'Registration failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] bg-slate-50 dark:bg-slate-950 py-14 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create Your LinguaLearn Account
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Register as a Student to enroll in English &amp; French courses, or apply as a Teacher.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5"
        >
          {/* Role Switcher */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  role === 'student'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Student Account
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  role === 'teacher'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Teacher Application
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={googleLoading || submitting}
            onClick={handleGoogleSignUp}
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
            {googleLoading
              ? 'Connecting to Google...'
              : `Continue with Google as ${role === 'teacher' ? 'Teacher' : 'Student'}`}
          </button>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="mx-3 shrink text-xs text-slate-500 dark:text-slate-400">
              or register with email
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sophie Laurent"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Language Focus
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as 'english' | 'french' | 'both')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              >
                <option value="both">Both English &amp; French</option>
                <option value="english">English</option>
                <option value="french">French</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sophie.laurent@example.com"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password (min. 6 chars)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {role === 'teacher' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Teaching Specialization
                </label>
                <input
                  type="text"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="e.g., DELF B2 Preparation & French Phonetics"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Instructor Biography
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Summarize your teaching credentials and language background..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>

          <p className="text-center text-xs text-slate-600 dark:text-slate-400">
            Already registered?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Sign in here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
