import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, TrendingUp, Dumbbell, Info,
  Minus, Plus, CheckCircle2, Loader2, Pencil,
} from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import Section from '../components/Section';
import DayTracker from '../components/DayTracker';
import WorkoutPlan from '../components/WorkoutPlan';
import ProgressBar from '../components/ProgressBar';
import EditWorkoutModal from '../components/EditWorkoutModal';
import EditProgressionModal from '../components/EditProgressionModal';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { supabase } from '../lib/supabase';
import { DEFAULT_GYM_DAYS } from '../data/defaults';

const STAGGER = { type: 'spring', stiffness: 260, damping: 30 };
const WEEK_SCHEDULES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function makeBlankDay(idx) {
  return {
    id: idx + 1,
    num: `Day ${idx + 1}`,
    name: `Day ${idx + 1}`,
    sub: 'Custom Day',
    schedule: WEEK_SCHEDULES[idx] || `Day ${idx + 1}`,
    exercises: [],
  };
}

function syncDaySlots(days) {
  return days.map((day, idx) => ({
    ...day,
    num: `Day ${idx + 1}`,
    schedule: WEEK_SCHEDULES[idx] || `Day ${idx + 1}`,
  }));
}

export default function GymPage() {
  const { user } = useAuth();
  const { config, updateConfig, loaded } = useUserConfig();
  const [editingDay, setEditingDay]           = useState(null);
  const [editingProgression, setEditingProgression] = useState(false);
  const [toast, setToast]                     = useState(null);

  const {
    gym_days: gymDays,
    gym_day_count: gymDayCount,
    completed,
    lifts,
    gym_goals: gymGoals,
    gym_rules: gymRules,
  } = config;

  const paddedDays = Array.from({ length: Math.max(gymDays.length, gymDayCount) }, (_, i) =>
    gymDays[i] || makeBlankDay(i)
  );
  const effectiveDays      = paddedDays.slice(0, gymDayCount);
  const effectiveCompleted = Array.from({ length: gymDayCount }, (_, i) => (completed ?? [])[i] ?? false);
  const currentDayIdx      = effectiveCompleted.indexOf(false);

  // ── handlers ──────────────────────────────────────────────────

  const handleDayCountChange = (newCount) => {
    const c = Math.min(7, Math.max(1, newCount));
    const newCompleted = Array.from({ length: c }, (_, i) => effectiveCompleted[i] ?? false);
    let newDays = gymDays;
    if (c > gymDays.length) {
      const extra = Array.from({ length: c - gymDays.length }, (_, i) => makeBlankDay(gymDays.length + i));
      newDays = [...gymDays, ...extra];
    }
    updateConfig({ gym_day_count: c, completed: newCompleted, gym_days: syncDaySlots(newDays) });
  };

  const handleReorder = (oldIdx, newIdx) => {
    const reorderedDays      = arrayMove([...effectiveDays], oldIdx, newIdx);
    const reorderedCompleted = arrayMove([...effectiveCompleted], oldIdx, newIdx);
    // Replace only the first gymDayCount entries; keep any extra days
    const newDays = [
      ...syncDaySlots(reorderedDays),
      ...gymDays.slice(gymDayCount),
    ];
    updateConfig({ gym_days: newDays, completed: reorderedCompleted });
  };

  const handleWeightChange = (dayId, exerciseId, value) => {
    const newDays = gymDays.map(d =>
      d.id === dayId
        ? { ...d, exercises: d.exercises.map(e => e.id === exerciseId ? { ...e, weight: value } : e) }
        : d
    );
    updateConfig({ gym_days: newDays });
  };

  const handleSaveWorkout = (updated) => {
    updateConfig({ gym_days: gymDays.map(d => d.id === updated.id ? updated : d) });
    setEditingDay(null);
  };

  const handleSaveProgression = ({ lifts: newLifts, gym_goals, gym_rules }) => {
    updateConfig({ lifts: newLifts, gym_goals, gym_rules });
    setEditingProgression(false);
  };

  const handleSubmitWorkout = async (day, dayIdx, note = '') => {
    const { error } = await supabase.from('workouts').insert({
      user_id:   user.id,
      date:      new Date().toISOString().split('T')[0],
      day_num:   day.num,
      day_name:  day.name,
      day_focus: day.sub,
      exercises: {
        items: day.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight || '' })),
        notes: note.trim().slice(0, 250),
      },
    });
    if (error) { console.error('Submit failed:', error.message); return false; }
    updateConfig({ completed: effectiveCompleted.map((v, i) => i === dayIdx ? true : v) });
    setToast('submitted');
    setTimeout(() => setToast(null), 3500);
    return true;
  };

  // ── loading ────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 size={24} className="text-mint/60 animate-spin" />
        <p className="font-mono text-[11px] tracking-[3px] text-text-muted uppercase">Loading your plan…</p>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <div className="pt-7 pb-5 mb-1">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, ...STAGGER }}
          className="font-mono text-[10px] tracking-[4px] text-mint/60 uppercase mb-2"
        >
          Training Program
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...STAGGER }}
          className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"
        >
          <h1 className="font-display text-[34px] sm:text-[44px] leading-none tracking-wide uppercase">
            Gym <span className="text-mint">Blueprint</span>
          </h1>

          {/* Split days stepper */}
          <div className="mb-1 flex flex-col items-start gap-1 sm:items-end">
            <span className="font-mono text-[9px] tracking-[2px] text-text-muted/60 uppercase">Split</span>
            <div className="flex items-center gap-1 bg-bg-700 border border-white/[0.06] rounded-xl px-1 py-1">
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={() => handleDayCountChange(gymDayCount - 1)} disabled={gymDayCount <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-mint hover:bg-mint/[0.08] transition-colors disabled:opacity-30">
                <Minus size={12} />
              </motion.button>
              <span className="font-display text-base tracking-wider text-text-primary w-7 text-center leading-none">
                {gymDayCount}
              </span>
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={() => handleDayCountChange(gymDayCount + 1)} disabled={gymDayCount >= 7}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-mint hover:bg-mint/[0.08] transition-colors disabled:opacity-30">
                <Plus size={12} />
              </motion.button>
            </div>
            <span className="font-mono text-[8px] tracking-wider text-text-muted/40 uppercase">days/week</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mt-2"
        >
          <p className="text-[12px] font-body text-text-muted tracking-wide font-light flex-1">
            {gymGoals}
          </p>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 28 }}
          style={{ originX: 0 }}
          className="h-px bg-gradient-to-r from-mint/30 via-mint/10 to-transparent mt-5"
        />
      </div>

      {/* Week Tracker */}
      <Section icon={<CalendarCheck size={15} />} title="This Week">
        <DayTracker
          completed={effectiveCompleted}
          days={effectiveDays}
          onToggle={i => {
            const next = [...effectiveCompleted];
            next[i] = !next[i];
            updateConfig({ completed: next });
          }}
          onReset={() => updateConfig({ completed: Array(gymDayCount).fill(false) })}
          onReorder={handleReorder}
        />
      </Section>

      {/* Progression */}
      <Section
        icon={<TrendingUp size={15} />}
        title="Progression"
        action={
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setEditingProgression(true)}
            className="flex items-center gap-1.5 text-[11px] font-body text-text-muted hover:text-mint transition-colors px-2 py-1 rounded-lg hover:bg-mint/[0.06]">
            <Pencil size={11} /> Edit
          </motion.button>
        }
      >
        <div className="space-y-2">
          {lifts.map((lift, idx) => {
            const pct = Math.min(100, Math.round((lift.current / lift.target) * 100));
            return (
              <motion.div
                key={lift.key}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-bg-700 border border-white/[0.05] rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-sm tracking-[2px] uppercase text-text-primary">{lift.name}</span>
                  <span className={`font-mono text-xs font-bold ${pct >= 100 ? 'text-mint' : 'text-text-muted'}`}>{pct}%</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="number"
                    value={lift.current || ''}
                    onChange={e => updateConfig({
                      lifts: lifts.map(l =>
                        l.key === lift.key ? { ...l, current: parseFloat(e.target.value) || 0 } : l
                      )
                    })}
                    placeholder="0"
                    className="w-[72px] px-3 py-2 bg-bg-600 border border-white/[0.07] rounded-lg text-sm text-center text-text-primary font-mono font-bold outline-none focus:border-mint/35 transition-colors"
                  />
                  <span className="text-xs text-text-muted font-body">{lift.unit}</span>
                  <div className="flex-1" />
                  <span className="font-mono text-[11px] text-text-muted tracking-wider">
                    → {lift.prefix || ''}{lift.target}{lift.unit}
                  </span>
                </div>
                <ProgressBar
                  value={lift.current}
                  max={lift.target}
                  onChange={(nextValue) => updateConfig({
                    lifts: lifts.map(l =>
                      l.key === lift.key ? { ...l, current: Math.round(nextValue) } : l
                    )
                  })}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Rules */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-3 bg-bg-700 border border-white/[0.04] rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Info size={12} className="text-mint/70" />
            <span className="font-mono text-[10px] tracking-[2px] uppercase text-text-muted">Rules</span>
          </div>
          {(gymRules || []).map((tip, i) => (
            <p key={i} className="text-[12px] font-body text-text-muted leading-relaxed flex gap-2 py-0.5">
              <span className="text-mint/60 font-bold mt-0.5 flex-shrink-0">▸</span>
              {tip}
            </p>
          ))}
        </motion.div>
      </Section>

      {/* Workout Plan */}
      <Section icon={<Dumbbell size={15} />} title="Workout Plan">
        <WorkoutPlan
          days={effectiveDays}
          currentDayIdx={currentDayIdx}
          completedDays={effectiveCompleted}
          onEditDay={setEditingDay}
          onWeightChange={handleWeightChange}
          onSubmitWorkout={handleSubmitWorkout}
        />
      </Section>

      {/* Modals */}
      {editingDay && (
        <EditWorkoutModal day={editingDay} onSave={handleSaveWorkout} onClose={() => setEditingDay(null)} />
      )}
      {editingProgression && (
        <EditProgressionModal
          lifts={lifts}
          goals={gymGoals}
          rules={gymRules}
          onSave={handleSaveProgression}
          onClose={() => setEditingProgression(false)}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast === 'submitted' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-bg-700 border border-mint/25 shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(0,255,170,0.12)' }}
          >
            <CheckCircle2 size={16} className="text-mint flex-shrink-0" />
            <span className="font-body text-sm font-medium text-text-primary whitespace-nowrap">
              Workout saved to your cabinet!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
