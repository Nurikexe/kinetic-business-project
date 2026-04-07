import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown } from 'lucide-react';
import ExercisePicker from './ExercisePicker';

const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

export default function EditWorkoutModal({ day, onSave, onClose }) {
  const [exercises, setExercises] = useState(() => day.exercises.map(e => ({ ...e })));
  const [dayName, setDayName] = useState(day.name);
  const [daySub, setDaySub]   = useState(day.sub);
  const [showPicker, setShowPicker] = useState(false);

  const updateExercise = (idx, field, value) => {
    setExercises(prev => prev.map((e, i) =>
      i === idx ? { ...e, [field]: field === 'sets' ? parseInt(value) || 0 : value } : e
    ));
  };

  const removeExercise = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx));

  const addFromPicker = ({ name, sets, reps }) => {
    setExercises(prev => [...prev, {
      id: 'e_' + Date.now(), name, sets, reps, weight: '',
    }]);
    setShowPicker(false);
  };

  const moveExercise = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= exercises.length) return;
    setExercises(prev => {
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(6,7,9,0.75)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={SPRING}
          onClick={e => e.stopPropagation()}
          className="bg-bg-700 border border-white/[0.07] rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <h3 className="font-display text-lg tracking-[2px] uppercase">Edit {day.num}</h3>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-500 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={17} />
            </motion.button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Name / Focus */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Name', value: dayName, set: setDayName },
                { label: 'Focus', value: daySub, set: setDaySub },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-[10px] font-mono text-text-muted tracking-[2px] uppercase mb-1.5 block">{label}</label>
                  <input
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-800 border border-white/[0.06] rounded-xl text-sm text-text-primary font-body font-medium outline-none focus:border-mint/30 transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-text-muted tracking-[2px] uppercase block">Exercises</label>
              <AnimatePresence>
                {exercises.map((ex, idx) => (
                  <motion.div
                    key={ex.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center gap-2 bg-bg-800 rounded-xl p-2.5 border border-white/[0.04] group"
                  >
                    <div className="flex flex-col gap-0.5">
                      {['▲','▼'].map((arrow, d) => (
                        <button key={d} onClick={() => moveExercise(idx, d === 0 ? -1 : 1)}
                          disabled={(d === 0 && idx === 0) || (d === 1 && idx === exercises.length - 1)}
                          className="text-text-muted hover:text-text-primary disabled:opacity-20 text-[10px] leading-none w-4 text-center">
                          {arrow}
                        </button>
                      ))}
                    </div>
                    <input
                      value={ex.name}
                      onChange={e => updateExercise(idx, 'name', e.target.value)}
                      placeholder="Exercise name"
                      className="flex-1 min-w-0 px-2 py-1.5 bg-transparent text-sm text-text-primary font-body outline-none placeholder:text-text-muted/40"
                    />
                    <input
                      type="number"
                      value={ex.sets}
                      onChange={e => updateExercise(idx, 'sets', e.target.value)}
                      className="w-10 px-1 py-1.5 bg-bg-600 border border-white/[0.06] rounded text-xs text-center text-text-primary font-mono outline-none focus:border-mint/30"
                    />
                    <span className="text-text-muted text-xs">×</span>
                    <input
                      value={ex.reps}
                      onChange={e => updateExercise(idx, 'reps', e.target.value)}
                      className="w-14 px-1 py-1.5 bg-bg-600 border border-white/[0.06] rounded text-xs text-center text-text-primary font-mono outline-none focus:border-mint/30"
                      placeholder="reps"
                    />
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => removeExercise(idx)}
                      className="p-1 rounded text-text-muted hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Picker toggle */}
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => setShowPicker(v => !v)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-colors text-sm font-body ${
                  showPicker
                    ? 'border-mint/20 text-mint bg-mint/[0.05]'
                    : 'border-dashed border-white/[0.08] text-text-muted hover:text-mint hover:border-mint/25'
                }`}
              >
                <motion.div animate={{ rotate: showPicker ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} />
                </motion.div>
                {showPicker ? 'Close Picker' : 'Add Exercise'}
              </motion.button>

              <AnimatePresence>
                {showPicker && (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1">
                      <ExercisePicker onAdd={addFromPicker} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-white/[0.05]">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/[0.08] text-text-secondary text-sm font-body font-medium hover:bg-bg-600 transition-colors">
              Cancel
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => onSave({ ...day, name: dayName, sub: daySub, exercises: exercises.filter(e => e.name.trim()) })}
              className="flex-1 py-3 rounded-xl bg-mint/[0.12] border border-mint/25 text-mint text-sm font-body font-semibold hover:bg-mint/[0.18] transition-colors">
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
