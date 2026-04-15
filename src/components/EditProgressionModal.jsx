import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const SHEET = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

const INPUT = 'px-3 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors';

export default function EditProgressionModal({ lifts, onSave, onClose }) {
  const [localLifts, setLocalLifts] = useState(() => lifts.map(l => ({ ...l })));
  const firstInputRef = useRef(null);
  const scrollBodyRef = useRef(null);

  useEffect(() => {
    // Lock background scroll without shifting layout
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

    scrollBodyRef.current?.scrollTo({ top: 0 });

    const focusTimer = setTimeout(() => {
      firstInputRef.current?.focus({ preventScroll: true });
    }, 450);

    return () => {
      clearTimeout(focusTimer);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top      = prev.bodyTop;
      body.style.width    = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const updateLift = (idx, field, val) =>
    setLocalLifts(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const addLift = () => setLocalLifts(prev => [...prev, {
    key: 'lift_' + Date.now(), name: '', current: 0, target: 100, unit: 'kg', prefix: '',
  }]);

  const removeLift = (idx) => setLocalLifts(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    onSave({ lifts: localLifts.filter(l => l.name.trim()) });
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="lifts-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/92 p-2 sm:bg-background/80 sm:p-4 sm:backdrop-blur-md"
        style={{ height: '100dvh' }}
        onClick={onClose}
      >
        <motion.div
          key="lifts-sheet"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={SHEET}
          className="flex min-h-0 w-full max-w-xl touch-pan-y flex-col overflow-hidden rounded-[28px] bg-background shadow-2xl sm:rounded-3xl sm:bg-surface-container-high"
          style={{ maxHeight: 'min(90dvh, 90svh)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="sm:hidden text-on-surface-variant">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Performance</p>
                <h3 className="font-headline font-bold text-lg uppercase tracking-tight text-on-surface leading-tight">
                  Edit Targets
                </h3>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="hidden sm:flex w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Scrollable body */}
          <div
            ref={scrollBodyRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-3"
          >
            <AnimatePresence>
              {localLifts.map((lift, idx) => (
                <motion.div
                  key={lift.key}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10 group"
                >
                  {/* Name row */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      ref={idx === 0 ? firstInputRef : null}
                      value={lift.name}
                      onChange={e => updateLift(idx, 'name', e.target.value)}
                      placeholder="Lift name (e.g. Bench Press)"
                      className={`${INPUT} flex-1`}
                    />
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => removeLift(idx)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/40 hover:text-error hover:bg-error-container/15 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>

                  {/* Fields grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Current', field: 'current', type: 'number' },
                      { label: 'Target',  field: 'target',  type: 'number' },
                      { label: 'Unit',    field: 'unit',    type: 'text'   },
                      { label: 'Prefix',  field: 'prefix',  type: 'text', placeholder: '+' },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-1.5 text-center">
                          {label}
                        </p>
                        <input
                          type={type}
                          value={lift[field] ?? ''}
                          onChange={e =>
                            updateLift(idx, field, type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)
                          }
                          placeholder={placeholder}
                          className="w-full px-2 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl text-xs text-center text-on-surface font-mono outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={addLift}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-outline-variant/25 text-on-surface-variant/50 hover:text-primary-fixed hover:border-primary-container/35 transition-colors text-sm font-bold"
            >
              <Plus size={14} />
              Add Lift
            </motion.button>

            {/* Safe area spacer */}
            <div className="h-2" />
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex shrink-0 gap-3 border-t border-outline-variant/10 bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:bg-surface-container-high sm:pb-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-outline-variant/20 text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              className="flex-1 py-4 rounded-2xl bg-primary-container/10 border border-primary-container/30 text-primary-fixed text-sm font-bold hover:bg-primary-container/20 transition-colors"
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
