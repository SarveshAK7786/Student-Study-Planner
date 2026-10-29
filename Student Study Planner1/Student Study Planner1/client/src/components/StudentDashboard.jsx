import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Flame, 
  BookOpen, 
  Brain,
  BrainCircuit, 
  TrendingUp, 
  Award, 
  Check, 
  Play, 
  FileText,
  Sparkles,
  BarChart2,
  UploadCloud,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { api } from '../services/api';
import PomodoroTimer from './PomodoroTimer';
import NotesTab from './NotesTab';
import QuizModal from './QuizModal';
import TopicStudyModal from './TopicStudyModal';
import AssignmentModal from './AssignmentModal';

export default function StudentDashboard({ 
  currentUser, 
  courses, 
  onOpenOnboarding, 
  onRefreshData 
}) {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'assignments' | 'quizzes' | 'notes' | 'analytics'
  const [studyPlans, setStudyPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeCourseId, setActiveCourseId] = useState(courses[0]?.id || '');
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New assignment modal / submit
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  // AI Quiz prompt state
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  // Topic Study Hub Modal
  const [selectedPlanForStudy, setSelectedPlanForStudy] = useState(null);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);

  // Assignment Modal
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const handleOpenStudyModal = (plan) => {
    setSelectedPlanForStudy(plan);
    setIsStudyModalOpen(true);
  };

  const handleOpenAssignmentModal = (assign) => {
    setSelectedAssignment(assign);
    setIsAssignmentModalOpen(true);
  };

  useEffect(() => {
    if (courses && courses.length > 0) {
      if (!activeCourseId || !courses.some(c => c.id === activeCourseId)) {
        setActiveCourseId(courses[0].id);
      }
    }
  }, [courses]);

  useEffect(() => {
    loadDashboardData();
  }, [activeCourseId, courses]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [plansData, assignData, quizData, analyticsData] = await Promise.all([
        api.getStudyPlans(activeCourseId ? { course_id: activeCourseId } : {}),
        api.getAssignments(),
        api.getTests(),
        api.getAnalytics()
      ]);

      setStudyPlans(plansData);
      setAssignments(assignData);
      setQuizzes(quizData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlan = async (plan) => {
    const newStatus = plan.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updatePlanStatus(plan.id, newStatus);
      setStudyPlans(studyPlans.map(p => p.id === plan.id ? { ...p, status: newStatus } : p));
      await loadDashboardData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('Error updating milestone: ' + err.message);
    }
  };

  const handleCompleteAssignment = async (assignmentId) => {
    try {
      await api.completeAssignment(assignmentId, {
        submission_notes: submissionNotes || 'Completed on schedule',
        score: 95
      });
      setSubmittingAssignmentId(null);
      setSubmissionNotes('');
      await loadDashboardData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('Error completing assignment: ' + err.message);
    }
  };

  const handleLaunchQuiz = (quizId) => {
    setActiveQuizId(quizId);
    setIsQuizModalOpen(true);
  };

  const handleGenerateAiQuiz = async () => {
    if (!activeCourseId) return;
    const currentCourse = courses.find(c => c.id == activeCourseId) || courses[0];
    const topic = prompt(`Enter topic for AI Diagnostic Quiz in "${currentCourse.name}":`, 'Core System Architecture & Reliability');
    if (!topic) return;

    setGeneratingQuiz(true);
    try {
      const res = await api.generateAiQuiz(currentCourse.id, topic);
      alert(`🎉 AI Quiz "${topic}" created! Opening now.`);
      await loadDashboardData();
      handleLaunchQuiz(res.quizId);
    } catch (err) {
      alert('Failed to generate AI quiz: ' + err.message);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const activeCourse = courses.find(c => c.id == activeCourseId) || courses[0];
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {analytics?.currentStreak || 1} Day Study Streak
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Student Study Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Welcome back, {currentUser?.name}!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Track your daily syllabus topics, upcoming assignments, and practice quizzes to stay on schedule.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Add Course / Exam
            </button>
          </div>
        </div>

        {/* Quick Analytics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs">
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Total Studied</span>
            <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{analytics?.totalHoursStudied || 0} hrs</span>
          </div>
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Tasks Completed</span>
            <span className="text-base font-bold text-green-600 dark:text-green-400 mt-0.5 block">{analytics?.tasksCompletedCount || 0}</span>
          </div>
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Pending Due</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{analytics?.tasksPendingCount || 0}</span>
          </div>
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Enrolled Subjects</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{courses.length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Tabs & Views, Right Sidebar Pomodoro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Navigation Tabs and Content */}
        <div className="lg:col-span-8 space-y-6">

          {/* Course Selector Chips */}
          {courses.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase shrink-0">Subject:</span>
              <button
                onClick={() => setActiveCourseId('')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  !activeCourseId ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Courses
              </button>
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCourseId(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                    activeCourseId == c.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color_code || '#2563eb' }} />
                  {c.name}
                  <span className="text-[10px] px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {c.progress_percentage}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 pb-1 overflow-x-auto">
            {[
              { id: 'schedule', label: "Daily Schedule", icon: Calendar },
              { id: 'assignments', label: 'Assignments', icon: FileText },
              { id: 'quizzes', label: 'Quizzes & Tests', icon: BrainCircuit },
              { id: 'notes', label: 'Study Notes', icon: Sparkles },
              { id: 'analytics', label: 'Analytics', icon: BarChart2 }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: SCHEDULE & STUDY PLANS */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Algorithm-Generated Daily Milestones</h3>
                  <p className="text-[11px] text-slate-400">Mark topics completed to update daily stats and parent alerts</p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading daily study plans...</div>
              ) : studyPlans.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center border border-slate-800 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No scheduled study milestones found. Add a course to generate one!</p>
                  <button
                    onClick={onOpenOnboarding}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Add Course & Syllabus
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {studyPlans.map((plan) => {
                    const isCompleted = plan.status === 'completed';
                    const isToday = plan.scheduled_date === todayStr;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleOpenStudyModal(plan)}
                        className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 hover:scale-[1.008] hover:border-indigo-400/80 hover:shadow-xl hover:shadow-indigo-500/10 ${
                          isCompleted
                            ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                            : isToday
                            ? 'glass-card border-indigo-500/60 shadow-lg shadow-indigo-500/10 bg-indigo-950/20'
                            : 'glass-card border-slate-800 hover:bg-slate-900/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePlan(plan);
                          }}
                          className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-600 hover:border-indigo-400'
                          }`}
                          title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                        >
                          {isCompleted && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                              Day {plan.day_number} • {plan.scheduled_date}
                            </span>
                            {isToday && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Due Today
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500">
                              {plan.course_name} • {plan.estimated_minutes} mins
                            </span>
                          </div>

                          <h4 className={`text-sm font-bold mt-1.5 flex items-center justify-between gap-2 ${isCompleted ? 'line-through text-slate-500' : 'text-white group-hover:text-indigo-300 transition'}`}>
                            <span>{plan.topic_title}</span>
                            <span className="text-[10px] font-semibold text-indigo-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition flex items-center gap-0.5 shrink-0">
                              Study Hub →
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            {plan.topic_description}
                          </p>

                          {/* Clickable Action Indicators */}
                          <div className="flex items-center gap-2.5 mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] font-semibold">
                            <span className="flex items-center gap-1 text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20">
                              <BookOpen className="w-3 h-3 text-indigo-400" /> Topic Notes
                            </span>
                            <span className="flex items-center gap-1 text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-500/20">
                              <Sparkles className="w-3 h-3 text-purple-400" /> Practice Questions
                            </span>
                            <span className="ml-auto text-slate-400 group-hover:text-indigo-300 transition text-[10px]">
                              Click to open notes & quiz
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAILY ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Daily Assignments with Due Times</h3>
                  <p className="text-[11px] text-slate-400">Micro-tasks to reinforce daily comprehension before evening digest</p>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center border border-slate-800 text-xs text-slate-400">
                  No assignments found. Generate a course syllabus to automatically populate assignments!
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assign) => {
                    const isDone = assign.status === 'completed';
                    const isOverdue = assign.isOverdue;
                    const evalData = assign.aiEvaluation;
                    const requiresRedo = Boolean(assign.requiresRedo || evalData?.requires_redo || evalData?.is_relevant === false);

                    return (
                      <div
                        key={assign.id}
                        onClick={() => handleOpenAssignmentModal(assign)}
                        className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:scale-[1.008] hover:shadow-xl ${
                          requiresRedo
                            ? 'bg-rose-950/25 border-rose-500/50 shadow-rose-950/20 hover:border-rose-400'
                            : isDone
                            ? 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-indigo-400/80'
                            : isOverdue
                            ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                            : 'glass-card border-slate-800 hover:bg-slate-900/60 hover:border-indigo-400/80'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {assign.course_name}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Due: {assign.due_date} at {assign.due_time}
                            </span>
                            {requiresRedo && (
                              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-400" /> Redo Required: Irrelevant Document
                              </span>
                            )}
                            {isOverdue && !isDone && !requiresRedo && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Overdue
                              </span>
                            )}
                            {isDone && !requiresRedo && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Score: {assign.score}/{assign.max_score} {evalData?.grade ? `(Grade ${evalData.grade})` : ''}
                              </span>
                            )}
                          </div>

                          <h4 className={`text-sm font-bold ${isDone && !requiresRedo ? 'line-through text-slate-500' : 'text-white group-hover:text-indigo-300 transition'}`}>
                            {assign.title}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{assign.description}</p>

                          {/* Quick Indicators */}
                          <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold">
                            <span className={`${requiresRedo ? 'text-rose-400' : 'text-indigo-400'} flex items-center gap-1`}>
                              <Sparkles className="w-3 h-3" /> {requiresRedo ? 'Flagged for Redo' : 'AI Evaluated'}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-purple-400 flex items-center gap-1">
                              <BrainCircuit className="w-3 h-3" /> Practice Questions
                            </span>
                          </div>
                        </div>

                        {/* Action buttons on the card */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignmentModal(assign);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
                          >
                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                            <span>Practice</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignmentModal(assign);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 ${
                              requiresRedo
                                ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/30 animate-pulse'
                                : isDone
                                ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                            }`}
                          >
                            {requiresRedo ? <RotateCcw className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
                            <span>{requiresRedo ? 'Redo Assignment' : isDone ? 'View AI Evaluation' : 'Submit Document'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUIZZES & TESTS */}
          {activeTab === 'quizzes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Regular Testing & Diagnostic System</h3>
                  <p className="text-[11px] text-slate-400">Automated evaluation with weak vs strong breakdown</p>
                </div>

                <button
                  onClick={handleGenerateAiQuiz}
                  disabled={generatingQuiz}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatingQuiz ? 'Synthesizing...' : 'Generate AI Quiz'}</span>
                </button>
              </div>

              {quizzes.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center border border-slate-800 text-xs text-slate-400">
                  No quizzes assigned yet. Click "Generate AI Quiz" to test yourself!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                            {quiz.course_name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {quiz.duration_minutes} mins
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-white mt-2">{quiz.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{quiz.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        {quiz.last_score !== null ? (
                          <div className="text-xs">
                            <span className="text-slate-400">Previous Grade: </span>
                            <span className={`font-bold ${quiz.last_passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {quiz.last_score}% {quiz.last_passed ? '✓ PASSED' : '⚠️ REVIEW'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not attempted yet</span>
                        )}

                        <button
                          onClick={() => handleLaunchQuiz(quiz.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{quiz.last_score !== null ? 'Retake Quiz' : 'Start Test'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI NOTES & FLASHCARDS */}
          {activeTab === 'notes' && (
            <NotesTab
              courses={courses}
              activeCourseId={activeCourseId}
            />
          )}

          {/* TAB 5: VISUAL ANALYTICS */}
          {activeTab === 'analytics' && (
            !analytics ? (
              <div className="glass-card p-12 text-center rounded-2xl border border-slate-700 space-y-3">
                <div className="w-8 h-8 mx-auto border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-300 font-medium">Aggregating focused study time and quiz analytics...</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Daily Study Minutes Chart */}
                <div className="glass-card p-5 rounded-2xl border border-slate-700 shadow-xl">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" /> Daily Focused Study Minutes History
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.dailyStudyMinutes || []}>
                        <defs>
                          <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="minutes" stroke="#6366f1" fillOpacity={1} fill="url(#colorMinutes)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quiz Score History Chart */}
                <div className="glass-card p-5 rounded-2xl border border-slate-700 shadow-xl">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Quiz & Test Score History (%)
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.quizHistory || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="title" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => val.slice(0, 15) + '...'} />
                        <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="percentage" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Diagnostic Strengths & Weaknesses */}
                {((analytics.weakAreas && analytics.weakAreas.length > 0) || (analytics.strongAreas && analytics.strongAreas.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 shadow-xl space-y-3">
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" /> Mastery Strengths
                      </h4>
                      <div className="space-y-2">
                        {analytics.strongAreas?.map((sa, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-xs flex items-center justify-between">
                            <span className="font-semibold text-white">{sa.topic}</span>
                            <span className="text-emerald-400 font-mono font-bold text-[11px]">{sa.accuracy}% accuracy</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weaknesses & Recommendations */}
                    <div className="glass-card p-5 rounded-2xl border border-rose-500/30 bg-rose-950/10 shadow-xl space-y-3">
                      <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400" /> High-Priority Review Topics
                      </h4>
                      <div className="space-y-2">
                        {analytics.weakAreas?.map((wa, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-rose-500/20 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{wa.topic}</span>
                              <span className="text-rose-400 font-mono font-bold text-[11px]">{wa.accuracy}% accuracy</span>
                            </div>
                            {wa.recommendation && (
                              <p className="text-[11px] text-slate-400">{wa.recommendation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          )}

        </div>

        {/* Right Column (4 cols): Pomodoro Focus Timer & Course Progress Cards */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Pomodoro Timer */}
          <PomodoroTimer
            activeCourse={activeCourse}
            onSessionCompleted={() => loadDashboardData()}
          />

          {/* Enrolled Courses Progress Cards */}
          <div className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Courses Progress</h4>
              <button
                onClick={onOpenOnboarding}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                + New
              </button>
            </div>

            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color_code }} />
                      {course.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-400">{course.progress_percentage}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        backgroundColor: course.color_code || '#6366f1',
                        width: `${course.progress_percentage}%`
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Target: {course.target_completion_date}</span>
                    <span>{course.target_hours_per_day} hrs/day</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Quiz Modal */}
      <QuizModal
        quizId={activeQuizId}
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        onQuizCompleted={() => loadDashboardData()}
      />

      {/* Topic Study Hub Modal (Topic Notes & Practice Questions) */}
      <TopicStudyModal
        plan={selectedPlanForStudy}
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        onToggleComplete={(p) => handleTogglePlan(p)}
      />

      {/* Assignment Modal (Practice Questions & Document AI Evaluation) */}
      <AssignmentModal
        assignment={selectedAssignment}
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        onAssignmentEvaluated={() => loadDashboardData()}
      />

    </div>
  );
}
