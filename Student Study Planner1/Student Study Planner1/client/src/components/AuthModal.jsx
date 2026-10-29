import React, { useState } from 'react';
import { Mail, Lock, User, GraduationCap, Users, Shield, ArrowRight, X, Eye, EyeOff, Phone, Key, Flame } from 'lucide-react';
import { api } from '../services/api';
import GoogleAccountChooser from './GoogleAccountChooser';
import { signInWithGoogleFirebase, isFirebaseConfigured } from '../config/firebase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    invite_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailTrimmed = formData.email.trim();
    const passwordClean = formData.password;

    try {
      let res;
      if (isLogin) {
        res = await api.login({ email: emailTrimmed, password: passwordClean, role });
      } else {
        res = await api.register({
          name: formData.name.trim(),
          email: emailTrimmed,
          password: passwordClean,
          role,
          phone_number: formData.phone_number.trim() || undefined
        });

        // If parent provided student invite code during registration, link immediately
        if (role === 'parent' && formData.invite_code && res.token) {
          try {
            sessionStorage.setItem('study_token', res.token);
            localStorage.setItem('study_token', res.token);
            await api.linkParent({ invite_code: formData.invite_code });
          } catch (linkErr) {
            console.warn('Initial student link note:', linkErr.message);
          }
        }
      }

      sessionStorage.setItem('study_token', res.token);
      localStorage.setItem('study_token', res.token);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (account) => {
    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await api.googleLogin({
          email: account.email,
          name: account.name,
          google_id: account.google_id || `g_oauth_${Date.now()}`,
          avatar_url: account.avatar_url,
          role
        });

        if (res && res.token) {
          sessionStorage.setItem('study_token', res.token);
          localStorage.setItem('study_token', res.token);
          setIsGoogleChooserOpen(false);
          onAuthSuccess(res.user);
          onClose();
          return;
        }
        throw new Error('Google sign-in returned an unexpected response.');
      } catch (err) {
        lastErr = err;
        if (attempt < 2) await new Promise(r => setTimeout(r, 800));
      }
    }
    throw lastErr;
  };

  const handleGoogleButtonClick = async () => {
    setError('');
    if (isFirebaseConfigured()) {
      setLoading(true);
      try {
        const googleUser = await signInWithGoogleFirebase();
        await handleSelectGoogleAccount(googleUser);
      } catch (fbErr) {
        console.warn('Firebase Google Sign-in Notice:', fbErr);
        if (fbErr.code === 'auth/popup-closed-by-user') {
          setError('Google sign-in popup was closed.');
        } else if (fbErr.code === 'auth/cancelled-popup-request') {
          // Ignore cancellation
        } else {
          // If popup blocked or failed, open chooser modal with fallback options
          setIsGoogleChooserOpen(true);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setIsGoogleChooserOpen(true);
    }
  };

  const handleQuickDemoLogin = async (demoEmail) => {
    setError('');
    setLoading(true);
    try {
      const pwd = demoEmail === 'adminse2007@gmail.com' ? 'Adminse@2026' : 'Password123!';
      const res = await api.login({ email: demoEmail, password: pwd, role: demoEmail === 'adminse2007@gmail.com' ? 'admin' : undefined });
      sessionStorage.setItem('study_token', res.token);
      localStorage.setItem('study_token', res.token);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to login with demo account.');
    } finally {
      setLoading(false);
    }
  };

  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-6 rounded-lg shadow-lg max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white mb-2 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isLogin ? 'Student Study Planner Login' : 'Register New Account'}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Academic Study Portal
            </span>
          </div>

          {/* Clean Tab Switcher */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 mt-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-center border-b-2 transition ${isLogin ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-center border-b-2 transition ${!isLogin ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Role Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Role:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 border transition ${
                role === 'student' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Student
            </button>
            <button
              type="button"
              onClick={() => setRole('parent')}
              className={`py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 border transition ${
                role === 'parent' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Parent
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('admin');
                if (!formData.email || formData.email.includes('study.edu') || formData.email.includes('family.com')) {
                  setFormData(prev => ({ ...prev, email: 'adminse2007@gmail.com' }));
                }
              }}
              className={`py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 border transition ${
                role === 'admin' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
          </div>
          {role === 'admin' && (
            <div className="mt-2 p-1.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span>Admin access restricted to: <strong>adminse2007@gmail.com</strong></span>
            </div>
          )}
        </div>

        {/* Google / Firebase Sign In Button */}
        <button
          onClick={handleGoogleButtonClick}
          disabled={loading}
          type="button"
          className="w-full mb-3 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-300 shadow-2xs transition"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google / Firebase as {roleName}</span>
        </button>

        {/* Divider */}
        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
          <span className="relative bg-white dark:bg-slate-800 px-2 text-[10px] text-slate-400 uppercase font-medium">or email & password</span>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {!isLogin && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Sarvesh Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. sarvesha195@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {!isLogin && role === 'parent' && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Student's Invite Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. STU-SARV-9821"
                value={formData.invite_code}
                onChange={(e) => setFormData({ ...formData, invite_code: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? `Sign In as ${roleName}` : `Create ${roleName} Account`)}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-3 text-center text-[11px] text-slate-500">
          {isLogin ? "Need a new account? " : "Already registered? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            {isLogin ? 'Register here' : 'Sign in here'}
          </button>
        </div>

      </div>

      {/* Google Account Selection & Firebase Dialog */}
      <GoogleAccountChooser
        isOpen={isGoogleChooserOpen}
        onClose={() => setIsGoogleChooserOpen(false)}
        onSelectAccount={handleSelectGoogleAccount}
        selectedRole={roleName}
      />
    </div>
  );
}
