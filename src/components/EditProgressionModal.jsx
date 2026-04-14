import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const SHEET = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

const INPUT = 'px-3 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors';

export default function EditProgressionModal({ lifts, onSave, onClose }) {
  const [localLifts, setLocalLifts] = useState(() => lifts.map(l => ({ ...l })));

  const updateLift = (idx, field, val) =>
    setLocalLifts(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const addLift = () => setLocalLifts(prev => [...prev, {
    key: 'lift_' + Date.now(), name: '', current: 0, target: 100, unit: 'kg', prefix: '',
  }]);

  const removeLift = (idx) => setLocalLifts(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    onSave({ lifts: localLifts.filter(l => l.name.trim()) });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="lifts-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-background sm:bg-background/80 sm:backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          key="lifts-sheet"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={SHEET}
          className="w-full h-full sm:h-auto sm:max-w-xl bg-background sm:bg-surface-container-high sm:rounded-3xl sm:max-h-[90dvh] flex flex-col overflow-hidden sm:shadow-2xl"
          onClick={e => e.stopPropagation()}
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
            className="hidden sm:flex w-8 h-8 rounded-xl bg-surface-container items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={16} />
          </motion.button>
        </div>

        {/* Scrollable body */}
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
          <div className="flex gap-3 px-5 pt-3 pb-6 border-t border-outline-variant/10 shrink-0">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-outline-variant/20 text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              className="flex-1 py-3.5 rounded-2xl bg-primary-container/10 border border-primary-container/30 text-primary-fixed text-sm font-bold hover:bg-primary-container/20 transition-colors"
            >
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
