import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  GraduationCap, 
  Users, 
  Shield, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Check,
  Calendar,
  BrainCircuit,
  Flame,
  Award,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import GoogleAccountChooser from './GoogleAccountChooser';

const ROLE_CONFIG = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    badge: '🎓 Student',
    demoEmail: 'student@study.edu',
    demoPassword: 'Password123!',
    tagline: 'Track study schedule, AI flashcards, quizzes & streaks',
    colorClasses: {
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/40 text-white',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      btn: 'from-indigo-600 via-indigo-500 to-purple-600 shadow-indigo-500/25',
      text: 'text-indigo-400',
      glow: 'from-indigo-600/20 to-purple-600/10'
    }
  },
  parent: {
    label: 'Parent',
    icon: Users,
    badge: '👨‍👩‍👧 Parent',
    demoEmail: 'parent@family.com',
    demoPassword: 'Password123!',
    tagline: 'Supervise child consistency, milestone completion & 8 PM digests',
    colorClasses: {
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-950/40 text-white',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      btn: 'from-purple-600 via-purple-500 to-indigo-600 shadow-purple-500/25',
      text: 'text-purple-400',
      glow: 'from-purple-600/20 to-pink-600/10'
    }
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    badge: '🛡️ Admin',
    demoEmail: 'adminse2007@gmail.com',
    demoPassword: 'Adminse@2026',
    tagline: 'Manage system users, platform analytics & automated alerts',
    colorClasses: {
      activeBorder: 'border-pink-500 ring-2 ring-pink-500/30 bg-pink-950/40 text-white',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      btn: 'from-pink-600 via-pink-500 to-rose-600 shadow-pink-500/25',
      text: 'text-pink-400',
      glow: 'from-pink-600/20 to-rose-600/10'
    }
  }
};

