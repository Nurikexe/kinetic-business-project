import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown } from 'lucide-react';
import ExercisePicker from './ExercisePicker';

const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

// onDelete is optional — if provided, a Delete Day button is shown
export default function EditWorkoutModal({ day, onSave, onClose, onDelete }) {
  const [exercises, setExercises] = useState(() => day.exercises.map(e => ({ ...e })));
  const [dayName, setDayName]     = useState(day.name);
  const [daySub, setDaySub]       = useState(day.sub || '');
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const containerRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    // 1. Smoothly scroll the page so the modal is vertically centered in the visible screen area
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 2. After scrolling, set keyboard focus to the first input field
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 500); // Wait for scroll animation

    // 3. Prevent background scroll while the modal is open
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalStyle;
    };
  }, []);

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
        className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-background sm:bg-background/80 sm:backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          ref={containerRef}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={SPRING}
          onClick={e => e.stopPropagation()}
          className="w-full h-full sm:h-auto sm:max-w-xl bg-background sm:bg-surface-container-high sm:rounded-3xl max-h-[90vh] sm:max-h-[90dvh] flex flex-col overflow-hidden sm:shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="sm:hidden text-on-surface-variant">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 className="font-headline font-bold text-lg uppercase tracking-tight text-on-surface">
                {day.id ? `Edit ${day.num}` : 'New Day'}
              </h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="hidden sm:flex p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={17} />
            </motion.button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Name / Focus */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Name',  value: dayName, set: setDayName, ref: firstInputRef },
                { label: 'Focus', value: daySub,  set: setDaySub  },
              ].map(({ label, value, set, ref }) => (
                <div key={label}>
                  <label className="text-[10px] font-mono text-on-surface-variant tracking-widest uppercase mb-1.5 block">{label}</label>
                  <input
                    ref={ref}
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-on-surface-variant tracking-widest uppercase block">Exercises</label>
              <AnimatePresence>
                {exercises.map((ex, idx) => (
                  <motion.div
                    key={ex.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center gap-2 bg-surface-container rounded-xl p-2.5 border border-outline-variant/10 group"
                  >
                    <div className="flex flex-col gap-0.5">
                      {['▲', '▼'].map((arrow, d) => (
                        <button key={d} onClick={() => moveExercise(idx, d === 0 ? -1 : 1)}
                          disabled={(d === 0 && idx === 0) || (d === 1 && idx === exercises.length - 1)}
                          className="text-on-surface-variant hover:text-on-surface disabled:opacity-20 text-[10px] leading-none w-4 text-center">
                          {arrow}
                        </button>
                      ))}
                    </div>
                    <input
                      value={ex.name}
                      onChange={e => updateExercise(idx, 'name', e.target.value)}
                      placeholder="Exercise name"
                      className="flex-1 min-w-0 px-2 py-1.5 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
                    />
                    <input
                      type="number"
                      value={ex.sets}
                      onChange={e => updateExercise(idx, 'sets', e.target.value)}
                      className="w-10 px-1 py-1.5 bg-surface-container-highest border border-outline-variant/20 rounded text-xs text-center text-on-surface font-mono outline-none focus:ring-2 focus:ring-primary-container/40"
                    />
                    <span className="text-on-surface-variant text-xs">×</span>
                    <input
                      value={ex.reps}
                      onChange={e => updateExercise(idx, 'reps', e.target.value)}
                      className="w-14 px-1 py-1.5 bg-surface-container-highest border border-outline-variant/20 rounded text-xs text-center text-on-surface font-mono outline-none focus:ring-2 focus:ring-primary-container/40"
                      placeholder="reps"
                    />
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => removeExercise(idx)}
                      className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => setShowPicker(v => !v)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-colors text-sm ${
                  showPicker
                    ? 'border-primary-container/30 text-primary-fixed bg-primary-container/10'
                    : 'border-dashed border-outline-variant/30 text-on-surface-variant hover:text-primary-fixed hover:border-primary-container/40'
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

            {/* Delete Day */}
            {onDelete && (
              <div className="pt-2 border-t border-outline-variant/10">
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-2.5 rounded-xl border border-error/20 text-error/60 text-sm font-medium hover:bg-error-container/10 hover:text-error hover:border-error/40 transition-colors"
                  >
                    Delete This Day
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-on-surface-variant text-center">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant text-sm hover:bg-surface-container transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onDelete}
                        className="flex-1 py-2.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-sm font-semibold hover:bg-error-container/30 transition-colors"
                      >
                        Delete Day
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pt-4 pb-10 border-t border-outline-variant/10 shrink-0">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-outline-variant/20 text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">
              Cancel
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => onSave({ ...day, name: dayName, sub: daySub, exercises: exercises.filter(e => e.name.trim()) })}
              className="flex-1 py-4 rounded-2xl bg-primary-container/10 border border-primary-container/30 text-primary-fixed text-sm font-semibold hover:bg-primary-container/20 transition-colors">
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
