import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({ src, alt, className = '', fallbackTitle }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 dark:from-slate-800 dark:via-slate-900 dark:to-blue-950 text-blue-700 dark:text-blue-300 p-6 text-center ${className}`}
      >
        <BookOpen className="h-8 w-8 mb-2 opacity-80" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
