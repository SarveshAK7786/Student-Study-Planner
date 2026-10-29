import React from 'react';
import { 
  GraduationCap, 
  ArrowRight, 
  Calendar, 
  BrainCircuit, 
  FileCheck2, 
  Clock, 
  Users, 
  BarChart3,
  MousePointerClick,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

export default function FreshLanding({ onOpenAuth }) {
  return (
    <div 
      onClick={onOpenAuth}
      className="min-h-[80vh] flex flex-col items-center justify-center cursor-pointer select-none py-10 px-4 sm:px-6 transition-all group"
      title="Click anywhere to open Login"
    >
      {/* Central Welcome Card */}
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-sm text-center flex flex-col items-center transition-all hover:border-blue-400 dark:hover:border-blue-500">
        
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform">
          <GraduationCap className="w-9 h-9" />
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Student Study Planner
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed mb-6">
          An academic study management system designed to organize course syllabi into daily study milestones, track assignment submissions, practice topic quizzes, and send progress updates to parents.
        </p>

        {/* Clean Primary Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAuth();
            }}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 shadow transition active:scale-95"
          >
            <span>Login / Register to Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle click cue */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <MousePointerClick className="w-3.5 h-3.5 text-blue-500" />
          <span>Click anywhere on this screen to open the login dialog</span>
        </div>

      </div>

      {/* Realistic Project Modules Grid */}
      <div className="w-full max-w-4xl mt-10">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-4">
          System Modules & Key Features
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left">
          
          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 mb-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <Calendar className="w-4 h-4 shrink-0" />
              <h3>Course Syllabus Scheduling</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Splits complete course topics into day-by-day study milestones with estimated study minutes.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 mb-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <BrainCircuit className="w-4 h-4 shrink-0" />
              <h3>Topic Study Hub & Notes</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Click any milestone to view summarized study notes, key concept takeaways, and practice flashcards.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 mb-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <h3>Assignment Submissions</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Submit assignment documents. Features automated validation and resubmission alerts for irrelevant files.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 mb-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <h3>Pomodoro Study Timer</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standard 25-minute focus intervals and 5-minute break cycles to track active study hours.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 mb-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <h3>Performance & Quiz Tracker</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Diagnostic multiple-choice quizzes, daily study streak counters, and syllabus completion charts.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 mb-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <Users className="w-4 h-4 shrink-0" />
              <h3>Parent & Admin Portals</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dedicated dashboards for parents to monitor study consistency and automated 8:00 PM email summaries.
            </p>
          </div>

        </div>

        {/* Clean Student Project Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-4">
          Software Engineering Laboratory • Department of Computer Science & Engineering
        </div>
      </div>

    </div>
  );
}
