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

        {/* Goals */}
        {gymGoals && (
          <div className="bg-surface-container rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-fixed">Current Goals</p>
              <button
                onClick={() => setShowProgressionEdit(true)}
                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-on-surface uppercase font-bold tracking-widest transition-colors"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
            </div>
            <p className="text-on-surface-variant text-sm">
              {typeof gymGoals === 'string' ? gymGoals : Array.isArray(gymGoals) ? gymGoals.join(' · ') : ''}
            </p>
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

        {/* Progression rules */}
        {Array.isArray(gymRules) && gymRules.length > 0 && (
          <div className="mt-8 bg-surface-container-low rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Progression Rules</p>
              <button
                onClick={() => setShowProgressionEdit(true)}
                className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-on-surface uppercase font-bold tracking-widest transition-colors"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
            </div>
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

        {/* Edit button if no goals/rules yet */}
        {!gymGoals && gymRules.length === 0 && (
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
