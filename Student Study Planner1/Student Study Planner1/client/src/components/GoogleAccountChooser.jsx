import React, { useState, useEffect } from 'react';
import { X, ArrowRight, UserPlus, CheckCircle2, Settings, Flame, ExternalLink, Key } from 'lucide-react';
import { 
  isFirebaseConfigured, 
  getStoredFirebaseConfig, 
  saveFirebaseConfig,
  signInWithGoogleFirebase 
} from '../config/firebase';

export default function GoogleAccountChooser({ isOpen, onClose, onSelectAccount, selectedRole }) {
  const [step, setStep] = useState('list'); // 'list' | 'add' | 'firebase'
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(null);
  const [accounts, setAccounts] = useState([]);

  // Firebase config input state
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbAppId, setFbAppId] = useState('');
  const [fbConfigured, setFbConfigured] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep('list');
    setError('');
    setLoadingEmail(null);
    setNewEmail('');
    setNewName('');

    const storedCfg = getStoredFirebaseConfig();
    setFbApiKey(storedCfg.apiKey || '');
    setFbAppId(storedCfg.appId || '');
    setFbConfigured(isFirebaseConfigured());

    try {
      const stored = localStorage.getItem('study_google_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          return;
        }
      }
    } catch (_) {}

    // Default seed accounts
    setAccounts([
      { name: 'Sarvesh', email: 'sarvesha195@gmail.com' },
      { name: 'University Student', email: 'student.google@university.edu' }
    ]);
  }, [isOpen]);

  if (!isOpen) return null;

  const saveAccount = (acc) => {
    try {
      const existing = (() => {
        try { return JSON.parse(localStorage.getItem('study_google_accounts') || '[]'); } catch { return []; }
      })();
      const updated = [acc, ...existing.filter(a => a.email !== acc.email)].slice(0, 5);
      localStorage.setItem('study_google_accounts', JSON.stringify(updated));
      setAccounts(updated);
    } catch (_) {}
  };

  const signIn = async (account) => {
    setLoadingEmail(account.email);
    setError('');
    try {
      await onSelectAccount({
        email: account.email,
        name: account.name,
        google_id: account.google_id || `g_oauth_${Date.now()}`,
        avatar_url: account.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(account.name)}&backgroundColor=2563eb`,
      });
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
      setLoadingEmail(null);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    const name = newName.trim() || email.split('@')[0];
    const acc = {
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=2563eb`,
    };
    saveAccount(acc);
    await signIn(acc);
  };

  const handleSaveFirebaseConfig = (e) => {
    e.preventDefault();
    if (!fbApiKey.trim()) {
      setError('Please provide a valid Firebase API Key.');
      return;
    }

    saveFirebaseConfig({
      apiKey: fbApiKey.trim(),
      appId: fbAppId.trim(),
      authDomain: 'software-engineering-b50a1.firebaseapp.com',
      projectId: 'software-engineering-b50a1',
      storageBucket: 'software-engineering-b50a1.firebasestorage.app'
    });

    setFbConfigured(true);
    setConfigSuccess(true);
    setError('');
    setTimeout(() => {
      setConfigSuccess(false);
      setStep('list');
    }, 1500);
  };

  const handleFirebasePopupAuth = async () => {
    setLoadingEmail('firebase_popup');
    setError('');
    try {
      const googleUser = await signInWithGoogleFirebase();
      await onSelectAccount(googleUser);
    } catch (err) {
      console.warn('Firebase popup error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed.');
      } else {
        setError(err.message || 'Firebase sign-in failed.');
      }
      setLoadingEmail(null);
    }
  };

  const initials = (name) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden border border-slate-300 dark:border-slate-700">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Firebase / Google Logo */}
          <div className="flex justify-center items-center gap-2 mb-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Firebase Authentication</span>
          </div>

          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {step === 'list' && 'Sign in with Google Account'}
            {step === 'add' && 'Enter Google Account'}
            {step === 'firebase' && 'Firebase Project Configuration'}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Project: <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">software-engineering-b50a1</span>
          </p>

          {/* Simple Tab Bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 mt-3 text-xs">
            <button
              type="button"
              onClick={() => { setStep('list'); setError(''); }}
              className={`flex-1 py-1.5 font-medium transition ${step === 'list' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              Accounts
            </button>
            <button
              type="button"
              onClick={() => { setStep('firebase'); setError(''); }}
              className={`flex-1 py-1.5 font-medium flex items-center justify-center gap-1 transition ${step === 'firebase' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Firebase Keys</span>
              {fbConfigured && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-1.5">
              <span>⚠</span>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="font-bold">×</button>
            </div>
          )}

          {configSuccess && (
            <div className="mb-3 p-2 rounded-md bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Firebase Configuration saved successfully!</span>
            </div>
          )}

          {/* STEP 1: Account List */}
          {step === 'list' && (
            <div className="space-y-2">
              
              {/* Real Firebase Popup Trigger (if apiKey is configured) */}
              {fbConfigured && (
                <button
                  type="button"
                  disabled={loadingEmail !== null}
                  onClick={handleFirebasePopupAuth}
                  className="w-full mb-3 flex items-center justify-center gap-2 p-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
                >
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>
                    {loadingEmail === 'firebase_popup' ? 'Opening Google Popup...' : 'Open Official Google Sign-in Popup'}
                  </span>
                </button>
              )}

              <div className="text-[11px] font-semibold text-slate-500 uppercase px-1">
                Select Account to Continue:
              </div>

              {accounts.map((acc) => {
                const busy = loadingEmail === acc.email;
                return (
                  <button
                    key={acc.email}
                    disabled={loadingEmail !== null}
                    onClick={() => signIn(acc)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 transition text-left disabled:opacity-60"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(acc.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{acc.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{acc.email}</div>
                    </div>
                    {busy ? (
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              {/* Add Custom Email */}
              <button
                type="button"
                onClick={() => { setStep('add'); setError(''); }}
                className="w-full mt-2 flex items-center justify-center gap-1.5 p-2 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-50 dark:hover:bg-slate-700/30 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Use another Google email address</span>
              </button>

              {/* Configure Firebase Prompt */}
              {!fbConfigured && (
                <div className="mt-3 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                  <div className="font-semibold flex items-center gap-1 mb-0.5">
                    <Flame className="w-3 h-3 text-amber-600" />
                    <span>Firebase Project Ready</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mb-1.5">
                    Pre-linked to <code>software-engineering-b50a1</code>. Click below to add your Web API Key.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep('firebase')}
                    className="text-blue-600 dark:text-blue-400 font-semibold underline"
                  >
                    Configure Firebase API Key →
                  </button>
                </div>
              )}

            </div>
          )}

          {/* STEP 2: Add Account */}
          {step === 'add' && (
            <form onSubmit={handleAddAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="yourname@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarvesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('list')}
                  className="flex-1 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loadingEmail !== null}
                  className="flex-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  {loadingEmail ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Firebase Config */}
          {step === 'firebase' && (
            <form onSubmit={handleSaveFirebaseConfig} className="space-y-3 text-xs">
              <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  How to get your Web API Key:
                </p>
                <ol className="list-decimal pl-4 space-y-0.5 text-slate-500 dark:text-slate-400">
                  <li>In Firebase Console, click the ⚙️ <b>Project settings</b> gear.</li>
                  <li>Under <b>General</b>, scroll down to <b>"Your apps"</b>.</li>
                  <li>Click Web app <code>&lt;/&gt;</code> and copy the <code>apiKey</code>.</li>
                </ol>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Firebase Project ID
                </label>
                <input
                  type="text"
                  disabled
                  value="software-engineering-b50a1"
                  className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Firebase Web API Key
                </label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={fbApiKey}
                  onChange={(e) => setFbApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  App ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef"
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('list')}
                  className="flex-1 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  Save & Enable Firebase
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 text-center">
          Software Engineering Project • Firebase Auth Enabled
        </div>
      </div>
    </div>
  );
}
