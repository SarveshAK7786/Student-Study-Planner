import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  Brain, 
  UploadCloud, 
  FileText, 
  FileCheck, 
  Check, 
  AlertCircle, 
  Clock, 
  Award, 
  Sparkles, 
  Trash2, 
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export default function AssignmentModal({ 
  assignment, 
  isOpen, 
  onClose, 
  onAssignmentEvaluated 
}) {
  const [activeTab, setActiveTab] = useState('evaluate'); // 'evaluate' | 'practice'
  
  // Practice quiz state
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [checkedAnswers, setCheckedAnswers] = useState({});

  // Document upload & AI Evaluation state
  const [submittingFile, setSubmittingFile] = useState(null);
  const [writtenText, setWrittenText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationStep, setEvaluationStep] = useState(0);
  const [evalResult, setEvalResult] = useState(null);
  const [evalError, setEvalError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const evalTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen && assignment?.id) {
      setEvalError(null);
      setSelectedAnswers({});
      setCheckedAnswers({});
      setSubmittingFile(null);
      setWrittenText('');
      
      // If assignment is already completed and has AI evaluation
      if (assignment.aiEvaluation) {
        setEvalResult(assignment.aiEvaluation);
      } else {
        setEvalResult(null);
      }

      loadPracticeQuestions();
    }
  }, [isOpen, assignment?.id]);

  const loadPracticeQuestions = async () => {
    setPracticeLoading(true);
    try {
      const data = await api.getAssignmentPractice(assignment.id);
      setPracticeQuestions(data.questions || []);
    } catch (err) {
      console.warn('Could not load assignment practice questions:', err.message);
    } finally {
      setPracticeLoading(false);
    }
  };

  if (!isOpen || !assignment) return null;

  const isDone = assignment.status === 'completed';

  // File handlers
  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setEvalError(`Unsupported format "${ext}". Please upload PDF, Word (DOCX), PowerPoint (PPTX), or TXT.`);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setEvalError('File exceeds 20MB limit. Please upload a smaller document.');
      return;
    }
    setEvalError(null);
    setSubmittingFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Submit for AI Evaluation
  const handleSubmitEvaluation = async () => {
    if (!submittingFile && writtenText.trim().length < 15) {
      setEvalError('Please upload a document or type your assignment answer (min 15 characters).');
      return;
    }

    setEvaluating(true);
    setEvalError(null);
    setEvaluationStep(1);

    if (evalTimerRef.current) clearInterval(evalTimerRef.current);
    evalTimerRef.current = setInterval(() => {
      setEvaluationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 3000);

    try {
      const res = await api.evaluateAssignment(assignment.id, {
        file: submittingFile,
        submissionText: writtenText
      });
      clearInterval(evalTimerRef.current);
      setEvaluationStep(3);
      setEvalResult(res.evaluation);

      if (onAssignmentEvaluated) {
        onAssignmentEvaluated(res);
      }
    } catch (err) {
      clearInterval(evalTimerRef.current);
      setEvalError(err.message || 'Failed to evaluate assignment submission.');
    } finally {
      setEvaluating(false);
    }
  };

  // Practice question interactions
  const handleSelectOption = (questionId, optionKey) => {
    if (checkedAnswers[questionId]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const handleCheckQuestion = (questionId) => {
    if (!selectedAnswers[questionId]) return;
    setCheckedAnswers(prev => ({ ...prev, [questionId]: true }));
  };

  const totalQuestions = practiceQuestions.length;
  const answeredCount = Object.keys(checkedAnswers).length;
  const correctCount = practiceQuestions.filter(
    q => checkedAnswers[q.id] && selectedAnswers[q.id] === q.correct_answer
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col glass-panel rounded-3xl border border-slate-700/80 shadow-2xl bg-slate-900/95 overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                {assignment.course_name}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Due: {assignment.due_date} at {assignment.due_time}
              </span>
              {isDone ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Submitted • Score: {assignment.score}/{assignment.max_score}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pending Submission
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
              {assignment.title}
            </h2>
            {assignment.description && (
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-2xl">
                {assignment.description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'evaluate'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document & AI Evaluation</span>
            {evalResult && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Grade: {evalResult.grade || 'A'}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'practice'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Assignment Practice Questions</span>
            {totalQuestions > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-950 border border-indigo-400/40 text-indigo-300">
                {answeredCount}/{totalQuestions}
              </span>
            )}
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* TAB 1: UPLOAD DOCUMENT & AI EVALUATION */}
          {activeTab === 'evaluate' && (
            <div className="space-y-6">
              
              {/* If already evaluated, show full feedback card */}
              {evalResult ? (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Score & Grade Hero Banner */}
                  {evalResult.requires_redo || evalResult.is_relevant === false ? (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-amber-950/70 to-slate-900 border-2 border-rose-500/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-2xl shadow-rose-950/50">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/50 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            Redo Required: Irrelevant Submission
                          </span>
                          <span className="text-xs text-slate-400 font-medium">Google Gemini AI Evaluation</span>
                        </div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          Document Not Relevant to Assignment Topic
                        </h3>
                        <p className="text-xs text-rose-200/90 leading-relaxed max-w-xl">
                          {evalResult.redo_reason || evalResult.summary}
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEvalResult(null);
                              setSubmittingFile(null);
                              setWrittenText('');
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition shadow-lg shadow-rose-900/40 flex items-center gap-2 active:scale-95 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Redo Assignment (Upload Relevant Document)</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-center sm:text-right bg-slate-900/90 px-5 py-3.5 rounded-2xl border border-rose-500/40 shrink-0 shadow-inner">
                        <div className="text-3xl font-extrabold text-rose-400">
                          0/{evalResult.max_score || assignment.max_score || 100}
                        </div>
                        <div className="text-xs font-bold text-rose-300">
                          Grade: <span className="text-rose-400 font-extrabold">{evalResult.grade || 'F (Redo Required)'}</span>
                        </div>
                        <span className="text-[10px] text-amber-300/80 block mt-1 font-semibold">⚠️ Action Required</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> AI Evaluated & Progress Recorded
                          </span>
                          <span className="text-xs text-slate-400">Google Gemini</span>
                        </div>
                        <h3 className="text-base font-bold text-white">
                          Academic Submission Evaluation
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                          {evalResult.summary}
                        </p>
                      </div>

                      <div className="text-center sm:text-right bg-slate-900/80 px-4 py-3 rounded-2xl border border-indigo-500/30 shrink-0">
                        <div className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                          {evalResult.score}/{evalResult.max_score || assignment.max_score || 100}
                        </div>
                        <div className="text-xs font-bold text-indigo-300">
                          Grade: <span className="text-emerald-400">{evalResult.grade || 'A'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Strengths & Improvements Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Identified Strengths
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {(evalResult.strengths || []).map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        Key Areas for Growth & Corrections
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {(evalResult.improvements || []).map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Detailed Markdown Feedback */}
                  {evalResult.feedback_markdown && (
                    <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        Detailed Evaluation Feedback & Model Solution
                      </h4>
                      <div className="text-xs text-slate-300 leading-relaxed prose prose-invert prose-xs max-w-none space-y-2">
                        <ReactMarkdown>{evalResult.feedback_markdown}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Resubmit or upload revised version */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEvalResult(null);
                        setSubmittingFile(null);
                        setWrittenText('');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        evalResult.requires_redo || evalResult.is_relevant === false
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 active:scale-95'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{evalResult.requires_redo || evalResult.is_relevant === false ? 'Redo Assignment (Upload Relevant Document)' : 'Upload Revised Document'}</span>
                    </button>
                  </div>
                </div>
              ) : evaluating ? (
                /* Processing State with Step Tracker */
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-spin blur-md opacity-60" />
                    <div className="absolute inset-1 rounded-full bg-slate-900 flex items-center justify-center border border-indigo-500/50">
                      <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      AI Evaluating Assignment Submission...
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Parsing submission document, grading accuracy, and logging student progress
                    </p>
                  </div>

                  {/* 3 Steps */}
                  <div className="w-full max-w-xs space-y-2.5 text-left bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        evaluationStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {evaluationStep > 1 ? '✓' : '1'}
                      </span>
                      <span className={evaluationStep >= 1 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        Reading & extracting document submission
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        evaluationStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {evaluationStep > 2 ? '✓' : '2'}
                      </span>
                      <span className={evaluationStep >= 2 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        Gemini AI grading accuracy & reasoning
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        evaluationStep >= 3 ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                      }`}>
                        3
                      </span>
                      <span className={evaluationStep >= 3 ? 'text-indigo-300 font-semibold' : 'text-slate-500'}>
                        Compiling grade, feedback & daily progress
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Submission Form */
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">
                      Submit Your Work for AI Grading & Feedback
                    </h3>
                    <p className="text-xs text-slate-400">
                      Upload your completed assignment document (PDF, Word, PPT, or text). The AI will review your submission, award a grade, and automatically record your progress streak.
                    </p>
                  </div>

                  {/* Drag and Drop File Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all ${
                      isDragging
                        ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
                        : submittingFile
                        ? 'border-emerald-500/60 bg-emerald-950/20'
                        : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-slate-950/70'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md"
                      onChange={(e) => handleFileSelect(e.target.files?.[0])}
                      className="hidden"
                    />

                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                      submittingFile
                        ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                        : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400'
                    }`}>
                      {submittingFile ? <FileCheck className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                    </div>

                    <p className="text-xs font-semibold text-white mb-1">
                      {submittingFile ? submittingFile.name : 'Upload submission document (PDF, Word, PPT, TXT)'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {submittingFile
                        ? `${(submittingFile.size / 1024).toFixed(1)} KB • Click to replace file`
                        : 'Supports PDF, Word (.docx), PowerPoint (.pptx), or plain text up to 20MB'}
                    </p>

                    {submittingFile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubmittingFile(null);
                        }}
                        className="mt-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-[10px] font-semibold border border-slate-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove File
                      </button>
                    )}
                  </div>

                  {/* Or Written Answer Area */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Or Write / Paste Solution Answers Directly:
                    </label>
                    <textarea
                      rows="4"
                      placeholder="Type your solution, code, formulas, or explanation here..."
                      value={writtenText}
                      onChange={(e) => setWrittenText(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Error Alert */}
                  {evalError && (
                    <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{evalError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitEvaluation}
                    disabled={evaluating || (!submittingFile && writtenText.trim().length < 15)}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Submit & Evaluate with Gemini AI</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: ASSIGNMENT PRACTICE QUESTIONS */}
          {activeTab === 'practice' && (
            <div className="space-y-6">
              
              {/* Practice Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Interactive Assignment Practice
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reinforce the concepts required for this assignment with immediate self-assessment.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-white">
                    {correctCount} / {totalQuestions}
                  </div>
                  <div className="text-[10px] text-indigo-300 font-semibold">
                    {answeredCount === totalQuestions ? 'Done! Ready for Submission' : `${answeredCount} of ${totalQuestions} Answered`}
                  </div>
                </div>
              </div>

              {practiceLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading practice questions...</div>
              ) : practiceQuestions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                  No practice questions generated yet for this assignment.
                </div>
              ) : (
                <div className="space-y-4">
                  {practiceQuestions.map((q, qIdx) => {
                    const isChecked = !!checkedAnswers[q.id];
                    const selected = selectedAnswers[q.id];
                    const isCorrect = selected === q.correct_answer;

                    return (
                      <div
                        key={q.id}
                        className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-bold text-white flex-1 leading-relaxed">
                            <span className="text-indigo-400 font-mono mr-1.5">Q{qIdx + 1}.</span>
                            {q.question}
                          </span>
                          {isChecked && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {isCorrect ? 'Correct (+1)' : 'Incorrect'}
                            </span>
                          )}
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt, optIdx) => {
                            const letter = String.fromCharCode(65 + optIdx);
                            const isThisSelected = selected === letter;
                            const isThisCorrect = q.correct_answer === letter;

                            let optClass = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                            if (isChecked) {
                              if (isThisCorrect) {
                                optClass = 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-semibold';
                              } else if (isThisSelected && !isCorrect) {
                                optClass = 'bg-rose-950/60 border-rose-500/60 text-rose-200';
                              } else {
                                optClass = 'bg-slate-900/40 border-slate-800/40 text-slate-500';
                              }
                            } else if (isThisSelected) {
                              optClass = 'bg-indigo-950/80 border-indigo-500 text-white font-semibold shadow-md';
                            }

                            return (
                              <button
                                key={letter}
                                type="button"
                                disabled={isChecked}
                                onClick={() => handleSelectOption(q.id, letter)}
                                className={`p-3 rounded-xl border text-left text-xs transition flex items-center gap-2.5 ${optClass}`}
                              >
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isThisSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {letter}
                                </span>
                                <span className="leading-snug">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Action Button & Explanation */}
                        {!isChecked ? (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              disabled={!selected}
                              onClick={() => handleCheckQuestion(q.id)}
                              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-40 transition shadow-md"
                            >
                              Check Answer
                            </button>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                            <span className="font-bold text-indigo-400 block text-[11px] uppercase tracking-wider">
                              💡 Solution Explanation:
                            </span>
                            <p className="leading-relaxed text-slate-300">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
