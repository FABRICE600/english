import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Captions,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Film,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { speakPhrase, stopSpeaking } from '../utils/speech.ts';
import type { CourseLevel, LanguageChoice, LessonExample, SkillType } from '../types.ts';

interface VideoLessonPlayerProps {
  title: string;
  language: LanguageChoice;
  level: CourseLevel;
  skillType: SkillType;
  summary: string;
  content: string;
  examples?: LessonExample[];
  videoUrl?: string;
}

interface VideoScene {
  id: string;
  kicker: string;
  headline: string;
  body: string;
  phonetic?: string;
  caption: string;
  speechText: string;
  durationSec: number;
}

function normalizeEmbedUrl(rawUrl: string): { kind: 'youtube' | 'mp4' | 'iframe'; url: string } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmed)) {
    return { kind: 'mp4', url: trimmed };
  }

  try {
    const u = new URL(trimmed);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) {
        return { kind: 'youtube', url: trimmed };
      }
      const v = u.searchParams.get('v');
      if (v) {
        return { kind: 'youtube', url: `https://www.youtube.com/embed/${v}` };
      }
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      if (id) {
        return { kind: 'youtube', url: `https://www.youtube.com/embed/${id}` };
      }
    }
  } catch {
    return null;
  }

  return { kind: 'iframe', url: trimmed };
}

