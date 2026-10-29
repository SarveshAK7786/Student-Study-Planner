import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StudentDashboard from './components/StudentDashboard';
import ParentDashboard from './components/ParentDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import FreshLanding from './components/FreshLanding';
import OnboardingModal from './components/OnboardingModal';
import ClaudeChatbot from './components/ClaudeChatbot';
import { api } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [dbStatus, setDbStatus] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // Apply dark mode class on mount
  useEffect(() => {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  }, []);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [alertToast, setAlertToast] = useState(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Fetch DB status
      const health = await api.getHealth().catch(() => null);
      if (health?.database) setDbStatus(health.database);

      // 2. Fetch User Profile if active session exists in current tab
      const token = sessionStorage.getItem('study_token');
      if (token) {
        try {
          const meData = await api.getMe();
          if (meData && meData.user) {
            setCurrentUser(meData.user);
            if (meData.user.role === 'student') {
              const courseList = await api.getCourses().catch(() => []);
              setCourses(courseList || []);
            } else {
              setCourses([]);
            }
          } else {
            sessionStorage.removeItem('study_token');
            localStorage.removeItem('study_token');
            setCurrentUser(null);
          }
        } catch (authErr) {
          console.warn('Session expired or token invalid:', authErr.message);
          sessionStorage.removeItem('study_token');
          localStorage.removeItem('study_token');
          setCurrentUser(null);
        }
      } else {
        // Fresh entry: show pristine blank & fresh landing state
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('App init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    if (user.role === 'student') {
      try {
        const courseList = await api.getCourses();
        setCourses(courseList || []);
      } catch (e) {
        setCourses([]);
      }
    } else {
      setCourses([]);
    }
  };

  const handleSwitchUser = async (demoEmail) => {
    try {
      const password = demoEmail === 'adminse2007@gmail.com' ? 'Adminse@2026' : 'Password123!';
      const res = await api.login({ email: demoEmail, password });
      sessionStorage.setItem('study_token', res.token);
      localStorage.setItem('study_token', res.token);
      await handleAuthSuccess(res.user);
    } catch (err) {
      alert('Error switching user: ' + err.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('study_token');
    localStorage.removeItem('study_token');
    setCurrentUser(null);
    setCourses([]);
    setIsAuthModalOpen(false);
  };

  const handleToggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    if (newIsDarkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
  };

  const handleTriggerDailyAlert = async () => {
    try {
      const studentId = currentUser?.role === 'student' ? currentUser.id : null;
      const res = await api.triggerDailyAlertNow(studentId);
      
      const sentCount = res.result?.alertsSent?.length || 1;
      const preview = res.result?.alertsSent?.find(a => a.previewUrl)?.previewUrl;

      setAlertToast({
        title: 'Daily Progress Digest Dispatched!',
        message: `Personalized report successfully sent to both Student and Linked Parent accounts (${sentCount} delivered).`,
        previewUrl: preview
      });

      setTimeout(() => setAlertToast(null), 8000);
    } catch (err) {
      alert('Error triggering alert: ' + err.message);
    }
  };

  const handleCourseCreated = async () => {
    if (currentUser?.role === 'student') {
      const updated = await api.getCourses();
      setCourses(updated);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span>Loading Student Study Planner...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'light bg-slate-50 text-slate-900'}`}>
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        onTriggerDailyAlert={handleTriggerDailyAlert}
        dbStatus={dbStatus}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Daily Digest Toast Banner */}
      {alertToast && (
        <div className="fixed top-20 right-6 z-50 max-w-md p-4 rounded-2xl glass-card border border-emerald-500/40 shadow-2xl animate-fade-in text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-emerald-400">
            <span>✨ {alertToast.title}</span>
            <button onClick={() => setAlertToast(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-slate-200">{alertToast.message}</p>
          {alertToast.previewUrl && (
            <a
              href={alertToast.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-1 text-indigo-400 hover:underline font-semibold"
            >
              🔗 View Ethereal Email Inbox Preview →
            </a>
          )}
        </div>
      )}

      {/* Main Role-Specific View or Blank & Fresh Landing Gateway */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {!currentUser ? (
          <FreshLanding onOpenAuth={() => setIsAuthModalOpen(true)} />
        ) : currentUser.role === 'student' ? (
          <StudentDashboard
            currentUser={currentUser}
            courses={courses}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onRefreshData={handleCourseCreated}
          />
        ) : currentUser.role === 'parent' ? (
          <ParentDashboard
            currentUser={currentUser}
          />
        ) : (
          <AdminDashboard
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Floating Claude AI Chatbot Mentor */}
      {currentUser && (
        <ClaudeChatbot activeCourse={courses?.[0]} />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCourseCreated={handleCourseCreated}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Study Planner — Software Engineering Academic Project</span>
          <span>Powered by React 19, Tailwind CSS, Claude AI & MySQL 8.0</span>
        </div>
      </footer>

    </div>
  );
}
