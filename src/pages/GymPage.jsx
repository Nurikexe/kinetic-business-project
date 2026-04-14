import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { useActiveSession } from '../context/ActiveSessionContext';
import { supabase } from '../lib/supabase';
import EditProgressionModal from '../components/EditProgressionModal';
import EditWorkoutModal from '../components/EditWorkoutModal';

// ── Active Gym Session ────────────────────────────────────────
function ActiveGymSession({ onFinish, onCancel }) {
  const { user }                       = useAuth();
  const { gymSession, setGymSession }  = useActiveSession();

  const { day, sets: savedSets, notes: savedNotes, elapsed: savedElapsed } = gymSession;

  const [sets, setSets]         = useState(savedSets);
  const [notes, setNotes]       = useState(savedNotes);
  const [elapsed, setElapsed]   = useState(savedElapsed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  // Keep context in sync so navigating away and back restores state
  useEffect(() => {
    setGymSession(s => ({ ...s, sets, notes, elapsed }));
  }, [sets, notes, elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const updateEntry = (exIdx, entryIdx, field, val) =>
    setSets(s => s.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      entries: ex.entries.map((e, j) => j !== entryIdx ? e : { ...e, [field]: val }),
    }));

  const addSet = (exIdx) =>
    setSets(s => s.map((ex, i) => i !== exIdx ? ex : ({
      ...ex,
      entries: [...ex.entries, { weight: ex.entries.at(-1)?.weight || '', reps: ex.entries.at(-1)?.reps || '' }],
    })));

  const removeSet = (exIdx, entryIdx) =>
    setSets(s => s.map((ex, i) => i !== exIdx ? ex : ({
      ...ex,
      entries: ex.entries.length > 1 ? ex.entries.filter((_, j) => j !== entryIdx) : ex.entries,
    })));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const exercises = sets.map(ex => ({
      id: ex.exId,
      name: ex.exName,
      sets: ex.entries.length,
      reps: ex.entries[0]?.reps || '',
      weight: ex.entries[0]?.weight || '',
      all_sets: ex.entries,
    }));
    const { error: dbErr } = await supabase.from('workouts').insert({
      user_id:   user.id,
      date:      new Date().toISOString().split('T')[0],
      day_num:   day.num,
      day_name:  day.name,
      day_focus: day.sub,
      exercises: { items: exercises, notes, duration_seconds: elapsed },
    });
    setSubmitting(false);
    if (dbErr) { setError(dbErr.message); return; }
    setGymSession(null);
    onFinish();
  };

  const totalSets = sets.reduce((acc, ex) => acc + ex.entries.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-background pb-40"
    >

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-50">
        {/* Electric top bar */}
        <div className="h-[3px] kinetic-gradient w-full" />
        <div className="bg-background/96 backdrop-blur-xl border-b border-outline-variant/10 px-5 py-3 flex items-center justify-between gap-4">
          {/* Left: day info */}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/50 mb-0.5">
              Active Session
            </p>
            <h2 className="font-headline font-black text-xl uppercase tracking-tight text-on-surface leading-none truncate">
              {day.name}
            </h2>
            {day.sub && (
              <p className="text-[10px] text-on-surface-variant/60 mt-0.5 truncate">{day.sub}</p>
            )}
          </div>

          {/* Right: timer + close */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-primary-container rounded-2xl px-3.5 py-2 flex flex-col items-center min-w-[72px]">
              <span className="font-mono text-[22px] font-black text-on-primary-fixed leading-none tracking-tight tabular-nums">
                {formatTime(elapsed)}
              </span>
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-on-primary-fixed/50 mt-0.5">
                elapsed
              </span>
            </div>
            <button
              onClick={onCancel}
              className="w-9 h-9 rounded-xl bg-surface-container-high border border-outline-variant/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        </div>

        {/* Exercises progress strip */}
        <div className="bg-background/96 backdrop-blur-xl px-5 py-2 border-b border-outline-variant/10 flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
            {sets.length} exercises · {totalSets} sets
          </span>
          <div className="flex-1 flex gap-1">
            {sets.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full bg-primary-container/20" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Exercise cards ─────────────────────────────────── */}
      <div className="px-4 pt-4 max-w-xl mx-auto space-y-3">
        {sets.map((ex, exIdx) => (
          <motion.div
            key={ex.exId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: exIdx * 0.05, duration: 0.22 }}
            className="rounded-2xl bg-surface-container overflow-hidden"
            style={{ boxShadow: 'inset 3px 0 0 0 rgba(212,251,0,0.35)' }}
          >
            {/* Card header */}
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-outline-variant/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-primary-container/15 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-primary-fixed">{exIdx + 1}</span>
                </div>
                <h3 className="font-headline font-bold text-[15px] uppercase tracking-tight text-on-surface truncate">
                  {ex.exName}
                </h3>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary-fixed bg-primary-container/12 border border-primary-container/20 px-2 py-1 rounded-lg shrink-0 ml-2">
                {ex.entries.length} {ex.entries.length === 1 ? 'set' : 'sets'}
              </span>
            </div>

            {/* Sets */}
            <div className="px-4 pt-3 pb-3">
              {/* Column labels */}
              <div className="flex items-center gap-3 mb-2 pl-[36px] pr-[36px]">
                <span className="flex-1 text-center text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">
                  Weight · kg
                </span>
                <span className="flex-1 text-center text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">
                  Reps
                </span>
              </div>

              <div className="space-y-2">
                {ex.entries.map((entry, entryIdx) => (
                  <div key={entryIdx} className="flex items-center gap-3">
                    {/* Set badge */}
                    <div className="w-7 h-7 rounded-full bg-surface-container-highest border border-outline-variant/15 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-black text-on-surface-variant">{entryIdx + 1}</span>
                    </div>

                    {/* Weight */}
                    <input
                      type="number"
                      inputMode="decimal"
                      value={entry.weight}
                      onChange={e => updateEntry(exIdx, entryIdx, 'weight', e.target.value)}
                      placeholder="—"
                      className="flex-1 min-w-0 bg-surface-container-highest border border-outline-variant/15 rounded-xl py-3 text-center text-[17px] font-headline font-black text-on-surface focus:outline-none focus:border-primary-container/70 focus:bg-surface-container-high transition-all placeholder:text-on-surface-variant/25"
                    />

                    {/* Reps */}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={entry.reps}
                      onChange={e => updateEntry(exIdx, entryIdx, 'reps', e.target.value)}
                      placeholder="—"
                      className="flex-1 min-w-0 bg-surface-container-highest border border-outline-variant/15 rounded-xl py-3 text-center text-[17px] font-headline font-black text-on-surface focus:outline-none focus:border-primary-container/70 focus:bg-surface-container-high transition-all placeholder:text-on-surface-variant/25"
                    />

                    {/* Remove */}
                    <button
                      onClick={() => removeSet(exIdx, entryIdx)}
                      className="w-7 h-7 flex items-center justify-center text-on-surface-variant/25 hover:text-error active:scale-90 transition-all shrink-0"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>remove</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add set */}
              <button
                onClick={() => addSet(exIdx)}
                className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-outline-variant/20 flex items-center justify-center gap-1.5 text-on-surface-variant/40 text-[10px] font-black uppercase tracking-widest hover:border-primary-container/40 hover:text-primary-fixed transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                Add Set
              </button>
            </div>
          </motion.div>
        ))}

        {/* ── Session Notes ─────────────────────────────────── */}
        <div className="rounded-2xl bg-surface-container overflow-hidden border border-outline-variant/10">
          <div className="px-4 pt-3.5 pb-3 flex items-center gap-2 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '15px' }}>edit_note</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">
              Session Notes
            </span>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="PRs, how you felt, pain points — anything worth remembering"
            rows={3}
            className="w-full bg-transparent px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 resize-none focus:outline-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-error-container/15 border border-error/20 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>error</span>
            <p className="text-error text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* ── Fixed Submit CTA ──────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background from-55% to-transparent pt-10 px-4 pb-6 pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tight text-lg shadow-[0_8px_32px_rgba(212,251,0,0.28)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-on-primary-fixed/30 border-t-on-primary-fixed rounded-full animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <span>Finish & Submit</span>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Workout Plan View ─────────────────────────────────────────
const NEW_DAY_TEMPLATE = {
  id: null,
  num: 'New Day',
  name: 'New Day',
  sub: '',
  schedule: '',
  exercises: [],
};

export default function GymPage() {
  const { config, updateConfig, loaded } = useUserConfig();
  const { gymSession, setGymSession }    = useActiveSession();
  const [toast, setToast]               = useState(null);
  const [expandedIdx, setExpandedIdx]   = useState(null); // null = follows currentDayIdx
  const [showProgressionEdit, setShowProgressionEdit] = useState(false);
  const [editingDay, setEditingDay]     = useState(null);
  const [showAddDay, setShowAddDay]     = useState(false);

  const {
    gym_days:      gymDays     = [],
    gym_day_count: gymDayCount = 5,
    completed      = [],
    gym_goals:     gymGoals    = '',
    gym_rules:     gymRules    = [],
    lifts          = [],
  } = config;

  const effectiveDays      = gymDays.slice(0, gymDayCount);
  const effectiveCompleted = Array.from({ length: gymDayCount }, (_, i) => completed[i] ?? false);
  const currentDayIdx      = effectiveCompleted.indexOf(false); // first incomplete day

  // Which day is visually expanded: user override OR auto (first incomplete)
  const activeExpandedIdx = expandedIdx !== null ? expandedIdx : currentDayIdx;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  // Mark day complete; auto-reset if all done
  const handleFinish = useCallback((dayIdx) => {
    const newCompleted = [...effectiveCompleted];
    if (dayIdx >= 0) newCompleted[dayIdx] = true;
    const allDone = newCompleted.every(Boolean);
    if (allDone) {
      updateConfig({ completed: Array(gymDayCount).fill(false) });
      showToast('Week complete! Starting fresh.');
    } else {
      updateConfig({ completed: newCompleted });
      showToast('Workout submitted!');
    }
  }, [effectiveCompleted, gymDayCount, updateConfig, showToast]);

  const resetWeek = () => {
    updateConfig({ completed: Array(gymDayCount).fill(false) });
    setExpandedIdx(null);
    showToast('Week reset!');
  };

  const startDay = (day) => {
    setGymSession({
      day,
      sets: (day.exercises || []).map(ex => ({
        exId: ex.id,
        exName: ex.name,
        entries: [{ weight: ex.weight || '', reps: ex.reps || '' }],
      })),
      notes: '',
      elapsed: 0,
    });
  };

  const toggleExpand = (idx) => {
    setExpandedIdx(prev => prev === idx ? null : idx);
  };

  // ── Day editing ──
  const saveDay = useCallback((updatedDay) => {
    const newDays = gymDays.map(d => d.id === updatedDay.id ? updatedDay : d);
    updateConfig({ gym_days: newDays });
    setEditingDay(null);
    showToast('Day updated!');
  }, [gymDays, updateConfig, showToast]);

  const addDay = useCallback((newDay) => {
    const nextNum = gymDays.length + 1;
    const dayWithId = { ...newDay, id: Date.now(), num: `Day ${nextNum}` };
    const newDays = [...gymDays, dayWithId];
    updateConfig({ gym_days: newDays, gym_day_count: newDays.length, completed: Array(newDays.length).fill(false) });
    setShowAddDay(false);
    showToast('Day added!');
  }, [gymDays, updateConfig, showToast]);

  const deleteDay = useCallback((dayId) => {
    const newDays = gymDays.filter(d => d.id !== dayId).map((d, i) => ({ ...d, num: `Day ${i + 1}` }));
    updateConfig({ gym_days: newDays, gym_day_count: newDays.length, completed: Array(newDays.length).fill(false) });
    setEditingDay(null);
    showToast('Day removed!');
  }, [gymDays, updateConfig, showToast]);

  // ── Progression editing ──
  const saveProgression = useCallback(({ lifts: newLifts, gym_goals, gym_rules }) => {
    updateConfig({ lifts: newLifts, gym_goals, gym_rules });
    setShowProgressionEdit(false);
    showToast('Progression updated!');
  }, [updateConfig, showToast]);

  // ── Lift current value (slider) ──
  const updateLiftCurrent = useCallback((liftKey, val) => {
    const newLifts = lifts.map(l => l.key === liftKey ? { ...l, current: val } : l);
    updateConfig({ lifts: newLifts });
  }, [lifts, updateConfig]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
      </div>
    );
  }

  // Show active session if one is in progress
  if (gymSession) {
    const dayIdx = effectiveDays.findIndex(d => d.id === gymSession.day.id);
    return (
      <ActiveGymSession
        onFinish={() => handleFinish(dayIdx)}
        onCancel={() => setGymSession(null)}
      />
    );
  }

  const doneCount = effectiveCompleted.filter(Boolean).length;

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
      </header>

      <div className="px-6 pt-6 max-w-xl mx-auto">
        {/* Week progress */}
        <section className="mb-8">
          <h2 className="font-headline font-extrabold text-3xl tracking-tighter uppercase mb-1">Gym Plan</h2>
          <div className="flex items-center justify-between mb-3">
            <p className="text-on-surface-variant text-sm">{doneCount}/{gymDayCount} days complete this week</p>
            <button onClick={resetWeek} className="text-xs text-on-surface-variant hover:text-on-surface uppercase font-bold tracking-widest transition-colors">
              Reset Week
            </button>
          </div>
          <div className="flex gap-1.5">
            {effectiveDays.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${effectiveCompleted[i] ? 'bg-primary-container' : 'bg-surface-container-highest'}`} />
            ))}
          </div>
        </section>

        {/* ── Performance Targets ──────────────────────── */}
        {lifts.length > 0 && (
          <section className="mb-8">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-0.5">
                  Performance
                </p>
                <h3 className="font-headline font-extrabold text-2xl uppercase tracking-tighter leading-none">
                  Targets
                </h3>
              </div>
              <button
                onClick={() => setShowProgressionEdit(true)}
                className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/60 hover:text-primary-fixed uppercase font-black tracking-widest transition-colors pb-0.5"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                Edit
              </button>
            </div>

            <div className="space-y-3">
              {lifts.map((lift, i) => {
                const maxVal  = Math.ceil((lift.target * 1.25) / 5) * 5;
                const pct     = lift.target > 0 ? Math.min(100, Math.round((lift.current / lift.target) * 100)) : 0;
                const fillPct = maxVal > 0 ? Math.min(100, (lift.current / maxVal) * 100) : 0;
                const reached = pct >= 100;

                return (
                  <motion.div
                    key={lift.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    className="rounded-2xl bg-surface-container overflow-hidden"
                  >
                    {/* Dynamic progress top-bar */}
                    <div
                      className="h-[2px] transition-all duration-500"
                      style={{
                        background: `linear-gradient(to right, #d4fb00 ${fillPct}%, rgba(255,255,255,0.04) ${fillPct}%)`,
                      }}
                    />

                    <div className="px-5 pt-4 pb-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/40 mb-0.5">
                            {lift.unit}{lift.prefix ? ` · ${lift.prefix}` : ''}
                          </p>
                          <h4 className="font-headline font-bold text-[15px] uppercase tracking-tight text-on-surface leading-tight">
                            {lift.name}
                          </h4>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          reached
                            ? 'bg-primary-container text-on-primary-fixed'
                            : 'bg-surface-container-highest text-on-surface-variant'
                        }`}>
                          {reached ? '✓ Done' : `${pct}%`}
                        </div>
                      </div>

                      {/* Numbers row */}
                      <div className="flex items-end justify-between mb-5">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">
                            Current
                          </p>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-headline font-black text-[40px] leading-none tracking-tighter text-on-surface">
                              {lift.prefix || ''}{lift.current}
                            </span>
                            <span className="text-on-surface-variant/60 text-sm font-bold leading-none mb-1">
                              {lift.unit}
                            </span>
                          </div>
                        </div>
                        <div className="text-right pb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">
                            Target
                          </p>
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="font-headline font-bold text-2xl leading-none tracking-tighter text-on-surface-variant/50">
                              {lift.prefix || ''}{lift.target}
                            </span>
                            <span className="text-on-surface-variant/30 text-xs font-bold leading-none mb-0.5">
                              {lift.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Slider */}
                      <input
                        type="range"
                        className="kinetic-slider w-full"
                        min={0}
                        max={maxVal}
                        step={lift.unit === 'kg' ? 2.5 : 0.5}
                        value={lift.current}
                        onChange={e => updateLiftCurrent(lift.key, parseFloat(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #d4fb00 ${fillPct}%, rgba(38,38,38,1) ${fillPct}%)`,
                        }}
                      />

                      {/* Min / Max labels */}
                      <div className="flex justify-between mt-2">
                        <span className="text-[9px] font-bold text-on-surface-variant/25">0</span>
                        <span className="text-[9px] font-bold text-on-surface-variant/25">{maxVal} {lift.unit}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Fallback: legacy goal string */}
        {lifts.length === 0 && gymGoals && (
          <div className="bg-surface-container rounded-xl p-5 mb-8 flex items-center justify-between">
            <p className="text-on-surface-variant text-sm flex-1">{gymGoals}</p>
            <button
              onClick={() => setShowProgressionEdit(true)}
              className="ml-4 text-[10px] text-on-surface-variant/60 hover:text-primary-fixed uppercase font-black tracking-widest transition-colors shrink-0"
            >
              Edit
            </button>
          </div>
        )}

        {/* Day cards */}
        <div className="space-y-3">
          {effectiveDays.map((day, idx) => {
            const done       = effectiveCompleted[idx];
            const isCurrent  = idx === currentDayIdx; // visual hint only
            const isExpanded = idx === activeExpandedIdx && !done;

            return (
              <div
                key={day.id}
                className={`rounded-xl overflow-hidden transition-all ${
                  isCurrent && !done
                    ? 'bg-surface-container-high border border-primary-container/20'
                    : 'bg-surface-container border border-transparent'
                } ${done ? 'opacity-60' : ''}`}
              >
                {/* Card header — tap to expand */}
                <button
                  className="w-full px-5 py-4 flex justify-between items-center text-left"
                  onClick={() => !done && toggleExpand(idx)}
                  disabled={done}
                >
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isCurrent && !done ? 'text-primary-fixed' : 'text-on-surface-variant'}`}>
                      {day.schedule || day.num}{isCurrent && !done ? ' · Next Up' : ''}
                    </p>
                    <h3 className="font-headline font-bold text-xl uppercase tracking-tight">{day.name}</h3>
                    {day.sub && <p className="text-on-surface-variant text-xs">{day.sub}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Edit button */}
                    {!done && (
                      <button
                        onClick={e => { e.stopPropagation(); setEditingDay(day); }}
                        className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                    )}
                    {done
                      ? <span className="material-symbols-outlined text-primary-fixed text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      : <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ fontSize: '20px' }}>expand_more</span>
                    }
                  </div>
                </button>

                {/* Expanded exercise list + Start button */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-outline-variant/10">
                        <div className="space-y-2 mt-3 mb-4">
                          {(day.exercises || []).map(ex => (
                            <div key={ex.id} className="flex justify-between items-center text-sm">
                              <span className="text-on-surface-variant">{ex.name}</span>
                              <span className="font-bold text-primary-fixed">{ex.sets}×{ex.reps}</span>
                            </div>
                          ))}
                          {(day.exercises || []).length === 0 && (
                            <p className="text-on-surface-variant text-xs italic">No exercises yet — tap Edit to add some.</p>
                          )}
                        </div>
                        <button
                          onClick={() => startDay(day)}
                          className="w-full py-3.5 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter shadow-[0_8px_24px_rgba(212,251,0,0.2)] active:scale-95 transition-transform"
                        >
                          Start Workout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collapsed state for incomplete non-expanded days: show exercise count */}
                {!isExpanded && !done && (
                  <div className="px-5 pb-3">
                    <span className="text-on-surface-variant text-xs">{(day.exercises || []).length} exercises</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Day button */}
        <button
          onClick={() => setShowAddDay(true)}
          className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center gap-2 text-on-surface-variant text-sm font-bold uppercase tracking-widest hover:border-primary-container/40 hover:text-primary-fixed transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add Day
        </button>

        {/* ── Progression Rules ────────────────────────── */}
        {Array.isArray(gymRules) && gymRules.length > 0 && (
          <section className="mt-8 mb-4">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-0.5">
                  Methodology
                </p>
                <h3 className="font-headline font-extrabold text-2xl uppercase tracking-tighter leading-none">
                  Progression
                </h3>
              </div>
              <button
                onClick={() => setShowProgressionEdit(true)}
                className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/60 hover:text-primary-fixed uppercase font-black tracking-widest transition-colors pb-0.5"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                Edit
              </button>
            </div>

            <div className="space-y-2">
              {gymRules.map((rule, i) => {
                const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][i] ?? String(i + 1);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.28 }}
                    className="relative flex items-start gap-0 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/[0.07] group"
                  >
                    {/* Left numeral column */}
                    <div className="flex items-center justify-center w-14 py-5 shrink-0 border-r border-outline-variant/[0.07] bg-surface-container-high/50">
                      <span
                        className="font-headline font-black text-xl tracking-tight select-none"
                        style={{ color: 'rgba(212,251,0,0.25)' }}
                      >
                        {roman}
                      </span>
                    </div>

                    {/* Rule text */}
                    <div className="flex-1 px-4 py-4">
                      <p className="text-sm text-on-surface leading-relaxed">{rule}</p>
                    </div>

                    {/* Subtle right accent on hover */}
                    <div
                      className="absolute left-0 top-0 w-[2px] h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'linear-gradient(to bottom, #d4fb00, rgba(212,251,0,0.2))' }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Setup CTA if nothing configured */}
        {lifts.length === 0 && !gymGoals && gymRules.length === 0 && (
          <button
            onClick={() => setShowProgressionEdit(true)}
            className="mt-8 w-full py-3 rounded-xl border border-outline-variant/20 flex items-center justify-center gap-2 text-on-surface-variant text-sm font-bold uppercase tracking-widest hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-base">flag</span>
            Set Goals & Progression Rules
          </button>
        )}
      </div>

      {/* Toast */}
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

      {/* Edit Progression Modal */}
      {showProgressionEdit && (
        <EditProgressionModal
          lifts={lifts}
          goals={gymGoals || ''}
          rules={Array.isArray(gymRules) ? gymRules : []}
          onSave={saveProgression}
          onClose={() => setShowProgressionEdit(false)}
        />
      )}

      {/* Edit Day Modal */}
      {editingDay && (
        <EditWorkoutModal
          day={editingDay}
          onSave={saveDay}
          onClose={() => setEditingDay(null)}
          onDelete={() => deleteDay(editingDay.id)}
        />
      )}

      {/* Add Day Modal */}
      {showAddDay && (
        <EditWorkoutModal
          day={NEW_DAY_TEMPLATE}
          onSave={addDay}
          onClose={() => setShowAddDay(false)}
        />
      )}
    </div>
  );
}
