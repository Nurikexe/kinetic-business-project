import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Pencil } from 'lucide-react';

export default function WorkoutCard({ day, isActive, onEdit }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border transition-all duration-200 mb-2 ${
      isActive
        ? 'bg-mint-dim border-mint/20 shadow-[0_0_20px_rgba(0,255,170,0.05)]'
        : 'bg-bg-800 border-white/[0.04] hover:border-white/[0.08]'
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className={`font-display font-bold text-xs tracking-[2px] uppercase min-w-[48px] ${
          isActive ? 'text-mint' : 'text-text-muted'
        }`}>
          {day.num}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-display font-medium text-[15px] tracking-wide uppercase">
            {day.name}
          </span>
          <span className="text-text-muted text-xs font-light ml-2">{day.sub}</span>
        </div>
        {isActive && (
          <span className="text-[10px] font-mono tracking-wider text-mint bg-mint/10 px-2 py-0.5 rounded-full uppercase">
            Next
          </span>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-muted"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1">
              {day.exercises.map((ex) => (
                <div key={ex.id} className="flex items-baseline justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-text-secondary text-sm">{ex.name}</span>
                  <div className="flex items-center gap-2">
                    {ex.weight && (
                      <span className="font-mono text-[11px] text-amber">{ex.weight}kg</span>
                    )}
                    <span className="font-mono text-xs text-mint font-bold tracking-wider">
                      {ex.sets}×{ex.reps}
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(day); }}
                className="mt-2 flex items-center gap-1.5 text-xs text-text-muted hover:text-mint transition-colors py-1"
              >
                <Pencil size={12} />
                Edit workout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
