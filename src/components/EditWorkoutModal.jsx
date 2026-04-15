import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown } from 'lucide-react';
import ExercisePicker from './ExercisePicker';

// Mobile: bottom-sheet slide-up (smooth, not snappy)
const SHEET_SPRING  = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 };
// Desktop: centered popup with scale+fade
const POPUP_SPRING  = { type: 'spring', stiffness: 380, damping: 36, mass: 0.75 };

const MOBILE_VARIANTS = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0,      opacity: 1 },
  exit:    { y: '100%', opacity: 0 },
};

const DESKTOP_VARIANTS = {
  initial: { scale: 0.96, opacity: 0, y: 14 },
  animate: { scale: 1,    opacity: 1, y: 0  },
  exit:    { scale: 0.95, opacity: 0, y: 8  },
};

// onDelete is optional — if provided, a Delete Day button is shown
export default function EditWorkoutModal({ day, onSave, onClose, onDelete }) {
  const [exercises, setExercises] = useState(() => day.exercises.map(e => ({ ...e })));
  const [dayName, setDayName]     = useState(day.name);
  const [daySub, setDaySub]       = useState(day.sub || '');
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Initialise synchronously so the first render already picks the right variant
  const [isSm] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  );

  const firstInputRef = useRef(null);

  useEffect(() => {
    // Lock background scroll while modal is open
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first input after the opening animation settles
    const t = setTimeout(() => {
      firstInputRef.current?.focus({ preventScroll: true });
    }, 400);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = original;
    };
  }, []);

  const updateExercise = (idx, field, value) => {
    setExercises(prev => prev.map((e, i) =>
      i === idx ? { ...e, [field]: field === 'sets' ? parseInt(value) || 0 : value } : e
    ));
  };

  const removeExercise = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx));

  const addFromPicker = ({ name, sets, reps }) => {
    setExercises(prev => [...prev, { id: 'e_' + Date.now(), name, sets, reps, weight: '' }]);
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

  const variants = isSm ? DESKTOP_VARIANTS : MOBILE_VARIANTS;
  const spring   = isSm ? POPUP_SPRING    : SHEET_SPRING;

  return (
    <AnimatePresence>
      {/* ── Backdrop ──────────────────────────────────────────────
          Mobile : items-end → modal anchors to bottom of screen
          Desktop: items-center → modal is vertically centered
          No overflow-y-auto here — internal body div handles all scroll  */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-background/90 sm:items-center sm:p-4 sm:backdrop-blur-md"
        onClick={onClose}
      >
        {/* ── Modal shell ─────────────────────────────────────────
            Mobile : h-[92dvh] so the Save button never disappears
                     behind a virtual keyboard (dvh = dynamic viewport)
            Desktop: height is auto, capped at 88dvh             */}
        <motion.div
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={spring}
          onClick={e => e.stopPropagation()}
          className="flex h-[92dvh] w-full max-w-xl flex-col overflow-hidden
                     rounded-t-[28px] bg-background shadow-2xl
                     sm:h-auto sm:max-h-[88dvh] sm:rounded-[28px] sm:bg-surface-container-high"
        >
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-3 pb-0.5 shrink-0 sm:hidden">
            <div className="h-[3px] w-10 rounded-full bg-outline-variant/40" />
          </div>

          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-6 py-5">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="text-on-surface-variant sm:hidden">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 className="font-headline font-bold text-lg uppercase tracking-tight text-on-surface">
                {day.id ? `Edit ${day.num}` : 'New Day'}
              </h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="hidden sm:flex p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={17} />
            </motion.button>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────
              flex-1 + overflow-y-auto → takes all remaining height,
              scrolls internally. Footer always stays visible below.  */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
            {/* Name / Focus */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Name',  value: dayName, set: setDayName, ref: firstInputRef },
                { label: 'Focus', value: daySub,  set: setDaySub  },
              ].map(({ label, value, set, ref }) => (
                <div key={label}>
                  <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
                    {label}
                  </label>
                  <input
                    ref={ref}
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:ring-2 focus:ring-primary-container/40"
                  />
                </div>
              ))}
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
                Exercises
              </label>
              <AnimatePresence>
                {exercises.map((ex, idx) => (
                  <motion.div
                    key={ex.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="group flex items-center gap-2 rounded-xl border border-outline-variant/10 bg-surface-container p-2.5"
                  >
                    <div className="flex flex-col gap-0.5">
                      {['▲', '▼'].map((arrow, d) => (
                        <button
                          key={d}
                          onClick={() => moveExercise(idx, d === 0 ? -1 : 1)}
                          disabled={(d === 0 && idx === 0) || (d === 1 && idx === exercises.length - 1)}
                          className="w-4 text-center text-[10px] leading-none text-on-surface-variant hover:text-on-surface disabled:opacity-20"
                        >
                          {arrow}
                        </button>
                      ))}
                    </div>
                    <input
                      value={ex.name}
                      onChange={e => updateExercise(idx, 'name', e.target.value)}
                      placeholder="Exercise name"
                      className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
                    />
                    <input
                      type="number"
                      value={ex.sets}
                      onChange={e => updateExercise(idx, 'sets', e.target.value)}
                      className="w-10 rounded border border-outline-variant/20 bg-surface-container-highest px-1 py-1.5 text-center font-mono text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40"
                    />
                    <span className="text-xs text-on-surface-variant">×</span>
                    <input
                      value={ex.reps}
                      onChange={e => updateExercise(idx, 'reps', e.target.value)}
                      placeholder="reps"
                      className="w-14 rounded border border-outline-variant/20 bg-surface-container-highest px-1 py-1.5 text-center font-mono text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40"
                    />
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => removeExercise(idx)}
                      className="rounded p-1 text-on-surface-variant opacity-0 transition-colors hover:bg-error-container/20 hover:text-error focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPicker(v => !v)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-colors text-sm ${
                  showPicker
                    ? 'border-primary-container/30 bg-primary-container/10 text-primary-fixed'
                    : 'border-dashed border-outline-variant/30 text-on-surface-variant hover:border-primary-container/40 hover:text-primary-fixed'
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
              <div className="border-t border-outline-variant/10 pt-2">
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full rounded-xl border border-error/20 py-2.5 text-sm font-medium text-error/60 transition-colors hover:border-error/40 hover:bg-error-container/10 hover:text-error"
                  >
                    Delete This Day
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-center text-xs text-on-surface-variant">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 rounded-xl border border-outline-variant/20 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onDelete}
                        className="flex-1 rounded-xl border border-error/30 bg-error-container/20 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error-container/30"
                      >
                        Delete Day
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────────
              shrink-0 keeps it pinned at the bottom of the flex-col.
              No `sticky` needed — the parent is overflow:hidden so
              it can't scroll; only the body div above scrolls.
              pb uses max() so it respects the iOS home indicator.  */}
          <div className="shrink-0 flex gap-3 border-t border-outline-variant/10 bg-background px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:bg-surface-container-high sm:pb-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="flex-1 rounded-2xl border border-outline-variant/20 py-4 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onSave({
                ...day,
                name: dayName,
                sub: daySub,
                exercises: exercises.filter(e => e.name.trim()),
              })}
              className="flex-1 rounded-2xl border border-primary-container/30 bg-primary-container/10 py-4 text-sm font-semibold text-primary-fixed transition-colors hover:bg-primary-container/20"
            >
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
