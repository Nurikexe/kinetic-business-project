import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown } from 'lucide-react';
import ExercisePicker from './ExercisePicker';

const MODAL_SPRING = { type: 'spring', stiffness: 360, damping: 34, mass: 0.85 };

const MODAL_VARIANTS = {
  initial: { scale: 0.96, opacity: 0, y: 16 },
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

  const firstInputRef = useRef(null);
  const scrollBodyRef = useRef(null);

  useEffect(() => {
    // Lock background scroll without shifting layout: fix <html> in place
    // and preserve the current scroll position so reopening/closing
    // doesn't visually jump the page behind the modal.
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop:      body.style.top,
      bodyWidth:    body.style.width,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top      = `-${scrollY}px`;
    body.style.width    = '100%';

    // Always start the modal body scrolled to the top
    scrollBodyRef.current?.scrollTo({ top: 0 });

    // Focus first input after the opening animation settles
    const t = setTimeout(() => {
      firstInputRef.current?.focus({ preventScroll: true });
    }, 400);

    return () => {
      clearTimeout(t);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top      = prev.bodyTop;
      body.style.width    = prev.bodyWidth;
      window.scrollTo(0, scrollY);
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

  return createPortal(
    <AnimatePresence>
      {/* ── Backdrop ───────────────────────────────────────────────
          Rendered into document.body via a portal so it escapes any
          ancestor with `transform` / `filter` (the page-transition
          motion.div in App.jsx), which would otherwise turn this
          `fixed` element into a page-relative one.                 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
        style={{ height: '100dvh' }}
        onClick={onClose}
      >
        {/* ── Modal shell ──────────────────────────────────────────
            Always centered, max-h caps height so the header/footer
            are always reachable, body div scrolls internally.      */}
        <motion.div
          variants={MODAL_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={MODAL_SPRING}
          onClick={e => e.stopPropagation()}
          className="flex w-full max-w-xl flex-col overflow-hidden
                     rounded-[28px] bg-surface-container-high shadow-2xl
                     max-h-[min(90dvh,90svh)]"
        >

          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-6 py-5">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight text-on-surface">
              {day.id ? `Edit ${day.num}` : 'New Day'}
            </h3>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={17} />
            </motion.button>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────
              flex-1 + overflow-y-scroll → takes all remaining height,
              scrolls internally. Footer always stays visible below.  */}
          <div
            ref={scrollBodyRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6"
          >
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
          <div className="shrink-0 flex gap-3 border-t border-outline-variant/10 bg-surface-container-high px-6 pt-4 pb-6">
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
    </AnimatePresence>,
    document.body
  );
}
