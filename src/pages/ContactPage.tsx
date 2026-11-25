import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client.ts';
import { useToast } from '../context/ToastContext.tsx';

export function ContactPage() {
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    if (subject.trim().length < 3 || message.trim().length < 10) {
      showError('Please include a subject and message of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/contact', { name, email, subject, message });
      showSuccess(res.data.message);
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Contact LinguaLearn</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Speak with Academic Support
              </h1>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Have questions about English or French course placement, teacher applications, or institutional onboarding? Send our team a direct message.
              </p>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-blue-700 dark:text-blue-400 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Email Admissions</p>
                  <p className="text-slate-600 dark:text-slate-400">admissions@lingualearn.edu</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-blue-700 dark:text-blue-400 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Academic Office</p>
                  <p className="text-slate-600 dark:text-slate-400">+44 20 7946 0821 (Mon–Fri, 08:30–18:00 CET)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-blue-700 dark:text-blue-400 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Campuses</p>
                  <p className="text-slate-600 dark:text-slate-400">Bloomsbury Square, London · Rue des Écoles, Paris</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5"
            >
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Send an Inquiry
              </h2>

              {submitted && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                  Your message has been logged in our system. An academic advisor will reply shortly.
                </div>
              )}

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
                    placeholder="Amina Koné"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                  />
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
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Placement test or course inquiry"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your current English or French level and learning goals..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
