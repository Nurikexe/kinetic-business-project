import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, Dumbbell, Send } from 'lucide-react';

const DAY_THEME = [
  { color: '#00ffaa', glow: 'rgba(0,255,170,0.07)' },
  { color: '#00ccff', glow: 'rgba(0,204,255,0.07)' },
  { color: '#ffb020', glow: 'rgba(255,176,32,0.07)' },
  { color: '#ff3b5c', glow: 'rgba(255,59,92,0.07)' },
  { color: '#a064ff', glow: 'rgba(160,100,255,0.07)' },
  { color: '#00e5ff', glow: 'rgba(0,229,255,0.07)' },
  { color: '#ff9f43', glow: 'rgba(255,159,67,0.07)' },
];

const SPRING_FAST = { type: 'spring', stiffness: 450, damping: 36, mass: 0.7 };
const SPRING_MED  = { type: 'spring', stiffness: 280, damping: 30, mass: 0.9 };
const EASE_SMOOTH = [0.32, 0.72, 0, 1];

export default function WorkoutPlan({ days, currentDayIdx, completedDays, onEditDay, onWeightChange, onSubmitWorkout }) {
  const effectiveCurrent = currentDayIdx < 0 ? 0 : currentDayIdx;
  const [selectedIdx, setSelectedIdx] = useState(effectiveCurrent);
  const [notesByDay, setNotesByDay] = useState({});
  const dirRef = useRef(0);

  // Clamp selectedIdx if days shrank
  const safeIdx = Math.min(selectedIdx, days.length - 1);

  const handleSelect = (idx) => {
    dirRef.current = idx > safeIdx ? 1 : -1;
    setSelectedIdx(idx);
  };

  const day   = days[safeIdx];
  const theme = DAY_THEME[safeIdx % DAY_THEME.length];
  const done  = completedDays[safeIdx];
  const total = day.exercises.reduce((s, e) => s + (e.sets || 0), 0);
  const workoutNote = notesByDay[day.id] ?? '';

  return (
    <div>
      {/* Day tab selector */}
      <div className="relative mb-5">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.04]" />
        <div className="flex gap-0 overflow-x-auto no-scrollbar">
          {days.map((d, i) => {
            const active = i === safeIdx;
            const isCur  = i === currentDayIdx;
            const isDone = completedDays[i];
            const t      = DAY_THEME[i % DAY_THEME.length];
            return (
              <button
                key={d.id}
                onClick={() => handleSelect(i)}
                className="relative flex-shrink-0 flex min-w-[68px] flex-col items-center gap-1.5 pt-2.5 pb-3 px-3 group sm:min-w-0 sm:px-3.5"
              >
                {active && (
                  <motion.div
                    layoutId="workout-underline"
                    transition={SPRING_FAST}
                    className="absolute bottom-0 inset-x-2 h-[2px] rounded-full"
                    style={{ background: t.color }}
                  />
                )}
                <div className={`relative w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone   ? 'bg-mint'
                  : active ? 'bg-bg-500 ring-1 ring-white/10'
                  :          'bg-bg-700 group-hover:bg-bg-600'
                }`}>
                  {isDone
                    ? <Check size={12} strokeWidth={3} className="text-bg-900" />
                    : <span className={`font-mono text-[10px] font-bold leading-none ${active ? 'text-text-primary' : 'text-text-muted'}`}>{i + 1}</span>
                  }
                  {isCur && !isDone && (
                    <span className="absolute -top-0.5 -right-0.5 flex">
                      <span className="relative w-2 h-2 rounded-full bg-mint">
                        <motion.span
                          className="absolute inset-0 rounded-full bg-mint"
                          animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
                          transition={{ duration: 2.2, repeat: Infinity }}
                        />
                      </span>
                    </span>
                  )}
                </div>
                <span className={`font-display text-xs tracking-[2px] uppercase transition-colors duration-200 ${
                  active ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary'
                }`}>
                  {d.name.split(' ')[0].slice(0, 5)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animated day panel */}
      <div className="overflow-hidden">
        <AnimatePresence custom={dirRef.current} mode="wait">
          <motion.div
            key={safeIdx}
            custom={dirRef.current}
            variants={{
              enter:  d => ({ x: d > 0 ? 56 : -56, opacity: 0, filter: 'blur(6px)' }),
              center:    ({ x: 0,  opacity: 1, filter: 'blur(0px)' }),
              exit:   d => ({ x: d > 0 ? -40 : 40, opacity: 0, filter: 'blur(4px)' }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: EASE_SMOOTH }}
          >
            {/* Header card */}
            <div
              className="relative overflow-hidden rounded-2xl border mb-2.5 p-5"
              style={{
                borderColor: `${theme.color}20`,
                background: `linear-gradient(145deg, ${theme.glow} 0%, rgba(11,12,16,0.97) 55%)`,
              }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage: `radial-gradient(circle, ${theme.color} 1px, transparent 1px)`,
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-[0.08]"
                style={{ background: theme.color }}
              />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] tracking-[3px] uppercase mb-1.5"
                    style={{ color: theme.color, opacity: 0.75 }}>
                    {day.num} · {day.schedule || `Day ${safeIdx + 1}`}
                  </p>
                  <h3 className="font-display text-[32px] leading-none tracking-wide uppercase text-text-primary">
                    {day.name}
                  </h3>
                  <p className="text-text-muted text-[13px] font-light mt-1">{day.sub}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {done && (
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="w-9 h-9 rounded-full bg-mint flex items-center justify-center"
                      style={{ boxShadow: '0 0 20px rgba(0,255,170,0.45)' }}
                    >
                      <Check size={18} strokeWidth={3} className="text-bg-900" />
                    </motion.div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.93 }}
                    transition={SPRING_FAST}
                    onClick={() => onEditDay(day)}
                    className="p-2.5 rounded-xl bg-bg-600 border border-white/[0.07] text-text-muted hover:text-text-primary hover:border-white/[0.14] transition-colors flex-shrink-0"
                  >
                    <Pencil size={15} />
                  </motion.button>
                </div>
              </div>

              <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.05] pt-3.5">
                <Dumbbell size={12} style={{ color: theme.color, opacity: 0.7 }} />
                <span className="font-mono text-[11px] text-text-muted tracking-wider">
                  <span className="text-text-primary font-bold">{day.exercises.length}</span> exercises
                </span>
                <div className="w-px h-3 bg-white/[0.07]" />
                <span className="font-mono text-[11px] text-text-muted tracking-wider">
                  <span className="text-text-primary font-bold">{total}</span> total sets
                </span>
              </div>
            </div>

            {/* Exercise rows */}
            <div className="space-y-1.5">
              {day.exercises.map((ex, i) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, x: dirRef.current > 0 ? 20 : -20, y: 4 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ ...SPRING_MED, delay: i * 0.04 }}
                >
                  <motion.div
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap sm:gap-3 bg-bg-700/60 border border-white/[0.05] rounded-xl px-3 py-3 hover:border-white/[0.09] cursor-default"
                  >
                    <div className="w-0.5 h-7 rounded-full flex-shrink-0"
                      style={{ background: theme.color, opacity: 0.4 }}
                    />
                    <span className="font-mono text-[10px] text-text-muted w-4 text-right flex-shrink-0 leading-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-[1_1_100%] text-[13.5px] font-body font-medium text-text-primary leading-snug sm:flex-1">
                      {ex.name}
                    </span>
                    <div className="flex-shrink-0 font-mono text-[11px] font-bold tracking-wider px-2.5 py-1.5 rounded-lg"
                      style={{ color: theme.color, background: `${theme.color}10` }}
                    >
                      {ex.sets}×{ex.reps}
                    </div>
                    <div className="ml-auto flex w-[78px] flex-shrink-0 items-center gap-1 rounded-lg border border-white/[0.06] bg-bg-600 px-2 py-1.5 transition-all duration-200 focus-within:border-white/20 sm:ml-0 sm:w-[64px]">
                      <input
                        type="number"
                        value={ex.weight || ''}
                        onChange={e => onWeightChange(day.id, ex.id, e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-[11.5px] font-mono text-center text-text-primary outline-none placeholder:text-text-muted/30 leading-none"
                      />
                      <span className="text-[9px] text-text-muted leading-none flex-shrink-0">kg</span>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Submit workout button */}
            {day.exercises.length > 0 && onSubmitWorkout && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: day.exercises.length * 0.04 + 0.06 }}
                className="mt-3 rounded-2xl border border-white/[0.05] bg-bg-700/60 p-3.5 backdrop-blur-sm overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] tracking-[2px] uppercase text-text-muted">Workout Note</span>
                  <span className="font-mono text-[10px] text-text-muted/50">
                    {workoutNote.length}/250
                  </span>
                </div>
                <textarea
                  value={workoutNote}
                  onChange={(e) => setNotesByDay(prev => ({ ...prev, [day.id]: e.target.value.slice(0, 250) }))}
                  placeholder="How did the workout feel? Any pain, fatigue, or highlights?"
                  maxLength={250}
                  className="w-full min-h-[78px] resize-none px-3 py-2.5 bg-bg-600 border border-white/[0.07] rounded-xl text-sm text-text-primary font-body outline-none focus:border-mint/30 transition-colors placeholder:text-text-muted/40"
                />

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: day.exercises.length * 0.04 + 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const ok = await onSubmitWorkout(day, safeIdx, workoutNote);
                    if (ok) {
                      setNotesByDay(prev => ({ ...prev, [day.id]: '' }));
                    }
                  }}
                  className={`mt-3 flex w-full items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-body font-semibold transition-colors ${
                    done
                      ? 'border-mint/15 bg-mint/[0.05] text-mint/50 cursor-default'
                      : 'border-mint/25 bg-mint/[0.08] text-mint hover:bg-mint/[0.14]'
                  }`}
                  disabled={done}
                >
                  <Send size={14} />
                  {done ? 'Workout Submitted' : 'Submit Workout'}
                </motion.button>
              </motion.div>
            )}

            {/* Prev / Next */}
            <div className="mt-4 flex justify-between gap-4 px-0.5">
              <motion.button
                whileHover={safeIdx > 0 ? { x: -2 } : {}}
                whileTap={safeIdx > 0 ? { scale: 0.95 } : {}}
                transition={SPRING_FAST}
                onClick={() => safeIdx > 0 && handleSelect(safeIdx - 1)}
                disabled={safeIdx === 0}
                className="min-w-0 flex items-center gap-1.5 text-left text-[11px] font-mono text-text-muted hover:text-text-secondary disabled:opacity-20 transition-colors py-1"
              >
                ← {safeIdx > 0 ? days[safeIdx - 1].name.split(' ')[0] : ''}
              </motion.button>
              <motion.button
                whileHover={safeIdx < days.length - 1 ? { x: 2 } : {}}
                whileTap={safeIdx < days.length - 1 ? { scale: 0.95 } : {}}
                transition={SPRING_FAST}
                onClick={() => safeIdx < days.length - 1 && handleSelect(safeIdx + 1)}
                disabled={safeIdx === days.length - 1}
                className="min-w-0 flex items-center justify-end gap-1.5 text-right text-[11px] font-mono text-text-muted hover:text-text-secondary disabled:opacity-20 transition-colors py-1"
              >
                {safeIdx < days.length - 1 ? days[safeIdx + 1].name.split(' ')[0] : ''} →
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
