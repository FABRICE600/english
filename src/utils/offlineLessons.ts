import { registerSW } from 'virtual:pwa-register';
import type { LanguageChoice, Lesson, SkillType } from '../types.ts';

export const OFFLINE_LESSONS_CACHE = 'lingualearn-offline-lessons-v1';
export const OFFLINE_PDFS_CACHE = 'lingualearn-offline-pdfs-v1';
const INDEX_STORAGE_KEY = 'lingualearn_offline_lessons_v1';

export interface OfflineLessonRecord extends Lesson {
  downloadedAt: string;
}

let swRegistered = false;

export function registerOfflineServiceWorker(onReady?: () => void): void {
  if (swRegistered || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  swRegistered = true;
  try {
    registerSW({
      immediate: true,
      onOfflineReady() {
        onReady?.();
      },
      onRegisterError(err) {
        console.warn('[LinguaLearn] Service worker registration skipped:', err);
      },
    });
  } catch (err) {
    console.warn('[LinguaLearn] Service worker setup error:', err);
  }
}

function readLocalFallbackMap(): Record<string, OfflineLessonRecord> {
  try {
    const raw = localStorage.getItem(INDEX_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, OfflineLessonRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalFallbackMap(map: Record<string, OfflineLessonRecord>): void {
  try {
    localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota issues
  }
}

export async function downloadLessonForOffline(lesson: Lesson): Promise<OfflineLessonRecord> {
  const record: OfflineLessonRecord = {
    ...lesson,
    downloadedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const lessonCache = await caches.open(OFFLINE_LESSONS_CACHE);
      const cacheKey = new Request(`/offline-lessons/${encodeURIComponent(lesson._id)}.json`);
      const payload = new Response(JSON.stringify(record), {
        headers: { 'Content-Type': 'application/json' },
      });
      await lessonCache.put(cacheKey, payload);

      if (lesson.pdfTitle) {
        const pdfUrl = `/api/lessons/${encodeURIComponent(lesson._id)}/pdf`;
        try {
          const pdfRes = await fetch(pdfUrl);
          if (pdfRes.ok) {
            const pdfCache = await caches.open(OFFLINE_PDFS_CACHE);
            await pdfCache.put(pdfUrl, pdfRes);
          }
        } catch {
          // If PDF fetch fails offline, pdfContent inside record remains available
        }
      }
    } catch (err) {
      console.warn('[LinguaLearn] Cache Storage write fallback:', err);
    }
  }

  const map = readLocalFallbackMap();
  map[lesson._id] = record;
  writeLocalFallbackMap(map);
  return record;
}

export async function downloadManyLessonsForOffline(lessons: Lesson[]): Promise<number> {
  let saved = 0;
  for (const lesson of lessons) {
    await downloadLessonForOffline(lesson);
    saved += 1;
  }
  return saved;
}

export async function removeOfflineLesson(lessonId: string): Promise<void> {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const lessonCache = await caches.open(OFFLINE_LESSONS_CACHE);
      await lessonCache.delete(`/offline-lessons/${encodeURIComponent(lessonId)}.json`);
      const pdfCache = await caches.open(OFFLINE_PDFS_CACHE);
      await pdfCache.delete(`/api/lessons/${encodeURIComponent(lessonId)}/pdf`);
    } catch {
      // ignore
    }
  }

  const map = readLocalFallbackMap();
  delete map[lessonId];
  writeLocalFallbackMap(map);
}

export async function getOfflineLessons(filters?: {
  language?: LanguageChoice;
  skillType?: SkillType;
  level?: string;
}): Promise<OfflineLessonRecord[]> {
  const byId = new Map<string, OfflineLessonRecord>();

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const lessonCache = await caches.open(OFFLINE_LESSONS_CACHE);
      const requests = await lessonCache.keys();
      const items = await Promise.all(
        requests.map(async (req) => {
          const res = await lessonCache.match(req);
          if (!res) return null;
          return (await res.json()) as OfflineLessonRecord;
        })
      );
      for (const item of items) {
        if (item && item._id) {
          byId.set(item._id, item);
        }
      }
    } catch {
      // fallback to localStorage index below
    }
  }

  if (byId.size === 0) {
    const localMap = readLocalFallbackMap();
    for (const item of Object.values(localMap)) {
      if (item && item._id) byId.set(item._id, item);
    }
  }

  let list = Array.from(byId.values());
  if (filters?.language) {
    list = list.filter((l) => l.language === filters.language);
  }
  if (filters?.skillType) {
    list = list.filter((l) => l.skillType === filters.skillType);
  }
  if (filters?.level && filters.level !== 'all') {
    list = list.filter((l) => l.level === filters.level);
  }

  return list.sort((a, b) => a.order - b.order);
}

export function getDownloadedLessonIdSet(): Set<string> {
  return new Set(Object.keys(readLocalFallbackMap()));
}

export async function downloadStudySheetLocally(lesson: Lesson): Promise<void> {
  const pdfUrl = `/api/lessons/${encodeURIComponent(lesson._id)}/pdf`;
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const pdfCache = await caches.open(OFFLINE_PDFS_CACHE);
      const cached = await pdfCache.match(pdfUrl);
      if (cached) {
        const blob = await cached.blob();
        triggerBlobDownload(blob, lesson.pdfTitle || `${lesson.title}.txt`);
        return;
      }
    } catch {
      // fall through
    }
  }

  const textBody = [
    `LINGUALEARN OFFLINE STUDY GUIDE`,
    `Title: ${lesson.title}`,
    `Language: ${lesson.language} | Level: ${lesson.level} | Skill: ${lesson.skillType}`,
    '',
    lesson.summary ? `Summary:\n${lesson.summary}\n` : '',
    `Lesson Notes:\n${lesson.content}\n`,
    lesson.pdfContent ? `Worksheet:\n${lesson.pdfContent}\n` : '',
    Array.isArray(lesson.examples) && lesson.examples.length > 0
      ? `Examples:\n${lesson.examples
          .map((ex) => `- ${ex.phrase} (${ex.phonetic}) — ${ex.translation}`)
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const blob = new Blob([textBody], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, `${lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
