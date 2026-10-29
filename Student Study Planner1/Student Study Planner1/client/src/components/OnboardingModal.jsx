import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { api } from '../services/api';

export default function OnboardingModal({ isOpen, onClose, onCourseCreated }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Course Details
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [colorCode, setColorCode] = useState('#4F46E5');

  // Syllabus Modules
  const [modules, setModules] = useState([
    {
      title: 'Module 1: Foundations & Core Architecture',
      hours: 6,
      subtopics: ['System Fundamentals', 'Core Principles', 'Architecture Analysis']
    },
    {
      title: 'Module 2: Practical Implementation & Verification',
      hours: 8,
      subtopics: ['Applied Engineering', 'Edge Case Handling', 'Performance Benchmarks']
    }
  ]);
  const [newSubtopicText, setNewSubtopicText] = useState({});

  // Schedule & Target Limits
  const defaultExamDate = new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState(defaultExamDate);
  const [dailyHours, setDailyHours] = useState(2.0);
  const [difficulty, setDifficulty] = useState('medium');

  if (!isOpen) return null;

  const addModule = () => {
    setModules([
      ...modules,
      {
        title: `Module ${modules.length + 1}: Advanced Topics`,
        hours: 6,
        subtopics: ['Key Theorems & Concepts', 'Applied Exercises']
      }
    ]);
  };

  const removeModule = (idx) => {
    if (modules.length > 1) {
      setModules(modules.filter((_, i) => i !== idx));
    }
  };

  const updateModuleTitle = (idx, val) => {
    const updated = [...modules];
    updated[idx].title = val;
    setModules(updated);
  };

  const updateModuleHours = (idx, val) => {
    const updated = [...modules];
    updated[idx].hours = parseFloat(val) || 1;
    setModules(updated);
  };

  const addSubtopic = (modIdx) => {
    const text = newSubtopicText[modIdx]?.trim();
    if (!text) return;
    const updated = [...modules];
    updated[modIdx].subtopics = [...(updated[modIdx].subtopics || []), text];
    setModules(updated);
    setNewSubtopicText({ ...newSubtopicText, [modIdx]: '' });
  };

  const removeSubtopic = (modIdx, subIdx) => {
    const updated = [...modules];
    updated[modIdx].subtopics = updated[modIdx].subtopics.filter((_, i) => i !== subIdx);
    setModules(updated);
  };

  // Calculate schedule preview stats
  const totalModuleHours = modules.reduce((sum, m) => sum + (parseFloat(m.hours) || 0), 0);
  const daysDiff = Math.max(1, Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24)));
  const totalStudyCapacity = (daysDiff * dailyHours).toFixed(1);
  const isPaceFeasible = totalStudyCapacity >= totalModuleHours;

  const handleFinish = async () => {
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: courseName,
        code: courseCode || null,
        description: courseDescription,
        target_completion_date: targetDate,
        target_hours_per_day: dailyHours,
        syllabus_modules: modules,
        difficulty,
        color_code: colorCode
      };

      const res = await api.createCourse(payload);
      onCourseCreated(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to generate study plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Course & Dynamic Study Plan Wizard</h2>
              <p className="text-xs text-slate-400">Step {step} of 4: {
                step === 1 ? 'Course Information' :
                step === 2 ? 'Syllabus & Modules' :
                step === 3 ? 'Exam Target & Hours' : 'AI Plan Preview & Confirmation'
              }</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div className="flex items-center justify-between mb-6 px-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30 shadow-lg' :
                step > s ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === s ? 'text-white' : 'text-slate-500'}`}>
                {s === 1 ? 'Details' : s === 2 ? 'Syllabus' : s === 3 ? 'Timeline' : 'Generate'}
              </span>
              {s < 4 && <div className="w-8 sm:w-12 h-0.5 bg-slate-700"></div>}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Course / Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems & Concurrency"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CS-305"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    {['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setColorCode(color)}
                        className={`w-7 h-7 rounded-full border-2 transition ${colorCode === color ? 'border-white scale-110 shadow-md' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description & Scope</label>
                <textarea
                  rows="3"
                  placeholder="Brief overview of course learning goals, core textbook chapters, and exam format..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Syllabus Modules */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Break down your syllabus into modules or chapters:</span>
                <button
                  type="button"
                  onClick={addModule}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Module
                </button>
              </div>

              {modules.map((mod, modIdx) => (
                <div key={modIdx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={mod.title}
                      onChange={(e) => updateModuleTitle(modIdx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white font-medium focus:border-indigo-500"
                    />
                    <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                      <span>Est.</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={mod.hours}
                        onChange={(e) => updateModuleHours(modIdx, e.target.value)}
                        className="w-14 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white text-center"
                      />
                      <span>hrs</span>
                    </div>
                    {modules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeModule(modIdx)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Subtopics */}
                  <div className="pl-2 border-l-2 border-indigo-500/40 space-y-1.5">
                    <span className="text-[11px] text-slate-400 block font-medium">Subtopics / Concepts:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.subtopics?.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300"
                        >
                          {sub}
                          <button
                            type="button"
                            onClick={() => removeSubtopic(modIdx, sIdx)}
                            className="text-slate-500 hover:text-rose-400 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Add subtopic..."
                        value={newSubtopicText[modIdx] || ''}
                        onChange={(e) => setNewSubtopicText({ ...newSubtopicText, [modIdx]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtopic(modIdx); } }}
                        className="flex-1 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => addSubtopic(modIdx)}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[11px]"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: Timeline & Daily Limits */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Exam Date *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {daysDiff} days remaining until target examination date.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Available Daily Study Hours: <span className="text-indigo-400 font-bold">{dailyHours} hrs/day</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>30 mins</span>
                  <span>2 hours</span>
                  <span>4 hours</span>
                  <span>8 hours</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Course Difficulty</label>
                <div className="grid grid-cols-3 gap-3">
                  {['easy', 'medium', 'hard'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                        difficulty === lvl
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feasibility Indicator */}
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                isPaceFeasible
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                <strong>Pace Feasibility Analysis:</strong> {
                  isPaceFeasible
                    ? `Great! You have ${totalStudyCapacity} total capacity hours against ${totalModuleHours} syllabus hours. You will comfortably finish with built-in revision buffer days!`
                    : `Notice: Syllabus requires ${totalModuleHours} hours, but current timeline provides ${totalStudyCapacity} study hours. The generator will compress sessions or recommend increasing daily hours by 0.5 - 1.0 hr.`
                }
              </div>
            </div>
          )}

          {/* STEP 4: Review & Generate */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colorCode }} />
                    {courseName} ({courseCode || 'Core'})
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] uppercase font-bold">
                    {difficulty}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">Modules</span>
                    <span className="font-bold text-white text-sm">{modules.length}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">Daily Limit</span>
                    <span className="font-bold text-indigo-400 text-sm">{dailyHours} hrs</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">Days Left</span>
                    <span className="font-bold text-pink-400 text-sm">{daysDiff} days</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <span className="text-xs font-semibold text-slate-300 block mb-1.5">What the algorithm generates for you:</span>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                    <li>Daily study milestones distributed up to {targetDate}</li>
                    <li>Daily micro-assignments with assigned due times</li>
                    <li>Checkpoint diagnostic quizzes after each module</li>
                    <li>Automated tracking linked to daily 8:00 PM parent-student digest</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/60 mt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 1 && !courseName}
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white shadow-xl shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Synthesizing Schedule with AI...' : 'Generate AI Study Plan'}
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
