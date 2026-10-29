import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flame, CheckCircle, Clock, Coffee, Plus, Minus, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function PomodoroTimer({ activeCourse, onSessionCompleted }) {
  // Focus duration state: 25 to 60 minutes (default 25)
  const [focusMinutes, setFocusMinutes] = useState(25);
  // Mode: 'focus', 'break_5', 'break_10'
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Calculate current mode duration in seconds
  const getModeDuration = (currentMode, fMins = focusMinutes) => {
    if (currentMode === 'focus') return fMins * 60;
    if (currentMode === 'break_10') return 10 * 60;
    return 5 * 60; // break_5 default
  };

  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleTimerFinish();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const handleTimerFinish = async () => {
    // Play audio notification chime
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // AudioContext fallback
    }

    if (mode === 'focus') {
      setCompletedCycles((c) => c + 1);
      try {
        await api.logPomodoroSession(focusMinutes, activeCourse?.id);
        if (onSessionCompleted) onSessionCompleted(focusMinutes);
      } catch (err) {
        console.warn('Log session note:', err.message);
      }
      alert(`🎉 ${focusMinutes}-minute study cycle complete! Take a breather.`);
      switchMode('break_5');
    } else {
      alert(`Break is over! Ready for your next ${focusMinutes}-minute focus cycle?`);
      switchMode('focus');
    }
  };

  const switchMode = (newMode, customFocusMins = focusMinutes) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(getModeDuration(newMode, customFocusMins));
  };

  const handleFocusDurationChange = (newMins) => {
    // Constrain strictly between 25 and 60 minutes
    const clamped = Math.max(25, Math.min(60, Number(newMins)));
    setFocusMinutes(clamped);
    if (mode === 'focus') {
      setIsRunning(false);
      setTimeLeft(clamped * 60);
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getModeDuration(mode, focusMinutes));
  };

  const currentDuration = getModeDuration(mode, focusMinutes);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = Math.min(100, Math.max(0, ((currentDuration - timeLeft) / currentDuration) * 100));

  const isBreak = mode.startsWith('break');

  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-700/80 shadow-xl relative overflow-hidden">
      
      {/* Background radial accent */}
      <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-colors duration-500 ${
        isBreak ? 'bg-emerald-500/10' : 'bg-indigo-500/10'
      }`}></div>

      {/* Header & Modes */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg transition-colors ${
            isBreak ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
          }`}>
            {isBreak ? <Coffee className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
          </div>
          <span className="font-bold text-sm text-white">Pomodoro Study Timer</span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => switchMode('focus')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              mode === 'focus' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Focus {focusMinutes}m
          </button>
          <button
            type="button"
            onClick={() => switchMode('break_5')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              mode === 'break_5' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Break 5m
          </button>
          <button
            type="button"
            onClick={() => switchMode('break_10')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              mode === 'break_10' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Break 10m
          </button>
        </div>
      </div>

      {/* Active Course Tag */}
      {activeCourse && (
        <div className="mb-3 text-[11px] text-slate-400 flex items-center gap-1.5">
          <span>Active Subject:</span>
          <span className="font-semibold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
            {activeCourse.name}
          </span>
        </div>
      )}

      {/* Focus Time Setter (25 to 60 Minutes) */}
      {mode === 'focus' && (
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 mb-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Focus Duration (25 - 60 min):
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isRunning || focusMinutes <= 25}
                onClick={() => handleFocusDurationChange(focusMinutes - 5)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 flex items-center justify-center transition"
                title="Decrease 5 minutes"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono font-bold text-indigo-300 bg-indigo-950/90 px-2 py-0.5 rounded border border-indigo-500/40 text-xs min-w-[58px] text-center">
                {focusMinutes} min
              </span>
              <button
                type="button"
                disabled={isRunning || focusMinutes >= 60}
                onClick={() => handleFocusDurationChange(focusMinutes + 5)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 flex items-center justify-center transition"
                title="Increase 5 minutes"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Interactive Range Slider (25m to 60m) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">25m</span>
            <input
              type="range"
              min="25"
              max="60"
              step="5"
              value={focusMinutes}
              disabled={isRunning}
              onChange={(e) => handleFocusDurationChange(e.target.value)}
              className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
            />
            <span className="text-[10px] text-slate-500 font-mono">60m</span>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {[25, 30, 40, 50, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                disabled={isRunning}
                onClick={() => handleFocusDurationChange(mins)}
                className={`py-1 rounded-md text-[11px] font-semibold transition ${
                  focusMinutes === mins
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                } disabled:opacity-50`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Break Time Selector (5 min or 10 min) */}
      {isBreak && (
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 mb-3 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
            Break Time:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => switchMode('break_5')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                mode === 'break_5'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              } disabled:opacity-50`}
            >
              5 Minutes
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => switchMode('break_10')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                mode === 'break_10'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              } disabled:opacity-50`}
            >
              10 Minutes
            </button>
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center py-2">
        <div className="font-mono text-5xl font-extrabold tracking-tight text-white mb-2">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden my-3 border border-slate-700/50">
          <div
            className={`h-full transition-all duration-300 ${
              isBreak 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                : 'bg-gradient-to-r from-indigo-500 to-pink-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition active:scale-95 ${
              isRunning 
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' 
                : isBreak 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Pause' : (mode === 'focus' ? `Start Focus (${focusMinutes}m)` : `Start Break (${mode === 'break_10' ? '10m' : '5m'})`)}
          </button>
          <button
            onClick={resetTimer}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Cycles counter */}
        <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Completed focus blocks today: <strong className="text-white">{completedCycles}</strong></span>
        </div>
      </div>

    </div>
  );
}
