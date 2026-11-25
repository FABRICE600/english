import type { PageRoute } from '../types.ts';

interface LearnSubNavProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
}

const LEARN_TABS: Array<{ label: string; route: PageRoute }> = [
  { label: 'English Hub', route: '/english' },
  { label: 'French Hub', route: '/french' },
  { label: 'Grammar', route: '/grammar' },
  { label: 'Vocabulary', route: '/vocabulary' },
  { label: 'Listening', route: '/listening' },
  { label: 'Speaking', route: '/speaking' },
  { label: 'Reading', route: '/reading' },
  { label: 'Writing', route: '/writing' },
  { label: 'Video Lessons', route: '/videos' },
  { label: 'Examinations', route: '/exams' },
];

export function LearnSubNav({ currentRoute, onNavigate }: LearnSubNavProps) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {LEARN_TABS.map((tab) => {
            const active = currentRoute === tab.route;
            return (
              <button
                key={tab.route}
                type="button"
                onClick={() => onNavigate(tab.route)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
