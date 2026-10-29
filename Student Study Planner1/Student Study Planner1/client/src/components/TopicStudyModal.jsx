import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  BookOpen, 
  Check, 
  HelpCircle, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Download, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Brain, 
  Bot, 
  Layers,
  ChevronRight,
  Award
} from 'lucide-react';
import { api } from '../services/api';

export default function TopicStudyModal({ 
  plan, 
  isOpen, 
  onClose, 
  onToggleComplete 
}) {
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'practice'
  const [loading, setLoading] = useState(true);
  const [studyData, setStudyData] = useState(null);
  const [error, setError] = useState(null);
  
  // Practice quiz state
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [checkedAnswers, setCheckedAnswers] = useState({});
  const [flippedCards, setFlippedCards] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && plan?.id) {
      loadStudyHub();
    }
  }, [isOpen, plan?.id]);

  const loadStudyHub = async () => {
    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    setCheckedAnswers({});
    try {
      const data = await api.getStudyHub(plan.id);
      setStudyData(data.studyHub);
    } catch (err) {
      console.error('Error loading study hub:', err);
      setError(err.message || 'Failed to load study notes.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !plan) return null;

  const isCompleted = plan.status === 'completed';

  const handleSelectOption = (questionId, optionKey) => {
    if (checkedAnswers[questionId]) return; // lock once checked
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const handleCheckQuestion = (questionId) => {
    if (!selectedAnswers[questionId]) return;
    setCheckedAnswers(prev => ({ ...prev, [questionId]: true }));
  };

  const handleCopyNotes = () => {
    if (!studyData) return;
    const notesText = `# ${studyData.topic} - Study Notes\n\n${studyData.summary}\n\n## Key Concepts\n${(studyData.key_concepts || []).map(k => `- **${k.term}:** ${k.explanation}`).join('\n')}\n\n## Takeaways\n${(studyData.takeaways || []).map(t => `- ${t}`).join('\n')}`;
    navigator.clipboard.writeText(notesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadNotes = () => {
    if (!studyData) return;
    const notesText = `# ${studyData.topic} - Study Notes\n\n${studyData.summary}\n\n## Key Concepts\n${(studyData.key_concepts || []).map(k => `- **${k.term}:** ${k.explanation}`).join('\n')}\n\n## Takeaways\n${(studyData.takeaways || []).map(t => `- ${t}`).join('\n')}`;
    const blob = new Blob([notesText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${plan.topic_title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFlip = (idx) => {
    setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Practice score calculation
  const totalQuestions = studyData?.practice_questions?.length || 0;
  const answeredCount = Object.keys(checkedAnswers).length;
  const correctCount = (studyData?.practice_questions || []).filter(
    q => checkedAnswers[q.id] && selectedAnswers[q.id] === q.correct_answer
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col glass-panel rounded-3xl border border-slate-700/80 shadow-2xl bg-slate-900/95 overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                Day {plan.day_number} • {plan.course_name}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {plan.estimated_minutes} mins estimated
              </span>
              {isCompleted ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Completed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Scheduled Milestone
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
              {plan.topic_title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onToggleComplete(plan)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isCompleted
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Completed' : 'Mark Completed'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Topic Notes & Concepts</span>
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
            <span>Practice Questions</span>
            {totalQuestions > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-950 border border-indigo-400/40 text-indigo-300">
                {answeredCount}/{totalQuestions}
              </span>
            )}
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-sm font-semibold text-white">Synthesizing Topic Notes & Questions...</p>
              <p className="text-xs text-slate-400">Extracting curriculum concepts and interactive practice items</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : studyData ? (
            <>
              {/* TAB 1: NOTES & CONCEPTS */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  {/* Action Bar */}
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
                    <span className="text-xs text-slate-400">
                      Curated study materials for <strong className="text-indigo-300">{plan.topic_title}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyNotes}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleDownloadNotes}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Executive Summary & Theoretical Foundations
                    </h3>
                    <div className="text-xs text-slate-300 leading-relaxed space-y-2 prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown>{studyData.summary}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Key Concepts Grid */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-400" />
                      Core Principles & Invariant Definitions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(studyData.key_concepts || []).map((concept, idx) => {
                        const term = typeof concept === 'string' ? concept.split(':')[0] : concept.term;
                        const desc = typeof concept === 'string' ? concept.split(':').slice(1).join(':') : concept.explanation;

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-1.5"
                          >
                            <span className="text-xs font-bold text-white block">{term}</span>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* High-Yield Takeaways */}
                  {studyData.takeaways?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-400" />
                        High-Yield Exam Takeaways & Pitfalls
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                        {studyData.takeaways.map((t, idx) => (
                          <li key={idx} className="leading-relaxed">{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Interactive Flip Flashcards */}
                  {studyData.flashcards?.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Brain className="w-4 h-4 text-emerald-400" />
                        Active Recall Flashcards (Click Card to Flip)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {studyData.flashcards.map((fc, idx) => {
                          const isFlipped = !!flippedCards[idx];
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleFlip(idx)}
                              className={`cursor-pointer min-h-[140px] p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between select-none ${
                                isFlipped
                                  ? 'bg-gradient-to-br from-indigo-950 to-purple-950 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                <span>{isFlipped ? 'Answer' : 'Question'}</span>
                                <span className="text-[9px] text-indigo-400">Click to flip ↺</span>
                              </div>
                              <p className="text-xs font-semibold leading-relaxed">
                                {isFlipped ? fc.a : fc.q}
                              </p>
                              <div className="pt-2 text-[9px] text-slate-500 text-right">
                                Card {idx + 1} of {studyData.flashcards.length}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INTERACTIVE PRACTICE QUESTIONS */}
              {activeTab === 'practice' && (
                <div className="space-y-6">
                  {/* Practice Score Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        Topic Practice Assessment
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Test your conceptual grasp with instant automated explanations.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-white">
                        {correctCount} / {totalQuestions}
                      </div>
                      <div className="text-[10px] text-indigo-300 font-semibold">
                        {answeredCount === totalQuestions ? 'Assessment Complete 🎉' : `${answeredCount} of ${totalQuestions} Answered`}
                      </div>
                    </div>
                  </div>

                  {/* Question Cards */}
                  <div className="space-y-4">
                    {(studyData.practice_questions || []).map((q, qIdx) => {
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
                              const letter = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'
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
                                💡 Academic Explanation:
                              </span>
                              <p className="leading-relaxed text-slate-300">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Powered by</span>
            <span className="font-semibold text-indigo-400">Google Gemini AI</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isCompleted) onToggleComplete(plan);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Done Reviewing' : 'Complete & Close'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
