import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { speakPhrase } from '../utils/speech.ts';
import type { LanguageChoice } from '../types.ts';

export interface FlashcardItem {
  term: string;
  phonetic: string;
  meaning: string;
  example: string;
  category?: string;
}

type RetentionStatus = 'unreviewed' | 'review' | 'mastered';

interface VocabularyFlashcardsProps {
  language: LanguageChoice;
  cards: FlashcardItem[];
}

export function VocabularyFlashcards({ language, cards }: VocabularyFlashcardsProps) {
  const [deckOrder, setDeckOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [currentPos, setCurrentPos] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'review' | 'mastered'>('all');
  const [retention, setRetention] = useState<Record<string, RetentionStatus>>({});

  useEffect(() => {
    setDeckOrder(cards.map((_, i) => i));
    setCurrentPos(0);
    setIsFlipped(false);
    setFilterMode('all');
  }, [language, cards]);

  const safeCards = Array.isArray(cards) ? cards : [];

  const getStatus = (term: string): RetentionStatus => retention[term] || 'unreviewed';

  const masteredCount = safeCards.filter((c) => getStatus(c.term) === 'mastered').length;
  const reviewCount = safeCards.filter((c) => getStatus(c.term) === 'review').length;
  const reviewedCount = masteredCount + reviewCount;
  const retentionPercent =
    reviewedCount > 0 ? Math.round((masteredCount / reviewedCount) * 100) : 0;

  const visibleIndices = deckOrder.filter((idx) => {
    const item = safeCards[idx];
    if (!item) return false;
    const status = getStatus(item.term);
    if (filterMode === 'review') return status === 'review' || status === 'unreviewed';
    if (filterMode === 'mastered') return status === 'mastered';
    return true;
  });

  const safePos =
    visibleIndices.length > 0 ? Math.min(currentPos, visibleIndices.length - 1) : 0;
  const activeCard =
    visibleIndices.length > 0 ? safeCards[visibleIndices[safePos]] : undefined;

  const goNext = () => {
    if (visibleIndices.length <= 1) return;
    setIsFlipped(false);
    setCurrentPos((prev) => (prev + 1) % visibleIndices.length);
  };

  const goPrev = () => {
    if (visibleIndices.length <= 1) return;
    setIsFlipped(false);
    setCurrentPos((prev) => (prev - 1 + visibleIndices.length) % visibleIndices.length);
  };

  const markRetention = (status: 'review' | 'mastered') => {
    if (!activeCard) return;
    setRetention((prev) => ({ ...prev, [activeCard.term]: status }));
    setIsFlipped(false);
    if (visibleIndices.length > 1) {
      setCurrentPos((prev) => (prev + 1) % visibleIndices.length);
    }
  };

  const shuffleDeck = () => {
    const copy = [...deckOrder];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeckOrder(copy);
    setCurrentPos(0);
    setIsFlipped(false);
  };

  const resetRetention = () => {
    setRetention((prev) => {
      const next = { ...prev };
      for (const c of safeCards) {
        delete next[c.term];
      }
      return next;
    });
    setFilterMode('all');
    setCurrentPos(0);
    setIsFlipped(false);
  };

  return (
    <section
      aria-labelledby="flashcard-deck-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
    >
      {/* Header & Memory Retention Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 capitalize">
            <Sparkles className="h-3.5 w-3.5" />
            {language} Active Recall Flashcards
          </p>
          <h2
            id="flashcard-deck-heading"
            className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white"
          >
            Interactive Flashcard Deck &amp; Memory Retention
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
            {masteredCount}/{safeCards.length} mastered
          </span>
          <span className="text-amber-700 dark:text-amber-400 font-semibold">
            {reviewCount} review
          </span>
          <span className="text-blue-700 dark:text-blue-400 font-bold">
            Retention: {retentionPercent}%
          </span>
        </div>
      </div>

      {/* Retention Progress Bar & Controls */}
      <div className="space-y-3">
        <div
          role="progressbar"
          aria-label="Flashcard mastery progress"
          aria-valuenow={safeCards.length > 0 ? Math.round((masteredCount / safeCards.length) * 100) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-500"
            style={{
              width: `${safeCards.length > 0 ? Math.round((masteredCount / safeCards.length) * 100) : 0}%`,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'all', label: `All (${safeCards.length})` },
                { id: 'review', label: `To Review (${safeCards.length - masteredCount})` },
                { id: 'mastered', label: `Mastered (${masteredCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterMode(tab.id);
                  setCurrentPos(0);
                  setIsFlipped(false);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filterMode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shuffleDeck}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle
            </button>
            <button
              type="button"
              onClick={resetRetention}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Active Flashcard */}
      {!activeCard ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {filterMode === 'review'
              ? 'Great job! Every card in this deck is currently marked as mastered.'
              : 'No cards match this filter yet. Flip cards and mark them as Mastered to track retention.'}
          </p>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            Show All Cards
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Flashcard ${safePos + 1} of ${visibleIndices.length}: ${activeCard.term}. Press Enter or Space to flip.`}
            onClick={() => setIsFlipped((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIsFlipped((prev) => !prev);
              } else if (e.key === 'ArrowRight') {
                goNext();
              } else if (e.key === 'ArrowLeft') {
                goPrev();
              }
            }}
            className={`min-h-[230px] rounded-xl border p-6 sm:p-8 flex flex-col justify-between cursor-pointer select-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              isFlipped
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                Card {safePos + 1} / {visibleIndices.length}
                {activeCard.category ? ` · ${activeCard.category}` : ''}
              </span>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold ${
                    getStatus(activeCard.term) === 'mastered'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : getStatus(activeCard.term) === 'review'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {getStatus(activeCard.term) === 'mastered'
                    ? 'Mastered'
                    : getStatus(activeCard.term) === 'review'
                      ? 'Needs Review'
                      : 'Unreviewed'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakPhrase(
                      isFlipped ? `${activeCard.term}. ${activeCard.example}` : activeCard.term,
                      language,
                      0.92
                    );
                  }}
                  aria-label={`Pronounce ${activeCard.term}`}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isFlipped ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Term · Front
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {activeCard.term}
                </h3>
                <p className="font-mono text-sm text-slate-600 dark:text-slate-400">
                  {activeCard.phonetic}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Translation &amp; Usage · Back
                </p>
                <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {activeCard.meaning}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 italic max-w-xl mx-auto">
                  “{activeCard.example}”
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <FlipHorizontal2 className="h-3.5 w-3.5" />
              <span>{isFlipped ? 'Click card to return to term' : 'Click card or press Space to reveal translation'}</span>
            </div>
          </div>

          {/* Navigation & Self-Assessment Retention Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FlipHorizontal2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                Flip Card
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markRetention('review')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Still Learning
              </button>
              <button
                type="button"
                onClick={() => markRetention('mastered')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mastered
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
