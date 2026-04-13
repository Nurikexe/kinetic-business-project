import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'kinetic_active_run_session';

function saveRun(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() })); } catch {}
}
function loadRun() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > 3 * 60 * 60 * 1000) { clearRun(); return null; }
    return data;
  } catch { return null; }
}
function clearRun() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// Parse "5:30" → 5.5 minutes, return 0 if invalid
function paceToMinutes(str) {
  const [m, s] = (str || '').split(':').map(Number);
  if (!m && !s) return 0;
  return (m || 0) + (s || 0) / 60;
}

// minutes per km → "M:SS" string
function minutesToPace(min) {
  if (!min || min <= 0) return '—';
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Active Run Session ────────────────────────────────────────
let segCounter = 0;
function newSeg() { return { id: `seg-${++segCounter}`, distance: '', pace: '' }; }

function ActiveRunSession({ runType, onFinish, onCancel }) {
  const { user } = useAuth();

  const [segments, setSegments] = useState(() => {
    const saved = loadRun();
    if (saved?.runTypeId === (runType?.id || runType?.key)) return saved.segments;
    return [newSeg()];
  });
  const [notes, setNotes]       = useState(() => loadRun()?.notes || '');
  const [elapsed, setElapsed]   = useState(() => loadRun()?.elapsed || 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    saveRun({ runTypeId: runType?.id || runType?.key, segments, notes, elapsed });
  }, [segments, notes, elapsed, runType]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const updateSeg = (id, field, val) =>
    setSegments(s => s.map(seg => seg.id === id ? { ...seg, [field]: val } : seg));

  const addSegment  = () => setSegments(s => [...s, newSeg()]);
  const removeSeg   = (id) => setSegments(s => s.length > 1 ? s.filter(seg => seg.id !== id) : s);

  // ── Computed totals ───────────────────────────────────────
  const totals = (() => {
    let totalDist = 0;
    let weightedPace = 0;
    segments.forEach(seg => {
      const dist = parseFloat(seg.distance) || 0;
      const pace = paceToMinutes(seg.pace);
      totalDist += dist;
      weightedPace += pace * dist;
    });
    const avgPace = totalDist > 0 ? weightedPace / totalDist : 0;
    return {
      totalDistance: Math.round(totalDist * 100) / 100,
      avgPace: minutesToPace(avgPace),
      avgPaceMin: avgPace,
    };
  })();

  const handleSubmit = async () => {
    if (totals.totalDistance === 0) { setError('Please enter at least one segment with distance.'); return; }
    setSubmitting(true);
    setError('');

    const { error: dbErr } = await supabase.from('run_sessions').insert({
      user_id:        user.id,
      date:           new Date().toISOString().split('T')[0],
      title:          runType?.name || 'Run',
      run_type:       runType?.key || runType?.type || 'run',
      segments:       segments.filter(s => s.distance),
      total_distance: totals.totalDistance,
      avg_pace:       totals.avgPace,
      notes,
      duration_seconds: elapsed,
    });

    setSubmitting(false);
    if (dbErr) { setError(dbErr.message); return; }
    clearRun();
    onFinish();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-background pb-36">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-secondary flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-secondary/60">Active Run</p>
          <h2 className="font-headline font-black text-xl uppercase tracking-tight text-on-secondary">{runType?.name || 'Run Session'}</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-2xl font-bold text-on-secondary">{formatTime(elapsed)}</span>
          <button onClick={onCancel} className="text-on-secondary/60 hover:text-on-secondary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="px-6 pt-6 max-w-xl mx-auto space-y-5">
        {/* Segments */}
        <div className="bg-surface-container rounded-lg overflow-hidden">
          <div className="px-5 py-3 bg-surface-container-high flex items-center justify-between">
            <h3 className="font-headline font-bold uppercase tracking-tight">Distance & Pace</h3>
            <span className="text-xs text-on-surface-variant font-bold uppercase">{segments.length} segment{segments.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4 space-y-3">
            {/* Headers */}
            <div className="grid grid-cols-[1fr_1fr_2rem] gap-3">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase text-center">Distance (km)</span>
              <span className="text-[10px] text-on-surface-variant font-bold uppercase text-center">Pace (min/km)</span>
              <span />
            </div>

            {segments.map((seg, i) => (
              <div key={seg.id} className="grid grid-cols-[1fr_1fr_2rem] gap-3 items-center">
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={seg.distance}
                    onChange={e => updateSeg(seg.id, 'distance', e.target.value)}
                    placeholder="5.0"
                    className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2.5 text-center font-headline font-bold focus:outline-none focus:border-secondary/60 transition-colors"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={seg.pace}
                    onChange={e => updateSeg(seg.id, 'pace', e.target.value)}
                    placeholder="6:00"
                    className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2.5 text-center font-headline font-bold focus:outline-none focus:border-secondary/60 transition-colors"
                  />
                </div>
                <button onClick={() => removeSeg(seg.id)} className="text-outline hover:text-error transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">remove_circle</span>
                </button>
              </div>
            ))}

            <button
              onClick={addSegment}
              className="flex items-center gap-2 text-secondary text-sm font-bold uppercase tracking-wide hover:opacity-80 pt-1"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Add Segment
            </button>
          </div>
        </div>

        {/* Totals card */}
        <div className="bg-surface-container rounded-lg p-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">Total Distance</p>
            <p className="font-headline font-black text-3xl tracking-tighter">
              {totals.totalDistance || '—'}<span className="text-base text-on-surface-variant ml-1">km</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-fixed mb-1">Avg Pace</p>
            <p className="font-headline font-black text-3xl tracking-tighter">
              {totals.avgPace}<span className="text-base text-on-surface-variant ml-1">/km</span>
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-surface-container rounded-lg p-5">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Session Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did the run feel?"
            rows={3}
            className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm placeholder:text-outline resize-none focus:outline-none border border-outline-variant/20 focus:border-secondary/50 transition-colors"
          />
        </div>

        {error && <p className="text-error text-sm font-bold">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-xl border-t border-outline-variant/10">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-full bg-secondary text-on-secondary font-headline font-black uppercase tracking-tighter text-lg shadow-[0_8px_30px_rgba(0,227,253,0.2)] active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? 'Saving…' : 'Submit Run'}
          <span className="material-symbols-outlined">check_circle</span>
        </button>
      </div>
    </motion.div>
  );
}

// ── Running Plan View ─────────────────────────────────────────
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RunningPage() {
  const { config, updateConfig, loaded } = useUserConfig();
  const [activeRunType, setActiveRunType] = useState(null);
  const [toast, setToast]   = useState(null);

  const {
    run_types:     runTypes  = [],
    run_week:      runWeek   = 0,
    run_weeks:     runWeeks  = [],
    run_completed: runCompleted = {},
    ten_k_target:  tenKTarget = '',
  } = config;

  // Resume saved run on mount
  useEffect(() => {
    if (!loaded) return;
    const saved = loadRun();
    if (saved?.runTypeId) {
      const rt = runTypes.find(r => (r.id || r.key) === saved.runTypeId);
      if (rt) setActiveRunType(rt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const markRunDone = (weekIdx, dayIdx) => {
    const weekKey = String(weekIdx);
    const current = runCompleted[weekKey] || [];
    const updated  = [...current];
    updated[dayIdx] = true;
    updateConfig({ run_completed: { ...runCompleted, [weekKey]: updated } });
    showToast('Run marked complete!');
  };

  const currentWeekData = runWeeks[runWeek] || null;
  const weekCompletions = runCompleted[String(runWeek)] || [];

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
      </div>
    );
  }

  if (activeRunType) {
    return (
      <ActiveRunSession
        runType={activeRunType}
        onFinish={() => { setActiveRunType(null); showToast('Run submitted!'); }}
        onCancel={() => setActiveRunType(null)}
      />
    );
  }

  // Enrich run types (ensure color/icon)
  const enrichedRunTypes = runTypes.map(rt => ({
    color: '#00e3fd',
    ...rt,
  }));

  const today = new Date().getDay(); // 0=Sun
  const todayWeekday = today === 0 ? 6 : today - 1; // Mon=0…Sun=6

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
        <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
      </header>

      <div className="px-6 pt-6 max-w-xl mx-auto">
        <section className="mb-8">
          <h2 className="font-headline font-extrabold text-3xl tracking-tighter uppercase mb-1">Running Plan</h2>
          {tenKTarget && (
            <p className="text-on-surface-variant text-sm">
              Goal: <span className="text-secondary font-bold">{typeof tenKTarget === 'string' ? tenKTarget : ''}</span>
            </p>
          )}
        </section>

        {/* Week selector */}
        {runWeeks.length > 0 && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 mb-8 -mx-6 px-6">
            {runWeeks.map((week, i) => {
              const weekCompDone = runCompleted[String(i)] || [];
              const allDone = weekCompDone.filter(Boolean).length >= 3;
              return (
                <button
                  key={i}
                  onClick={() => updateConfig({ run_week: i })}
                  className={`shrink-0 w-20 h-20 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                    i === runWeek
                      ? 'bg-primary-container text-on-primary-fixed'
                      : allDone
                      ? 'bg-surface-container text-secondary'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="font-label font-bold text-xs uppercase">Week</span>
                  <span className="font-headline font-black text-3xl tracking-tighter">{String(week.week || i + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Current week sessions */}
        {currentWeekData && (
          <div className="mb-8 space-y-4">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Week {currentWeekData.week} Sessions</h3>
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
              .filter(d => currentWeekData[d])
              .map((dayKey, dayIdx) => {
                const done = weekCompletions[dayIdx] === true;
                const label = SHORT_DAY[['mon','tue','wed','thu','fri','sat','sun'].indexOf(dayKey)];
                const isToday = ['mon','tue','wed','thu','fri','sat','sun'].indexOf(dayKey) === todayWeekday;

                return (
                  <div
                    key={dayKey}
                    className={`rounded-lg overflow-hidden ${isToday ? 'border border-primary-container/20 bg-surface-container-high' : 'bg-surface-container'} ${done ? 'opacity-60' : ''}`}
                  >
                    <div className={`px-6 py-4 flex justify-between items-center ${isToday ? 'border-b border-outline-variant/10' : ''}`}>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-secondary' : 'text-on-surface-variant'}`}>
                          {label}{isToday ? ' · Today' : ''}
                        </p>
                        <h4 className="font-headline font-bold text-lg uppercase tracking-tight">{currentWeekData[dayKey]}</h4>
                      </div>
                      {done
                        ? <span className="material-symbols-outlined text-primary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        : <span className="material-symbols-outlined text-on-surface-variant">directions_run</span>
                      }
                    </div>

                    {isToday && !done && (
                      <div className="px-6 pb-4">
                        <button
                          onClick={() => setActiveRunType({ name: currentWeekData[dayKey], key: `week${runWeek}_${dayKey}`, id: `week${runWeek}_${dayKey}` })}
                          className="w-full py-3.5 rounded-full bg-gradient-to-r from-primary-fixed to-primary-dim text-on-primary-fixed font-headline font-black uppercase tracking-tighter shadow-[0_8px_24px_rgba(212,251,0,0.2)] active:scale-95 transition-transform"
                        >
                          Start Session
                        </button>
                      </div>
                    )}

                    {!isToday && !done && (
                      <div className="px-6 pb-4 flex justify-end gap-2">
                        <button
                          onClick={() => setActiveRunType({ name: currentWeekData[dayKey], key: `week${runWeek}_${dayKey}`, id: `week${runWeek}_${dayKey}` })}
                          className="px-4 py-2 rounded-full bg-surface-container-highest text-on-surface font-bold text-xs uppercase tracking-wide hover:bg-surface-bright transition-colors active:scale-95"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => markRunDone(runWeek, dayIdx)}
                          className="px-4 py-2 rounded-full border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-wide hover:text-on-surface transition-colors active:scale-95"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Run type catalog — quick-start any run type */}
        {enrichedRunTypes.length > 0 && (
          <section className="mb-8">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight mb-4">Quick Start a Run</h3>
            <div className="space-y-3">
              {enrichedRunTypes.map(rt => (
                <button
                  key={rt.id || rt.key}
                  onClick={() => setActiveRunType(rt)}
                  className="w-full bg-surface-container rounded-lg p-5 flex items-center gap-4 hover:bg-surface-container-high transition-colors active:scale-[0.98] text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${rt.color}20`, color: rt.color }}
                  >
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold uppercase tracking-tight" style={{ color: rt.color }}>{rt.name}</p>
                    <p className="text-on-surface-variant text-xs">{rt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Free run */}
        <button
          onClick={() => setActiveRunType({ name: 'Free Run', key: 'free', id: 'free' })}
          className="w-full py-4 rounded-full border border-secondary/30 text-secondary font-headline font-bold uppercase tracking-tighter hover:bg-secondary/10 transition-colors active:scale-95"
        >
          Start Free Run
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary-fixed px-6 py-3 rounded-full font-bold text-sm shadow-lg z-50 whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
