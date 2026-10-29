import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Send, 
  Plus, 
  TrendingUp, 
  Mail, 
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function ParentDashboard({ currentUser }) {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState({ text: '', type: '' });
  const [alertsHistory, setAlertsHistory] = useState([]);
  const [triggeringAlert, setTriggeringAlert] = useState(false);

  useEffect(() => {
    loadChildrenData();
    loadAlertsHistory();
  }, []);

  const loadChildrenData = async () => {
    setLoading(true);
    try {
      const data = await api.getParentChildren();
      setChildren(data);
      if (data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading parent children:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlertsHistory = async () => {
    try {
      const data = await api.getAlerts();
      setAlertsHistory(data);
    } catch (err) {
      console.error('Error loading alerts history:', err);
    }
  };

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    setLinking(true);
    setLinkMessage({ text: '', type: '' });

    try {
      const res = await api.linkParent({ invite_code: inviteCodeInput.trim() });
      setLinkMessage({ text: res.message, type: 'success' });
      setInviteCodeInput('');
      await loadChildrenData();
    } catch (err) {
      setLinkMessage({ text: err.message || 'Failed to link student.', type: 'error' });
    } finally {
      setLinking(false);
    }
  };

  const handleSendDigestNow = async () => {
    if (!selectedChildId) return;
    setTriggeringAlert(true);
    try {
      const res = await api.triggerDailyAlertNow(selectedChildId);
      alert('📧 Daily Progress Digest successfully sent to student and your parent email inbox!');
      await loadAlertsHistory();
    } catch (err) {
      alert('Error triggering digest: ' + err.message);
    } finally {
      setTriggeringAlert(false);
    }
  };

  const currentChild = children.find(c => c.id == selectedChildId) || children[0];

  return (
    <div className="space-y-6">
      
      {/* Parent Portal Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Parent Academic Oversight Portal
              </span>
              <span className="text-xs text-slate-400">Linked Accounts Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {currentUser?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Track your student's daily study consistency, course milestone completion percentages, test scores, and scheduled evening alert digests.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSendDigestNow}
              disabled={triggeringAlert || !currentChild}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-xl shadow-purple-600/30 transition active:scale-95 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${triggeringAlert ? 'animate-spin' : ''}`} />
              <span>Email Daily Report Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Child Switcher & Link Code Input Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-700/80 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Child Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">Selected Child:</span>
          {children.length === 0 ? (
            <span className="text-xs text-amber-400 font-medium">No students linked yet. Enter invite code on the right.</span>
          ) : (
            children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedChildId == child.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>🎓 {child.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/80 text-purple-200">
                  {child.streak}d streak
                </span>
              </button>
            ))
          )}
        </div>

        {/* Link Student by Invite Code Form */}
        <form onSubmit={handleLinkStudent} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            required
            placeholder="Enter Student Code (e.g. STU-SARV-9821)"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value)}
            className="w-full md:w-64 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            type="submit"
            disabled={linking || !inviteCodeInput.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{linking ? 'Linking...' : 'Link Student'}</span>
          </button>
        </form>
      </div>

      {linkMessage.text && (
        <div className={`p-3 rounded-xl border text-xs ${
          linkMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {linkMessage.text}
        </div>
      )}

      {/* Child Academic Overview Content */}
      {currentChild && (
        <div className="space-y-6">
          
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-2xl border border-slate-700/80">
              <span className="text-slate-400 block text-[11px] uppercase font-bold">Active Study Streak</span>
              <div className="flex items-center gap-2 mt-1">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="text-xl font-black text-white">{currentChild.streak} Days</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-700/80">
              <span className="text-slate-400 block text-[11px] uppercase font-bold">Today's Focus Time</span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span className="text-xl font-black text-indigo-300">{currentChild.minutes_today} minutes</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-700/80">
              <span className="text-slate-400 block text-[11px] uppercase font-bold">Enrolled Courses</span>
              <div className="flex items-center gap-2 mt-1">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span className="text-xl font-black text-purple-300">{currentChild.courses?.length || 0} Subjects</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-700/80">
              <span className="text-slate-400 block text-[11px] uppercase font-bold">Daily Alert Delivery</span>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">Active (8:00 PM)</span>
              </div>
            </div>
          </div>

          {/* Courses Progress Tracking */}
          <div className="glass-card p-6 rounded-2xl border border-slate-700/80 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              Syllabus Completion Rates for {currentChild.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentChild.courses?.map((course) => (
                <div key={course.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: course.color_code }} />
                      {course.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-300">{course.progress_percent}%</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${course.progress_percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Target Exam: {course.target_completion_date}</span>
                    <span>Completed {course.completed_topics} / {course.total_topics} topics</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Assignments Watchlist & Recent Quizzes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Assignments Watchlist */}
            <div className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Today's Assignment Watchlist
              </h3>

              {currentChild.today_assignments?.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No assignments scheduled for today.</p>
              ) : (
                <div className="space-y-2">
                  {currentChild.today_assignments?.map((a) => (
                    <div key={a.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{a.title}</span>
                        <span className="text-[11px] text-slate-400">Due: {a.due_time} ({a.course_name})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        a.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Quizzes */}
            <div className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Recent Diagnostic Test Results
              </h3>

              {currentChild.recent_quizzes?.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No tests taken yet.</p>
              ) : (
                <div className="space-y-2">
                  {currentChild.recent_quizzes?.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{q.title}</span>
                        <span className="text-[11px] text-slate-400">{new Date(q.submitted_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black ${q.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {q.percentage}%
                        </span>
                        <span className="block text-[10px] text-slate-500 uppercase">{q.passed ? 'Passed' : 'Needs Review'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Daily Alert History Log */}
          <div className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-pink-400" />
              Automated Daily Progress Alert Audit Log
            </h3>

            {alertsHistory.length === 0 ? (
              <p className="text-xs text-slate-400">No alert logs recorded yet. Click "Email Daily Report Now" above to generate your first audit digest.</p>
            ) : (
              <div className="space-y-2">
                {alertsHistory.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{alert.subject}</span>
                      <span className="text-[11px] text-slate-400">{alert.summary_text}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold">
                        {alert.delivery_status}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1">{new Date(alert.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
