import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';

const SHEET = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

const INPUT = 'flex-1 px-3 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors placeholder:text-on-surface-variant/30';

export default function EditRulesModal({ rules, onSave, onClose }) {
  const [localRules, setLocalRules] = useState([...rules]);

  const updateRule = (idx, val) =>
    setLocalRules(prev => prev.map((r, i) => i === idx ? val : r));

  const addRule = () =>
    setLocalRules(prev => [...prev, '']);

  const removeRule = (idx) =>
    setLocalRules(prev => prev.filter((_, i) => i !== idx));

  const moveRule = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= localRules.length) return;
    setLocalRules(prev => {
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const handleSave = () => {
    onSave({ gym_rules: localRules.filter(r => r.trim()) });
  };

  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];

  return (
    <AnimatePresence>
      <motion.div
        key="rules-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(14,14,14,0.75)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
      >
        <motion.div
          key="rules-sheet"
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.5 }}
          transition={SHEET}
          className="w-full max-w-xl bg-surface-container-high rounded-t-3xl sm:rounded-3xl max-h-[88dvh] flex flex-col overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.4)] sm:shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle - only visible on mobile */}
          <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-outline-variant/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/10 shrink-0">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Methodology</p>
              <h3 className="font-headline font-bold text-lg uppercase tracking-tight text-on-surface leading-tight">
                Edit Rules
              </h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            <AnimatePresence>
              {localRules.map((rule, idx) => {
                const roman = ROMAN[idx] ?? String(idx + 1);
                return (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="flex items-center gap-2 group"
                  >
                    {/* Roman numeral */}
                    <div className="w-8 flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveRule(idx, -1)}
                        disabled={idx === 0}
                        className="text-on-surface-variant/30 hover:text-on-surface-variant disabled:opacity-10 transition-colors leading-none"
                        style={{ fontSize: '10px' }}
                      >▲</button>
                      <span
                        className="font-headline font-black text-sm select-none"
                        style={{ color: 'rgba(212,251,0,0.35)' }}
                      >
                        {roman}
                      </span>
                      <button
                        onClick={() => moveRule(idx, 1)}
                        disabled={idx === localRules.length - 1}
                        className="text-on-surface-variant/30 hover:text-on-surface-variant disabled:opacity-10 transition-colors leading-none"
                        style={{ fontSize: '10px' }}
                      >▼</button>
                    </div>

                    {/* Rule input */}
                    <input
                      value={rule}
                      onChange={e => updateRule(idx, e.target.value)}
                      placeholder="Describe your rule or tip…"
                      className={INPUT}
                    />

                    {/* Delete */}
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => removeRule(idx)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/30 hover:text-error hover:bg-error-container/15 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={addRule}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-outline-variant/25 text-on-surface-variant/50 hover:text-primary-fixed hover:border-primary-container/35 transition-colors text-sm font-bold"
            >
              <Plus size={14} />
              Add Rule
            </motion.button>

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
        </div>
      </motion.div>
    </AnimatePresence>
    </AnimatePresence>
  );
}
