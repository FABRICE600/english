import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { CoursesPage } from './pages/CoursesPage.tsx';
import { LanguageHubPage } from './pages/LanguageHubPage.tsx';
import { SkillStudioPage } from './pages/SkillStudios.tsx';
import { VideoLibraryPage } from './pages/VideoLibraryPage.tsx';
import { ExamsPage } from './pages/ExamsPage.tsx';
import { StudentDashboard } from './pages/StudentDashboard.tsx';
import { TeacherDashboard } from './pages/TeacherDashboard.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import type { PageRoute, UserRole } from './types.ts';

const VALID_ROUTES: PageRoute[] = [
  '/',
  '/about',
  '/courses',
  '/english',
  '/french',
  '/grammar',
  '/vocabulary',
  '/listening',
  '/speaking',
  '/reading',
  '/writing',
  '/videos',
  '/exams',
  '/dashboard/student',
  '/dashboard/teacher',
  '/dashboard/admin',
  '/login',
  '/register',
  '/profile',
  '/contact',
];

function parseRoute(pathname: string): PageRoute {
  if (VALID_ROUTES.includes(pathname as PageRoute)) {
    return pathname as PageRoute;
  }
  return '/';
}

function ProtectedGuard({
  allowedRoles,
  onNavigate,
  children,
}: {
  allowedRoles?: UserRole[];
  onNavigate: (route: PageRoute) => void;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Sign In Required
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Please sign in with your LinguaLearn account to access this protected area.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/login')}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const homeDash: PageRoute =
      user.role === 'admin'
        ? '/dashboard/admin'
        : user.role === 'teacher'
        ? '/dashboard/teacher'
        : '/dashboard/student';

    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your account role ({user.role}) does not have permission to view this dashboard.
        </p>
        <button
          type="button"
          onClick={() => onNavigate(homeDash)}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Return to My Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function LinguaLearnShell() {
  const [route, setRoute] = useState<PageRoute>(() => parseRoute(window.location.pathname));
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const navigate = (next: PageRoute) => {
    if (next !== '/courses') setSelectedCourseId(null);
    setRoute(next);
    if (window.location.pathname !== next) {
      window.history.pushState({}, '', next);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCourse = (courseId: string | null) => {
    setSelectedCourseId(courseId);
    setRoute('/courses');
    if (window.location.pathname !== '/courses') {
      window.history.pushState({}, '', '/courses');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar currentRoute={route} onNavigate={navigate} />

      <main className="flex-1">
        {route === '/' && <HomePage onNavigate={navigate} onSelectCourse={openCourse} />}
        {route === '/about' && <AboutPage onNavigate={navigate} />}
        {route === '/courses' && (
          <CoursesPage
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            onNavigate={navigate}
          />
        )}
        {route === '/english' && (
          <LanguageHubPage language="english" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/french' && (
          <LanguageHubPage language="french" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/grammar' && (
          <SkillStudioPage skill="grammar" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/vocabulary' && (
          <SkillStudioPage skill="vocabulary" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/listening' && (
          <SkillStudioPage skill="listening" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/speaking' && (
          <SkillStudioPage skill="speaking" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/reading' && (
          <SkillStudioPage skill="reading" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/writing' && (
          <SkillStudioPage skill="writing" currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/videos' && (
          <VideoLibraryPage currentRoute={route} onNavigate={navigate} />
        )}
        {route === '/exams' && <ExamsPage currentRoute={route} onNavigate={navigate} />}
        {route === '/login' && <LoginPage onNavigate={navigate} />}
        {route === '/register' && <RegisterPage onNavigate={navigate} />}
        {route === '/contact' && <ContactPage />}

        {route === '/profile' && (
          <ProtectedGuard onNavigate={navigate}>
            <ProfilePage onNavigate={navigate} />
          </ProtectedGuard>
        )}
        {route === '/dashboard/student' && (
          <ProtectedGuard allowedRoles={['student']} onNavigate={navigate}>
            <StudentDashboard onNavigate={navigate} onSelectCourse={openCourse} />
          </ProtectedGuard>
        )}
        {route === '/dashboard/teacher' && (
          <ProtectedGuard allowedRoles={['teacher']} onNavigate={navigate}>
            <TeacherDashboard onNavigate={navigate} />
          </ProtectedGuard>
        )}
        {route === '/dashboard/admin' && (
          <ProtectedGuard allowedRoles={['admin']} onNavigate={navigate}>
            <AdminDashboard onNavigate={navigate} />
          </ProtectedGuard>
        )}
      </main>

      <Footer onNavigate={navigate} />
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <LinguaLearnShell />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