export default function LoginPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    invite_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [showForgotTip, setShowForgotTip] = useState(false);

  const activeConfig = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.student;

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setError('');
  };

  const handleQuickFillDemo = () => {
    setFormData(prev => ({
      ...prev,
      email: activeConfig.demoEmail,
      password: activeConfig.demoPassword
    }));
    setCopiedDemo(true);
    setTimeout(() => setCopiedDemo(false), 2000);
    setError('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  // Google Account Chooser Selection Handler
  const handleSelectGoogleAccount = async (account) => {
    // Retry up to 2 times on 502/network errors (proxy warm-up)
    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await api.googleLogin({
          email: account.email,
          name: account.name,
          google_id: `g_oauth_${Date.now()}`,
          avatar_url: account.avatar_url,
          role: selectedRole
        });

        if (res && res.token) {
          localStorage.setItem('study_token', res.token);
          setIsGoogleChooserOpen(false);
          onAuthSuccess(res.user);
          return;
        } else {
          throw new Error('Google sign-in returned an unexpected response.');
        }
      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          // Brief pause before retry
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }
    // Surface error inside the chooser
    throw lastErr;
  };

  // Standard Email & Password Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailClean = formData.email.trim();
    const passwordClean = formData.password;

    if (!emailClean || !passwordClean) {
      setError('Please provide both your email address and password.');
      setLoading(false);
      return;
    }

    try {
      let res;
      if (isLogin) {
        res = await api.login({ email: emailClean, password: passwordClean });
      } else {
        if (!formData.name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }

        res = await api.register({
          name: formData.name.trim(),
          email: emailClean,
          password: passwordClean,
          role: selectedRole,
          phone_number: formData.phone_number.trim() || undefined
        });

        // Link student if parent registered with invite code
        if (selectedRole === 'parent' && formData.invite_code?.trim() && res.token) {
          try {
            localStorage.setItem('study_token', res.token);
            await api.linkParent({ invite_code: formData.invite_code.trim() });
          } catch (linkErr) {
            console.warn('Initial student link note:', linkErr.message);
          }
        }
      }

      if (res && res.token) {
        localStorage.setItem('study_token', res.token);
        onAuthSuccess(res.user);
      } else {
        setError('Authentication failed: no session token returned.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4 sm:px-6">
      
      {/* Dynamic ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Product Showcase & Value Props (Visible on Large/Medium) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-8 pr-4">
          
          <div>
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI-Powered Academic Schedule & Mentor</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Master Your Semester with <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Smart Automation</span>
            </h1>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Join thousands of students and parents achieving academic excellence through Claude 3.5 AI mentoring, adaptive milestone schedules, and automated progress reports.
            </p>
          </div>

          {/* Interactive Feature Highlights */}
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Dynamic Milestone Scheduling</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Automatically chunks course syllabus modules based on exam targets and daily hour capacity.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Claude AI Tutor & Notes Generator</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Get instant conceptual analogies, AI flashcard decks, and tailored diagnostic quizzes.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">Automated 8:00 PM Parent Digest</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Daily email audit reports delivered to parents covering active study streaks and completed tasks.
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof & Metrics */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Dual SQLite / MySQL 8.0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Study Streak Gamification</span>
            </div>
          </div>

        </div>

        {/* Right Column: High-End Auth Card (Col 7 on LG) */}
        <div className="w-full lg:col-span-7 max-w-lg mx-auto">
          <div className="glass-panel p-6 sm:p-9 rounded-3xl shadow-2xl border border-slate-700/70 backdrop-blur-2xl relative overflow-hidden">
            
            {/* Top Glowing Edge Bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${activeConfig.colorClasses.btn}`}></div>

            {/* Header with Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {isLogin ? 'Sign In to Portal' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Smart Study Planner & AI Mentor
                  </p>
                </div>
              </div>

              {/* Mode Toggle Switch (Sign In / Sign Up) */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* STEP 1: ROLE SELECTION */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] inline-flex items-center justify-center font-bold">1</span>
                  Select Role:
                </label>
                <span className={`text-[11px] font-semibold ${activeConfig.colorClasses.text}`}>
                  Signing in as: {activeConfig.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'student', label: 'Student', icon: GraduationCap },
                  { key: 'parent', label: 'Parent', icon: Users },
                  { key: 'admin', label: 'Admin', icon: Shield }
                ].map(({ key, label, icon: Icon }) => {
                  const isSelected = selectedRole === key;
                  const cfg = ROLE_CONFIG[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleRoleSelect(key)}
                      className={`py-3 px-2.5 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        isSelected 
                          ? `${cfg.colorClasses.activeBorder} shadow-lg` 
                          : 'bg-slate-900/60 border-slate-700/70 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? cfg.colorClasses.text : 'text-slate-400'}`} />
                      <span>{label}</span>
                      {isSelected && (
                        <span className="text-[10px] flex items-center gap-0.5 text-emerald-400 font-semibold">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 mt-2 px-1">
                {activeConfig.tagline}
              </p>
            </div>

            {/* STEP 2: AUTHENTICATION (Google + Email) */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] inline-flex items-center justify-center font-bold">2</span>
                Sign In Method:
              </label>

              {/* Official Google OAuth Button */}
              <button
                onClick={() => setIsGoogleChooserOpen(true)}
                disabled={loading}
                type="button"
                className="w-full mb-3 flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-98 text-slate-800 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google as {activeConfig.label}</span>
              </button>

              {/* 1-Click Demo Credentials Chip */}
              {isLogin && (
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="w-full mb-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold transition active:scale-98 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {copiedDemo 
                      ? `✓ Filled ${activeConfig.label} demo credentials!` 
                      : `⚡ 1-Click Autofill ${activeConfig.label} Credentials`}
                  </span>
                </button>
              )}

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/80"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-[#111827] px-3 text-slate-400 font-semibold">or with email</span>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
                <button 
                  type="button"
                  onClick={() => setError('')}
                  className="text-rose-400 hover:text-white ml-1 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Full Name (Sign Up only) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder={`e.g. ${activeConfig.demoEmail}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowForgotTip(!showForgotTip)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition p-0.5 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {showForgotTip && (
                  <div className="mt-2 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 animate-fade-in">
                    💡 For demo profiles, the default password is <code className="font-mono font-bold text-white">Password123!</code>. Or click the 1-Click Autofill button above.
                  </div>
                )}
              </div>

              {/* Remember Me Checkbox */}
              {isLogin && (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">JWT Secure</span>
                </div>
              )}

              {/* Phone Number (Optional on Sign Up) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone Number <span className="text-slate-500 font-normal">(Optional for alert digests)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 000-0000"
                      value={formData.phone_number}
                      onChange={(e) => handleInputChange('phone_number', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Student Invite Code (for Parent registration) */}
              {!isLogin && selectedRole === 'parent' && (
                <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                  <label className="block text-xs font-medium text-purple-300 mb-1">
                    Student's Invite Code <span className="text-purple-400/80 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. STU-SARV-9821"
                      value={formData.invite_code}
                      onChange={(e) => handleInputChange('invite_code', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-purple-500/40 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-400 transition"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 You can also link your student anytime later from the Parent Dashboard.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r ${activeConfig.colorClasses.btn} hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-98 disabled:opacity-50 cursor-pointer`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing In as {activeConfig.label}...</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? `Sign In as ${activeConfig.label}` : `Create ${activeConfig.label} Account`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Footer Notice */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
              By proceeding, you agree to Smart Study Planner's{' '}
              <span className="text-slate-400 hover:underline cursor-pointer">Terms of Service</span> and{' '}
              <span className="text-slate-400 hover:underline cursor-pointer">Privacy Policy</span>.
            </div>

          </div>
        </div>

      </div>

      {/* Realistic Google Account Selection Modal */}
      <GoogleAccountChooser
        isOpen={isGoogleChooserOpen}
        onClose={() => setIsGoogleChooserOpen(false)}
        onSelectAccount={handleSelectGoogleAccount}
        selectedRole={activeConfig.label}
      />
    </div>
  );
}
