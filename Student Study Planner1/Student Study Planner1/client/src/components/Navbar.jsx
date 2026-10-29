import React, { useState } from 'react';
import { 
  GraduationCap, 
  Database, 
  Sun, 
  Moon, 
  LogOut, 
  Copy, 
  Check, 
  Send 
} from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  onLogout, 
  onSwitchUser, 
  onTriggerDailyAlert, 
  dbStatus, 
  isDarkMode, 
  onToggleTheme,
  onOpenAuthModal 
}) {
  const [copied, setCopied] = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);

  const copyInviteCode = () => {
    if (currentUser?.invite_code) {
      navigator.clipboard.writeText(currentUser.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAlertClick = async () => {
    setIsAlerting(true);
    await onTriggerDailyAlert();
    setIsAlerting(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                Student Study Planner
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Database Connection Pill */}
          <div className="relative">
            <button
              onClick={() => setShowDbInfo(!showDbInfo)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 transition"
              title="Database Info"
            >
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">
                {dbStatus?.driver === 'mysql' ? 'MySQL 8.0' : 'SQLite DB'}
              </span>
            </button>

            {/* DB Info Modal Popup */}
            {showDbInfo && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg z-50 text-left border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                  <span>Database Details</span>
                  <button onClick={() => setShowDbInfo(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="font-mono font-bold uppercase text-blue-600">{dbStatus?.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database:</span>
                    <span className="font-mono">{dbStatus?.databaseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-green-600 font-medium">Connected</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student's Invite Code */}
          {currentUser && currentUser.role === 'student' && currentUser.invite_code && (
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 transition"
              title="Copy student code for parent"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Code:</span>
              <span className="font-bold">{currentUser.invite_code}</span>
            </button>
          )}

          {/* Simulate 8 PM Alert */}
          {currentUser && (
            <button
              onClick={handleAlertClick}
              disabled={isAlerting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 transition disabled:opacity-50"
              title="Send 8:00 PM email summary digest"
            >
              <Send className={`w-3 h-3 ${isAlerting ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Send Digest</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>

          {/* User Profile / Logout */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                  {currentUser.role}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900 transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
            >
              Sign In
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
