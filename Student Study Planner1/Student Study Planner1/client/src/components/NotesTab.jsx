import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Trash2, 
  Copy, 
  Check, 
  Layers, 
  HelpCircle, 
  RotateCw,
  Plus,
  Brain
} from 'lucide-react';
import { api } from '../services/api';

export default function NotesTab({ courses = [], activeCourseId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(activeCourseId || (courses[0]?.id || ''));
  const [topicInput, setTopicInput] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (activeCourseId) {
      setSelectedCourseId(activeCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [activeCourseId, courses]);

  useEffect(() => {
    loadNotes();
  }, [selectedCourseId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.getNotes(selectedCourseId || null);
      setNotes(data);
    } catch (err) {
      console.error('Fetch notes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNotes = async (e) => {
    e.preventDefault();
    if (!topicInput.trim() || !selectedCourseId) return;

    setGenerating(true);
    try {
      const res = await api.generateNotes(selectedCourseId, topicInput.trim(), difficulty);
      setNotes([res.note, ...notes]);
      setTopicInput('');
    } catch (err) {
      alert('Error generating AI study notes: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!confirm('Are you sure you want to delete these study notes?')) return;
    try {
      await api.deleteNote(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (err) {
      alert('Error deleting note: ' + err.message);
    }
  };

  const toggleFlip = (noteId, cardIdx) => {
    const key = `${noteId}-${cardIdx}`;
    setFlippedCards((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const copyNoteText = (note) => {
    const text = `${note.topic} - AI Study Summary\n\n${note.summary}\n\nKey Concepts:\n${(note.key_concepts || []).join('\n')}\n\nTakeaways:\n${(note.takeaways || []).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Generator Bar */}
      <div className="glass-card p-5 rounded-2xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Generate AI Study Notes & Flashcards</h3>
            <p className="text-[11px] text-slate-400">Powered by Anthropic Claude 3.5 Sonnet</p>
          </div>
        </div>

        <form onSubmit={handleGenerateNotes} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Course select */}
          <div className="sm:col-span-4">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Topic Input */}
          <div className="sm:col-span-5">
            <input
              type="text"
              required
              placeholder="e.g. Distributed Consensus & Raft Algorithm"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Difficulty & Generate Button */}
          <div className="sm:col-span-3 flex items-center gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-24 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-indigo-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button
              type="submit"
              disabled={generating || !topicInput.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30 hover:opacity-90 disabled:opacity-50 transition active:scale-95"
            >
              {generating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{generating ? 'Drafting...' : 'Generate'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading AI study notes library...</div>
      ) : notes.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl text-center border border-slate-800 space-y-2">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-white">No Notes Saved Yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Select a subject above and type any topic to let Claude AI automatically produce notes, formulas, and flashcards.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {notes.map((note) => (
            <div key={note.id} className="glass-card p-6 rounded-2xl border border-slate-700/80 shadow-xl space-y-4">
              
              {/* Note Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {note.course_name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Model: {note.model_used || 'claude-3-5-sonnet'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-1.5">{note.topic}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyNoteText(note)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Copy Note Text"
                  >
                    {copiedId === note.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-1">Executive Summary:</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  {note.summary}
                </p>
              </div>

              {/* Key Concepts */}
              {note.key_concepts && note.key_concepts.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-1.5">Key Concepts & Formulas:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {note.key_concepts.map((kc, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                        • {kc}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Takeaways & Exam Tips */}
              {note.takeaways && note.takeaways.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-indigo-300 block mb-1.5">💡 Exam Tips & High-Yield Takeaways:</span>
                  <ul className="space-y-1 text-xs text-slate-400 pl-4 list-disc">
                    {note.takeaways.map((tw, idx) => (
                      <li key={idx}>{tw}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Flashcards */}
              {note.flashcards && note.flashcards.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5 mb-2.5">
                    <Brain className="w-4 h-4" /> Interactive Memory Flashcards (Click to Flip):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {note.flashcards.map((card, cIdx) => {
                      const isFlipped = flippedCards[`${note.id}-${cIdx}`];
                      return (
                        <div
                          key={cIdx}
                          onClick={() => toggleFlip(note.id, cIdx)}
                          className={`cursor-pointer p-3.5 rounded-xl border text-xs min-h-[90px] flex flex-col justify-between transition-all select-none ${
                            isFlipped
                              ? 'bg-gradient-to-br from-indigo-950 to-purple-950 border-indigo-500/60 text-indigo-100 shadow-md'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-bold block mb-1 text-slate-500">
                              {isFlipped ? 'Answer' : 'Question (Click to reveal)'}
                            </span>
                            <p className="font-medium leading-snug">
                              {isFlipped ? card.a : card.q}
                            </p>
                          </div>
                          <span className="text-[9px] text-right text-slate-500 mt-2 block">
                            ↻ Flip
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
