import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PenLine } from 'lucide-react';
import { EXERCISES, MUSCLE_GROUPS } from '../data/exercises';
import { REP_SCHEMES, SCHEME_CATEGORIES } from '../data/reps';

const SPRING = { type: 'spring', stiffness: 380, damping: 30 };

const SELECT_CLS = `
  w-full px-3 py-2.5 bg-bg-800 border border-white/[0.06] rounded-xl
  text-sm text-text-primary font-body outline-none
  focus:border-mint/30 transition-colors appearance-none cursor-pointer
  [&>option]:bg-bg-800
`.trim();

export default function ExercisePicker({ onAdd }) {
  const [mode, setMode]       = useState('library'); // 'library' | 'manual'
  const [group, setGroup]     = useState('');
  const [exercise, setExercise] = useState('');
  const [scheme, setScheme]   = useState('');
  const [manualName, setManualName] = useState('');
  const [manualSets, setManualSets] = useState('3');
  const [manualReps, setManualReps] = useState('10');

  const exerciseList = group ? EXERCISES[group] || [] : [];
  const schemeByCategory = SCHEME_CATEGORIES.map(cat => ({
    cat,
    schemes: REP_SCHEMES.filter(s => s.category === cat),
  }));

  const canAddLibrary = group && exercise && scheme;
  const canAddManual  = manualName.trim().length > 0;

  const handleAdd = () => {
    if (mode === 'library') {
      if (!canAddLibrary) return;
      const s = REP_SCHEMES.find(r => r.label === scheme);
      onAdd({ name: exercise, sets: s.sets, reps: s.reps });
      setGroup(''); setExercise(''); setScheme('');
    } else {
      if (!canAddManual) return;
      onAdd({ name: manualName.trim(), sets: parseInt(manualSets) || 3, reps: manualReps || '10' });
      setManualName(''); setManualSets('3'); setManualReps('10');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="bg-bg-800 border border-mint/[0.12] rounded-2xl p-4 space-y-3"
    >
      {/* Mode toggle */}
      <div className="flex gap-0.5 bg-bg-700 rounded-lg p-0.5 border border-white/[0.05]">
        {[
          { id: 'library', label: 'From Library', icon: <Plus size={11} /> },
          { id: 'manual',  label: 'Manual Entry', icon: <PenLine size={11} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-body font-semibold transition-colors duration-200 ${
              mode === tab.id ? 'text-mint' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {mode === tab.id && (
              <motion.div
                layoutId="picker-tab"
                transition={SPRING}
                className="absolute inset-0 rounded-md bg-mint/[0.08] border border-mint/20"
              />
            )}
            <span className="relative z-10">{tab.icon}</span>
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'library' ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-2.5"
          >
            {/* Step 1: Muscle group */}
            <div>
              <label className="text-[9px] font-mono text-text-muted/70 tracking-[2px] uppercase block mb-1">
                1 · Muscle Group
              </label>
              <select
                value={group}
                onChange={e => { setGroup(e.target.value); setExercise(''); }}
                className={SELECT_CLS}
              >
                <option value="">Choose muscle group…</option>
                {MUSCLE_GROUPS.map(g => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Exercise */}
            <div>
              <label className="text-[9px] font-mono text-text-muted/70 tracking-[2px] uppercase block mb-1">
                2 · Exercise
              </label>
              <select
                value={exercise}
                onChange={e => setExercise(e.target.value)}
                disabled={!group}
                className={SELECT_CLS + ' disabled:opacity-40 disabled:cursor-not-allowed'}
              >
                <option value="">{group ? 'Choose exercise…' : 'Select a muscle group first'}</option>
                {exerciseList.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>

            {/* Step 3: Rep scheme */}
            <div>
              <label className="text-[9px] font-mono text-text-muted/70 tracking-[2px] uppercase block mb-1">
                3 · Sets × Reps
              </label>
              <select
                value={scheme}
                onChange={e => setScheme(e.target.value)}
                disabled={!exercise}
                className={SELECT_CLS + ' disabled:opacity-40 disabled:cursor-not-allowed'}
              >
                <option value="">{exercise ? 'Choose scheme…' : 'Select exercise first'}</option>
                {schemeByCategory.map(({ cat, schemes }) => (
                  <optgroup key={cat} label={cat}>
                    {schemes.map(s => (
                      <option key={s.label} value={s.label}>{s.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="space-y-2.5"
          >
            <div>
              <label className="text-[9px] font-mono text-text-muted/70 tracking-[2px] uppercase block mb-1">
                Exercise Name
              </label>
              <input
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="e.g. Cable Flye"
                className="w-full px-3 py-2.5 bg-bg-800 border border-white/[0.06] rounded-xl text-sm text-text-primary font-body outline-none focus:border-mint/30 transition-colors placeholder:text-text-muted/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono text-text-muted/70 tracking-[2px] uppercase block mb-1">Sets</label>
                <input
                  type="number"
                  min="1"
                  value={manualSets}
                  onChange={e => setManualSets(e.target.value)}
                  className="w-full px-3 py-2.5 bg-bg-800 border border-white/[0.06] rounded-xl text-sm text-center text-text-primary font-mono outline-none focus:border-mint/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-text-muted/70 tracking-[2px] uppercase block mb-1">Reps</label>
                <input
                  value={manualReps}
                  onChange={e => setManualReps(e.target.value)}
                  placeholder="8-12"
                  className="w-full px-3 py-2.5 bg-bg-800 border border-white/[0.06] rounded-xl text-sm text-center text-text-primary font-mono outline-none focus:border-mint/30 transition-colors placeholder:text-text-muted/30"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleAdd}
        disabled={mode === 'library' ? !canAddLibrary : !canAddManual}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mint/[0.10] border border-mint/25 text-mint text-sm font-body font-semibold hover:bg-mint/[0.16] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
        Add Exercise
      </motion.button>
    </motion.div>
  );
}
