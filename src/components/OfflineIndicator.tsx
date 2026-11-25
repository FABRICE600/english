import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { getDownloadedLessonIdSet } from '../utils/offlineLessons.ts';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  const savedCount = getDownloadedLessonIdSet().size;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-100 shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
      <span>
        Offline Mode — {savedCount} downloaded {savedCount === 1 ? 'lesson' : 'lessons'} available
      </span>
    </div>
  );
}
