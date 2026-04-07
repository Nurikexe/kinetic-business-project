import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

const INPUT = 'px-2.5 py-2 bg-bg-800 border border-white/[0.06] rounded-lg text-sm text-text-primary font-body outline-none focus:border-mint/30 transition-colors';

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
        style={{ background: 'rgba(6,7,9,0.8)', backdropFilter: 'blur(12px)' }}
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
            <h3 className="font-display text-lg tracking-[2px] uppercase">Edit Progression & Goals</h3>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-500 text-text-muted hover:text-text-primary transition-colors">
              <X size={17} />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Goals string */}
            <div>
              <label className="text-[10px] font-mono text-text-muted tracking-[2px] uppercase block mb-2">Goal Line</label>
              <input
                value={localGoals}
                onChange={e => setLocalGoals(e.target.value)}
                placeholder="100kg Bench · 120kg Squat · ..."
                className={`${INPUT} w-full`}
              />
              <p className="text-[10px] text-text-muted/50 mt-1 font-body">Displayed under the page title</p>
            </div>

            {/* Lifts */}
            <div>
              <label className="text-[10px] font-mono text-text-muted tracking-[2px] uppercase block mb-2">Progression Lifts</label>
              <div className="space-y-2">
                {localLifts.map((lift, idx) => (
                  <motion.div
                    key={lift.key}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-bg-800 rounded-xl p-3 border border-white/[0.04] group space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={lift.name}
                        onChange={e => updateLift(idx, 'name', e.target.value)}
                        placeholder="Lift name"
                        className={`${INPUT} flex-1`}
                      />
                      <motion.button whileTap={{ scale: 0.88 }} onClick={() => removeLift(idx)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <p className="text-[9px] font-mono text-text-muted/60 uppercase mb-1">Current</p>
                        <input type="number" value={lift.current}
                          onChange={e => updateLift(idx, 'current', parseFloat(e.target.value) || 0)}
                          className={`${INPUT} w-full text-center`} />
                      </div>
                      <div>
                        <p className="text-[9px] font-mono text-text-muted/60 uppercase mb-1">Target</p>
                        <input type="number" value={lift.target}
                          onChange={e => updateLift(idx, 'target', parseFloat(e.target.value) || 0)}
                          className={`${INPUT} w-full text-center`} />
                      </div>
                      <div>
                        <p className="text-[9px] font-mono text-text-muted/60 uppercase mb-1">Unit</p>
                        <input value={lift.unit}
                          onChange={e => updateLift(idx, 'unit', e.target.value)}
                          className={`${INPUT} w-full text-center`} />
                      </div>
                      <div>
                        <p className="text-[9px] font-mono text-text-muted/60 uppercase mb-1">Prefix</p>
                        <input value={lift.prefix || ''}
                          onChange={e => updateLift(idx, 'prefix', e.target.value)}
                          placeholder="+"
                          className={`${INPUT} w-full text-center`} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={addLift}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.08] text-text-muted hover:text-mint hover:border-mint/25 transition-colors text-sm font-body">
                <Plus size={13} /> Add Lift
              </motion.button>
            </div>

            {/* Rules */}
            <div>
              <label className="text-[10px] font-mono text-text-muted tracking-[2px] uppercase block mb-2">Rules & Tips</label>
              <div className="space-y-2">
                {localRules.map((rule, idx) => (
                  <motion.div key={idx} layout
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 group">
                    <span className="text-mint/60 font-bold text-xs flex-shrink-0">▸</span>
                    <input
                      value={rule}
                      onChange={e => updateRule(idx, e.target.value)}
                      placeholder="Add a rule or tip…"
                      className={`${INPUT} flex-1`}
                    />
                    <motion.button whileTap={{ scale: 0.88 }} onClick={() => removeRule(idx)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={addRule}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.08] text-text-muted hover:text-mint hover:border-mint/25 transition-colors text-sm font-body">
                <Plus size={13} /> Add Rule
              </motion.button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-white/[0.05]">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/[0.08] text-text-secondary text-sm font-body font-medium hover:bg-bg-600 transition-colors">
              Cancel
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-mint/[0.12] border border-mint/25 text-mint text-sm font-body font-semibold hover:bg-mint/[0.18] transition-colors">
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
