import React, { useEffect, useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { PageRoute, QuizResult } from '../types.ts';

interface ProfilePageProps {
  onNavigate: (route: PageRoute) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, refreshUser, logout } = useAuth();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [preferredLanguage, setPreferredLanguage] = useState<'english' | 'french' | 'both'>(
    user?.preferredLanguage || 'both'
  );
  const [expertise, setExpertise] = useState(user?.expertise || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPreferredLanguage(user.preferredLanguage);
      setExpertise(user.expertise || '');
      setBio(user.bio || '');
      void api
        .get<{ results: QuizResult[] }>('/quizzes/results/mine')
        .then((res) => setResults(Array.isArray(res.data?.results) ? res.data.results : []))
        .catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      showError('Name must be at least 2 characters.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/profile', {
        name,
        preferredLanguage,
        expertise,
        bio,
        newPassword: newPassword || undefined,
      });
      await refreshUser();
      setNewPassword('');
      showSuccess('Profile updated successfully.');
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              {user.role} Account · {user.email}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white">
              {user.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-start"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleSave}
            className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
          >
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Personal Details &amp; Security
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Preferred Language Track
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as 'english' | 'french' | 'both')}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="both">English &amp; French</option>
                  <option value="english">English</option>
                  <option value="french">French</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Level / Specialization
                </label>
                <input
                  type="text"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Biography
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                New Password (leave blank to keep current)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Recent Examination Records
            </h2>
            {results.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No completed quizzes or examinations yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {results.slice(0, 6).map((res) => (
                  <div key={res._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {res.quizTitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {res.language} · {res.passed ? 'Passed' : 'Review needed'}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400 tabular-nums shrink-0">
                      {res.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
