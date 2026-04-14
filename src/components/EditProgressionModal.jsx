import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

const INPUT = 'px-3 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors';

export default function EditProgressionModal({ lifts, goals, rules, onSave, onClose }) {
  const [localLifts, setLocalLifts] = useState(() => lifts.map(l => ({ ...l })));
  const [localGoals, setLocalGoals] = useState(goals);
  const [localRules, setLocalRules] = useState([...rules]);

  const updateLift = (idx, field, val) =>
    setLocalLifts(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const addLift = () => setLocalLifts(prev => [...prev, {
    key: 'lift_' + Date.now(), name: 'New Lift', current: 0, target: 100, unit: 'kg', prefix: '',
  }]);

  const removeLift = (idx) => setLocalLifts(prev => prev.filter((_, i) => i !== idx));

  const updateRule = (idx, val) => setLocalRules(prev => prev.map((r, i) => i === idx ? val : r));
  const addRule    = () => setLocalRules(prev => [...prev, '']);
  const removeRule = (idx) => setLocalRules(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    onSave({
      lifts: localLifts.filter(l => l.name.trim()),
      gym_goals: localGoals,
      gym_rules: localRules.filter(r => r.trim()),
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(14,14,14,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={SPRING}
          onClick={e => e.stopPropagation()}
          className="bg-surface-container-high border border-outline-variant/10 rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight text-on-surface">Edit Progression & Goals</h3>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors">
              <X size={17} />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Goals string */}
            <div>
              <label className="text-[10px] font-mono text-on-surface-variant tracking-widest uppercase block mb-2">Goal Line</label>
              <input
                value={localGoals}
                onChange={e => setLocalGoals(e.target.value)}
                placeholder="100kg Bench · 120kg Squat · ..."
                className={`${INPUT} w-full`}
              />
              <p className="text-[10px] text-on-surface-variant/50 mt-1">Displayed at the top of the gym page</p>
            </div>

            {/* Lifts */}
            <div>
              <label className="text-[10px] font-mono text-on-surface-variant tracking-widest uppercase block mb-2">Progression Lifts</label>
              <div className="space-y-2">
                {localLifts.map((lift, idx) => (
                  <motion.div
                    key={lift.key}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-surface-container rounded-xl p-3 border border-outline-variant/10 group space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={lift.name}
                        onChange={e => updateLift(idx, 'name', e.target.value)}
                        placeholder="Lift name"
                        className={`${INPUT} flex-1`}
                      />
                      <motion.button whileTap={{ scale: 0.88 }} onClick={() => removeLift(idx)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Current', field: 'current', type: 'number' },
                        { label: 'Target',  field: 'target',  type: 'number' },
                        { label: 'Unit',    field: 'unit',    type: 'text'   },
                        { label: 'Prefix',  field: 'prefix',  type: 'text', placeholder: '+' },
                      ].map(({ label, field, type, placeholder }) => (
                        <div key={field}>
                          <p className="text-[9px] font-mono text-on-surface-variant/60 uppercase mb-1">{label}</p>
                          <input
                            type={type}
                            value={lift[field] ?? ''}
                            onChange={e => updateLift(idx, field, type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
                            placeholder={placeholder}
                            className="w-full px-2 py-2 bg-surface-container-highest border border-outline-variant/20 rounded-lg text-xs text-center text-on-surface font-mono outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={addLift}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant hover:text-primary-fixed hover:border-primary-container/40 transition-colors text-sm">
                <Plus size={13} /> Add Lift
              </motion.button>
            </div>

            {/* Rules */}
            <div>
              <label className="text-[10px] font-mono text-on-surface-variant tracking-widest uppercase block mb-2">Rules & Tips</label>
              <div className="space-y-2">
                {localRules.map((rule, idx) => (
                  <motion.div key={idx} layout
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 group">
                    <span className="text-primary-fixed/60 font-bold text-xs shrink-0">▸</span>
                    <input
                      value={rule}
                      onChange={e => updateRule(idx, e.target.value)}
                      placeholder="Add a rule or tip…"
                      className={`${INPUT} flex-1`}
                    />
                    <motion.button whileTap={{ scale: 0.88 }} onClick={() => removeRule(idx)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={addRule}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant hover:text-primary-fixed hover:border-primary-container/40 transition-colors text-sm">
                <Plus size={13} /> Add Rule
              </motion.button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-outline-variant/10">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">
              Cancel
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-primary-container/10 border border-primary-container/30 text-primary-fixed text-sm font-semibold hover:bg-primary-container/20 transition-colors">
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
