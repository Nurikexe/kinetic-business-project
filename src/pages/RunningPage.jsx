import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { useActiveSession } from '../context/ActiveSessionContext';
import { supabase } from '../lib/supabase';

function paceToMinutes(str) {
  const [m, s] = (str || '').split(':').map(Number);
  if (!m && !s) return 0;
  return (m || 0) + (s || 0) / 60;
}

function minutesToPace(min) {
  if (!min || min <= 0) return '—';
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

let segCounter = 0;
function newSeg() { return { id: `seg-${++segCounter}`, distance: '', pace: '' }; }

// ── Active Run Session ────────────────────────────────────────
function ActiveRunSession({ onFinish, onCancel }) {
  const { user }                      = useAuth();
  const { runSession, setRunSession } = useActiveSession();

  const { runType, segments: savedSegments, notes: savedNotes, elapsed: savedElapsed } = runSession;

  const [segments, setSegments] = useState(savedSegments);
  const [notes, setNotes]       = useState(savedNotes);
  const [elapsed, setElapsed]   = useState(savedElapsed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  // Keep context in sync on every change
  useEffect(() => {
    setRunSession(s => ({ ...s, segments, notes, elapsed }));
  }, [segments, notes, elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const updateSeg = (id, field, val) =>
    setSegments(s => s.map(seg => seg.id === id ? { ...seg, [field]: val } : seg));

  const addSegment = () => setSegments(s => [...s, newSeg()]);
  const removeSeg  = (id) => setSegments(s => s.length > 1 ? s.filter(seg => seg.id !== id) : s);

  const totals = (() => {
    let totalDist = 0, weightedPace = 0;
    segments.forEach(seg => {
      const dist = parseFloat(seg.distance) || 0;
      const pace = paceToMinutes(seg.pace);
      totalDist    += dist;
      weightedPace += pace * dist;
    });
    const avgPace = totalDist > 0 ? weightedPace / totalDist : 0;
    return { totalDistance: Math.round(totalDist * 100) / 100, avgPace: minutesToPace(avgPace) };
  })();

  const handleSubmit = async () => {
    if (totals.totalDistance === 0) { setError('Please enter at least one segment with distance.'); return; }
    setSubmitting(true);
    setError('');
    const { error: dbErr } = await supabase.from('run_sessions').insert({
      user_id:         user.id,
      date:            new Date().toISOString().split('T')[0],
      title:           runType?.name || 'Run',
      run_type:        runType?.key || runType?.type || 'run',
      segments:        segments.filter(s => s.distance),
      total_distance:  totals.totalDistance,
      avg_pace:        totals.avgPace,
      notes,
      duration_seconds: elapsed,
    });
    setSubmitting(false);
    if (dbErr) { setError(dbErr.message); return; }
    setRunSession(null);
    onFinish();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-background pb-44">
      {/* Active header */}
      <div className="sticky top-0 z-50 bg-secondary shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-secondary/60">Active Run</p>
            <h2 className="font-headline font-black text-xl uppercase tracking-tight text-on-secondary line-clamp-1">
              {runType?.name || 'Run Session'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="font-mono text-2xl font-bold text-on-secondary leading-none">{formatTime(elapsed)}</span>
              <span className="text-[9px] uppercase font-black text-on-secondary/40 tracking-tighter">Elapsed</span>
            </div>
            <button onClick={onCancel} className="w-10 h-10 rounded-full bg-on-secondary/10 flex items-center justify-center text-on-secondary hover:bg-on-secondary/20 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 max-w-xl mx-auto space-y-6">
        {/* Totals */}
        <div className="bg-surface-container rounded-2xl p-6 grid grid-cols-2 gap-6 border border-outline-variant/10 shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary/70">Total Distance</p>
            <p className="font-headline font-black text-4xl tracking-tighter text-on-surface">
              {totals.totalDistance || '0.0'}
              <span className="text-sm text-on-surface-variant ml-1 uppercase font-black tracking-widest">km</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-fixed/70">Avg Pace</p>
            <p className="font-headline font-black text-4xl tracking-tighter text-on-surface">
              {totals.avgPace}
              <span className="text-sm text-on-surface-variant ml-1 uppercase font-black tracking-widest">/km</span>
            </p>
          </div>
        </div>

        {/* Segments */}
        <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm">
          <div className="px-5 py-4 bg-surface-container-high flex items-center justify-between border-b border-outline-variant/10">
            <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface">Distance &amp; Pace</h3>
            <div className="px-2.5 py-1 rounded-full bg-secondary/10 text-[10px] text-secondary font-black uppercase tracking-widest">
              {segments.length} segment{segments.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-3 px-1">
              <span className="text-[10px] text-on-surface-variant font-black uppercase text-center tracking-tighter">Distance (km)</span>
              <span className="text-[10px] text-on-surface-variant font-black uppercase text-center tracking-tighter">Pace (min/km)</span>
              <span />
            </div>
            {segments.map((seg) => (
              <div key={seg.id} className="grid grid-cols-[1fr_1fr_2.5rem] gap-3 items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={seg.distance}
                  onChange={e => updateSeg(seg.id, 'distance', e.target.value)}
                  placeholder="5.0"
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-3 text-center font-headline font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={seg.pace}
                  onChange={e => updateSeg(seg.id, 'pace', e.target.value)}
                  placeholder="6:00"
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-3 text-center font-headline font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                />
                <button onClick={() => removeSeg(seg.id)} className="text-outline/40 hover:text-error transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">remove_circle</span>
                </button>
              </div>
            ))}
            <button
              onClick={addSegment}
              className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center gap-2 text-on-surface-variant text-xs font-black uppercase tracking-widest hover:border-secondary/50 hover:text-secondary transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Segment
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-secondary text-sm">edit_note</span>
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Session Notes</label>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did you feel? Any pain? (e.g. 'felt knee pain', 'crushed it!')"
            rows={3}
            className="w-full bg-surface-container-highest rounded-xl px-4 py-4 text-sm placeholder:text-outline/50 resize-none focus:outline-none border border-outline-variant/20 focus:ring-2 focus:ring-secondary/40 transition-all"
          />
        </div>

        {error && (
          <div className="bg-error-container/20 border border-error/20 rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-error">error</span>
            <p className="text-error text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="h-10" />
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 rounded-2xl bg-secondary text-on-secondary font-headline font-black uppercase tracking-tighter text-xl shadow-[0_12px_40px_rgba(0,227,253,0.3)] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3 group"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin" />
                <span>Saving Run…</span>
              </>
            ) : (
              <>
                <span>Finish & Submit</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Running Plan View ─────────────────────────────────────────
const SHORT_DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RunningPage() {
  const { config, updateConfig, loaded } = useUserConfig();
  const { runSession, setRunSession }    = useActiveSession();
  const [toast, setToast]               = useState(null);

  const {
    run_types:     runTypes     = [],
    run_week:      runWeek      = 0,
    run_weeks:     runWeeks     = [],
    run_completed: runCompleted = {},
    ten_k_target:  tenKTarget   = '',
  } = config;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const startRun = (runType) => {
    setRunSession({ runType, segments: [newSeg()], notes: '', elapsed: 0 });
  };

  const markRunDone = (weekIdx, dayIdx) => {
    const weekKey = String(weekIdx);
    const current = runCompleted[weekKey] || [];
    const updated = [...current];
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

  if (runSession) {
    return (
      <ActiveRunSession
        onFinish={() => showToast('Run submitted!')}
        onCancel={() => setRunSession(null)}
      />
    );
  }

  const today       = new Date().getDay();
  const todayIdx    = today === 0 ? 6 : today - 1;
  const enriched    = runTypes.map(rt => ({ color: '#00e3fd', ...rt }));

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex justify-between items-center px-6 py-4">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
        </div>
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
              const done = (runCompleted[String(i)] || []).filter(Boolean).length >= 3;
              return (
                <button
                  key={i}
                  onClick={() => updateConfig({ run_week: i })}
                  className={`shrink-0 w-20 h-20 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                    i === runWeek ? 'bg-primary-container text-on-primary-fixed'
                    : done        ? 'bg-surface-container text-secondary'
                    :               'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="font-label font-bold text-xs uppercase">Week</span>
                  <span className="font-headline font-black text-3xl tracking-tighter">
                    {String(week.week || i + 1).padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Current week sessions */}
        {currentWeekData && (
          <div className="mb-8 space-y-4">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Week {currentWeekData.week} Sessions</h3>
            {['mon','tue','wed','thu','fri','sat','sun']
              .filter(d => currentWeekData[d])
              .map((dayKey, dayIdx) => {
                const done    = weekCompletions[dayIdx] === true;
                const label   = SHORT_DAY[['mon','tue','wed','thu','fri','sat','sun'].indexOf(dayKey)];
                const isToday = ['mon','tue','wed','thu','fri','sat','sun'].indexOf(dayKey) === todayIdx;
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
                    {!done && (
                      <div className="px-6 pb-4 flex justify-end gap-2">
                        <button
                          onClick={() => startRun({ name: currentWeekData[dayKey], key: `week${runWeek}_${dayKey}`, id: `week${runWeek}_${dayKey}` })}
                          className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wide active:scale-95 transition-colors ${isToday ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'}`}
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

        {/* Quick-start run types */}
        {enriched.length > 0 && (
          <section className="mb-8">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight mb-4">Quick Start a Run</h3>
            <div className="space-y-3">
              {enriched.map(rt => (
                <button
                  key={rt.id || rt.key}
                  onClick={() => startRun(rt)}
                  className="w-full bg-surface-container rounded-lg p-5 flex items-center gap-4 hover:bg-surface-container-high transition-colors active:scale-[0.98] text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${rt.color}20`, color: rt.color }}>
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

        <button
          onClick={() => startRun({ name: 'Free Run', key: 'free', id: 'free' })}
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
