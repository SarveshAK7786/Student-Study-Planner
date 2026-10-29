import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  AlertTriangle, 
  Award, 
  ArrowRight, 
  RotateCcw,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function QuizModal({ quizId, isOpen, onClose, onQuizCompleted }) {
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (isOpen && quizId) {
      loadQuiz();
    } else {
      setResult(null);
      setAnswers({});
      setCurrentIdx(0);
    }
  }, [isOpen, quizId]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || result || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, result, timeLeft]);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const data = await api.getTestDetails(quizId);
      setQuizData(data.quiz);
      setQuestions(data.questions || []);
      setTimeLeft((data.quiz?.duration_minutes || 15) * 60);

      // If already submitted prior
      if (data.priorSubmission) {
        setResult({
          score: data.priorSubmission.score,
          totalQuestions: data.priorSubmission.total_marks,
          percentage: data.priorSubmission.percentage,
          passed: !!data.priorSubmission.passed,
          weakAreas: data.priorSubmission.weak_areas || [],
          strongAreas: data.priorSubmission.strong_areas || []
        });
      }
    } catch (err) {
      console.error('Load quiz error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionLetter) => {
    if (result) return; // Read-only after submission
    setAnswers({
      ...answers,
      [questionId]: optionLetter
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitTest(quizId, answers);
      setResult(res);

      if (res.passed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      if (onQuizCompleted) onQuizCompleted(res);
    } catch (err) {
      alert('Error submitting quiz: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold tracking-wider">
                {quizData?.course_name || 'Academic Assessment'}
              </span>
              <span className="text-xs text-slate-400">Pass Mark: {quizData?.pass_criteria}%</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{quizData?.title}</h2>
          </div>

          <div className="flex items-center gap-3">
            {!result && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
              </div>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <BrainCircuit className="w-8 h-8 text-indigo-400 animate-pulse" />
              Loading quiz questions and assessment rubrics...
            </div>
          ) : result ? (
            /* Results View */
            <div className="space-y-5 animate-fade-in">
              <div className={`p-6 rounded-2xl text-center border ${
                result.passed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                <div className="inline-flex p-3 rounded-2xl bg-slate-900 mb-2 shadow-inner">
                  {result.passed ? <Award className="w-10 h-10 text-emerald-400" /> : <AlertTriangle className="w-10 h-10 text-rose-400" />}
                </div>
                <h3 className="text-2xl font-black text-white">{result.percentage}%</h3>
                <p className="text-xs font-semibold uppercase tracking-wider mt-1">
                  {result.passed ? 'Assessment Passed! Outstanding Work' : 'Requires Additional Review & Focus'}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  You scored {result.score} out of {result.totalQuestions} questions correctly.
                </p>
              </div>

              {/* Weak vs Strong Areas Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strong Areas */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4" /> Strong Competencies
                  </span>
                  {result.strongAreas?.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Keep practicing to build topic mastery!</p>
                  ) : (
                    <div className="space-y-1.5">
                      {result.strongAreas?.map((sa, i) => (
                        <div key={i} className="text-xs text-slate-300 flex justify-between bg-slate-800/60 p-2 rounded-lg">
                          <span>{sa.topic}</span>
                          <span className="font-bold text-emerald-400">{sa.accuracy}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weak Areas */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-4 h-4" /> Areas for Improvement
                  </span>
                  {result.weakAreas?.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Zero weak areas detected on this test! Great job!</p>
                  ) : (
                    <div className="space-y-2">
                      {result.weakAreas?.map((wa, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-800/60 text-xs text-slate-300">
                          <div className="flex justify-between font-semibold text-amber-300">
                            <span>{wa.topic}</span>
                            <span>{wa.accuracy}%</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{wa.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Breakdown */}
              {result.gradedBreakdown && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Question-by-Question Review:</span>
                  {result.gradedBreakdown.map((gb, i) => (
                    <div key={i} className={`p-3.5 rounded-xl border text-xs ${gb.isCorrect ? 'bg-slate-900/80 border-slate-700' : 'bg-rose-950/20 border-rose-500/30'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-200">Q{i + 1}. {gb.questionText}</span>
                        {gb.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400 flex gap-4">
                        <span>Your Answer: <strong className="text-white">{gb.studentAnswer || '(Skipped)'}</strong></span>
                        <span>Correct Answer: <strong className="text-emerald-400">{gb.correctAnswer}</strong></span>
                      </div>
                      {gb.explanation && (
                        <p className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-indigo-300 italic">
                          💡 Explanation: {gb.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : currentQ ? (
            /* Active Quiz View */
            <div className="space-y-5">
              {/* Question progress indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Question {currentIdx + 1} of {questions.length}</span>
                <span>Topic: <strong className="text-slate-200">{currentQ.topic || 'General'}</strong></span>
              </div>

              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
              </div>

              {/* Question Text */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-sm font-semibold text-white leading-relaxed">{currentQ.question_text}</p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options?.map((opt, oIdx) => {
                  const letter = ['A', 'B', 'C', 'D'][oIdx] || String(oIdx + 1);
                  const isSelected = answers[currentQ.id] === letter;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, letter)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium transition flex items-center gap-3 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {letter}
                      </span>
                      <span className="leading-relaxed">{String(opt).replace(/^[A-D]\)\s*/i, '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Navigation */}
        {!result ? (
          <div className="flex items-center justify-between pt-4 border-t border-slate-700/60 mt-4">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(currentIdx - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 disabled:opacity-40 transition"
            >
              Previous
            </button>

            <span className="text-xs text-slate-400">
              {answeredCount} / {questions.length} Answered
            </span>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(currentIdx + 1)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
              >
                Next Question
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-90 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Auto-Grading with AI...' : 'Submit & Grade Quiz'}
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between pt-4 border-t border-slate-700/60 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 transition"
            >
              Done Reviewing
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswers({});
                setCurrentIdx(0);
                setTimeLeft((quizData?.duration_minutes || 15) * 60);
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Test Now</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
