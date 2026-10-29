import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  BookOpen, 
  Database, 
  CheckCircle, 
  Send, 
  FileText, 
  BrainCircuit, 
  Calendar,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminDashboard({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOverview();
      setData(res);
    } catch (err) {
      console.error('Error loading admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPlatform = async () => {
    if (!confirm('Are you sure you want to reset all admin platform details, test accounts, and metrics back to the clean initial state?')) return;
    setResetting(true);
    try {
      await api.resetAdminData();
      alert('Platform details and database have been reset successfully!');
      await loadAdminData();
    } catch (err) {
      alert('Error resetting platform data: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleTriggerAll = async () => {
    if (!confirm('Are you sure you want to trigger daily progress alerts for ALL active students and their parents?')) return;
    setTriggeringAll(true);
    try {
      const res = await fetch('/api/alerts/trigger-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('study_token')}`
        }
      });
      const json = await res.json();
      alert(`Success! Generated digests for ${json.report?.length || 0} students.`);
      loadAdminData();
    } catch (err) {
      alert('Error triggering bulk alerts: ' + err.message);
    } finally {
      setTriggeringAll(false);
    }
  };

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      await api.updateAdminUser(userId, { is_active: !currentStatus });
      loadAdminData();
    } catch (err) {
      alert('Error updating user status: ' + err.message);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading system administration console...</div>;
  }

  const { metrics, dbStatus, users } = data || {};

  return (
    <div className="space-y-6">
      
      {/* Admin Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pink-950 via-slate-900 to-purple-950 border border-pink-500/30 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Platform Administration
              </span>
              <span className="text-xs text-slate-400">Database Engine & Role Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              System Control Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Monitor active users, course schemas, dynamic plans, database connections, and trigger automated daily progress digests.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleResetPlatform}
              disabled={resetting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
              title="Reset all platform details, courses, and accounts to clean initial defaults"
            >
              <RotateCcw className={`w-4 h-4 text-pink-400 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Resetting Data...' : 'Reset All Details'}</span>
            </button>

            <button
              onClick={handleTriggerAll}
              disabled={triggeringAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-xl shadow-pink-600/30 transition active:scale-95 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${triggeringAll ? 'animate-spin' : ''}`} />
              <span>Send Daily Alerts to All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Users', val: metrics?.users, icon: Users, color: 'text-indigo-400' },
          { label: 'Courses Created', val: metrics?.courses, icon: BookOpen, color: 'text-cyan-400' },
          { label: 'Study Milestones', val: metrics?.study_plans, icon: Calendar, color: 'text-emerald-400' },
          { label: 'Assignments', val: metrics?.assignments, icon: FileText, color: 'text-amber-400' },
          { label: 'Tests / Quizzes', val: metrics?.quizzes, icon: BrainCircuit, color: 'text-purple-400' },
          { label: 'Alerts Dispatched', val: metrics?.alerts_sent, icon: Send, color: 'text-pink-400' },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="glass-card p-3.5 rounded-2xl border border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">{m.label}</span>
                <Icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <span className="text-xl font-black text-white mt-1 block">{m.val || 0}</span>
            </div>
          );
        })}
      </div>

      {/* Database Status Card */}
      <div className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-indigo-400" />
          Active Database Connection Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Engine Driver</span>
            <span className="text-sm font-bold text-indigo-300 uppercase">{dbStatus?.driver}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Database Target</span>
            <span className="text-sm font-bold text-white font-mono">{dbStatus?.databaseName}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Host Address</span>
            <span className="text-sm font-bold text-slate-300">{dbStatus?.host}</span>
          </div>
        </div>
      </div>

      {/* User Accounts Management Table */}
      <div className="glass-card p-6 rounded-2xl border border-slate-700/80 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-pink-400" />
          User Accounts & RBAC Roles ({users?.length || 0})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-700 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Invite Code</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 font-semibold text-white">{u.name}</td>
                  <td className="py-2.5 px-3">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'admin'
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        : u.role === 'parent'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{u.invite_code || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      u.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleToggleUserActive(u.id, u.is_active)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      {u.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
