import { useMemo, useState } from 'react';
import { Award, Check, Copy, Download, Flame, Share2, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.tsx';
import type { QuizScoreStreakData, StudentBadgeItem } from './BadgesShowcase.tsx';
import type { StudyStreakData } from './DailyStudyStreak.tsx';

interface ShareProgressModalProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  studyStreak: StudyStreakData;
  quizScoreStreak: QuizScoreStreakData;
  badges: StudentBadgeItem[];
  englishCompletion: number;
  frenchCompletion: number;
  completedLessons: number;
  avgQuizScore: number;
}

export function ShareProgressModal({
  open,
  onClose,
  studentName,
  studyStreak,
  quizScoreStreak,
  badges,
  englishCompletion,
  frenchCompletion,
  completedLessons,
  avgQuizScore,
}: ShareProgressModalProps) {
  const { showSuccess, showError } = useToast();

  const [includeBadges, setIncludeBadges] = useState(true);
  const [includeStreak, setIncludeStreak] = useState(true);
  const [includeCourses, setIncludeCourses] = useState(true);
  const [copied, setCopied] = useState(false);

  const earnedBadges = useMemo(() => badges.filter((b) => b.earned), [badges]);

  const shareText = useMemo(() => {
    const parts: string[] = [`${studentName}'s LinguaLearn Progress Update:`];
    if (includeStreak) {
      parts.push(
        `• ${studyStreak.currentStreak}-day daily study streak (Best: ${studyStreak.longestStreak} days)`
      );
      if (quizScoreStreak.bestHighScoreStreak > 0) {
        parts.push(
          `• High-score quiz streak: ${quizScoreStreak.bestHighScoreStreak} consecutive quizzes at ${quizScoreStreak.threshold}%+`
        );
      }
    }
    if (includeBadges) {
      const badgeTitles =
        earnedBadges.length > 0
          ? earnedBadges.slice(0, 4).map((b) => b.title).join(', ')
          : 'Working toward first milestone badge';
      parts.push(`• Earned ${earnedBadges.length}/${badges.length} badges (${badgeTitles})`);
    }
    if (includeCourses) {
      parts.push(
        `• English ${englishCompletion}% · French ${frenchCompletion}% · ${completedLessons} lessons completed (${avgQuizScore}% quiz avg)`
      );
    }
    parts.push('#LinguaLearn #LanguageLearning #English #French');
    return parts.join('\n');
  }, [
    studentName,
    includeStreak,
    includeBadges,
    includeCourses,
    studyStreak,
    quizScoreStreak,
    earnedBadges,
    badges.length,
    englishCompletion,
    frenchCompletion,
    completedLessons,
    avgQuizScore,
  ]);

  if (!open) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lingualearn.edu';
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const socialLinks = [
    {
      name: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      accent: 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/feed/?shareActive=true&mini=true&text=${encodedText}%20${encodedUrl}`,
      accent: 'border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50',
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      accent: 'border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/50',
    },
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
      accent: 'border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50',
    },
  ];

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      showSuccess('Progress summary copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      showError('Clipboard access failed. Please copy manually.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: `${studentName} — LinguaLearn Progress`,
        text: shareText,
        url: shareUrl,
      });
    } catch {
      // User dismissed native share sheet
    }
  };

  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crisp slate/blue executive card background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1200, 630);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, 1128, 558);

    // Header text
    ctx.fillStyle = '#60a5fa';
    ctx.font = '600 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('LINGUALEARN · STUDENT ACHIEVEMENT SUMMARY', 76, 98);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 48px system-ui, -apple-system, sans-serif';
    ctx.fillText(studentName, 76, 158);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `English ${englishCompletion}%  ·  French ${frenchCompletion}%  ·  ${completedLessons} Lessons Completed  ·  ${avgQuizScore}% Avg Quiz`,
      76,
      204
    );

    // Metrics boxes
    const boxes = [
      {
        label: 'DAILY STUDY STREAK',
        value: `${studyStreak.currentStreak} Days`,
        sub: `Personal best: ${studyStreak.longestStreak} days`,
      },
      {
        label: 'EARNED BADGES',
        value: `${earnedBadges.length} / ${badges.length}`,
        sub: earnedBadges.slice(0, 2).map((b) => b.title).join(', ') || 'In progress',
      },
      {
        label: 'QUIZ SCORE STREAK',
        value: `${quizScoreStreak.bestHighScoreStreak}x`,
        sub: `Consecutive quizzes at ${quizScoreStreak.threshold}%+`,
      },
    ];

    boxes.forEach((box, idx) => {
      const x = 76 + idx * 356;
      const y = 250;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, 332, 180);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 332, 180);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '600 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(box.label, x + 24, y + 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 44px ui-monospace, monospace';
      ctx.fillText(box.value, x + 24, y + 106);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '400 17px system-ui, -apple-system, sans-serif';
      ctx.fillText(box.sub.slice(0, 34), x + 24, y + 148);
    });

    // Earned badge strip
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    const badgeFooter =
      earnedBadges.length > 0
        ? `Unlocked Credentials: ${earnedBadges.map((b) => b.title).join('  ·  ')}`
        : 'Building English & French fluency on LinguaLearn';
    ctx.fillText(badgeFooter.slice(0, 96), 76, 512);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 18px ui-monospace, monospace';
    ctx.fillText(new Date().toLocaleDateString(), 76, 554);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `LinguaLearn-Progress-${studentName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Progress card PNG downloaded.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-progress-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Share2 className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h2
                id="share-progress-title"
                className="font-display text-base font-bold text-slate-900 dark:text-white"
              >
                Share Your LinguaLearn Progress
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize your achievement card and share badges &amp; study streaks on social platforms.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share progress dialog"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Visual Card Preview */}
          <div className="rounded-xl bg-slate-900 text-white p-5 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                  LinguaLearn Progress Summary
                </p>
                <h3 className="mt-0.5 font-display text-xl font-bold">{studentName}</h3>
              </div>
              {includeStreak && (
                <div className="flex items-center gap-1.5 text-amber-400 font-mono text-sm font-bold tabular-nums">
                  <Flame className="h-4 w-4" />
                  {studyStreak.currentStreak}-Day Streak
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {includeStreak && (
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-3">
                  <p className="text-[11px] text-slate-400">Study Streak</p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                    {studyStreak.currentStreak}d
                  </p>
                </div>
              )}
              {includeBadges && (
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-3">
                  <p className="text-[11px] text-slate-400">Earned Badges</p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                    {earnedBadges.length}/{badges.length}
                  </p>
                </div>
              )}
              {includeCourses && (
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-3">
                  <p className="text-[11px] text-slate-400">EN / FR Progress</p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                    {englishCompletion}% · {frenchCompletion}%
                  </p>
                </div>
              )}
            </div>

            {includeBadges && earnedBadges.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <Award className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Badges: {earnedBadges.map((b) => b.title).join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* Toggle Options */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStreak}
                onChange={(e) => setIncludeStreak(e.target.checked)}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              Include Study &amp; Quiz Streaks
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBadges}
                onChange={(e) => setIncludeBadges(e.target.checked)}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              Include Earned Badges
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCourses}
                onChange={(e) => setIncludeCourses(e.target.checked)}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              Include Course Percentages
            </label>
          </div>

          {/* Editable / Preview Post Copy */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line font-mono leading-relaxed">
            {shareText}
          </div>

          {/* Social Share Actions */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Share Directly to Social Media
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {socialLinks.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors whitespace-nowrap ${platform.accent}`}
                >
                  {platform.name}
                </a>
              ))}
            </div>
          </div>

          {/* Copy / Download / Native Share */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </button>

              <button
                type="button"
                onClick={handleDownloadCard}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download PNG Card
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Device Share
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
