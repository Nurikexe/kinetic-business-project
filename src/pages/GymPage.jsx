import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { useActiveSession } from '../context/ActiveSessionContext';
import { supabase } from '../lib/supabase';

// ── Active Gym Session ────────────────────────────────────────
function ActiveGymSession({ onFinish, onCancel }) {
  const { user }                    = useAuth();
  const { gymSession, setGymSession } = useActiveSession();

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-background pb-44">
      {/* Active header */}
      <div className="sticky top-0 z-50 bg-primary-container flex items-center justify-between px-6 py-4 shadow-md">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-primary-fixed/60">Active Session</p>
          <h2 className="font-headline font-black text-xl uppercase tracking-tight text-on-primary-fixed line-clamp-1">{day.name}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="font-mono text-2xl font-bold text-on-primary-fixed leading-none">{formatTime(elapsed)}</span>
            <span className="text-[9px] uppercase font-black text-on-primary-fixed/40 tracking-tighter">Elapsed</span>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full bg-on-primary-fixed/10 flex items-center justify-center text-on-primary-fixed hover:bg-on-primary-fixed/20 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="px-6 pt-6 max-w-xl mx-auto space-y-6">
        {sets.map((ex, exIdx) => (
          <div key={ex.exId} className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm">
            <div className="px-5 py-4 bg-surface-container-high flex items-center justify-between border-b border-outline-variant/10">
              <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface">{ex.exName}</h3>
              <div className="px-2.5 py-1 rounded-full bg-primary-container/20 text-[10px] text-primary-fixed font-black uppercase tracking-widest">
                {ex.entries.length} set{ex.entries.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 px-1">
                <span className="text-[10px] text-on-surface-variant font-black uppercase text-center tracking-tighter">Set</span>
                <span className="text-[10px] text-on-surface-variant font-black uppercase text-center tracking-tighter">Weight (kg)</span>
                <span className="text-[10px] text-on-surface-variant font-black uppercase text-center tracking-tighter">Reps</span>
                <span />
              </div>
              {ex.entries.map((entry, entryIdx) => (
                <div key={entryIdx} className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 items-center">
                  <span className="text-center text-sm font-black text-on-surface-variant bg-surface-container-highest w-8 h-8 flex items-center justify-center rounded-full mx-auto">{entryIdx + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={entry.weight}
                    onChange={e => updateEntry(exIdx, entryIdx, 'weight', e.target.value)}
                    placeholder="—"
                    className="bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-3 text-center font-headline font-bold focus:outline-none focus:ring-2 focus:ring-primary-container/40 transition-all"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={entry.reps}
                    onChange={e => updateEntry(exIdx, entryIdx, 'reps', e.target.value)}
                    placeholder="—"
                    className="bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-3 text-center font-headline font-bold focus:outline-none focus:ring-2 focus:ring-primary-container/40 transition-all"
                  />
                  <button onClick={() => removeSet(exIdx, entryIdx)} className="text-outline/40 hover:text-error transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">remove_circle</span>
                  </button>
                </div>
              ))}
              <button onClick={() => addSet(exIdx)} className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center gap-2 text-on-surface-variant text-xs font-black uppercase tracking-widest hover:border-primary-container/50 hover:text-primary-fixed transition-all">
                <span className="material-symbols-outlined text-sm">add</span>
                Add Set
              </button>
            </div>
          </div>
        ))}

        <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary-fixed text-sm">edit_note</span>
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Session Feedback</label>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did you feel? Any pain? PRs? (e.g. 'felt knee pain', 'crushed it!')"
            rows={3}
            className="w-full bg-surface-container-highest rounded-xl px-4 py-4 text-sm placeholder:text-outline/50 resize-none focus:outline-none border border-outline-variant/20 focus:ring-2 focus:ring-primary-container/40 transition-all"
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
            className="w-full py-5 rounded-2xl kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter text-xl shadow-[0_12px_40px_rgba(212,251,0,0.3)] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3 group"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-on-primary-fixed/30 border-t-on-primary-fixed rounded-full animate-spin" />
                <span>Saving Workout…</span>
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

// ── Workout Plan View ─────────────────────────────────────────
export default function GymPage() {
  const { config, updateConfig, loaded } = useUserConfig();
  const { gymSession, setGymSession }    = useActiveSession();
  const [toast, setToast]               = useState(null);

  const {
    gym_days:      gymDays     = [],
    gym_day_count: gymDayCount = 5,
    completed      = [],
    gym_goals:     gymGoals    = '',
    gym_rules:     gymRules    = [],
  } = config;

  const effectiveDays      = gymDays.slice(0, gymDayCount);
  const effectiveCompleted = Array.from({ length: gymDayCount }, (_, i) => completed[i] ?? false);
  const currentDayIdx      = effectiveCompleted.indexOf(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const markComplete = useCallback((idx) => {
    const newCompleted = [...effectiveCompleted];
    newCompleted[idx] = true;
    updateConfig({ completed: newCompleted });
    showToast('Day marked complete!');
  }, [effectiveCompleted, updateConfig, showToast]);

  const resetWeek = () => {
    updateConfig({ completed: Array(gymDayCount).fill(false) });
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
        onFinish={() => {
          if (dayIdx >= 0) markComplete(dayIdx);
          showToast('Workout submitted!');
        }}
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

        {gymGoals && (
          <div className="bg-surface-container rounded-lg p-5 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-fixed mb-2">Current Goals</p>
            <p className="text-on-surface-variant text-sm">
              {typeof gymGoals === 'string' ? gymGoals : Array.isArray(gymGoals) ? gymGoals.join(' · ') : ''}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {effectiveDays.map((day, idx) => {
            const done      = effectiveCompleted[idx];
            const isCurrent = idx === currentDayIdx;

            return (
              <div
                key={day.id}
                className={`rounded-lg overflow-hidden transition-all ${isCurrent ? 'bg-surface-container-high border border-primary-container/20' : 'bg-surface-container'} ${done ? 'opacity-60' : ''}`}
              >
                <div className={`px-6 py-4 flex justify-between items-center ${isCurrent ? 'border-b border-outline-variant/10' : ''}`}>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isCurrent ? 'text-primary-fixed' : 'text-on-surface-variant'}`}>
                      {day.schedule}{isCurrent ? ' · Today' : ''}
                    </p>
                    <h3 className="font-headline font-bold text-xl uppercase tracking-tight">{day.name}</h3>
                    {day.sub && <p className="text-on-surface-variant text-xs">{day.sub}</p>}
                  </div>
                  {done
                    ? <span className="material-symbols-outlined text-primary-fixed text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    : <span className="material-symbols-outlined text-on-surface-variant">fitness_center</span>
                  }
                </div>

                {isCurrent && !done && (
                  <div className="px-6 pb-5">
                    <div className="space-y-2 mb-4">
                      {(day.exercises || []).slice(0, 4).map(ex => (
                        <div key={ex.id} className="flex justify-between items-center text-sm">
                          <span className="text-on-surface-variant">{ex.name}</span>
                          <span className="font-bold text-primary-fixed">{ex.sets}×{ex.reps}</span>
                        </div>
                      ))}
                      {(day.exercises || []).length > 4 && (
                        <p className="text-on-surface-variant text-xs">+{day.exercises.length - 4} more exercises</p>
                      )}
                    </div>
                    <button
                      onClick={() => startDay(day)}
                      className="w-full py-3.5 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter shadow-[0_8px_24px_rgba(212,251,0,0.2)] active:scale-95 transition-transform"
                    >
                      Start Workout
                    </button>
                  </div>
                )}

                {!isCurrent && !done && (
                  <div className="px-6 pb-4 flex justify-between items-center">
                    <span className="text-on-surface-variant text-xs">{(day.exercises || []).length} exercises</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startDay(day)}
                        className="px-4 py-2 rounded-full bg-surface-container-highest text-on-surface font-bold text-xs uppercase tracking-wide hover:bg-surface-bright transition-colors active:scale-95"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => markComplete(idx)}
                        className="px-4 py-2 rounded-full border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-wide hover:text-on-surface transition-colors active:scale-95"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Array.isArray(gymRules) && gymRules.length > 0 && (
          <div className="mt-8 bg-surface-container-low rounded-lg p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Progression Rules</p>
            <ul className="space-y-2">
              {gymRules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm text-on-surface-variant">
                  <span className="text-primary-fixed font-bold shrink-0">{i + 1}.</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        )}
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
