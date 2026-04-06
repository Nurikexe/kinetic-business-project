import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';

const SHORT = ['Push', 'Pull', 'Legs', 'Arms', 'C/B'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SPRING = { type: 'spring', stiffness: 400, damping: 30, mass: 0.7 };

export default function DayTracker({ completed, onToggle, onReset }) {
  const currentIdx = completed.indexOf(false);
  const doneCount = completed.filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <motion.span
            key={doneCount}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={SPRING}
            className="font-display text-3xl text-text-primary"
          >
            {doneCount}
          </motion.span>
          <span className="font-body text-sm text-text-muted">/5 this week</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red transition-colors py-1 px-2.5 rounded-lg hover:bg-red/[0.06] font-body"
        >
          <RotateCcw size={11} />
          Reset
        </motion.button>
      </div>

      <div className="h-px bg-bg-500/60 rounded-full overflow-hidden mb-4">
        <motion.div
          animate={{ width: `${(doneCount / 5) * 100}%` }}
          transition={{ type: 'spring', stiffness: 150, damping: 24 }}
          className="h-full bg-gradient-to-r from-mint/60 to-cyan/60"
        />
      </div>

      <div className="grid grid-cols-5 gap-2">
        {completed.map((done, i) => {
          const isCurrent = i === currentIdx;
          return (
            <motion.button
              key={i}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.93, y: 0 }}
              transition={SPRING}
              onClick={() => onToggle(i)}
              className={`relative flex flex-col items-center gap-2 py-3.5 px-1 rounded-2xl border transition-colors duration-300 ${
                done
                  ? 'bg-mint/[0.07] border-mint/20'
                  : isCurrent
                  ? 'bg-bg-600 border-white/[0.08]'
                  : 'bg-bg-700/60 border-white/[0.04] hover:border-white/[0.08]'
              }`}
            >
              {isCurrent && !done && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border border-mint/20"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <span className={`font-mono text-[10px] tracking-widest uppercase leading-none ${
                done ? 'text-mint' : isCurrent ? 'text-text-secondary' : 'text-text-muted'
              }`}>
                {DAYS_OF_WEEK[i]}
              </span>
              <motion.div
                animate={done ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  done ? 'bg-mint' : 'border border-bg-400'
                }`}
              >
                <motion.div
                  initial={false}
                  animate={done ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                >
                  <Check size={15} strokeWidth={3} className="text-bg-900" />
                </motion.div>
              </motion.div>
              <span className={`font-display text-[11px] tracking-widest uppercase leading-none ${
                done ? 'text-mint' : isCurrent ? 'text-text-secondary' : 'text-text-muted'
              }`}>
                {SHORT[i]}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
