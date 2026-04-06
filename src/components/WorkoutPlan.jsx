import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, Dumbbell } from 'lucide-react';

const SCHEDULE = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DAY_THEME = [
  { color: '#00ffaa', glow: 'rgba(0,255,170,0.07)' },
  { color: '#00ccff', glow: 'rgba(0,204,255,0.07)' },
  { color: '#ffb020', glow: 'rgba(255,176,32,0.07)' },
  { color: '#ff3b5c', glow: 'rgba(255,59,92,0.07)' },
  { color: '#a064ff', glow: 'rgba(160,100,255,0.07)' },
];

const SHORT = ['Push', 'Pull', 'Legs', 'Arms', 'Chest'];

const SPRING_FAST = { type: 'spring', stiffness: 450, damping: 36, mass: 0.7 };
const SPRING_MED  = { type: 'spring', stiffness: 280, damping: 30, mass: 0.9 };
const EASE_SMOOTH = [0.32, 0.72, 0, 1];

export default function WorkoutPlan({ days, currentDayIdx, completedDays, onEditDay, onWeightChange }) {
  const effectiveCurrent = currentDayIdx < 0 ? 0 : currentDayIdx;
  const [selectedIdx, setSelectedIdx] = useState(effectiveCurrent);
  const dirRef = useRef(0);

  const handleSelect = (idx) => {
    dirRef.current = idx > selectedIdx ? 1 : -1;
    setSelectedIdx(idx);
  };

  const day   = days[selectedIdx];
  const theme = DAY_THEME[selectedIdx];
  const done  = completedDays[selectedIdx];
  const total = day.exercises.reduce((s, e) => s + (e.sets || 0), 0);

  return (
    <div>
      {/* Day tab selector */}
      <div className="relative mb-5">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.04]" />
        <div className="flex gap-0 overflow-x-auto no-scrollbar">
          {days.map((d, i) => {
            const active = i === selectedIdx;
            const isCur  = i === currentDayIdx;
            const isDone = completedDays[i];
            return (
              <button
                key={d.id}
                onClick={() => handleSelect(i)}
                className="relative flex-shrink-0 flex flex-col items-center gap-1.5 pt-2.5 pb-3 px-3.5 group"
              >
                {active && (
                  <motion.div
                    layoutId="workout-underline"
                    transition={SPRING_FAST}
                    className="absolute bottom-0 inset-x-2 h-[2px] rounded-full"
                    style={{ background: theme.color }}
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
                  {SHORT[i]}
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
            key={selectedIdx}
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
                    {day.num} · {SCHEDULE[selectedIdx]}
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
                    className="p-2.5 rounded-xl bg-bg-600 border border-white/[0.07] text-text-muted hover:text-text-primary hover:border-white/[0.14] transition-colors"
                  >
                    <Pencil size={15} />
                  </motion.button>
                </div>
              </div>

              <div className="relative flex items-center gap-4 mt-4 pt-3.5 border-t border-white/[0.05]">
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
                    className="flex items-center gap-3 bg-bg-700/60 border border-white/[0.05] rounded-xl px-3.5 py-3 hover:border-white/[0.09] cursor-default"
                  >
                    <div className="w-0.5 h-7 rounded-full flex-shrink-0"
                      style={{ background: theme.color, opacity: 0.4 }}
                    />
                    <span className="font-mono text-[10px] text-text-muted w-4 text-right flex-shrink-0 leading-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 min-w-0 text-[13.5px] font-body font-medium text-text-primary leading-snug">
                      {ex.name}
                    </span>
                    <div className="flex-shrink-0 font-mono text-[11px] font-bold tracking-wider px-2.5 py-1.5 rounded-lg"
                      style={{ color: theme.color, background: `${theme.color}10` }}
                    >
                      {ex.sets}×{ex.reps}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 bg-bg-600 border border-white/[0.06] rounded-lg px-2 py-1.5 focus-within:border-white/20 transition-all duration-200 w-[64px]">
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

            {/* Prev / Next */}
            <div className="flex justify-between mt-4 px-0.5">
              <motion.button
                whileHover={selectedIdx > 0 ? { x: -2 } : {}}
                whileTap={selectedIdx > 0 ? { scale: 0.95 } : {}}
                transition={SPRING_FAST}
                onClick={() => selectedIdx > 0 && handleSelect(selectedIdx - 1)}
                disabled={selectedIdx === 0}
                className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary disabled:opacity-20 transition-colors py-1"
              >
                ← {selectedIdx > 0 ? days[selectedIdx - 1].name.split(' ')[0] : ''}
              </motion.button>
              <motion.button
                whileHover={selectedIdx < days.length - 1 ? { x: 2 } : {}}
                whileTap={selectedIdx < days.length - 1 ? { scale: 0.95 } : {}}
                transition={SPRING_FAST}
                onClick={() => selectedIdx < days.length - 1 && handleSelect(selectedIdx + 1)}
                disabled={selectedIdx === days.length - 1}
                className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary disabled:opacity-20 transition-colors py-1"
              >
                {selectedIdx < days.length - 1 ? days[selectedIdx + 1].name.split(' ')[0] : ''} →
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