export function VideoLessonPlayer({
  title,
  language,
  level,
  skillType,
  summary,
  content,
  examples = [],
  videoUrl = '',
}: VideoLessonPlayerProps) {
  const embed = useMemo(() => normalizeEmbedUrl(videoUrl), [videoUrl]);

  const scenes: VideoScene[] = useMemo(() => {
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const coreBody = sentences.slice(0, 2).join(' ') || content;
    const detailBody = sentences.slice(2).join(' ') || summary;

    const list: VideoScene[] = [
      {
        id: 'intro',
        kicker: `${language === 'english' ? 'English' : 'French'} · ${level} · ${skillType}`,
        headline: title,
        body: summary || coreBody,
        caption: summary || title,
        speechText: `${title}. ${summary}`,
        durationSec: 10,
      },
      {
        id: 'concept',
        kicker: 'Lesson Explanation',
        headline: 'Core Concept & Rule',
        body: coreBody,
        caption: coreBody,
        speechText: coreBody,
        durationSec: 16,
      },
    ];

    if (detailBody && detailBody !== summary && detailBody !== coreBody) {
      list.push({
        id: 'detail',
        kicker: 'Applied Context',
        headline: 'Usage in Context',
        body: detailBody,
        caption: detailBody,
        speechText: detailBody,
        durationSec: 14,
      });
    }

    examples.forEach((ex, index) => {
      list.push({
        id: `example-${index}`,
        kicker: `Spoken Example ${index + 1} of ${examples.length}`,
        headline: ex.phrase,
        phonetic: ex.phonetic,
        body: ex.translation,
        caption: `${ex.phrase} — ${ex.translation}`,
        speechText: ex.phrase,
        durationSec: 9,
      });
    });

    list.push({
      id: 'summary',
      kicker: 'Lesson Complete',
      headline: 'Review & Practice Next',
      body: 'Replay any slide above, download the PDF study guide, or test yourself in the Skill Studio and Examinations center.',
      caption: 'Review complete. Continue to practice exercises.',
      speechText:
        language === 'french'
          ? 'Leçon terminée. Continuez avec les exercices pratiques.'
          : 'Lesson video complete. Continue with the interactive exercises.',
      durationSec: 8,
    });

    return list;
  }, [title, language, level, skillType, summary, content, examples]);

  const [mode, setMode] = useState<'interactive' | 'external'>('interactive');
  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [elapsedInScene, setElapsedInScene] = useState(0);
  const timerRef = useRef<number | null>(null);

  const activeScene = scenes[sceneIdx] || scenes[0];
  const totalDuration = scenes.reduce((sum, s) => sum + s.durationSec, 0);
  const elapsedBeforeScene = scenes
    .slice(0, sceneIdx)
    .reduce((sum, s) => sum + s.durationSec, 0);
  const overallElapsed = Math.min(totalDuration, elapsedBeforeScene + elapsedInScene);

  // Reset when lesson changes
  useEffect(() => {
    setPlaying(false);
    setSceneIdx(0);
    setElapsedInScene(0);
    setMode('interactive');
    stopSpeaking();
  }, [title]);

  // Speak current scene whenever playing starts or scene advances while playing
  useEffect(() => {
    if (!playing || mode !== 'interactive') {
      return;
    }

    speakPhrase(activeScene.speechText, language, rate);

    timerRef.current = window.setInterval(() => {
      setElapsedInScene((prev) => {
        if (prev + 1 >= activeScene.durationSec) {
          if (sceneIdx < scenes.length - 1) {
            setSceneIdx((idx) => idx + 1);
            return 0;
          }
          setPlaying(false);
          return activeScene.durationSec;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing, mode, sceneIdx, activeScene, language, rate, scenes.length]);

  const handleTogglePlay = () => {
    if (playing) {
      setPlaying(false);
      stopSpeaking();
    } else {
      if (sceneIdx === scenes.length - 1 && elapsedInScene >= activeScene.durationSec) {
        setSceneIdx(0);
        setElapsedInScene(0);
      }
      setPlaying(true);
    }
  };

  const goToScene = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(scenes.length - 1, nextIdx));
    stopSpeaking();
    setSceneIdx(clamped);
    setElapsedInScene(0);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 text-white">
      {/* Top Theater Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-200 min-w-0">
          <Film className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="truncate">Video Lesson · {title}</span>
        </div>

        {embed && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('interactive');
                setPlaying(false);
                stopSpeaking();
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                mode === 'interactive'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Interactive Studio
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                stopSpeaking();
                setMode('external');
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                mode === 'external'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              External Stream
            </button>
          </div>
        )}
      </div>

      {/* Stage Area */}
      {mode === 'external' && embed ? (
        <div className="bg-black">
          {embed.kind === 'mp4' ? (
            <video src={embed.url} controls className="w-full aspect-video" />
          ) : (
            <iframe
              title={title}
              src={embed.url}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>External video stream</span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:underline"
            >
              Open source link <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <div>
          {/* 16:9 Interactive Animated Presentation Stage */}
          <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 sm:p-10 flex flex-col justify-between overflow-hidden">
            {/* Header Row inside frame */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-blue-300 capitalize">
                {activeScene.kicker}
              </span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                Slide {sceneIdx + 1} / {scenes.length}
              </span>
            </div>

            {/* Center Focal Typography */}
            <div className="my-auto max-w-2xl space-y-3">
              <h3 className="font-display text-xl sm:text-3xl font-bold text-white leading-tight text-balance">
                {activeScene.headline}
              </h3>
              {activeScene.phonetic && (
                <p className="font-mono text-sm sm:text-base text-blue-300">
                  {activeScene.phonetic}
                </p>
              )}
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed line-clamp-4">
                {activeScene.body}
              </p>
            </div>

            {/* Synchronized Subtitles */}
            {showCaptions && (
              <div className="mx-auto max-w-xl rounded-lg bg-black/65 border border-white/10 px-4 py-2 text-center">
                <p className="text-xs sm:text-sm text-slate-100 leading-snug">
                  {activeScene.caption}
                </p>
              </div>
            )}
          </div>

          {/* Scene Timeline Scrubber & Transport Controls */}
          <div className="bg-slate-900 px-4 py-3 space-y-2.5 border-t border-slate-800">
            {/* Segmented Scene Progress Bar */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${scenes.length}, minmax(0, 1fr))` }}>
              {scenes.map((sc, i) => {
                const pct =
                  i < sceneIdx
                    ? 100
                    : i === sceneIdx
                    ? Math.min(100, Math.round((elapsedInScene / sc.durationSec) * 100))
                    : 0;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => goToScene(i)}
                    aria-label={`Jump to slide ${i + 1}: ${sc.headline}`}
                    className="h-2 rounded-full bg-slate-800 overflow-hidden text-left"
                  >
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {playing ? 'Pause' : 'Play Video'}
                </button>

                <button
                  type="button"
                  onClick={() => goToScene(sceneIdx - 1)}
                  disabled={sceneIdx === 0}
                  aria-label="Previous slide"
                  className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToScene(sceneIdx + 1)}
                  disabled={sceneIdx === scenes.length - 1}
                  aria-label="Next slide"
                  className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    goToScene(0);
                  }}
                  aria-label="Restart video"
                  className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <span className="font-mono text-xs text-slate-400 tabular-nums ml-1">
                  {formatTime(overallElapsed)} / {formatTime(totalDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakPhrase(activeScene.speechText, language, rate)}
                  aria-label="Replay current slide voice"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Volume2 className="h-3.5 w-3.5 text-blue-400" />
                  Audio
                </button>

                <div className="flex items-center gap-0.5 rounded-lg bg-slate-800 p-0.5">
                  {[0.75, 1.0, 1.15].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRate(r)}
                      className={`px-2 py-1 text-[11px] font-mono rounded ${
                        rate === r ? 'bg-blue-700 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowCaptions((prev) => !prev)}
                  aria-label="Toggle subtitles"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    showCaptions
                      ? 'border-blue-600 bg-blue-950/60 text-blue-300'
                      : 'border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Captions className="h-3.5 w-3.5" />
                  CC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
