import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, TrendingUp, Dumbbell, Info } from 'lucide-react';
import Section from '../components/Section';
import DayTracker from '../components/DayTracker';
import WorkoutPlan from '../components/WorkoutPlan';
import ProgressBar from '../components/ProgressBar';
import EditWorkoutModal from '../components/EditWorkoutModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_GYM_DAYS, DEFAULT_LIFTS } from '../data/defaults';

const STAGGER = { type: 'spring', stiffness: 260, damping: 30 };

export default function GymPage() {
  const [gymDays, setGymDays]     = useLocalStorage('ha_gym_days', DEFAULT_GYM_DAYS);
  const [completed, setCompleted] = useLocalStorage('ha_gym_completed', [false,false,false,false,false]);
  const [lifts, setLifts]         = useLocalStorage('ha_lifts', DEFAULT_LIFTS);
  const [editingDay, setEditingDay] = useState(null);

  const currentDayIdx = completed.indexOf(false);

  const handleWeightChange = (dayId, exerciseId, value) => {
    setGymDays(prev => prev.map(d =>
      d.id === dayId
        ? { ...d, exercises: d.exercises.map(e => e.id === exerciseId ? { ...e, weight: value } : e) }
        : d
    ));
  };

  const handleSaveWorkout = (updated) => {
    setGymDays(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditingDay(null);
  };

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
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...STAGGER }}
          className="font-display text-[44px] leading-none tracking-wide uppercase"
        >
          Gym <span className="text-mint">Blueprint</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[12px] font-body text-text-muted mt-2 tracking-wide font-light"
        >
          100kg Bench · 120kg Squat · +60kg Pull-up · +80kg Dip
        </motion.p>
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
          completed={completed}
          onToggle={i => setCompleted(prev => prev.map((v, j) => j === i ? !v : v))}
          onReset={() => setCompleted([false,false,false,false,false])}
        />
      </Section>

      {/* Progression */}
      <Section icon={<TrendingUp size={15} />} title="Progression">
        <div className="space-y-2">
          {lifts.map((lift, idx) => {
            const pct = Math.min(100, Math.round((lift.current / lift.target) * 100));
            return (
              <motion.div
                key={lift.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-bg-700 border border-white/[0.05] rounded-2xl p-4 "
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-sm tracking-[2px] uppercase text-text-primary">
                    {lift.name}
                  </span>
                  <span className={`font-mono text-xs font-bold ${pct >= 100 ? 'text-mint' : 'text-text-muted'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="number"
                    value={lift.current || ''}
                    onChange={e => setLifts(prev => prev.map(l =>
                      l.key === lift.key ? { ...l, current: parseFloat(e.target.value) || 0 } : l
                    ))}
                    placeholder="0"
                    className="w-[72px] px-3 py-2 bg-bg-600 border border-white/[0.07] rounded-lg text-sm text-center text-text-primary font-mono font-bold outline-none focus:border-mint/35 transition-colors"
                  />
                  <span className="text-xs text-text-muted font-body">{lift.unit}</span>
                  <div className="flex-1" />
                  <span className="font-mono text-[11px] text-text-muted tracking-wider">
                    → {lift.prefix || ''}{lift.target}{lift.unit}
                  </span>
                </div>
                <ProgressBar value={lift.current} max={lift.target} />
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-3 bg-bg-700 border border-white/[0.04] rounded-2xl p-4 "
        >
          <div className="flex items-center gap-2 mb-3">
            <Info size={12} className="text-mint/70" />
            <span className="font-mono text-[10px] tracking-[2px] uppercase text-text-muted">Rules</span>
          </div>
          {[
            'Barbell lifts: +2.5kg/week. Fail 5×5 → repeat the weight.',
            'Calisthenics: Top Set (max 2-3 reps) → drop 20% for volume.',
            'Accessories: 3-sec eccentric on curls, raises, pushdowns.',
            'Hip Thrust to 140kg+ to make 120kg squat lighter.',
          ].map((tip, i) => (
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
          days={gymDays}
          currentDayIdx={currentDayIdx}
          completedDays={completed}
          onEditDay={setEditingDay}
          onWeightChange={handleWeightChange}
        />
      </Section>

      {editingDay && (
        <EditWorkoutModal
          day={editingDay}
          onSave={handleSaveWorkout}
          onClose={() => setEditingDay(null)}
        />
      )}
    </>
  );
}
