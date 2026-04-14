import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const SHEET = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

const INPUT = 'flex-1 px-3 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors placeholder:text-on-surface-variant/30';

export default function EditRulesModal({ rules, onSave, onClose }) {
  const [localRules, setLocalRules] = useState([...rules]);
  const containerRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    // 1. One smooth centered scroll after mounting
    const scrollRaf = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // 2. Focus first input with delay
    const focusTimer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 450);

    // 3. Prevent background scroll while the modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(scrollRaf);
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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
        className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-background sm:bg-background/80 sm:backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          key="rules-sheet"
          ref={containerRef}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={SHEET}
          className="w-full h-full sm:h-auto sm:max-w-xl bg-background sm:bg-surface-container-high sm:rounded-3xl max-h-[100dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden sm:shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/10 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="sm:hidden text-on-surface-variant">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Methodology</p>
                <h3 className="font-headline font-bold text-lg uppercase tracking-tight text-on-surface leading-tight">
                  Edit Rules
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
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
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
                      ref={idx === 0 ? firstInputRef : null}
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
          <div className="flex gap-3 px-6 pt-3 pb-10 border-t border-outline-variant/10 shrink-0">
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
    </AnimatePresence>
  );
}
