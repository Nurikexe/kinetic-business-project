import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { EXERCISES, MUSCLE_GROUPS } from '../data/exercises';
import { REP_SCHEMES, SCHEME_CATEGORIES } from '../data/reps';

// ── Run type presets (mirrors RunningPage) ────────────────────
const RUN_TYPE_PRESETS = [
  { key: 'zone_2_easy',          name: 'Zone 2 Easy',         desc: 'Low intensity aerobic base',       icon: 'directions_run', defaultSession: '30 min easy jog' },
  { key: 'long_run',             name: 'Long Run',             desc: 'Distance & endurance',             icon: 'route',          defaultSession: '8 km long run' },
  { key: 'tempo',                name: 'Tempo',                desc: 'Comfortably hard pace',            icon: 'speed',          defaultSession: '20 min tempo' },
  { key: 'threshold',            name: 'Threshold',            desc: 'Lactate threshold training',       icon: 'whatshot',       defaultSession: '3 × 5 min @ threshold' },
  { key: 'intervals',            name: 'Intervals',            desc: 'High intensity repeats',           icon: 'timer',          defaultSession: '6 × 400m' },
  { key: 'fartlek',              name: 'Fartlek',              desc: 'Unstructured speed play',          icon: 'shuffle',        defaultSession: '25 min fartlek' },
  { key: 'hill_repeats',         name: 'Hill Repeats',         desc: 'Strength & power',                 icon: 'landscape',      defaultSession: '8 × hill repeats' },
  { key: 'recovery_run',         name: 'Recovery Run',         desc: 'Easy active recovery',             icon: 'self_improvement',defaultSession: '20 min recovery jog' },
  { key: 'progression_run',      name: 'Progression',          desc: 'Gradually increasing pace',        icon: 'trending_up',    defaultSession: '6 km progression run' },
  { key: 'strides',              name: 'Strides',              desc: 'Short controlled accelerations',   icon: 'sprint',         defaultSession: '6 × 80m strides' },
  { key: 'sprint_accelerations', name: 'Sprint Accelerations', desc: 'Max speed development',            icon: 'bolt',           defaultSession: '5 × 60m sprints' },
];

const RT_COLORS = ['#ffb020','#00ccff','#ff3b5c','#00e3fd','#7c3aed','#10b981'];

const THUMBNAILS = [
  { id: 'gym',    url: '/thumbnails/gym.png',    label: 'Strength' },
  { id: 'run',    url: '/thumbnails/run.png',    label: 'Running' },
  { id: 'hybrid', url: '/thumbnails/hybrid.png', label: 'Functional' },
  { id: 'yoga',   url: '/thumbnails/yoga.png',   label: 'Wellness' },
  { id: 'boxing', url: '/thumbnails/boxing.png', label: 'Combat' },
  { id: 'cycle',  url: '/thumbnails/cycle.png',  label: 'Endurance' },
];

// ── Gym day/exercise helpers ──────────────────────────────────
let exerciseCounter = 0;
function newExercise(name = '', sets = 3, reps = '10') {
  return { id: `ex-${++exerciseCounter}`, name, sets, reps, rest: '90s' };
}
let dayCounter = 0;
function newDay(label = '') {
  return { id: `day-${++dayCounter}`, name: label || `Day ${dayCounter}`, focus: '', exercises: [] };
}

// ── Small inline ExercisePicker for the Create page ──────────
const SELECT_CLS = `w-full px-3 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-xl
  text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40
  transition-colors appearance-none cursor-pointer [&>option]:bg-surface-container-highest`.trim();

function InlineExercisePicker({ onAdd }) {
  const [mode, setMode]         = useState('library');
  const [group, setGroup]       = useState('');
  const [exercise, setExercise] = useState('');
  const [scheme, setScheme]     = useState('');
  const [manualName, setManualName] = useState('');
  const [manualSets, setManualSets] = useState('3');
  const [manualReps, setManualReps] = useState('10');

  const exerciseList     = group ? EXERCISES[group] || [] : [];
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className="bg-surface-container-highest border border-primary-container/20 rounded-2xl p-4 space-y-3 mt-3"
    >
      {/* Mode toggle */}
      <div className="flex gap-0.5 bg-surface-container-high rounded-lg p-0.5 border border-outline-variant/10">
        {[
          { id: 'library', label: 'From Library' },
          { id: 'manual',  label: 'Manual Entry' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`relative flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors duration-200 ${
              mode === tab.id ? 'text-primary-fixed' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {mode === tab.id && (
              <motion.div
                layoutId="create-picker-tab"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-md bg-primary-container/10 border border-primary-container/30"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'library' ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.14 }}
            className="space-y-2.5"
          >
            <div>
              <label className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase block mb-1">1 · Muscle Group</label>
              <select value={group} onChange={e => { setGroup(e.target.value); setExercise(''); }} className={SELECT_CLS}>
                <option value="">Choose muscle group…</option>
                {MUSCLE_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase block mb-1">2 · Exercise</label>
              <select value={exercise} onChange={e => setExercise(e.target.value)} disabled={!group} className={SELECT_CLS + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
                <option value="">{group ? 'Choose exercise…' : 'Select a muscle group first'}</option>
                {exerciseList.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase block mb-1">3 · Sets × Reps</label>
              <select value={scheme} onChange={e => setScheme(e.target.value)} disabled={!exercise} className={SELECT_CLS + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
                <option value="">{exercise ? 'Choose scheme…' : 'Select exercise first'}</option>
                {schemeByCategory.map(({ cat, schemes }) => (
                  <optgroup key={cat} label={cat}>
                    {schemes.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.14 }}
            className="space-y-2.5"
          >
            <div>
              <label className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase block mb-1">Exercise Name</label>
              <input
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="e.g. Cable Flye"
                className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/20 rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors placeholder:text-on-surface-variant/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase block mb-1">Sets</label>
                <input type="number" min="1" value={manualSets} onChange={e => setManualSets(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/20 rounded-xl text-sm text-center text-on-surface font-mono outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors" />
              </div>
              <div>
                <label className="text-[9px] font-mono text-on-surface-variant tracking-widest uppercase block mb-1">Reps</label>
                <input value={manualReps} onChange={e => setManualReps(e.target.value)} placeholder="8-12"
                  className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/20 rounded-xl text-sm text-center text-on-surface font-mono outline-none focus:ring-2 focus:ring-primary-container/40 transition-colors placeholder:text-on-surface-variant/30" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleAdd}
        disabled={mode === 'library' ? !canAddLibrary : !canAddManual}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-container/10 border border-primary-container/30 text-primary-fixed text-sm font-semibold hover:bg-primary-container/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        Add Exercise
      </button>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function CreateWorkoutPage({ setPage }) {
  const { user } = useAuth();

  // ── Shared meta ──────────────────────────────────────────────
  const [title, setTitle]           = useState('');
  const [desc, setDesc]             = useState('');
  const [planType, setPlanType]     = useState('gym');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [thumbnail, setThumbnail]   = useState(THUMBNAILS[0].url);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  // ── Gym state ────────────────────────────────────────────────
  const [days, setDays]             = useState([newDay('Day 1')]);
  const [showPickerFor, setShowPickerFor] = useState(null); // dayId or null

  // ── Running state ────────────────────────────────────────────
  const [runTypes, setRunTypes]     = useState([]);
  const [runWeeks, setRunWeeks]     = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [editingSession, setEditingSession] = useState(null); // { weekIdx, rtId }
  const [editSessionValue, setEditSessionValue] = useState('');
  const [showAddRunType, setShowAddRunType] = useState(false);
  const [addRTMode, setAddRTMode]   = useState('preset');
  const [newRTName, setNewRTName]   = useState('');
  const [newRTDesc, setNewRTDesc]   = useState('');

  // ── Gym day handlers ─────────────────────────────────────────
  const addDay    = () => setDays(d => [...d, newDay(`Day ${d.length + 1}`)]);
  const removeDay = id => setDays(d => d.filter(x => x.id !== id));
  const updateDay = (id, field, value) =>
    setDays(d => d.map(x => x.id === id ? { ...x, [field]: value } : x));

  const addExerciseToDay = (dayId, ex) => {
    setDays(d => d.map(x => x.id === dayId
      ? { ...x, exercises: [...x.exercises, newExercise(ex.name, ex.sets, ex.reps)] }
      : x));
    setShowPickerFor(null);
  };
  const removeExercise = (dayId, exId) =>
    setDays(d => d.map(x => x.id === dayId
      ? { ...x, exercises: x.exercises.filter(e => e.id !== exId) }
      : x));
  const updateExercise = (dayId, exId, field, value) =>
    setDays(d => d.map(x => x.id === dayId
      ? { ...x, exercises: x.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) }
      : x));

  // ── Running handlers ─────────────────────────────────────────
  const addWeek = () => {
    const weekNum = runWeeks.length + 1;
    const sessions = {};
    runTypes.forEach(rt => { sessions[rt.id] = rt.defaultSession || '30 min run'; });
    setRunWeeks(w => [...w, { week: weekNum, sessions }]);
    setSelectedWeek(runWeeks.length); // select the new week
  };

  const removeWeek = idx => {
    setRunWeeks(w => w.filter((_, i) => i !== idx).map((w2, i) => ({ ...w2, week: i + 1 })));
    setSelectedWeek(prev => Math.min(prev, Math.max(0, runWeeks.length - 2)));
  };

  const addRunTypeFromPreset = preset => {
    if (runTypes.some(rt => rt.presetKey === preset.key)) return;
    const color  = RT_COLORS[runTypes.length % RT_COLORS.length];
    const newRT  = { id: `rt-${Date.now()}`, name: preset.name, desc: preset.desc, color, icon: preset.icon, presetKey: preset.key, defaultSession: preset.defaultSession };
    setRunTypes(r => [...r, newRT]);
    // add this run type's default session to every existing week
    setRunWeeks(w => w.map(wk => ({ ...wk, sessions: { ...(wk.sessions || {}), [newRT.id]: preset.defaultSession } })));
    setShowAddRunType(false);
  };

  const addCustomRunType = () => {
    if (!newRTName.trim()) return;
    const color = RT_COLORS[runTypes.length % RT_COLORS.length];
    const newRT = { id: `rt-${Date.now()}`, name: newRTName.trim(), desc: newRTDesc.trim(), color, icon: 'directions_run', presetKey: null, defaultSession: '30 min run' };
    setRunTypes(r => [...r, newRT]);
    setRunWeeks(w => w.map(wk => ({ ...wk, sessions: { ...(wk.sessions || {}), [newRT.id]: '30 min run' } })));
    setNewRTName(''); setNewRTDesc(''); setShowAddRunType(false);
  };

  const removeRunType = id => {
    setRunTypes(r => r.filter(rt => rt.id !== id));
    setRunWeeks(w => w.map(wk => { const s = { ...(wk.sessions || {}) }; delete s[id]; return { ...wk, sessions: s }; }));
  };

  const startEditSession = (weekIdx, rtId, val) => {
    setEditingSession({ weekIdx, rtId });
    setEditSessionValue(val);
  };
  const saveSession = () => {
    if (!editingSession) return;
    const { weekIdx, rtId } = editingSession;
    setRunWeeks(w => w.map((wk, i) =>
      i === weekIdx ? { ...wk, sessions: { ...(wk.sessions || {}), [rtId]: editSessionValue } } : wk
    ));
    setEditingSession(null);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) { setError('Plan title is required.'); return; }
    if (!user)         { setError('You must be logged in.'); return; }

    // Build plan_data based on type
    let plan_data = {};
    if (planType === 'gym') {
      plan_data = { days, thumbnail_url: thumbnail };
    } else if (planType === 'running') {
      plan_data = { runTypes, weeks: runWeeks, thumbnail_url: thumbnail };
    } else {
      plan_data = { days, runTypes, weeks: runWeeks, thumbnail_url: thumbnail };
    }

    setSaving(true); setError('');
    const { error: dbErr } = await supabase.from('community_plans').insert({
      user_id:     user.id,
      title:       title.trim(),
      description: desc.trim(),
      plan_type:   planType,
      difficulty,
      plan_data,
      likes: 0,
    });
    setSaving(false);
    if (dbErr) setError(dbErr.message);
    else       setSuccess(true);
  };

  // ── Success screen ────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-3xl text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h2 className="text-3xl font-black font-headline uppercase tracking-tighter mb-3">Plan Published!</h2>
        <p className="text-on-surface-variant mb-8">Your workout plan has been shared with the KINETIC community.</p>
        <button
          onClick={() => setPage('home')}
          className="px-8 py-4 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // ── Helpers for rendering ─────────────────────────────────────
  const currentWeekData = runWeeks[selectedWeek] || null;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl flex items-center gap-4 px-6 py-4 border-b border-outline-variant/10">
        <button onClick={() => setPage('home')} className="text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="text-xl font-black font-headline uppercase tracking-tighter text-primary-fixed">Create Plan</span>
      </header>

      <div className="px-6 pt-8 pb-10 max-w-2xl mx-auto">
        {/* Hero heading */}
        <section className="mb-10">
          <h1 className="font-headline font-black text-5xl tracking-tighter uppercase leading-none mb-3">
            Forge <br /><span className="text-primary-container">Greatness.</span>
          </h1>
          <p className="text-on-surface-variant max-w-sm">Design your custom performance blueprint and share it with the community.</p>
        </section>

        {/* ── Basic Info ──────────────────────────────────────── */}
        <div className="bg-surface-container rounded-xl p-6 space-y-5 mb-6">
          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-4 block">Select Workout Cover</label>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
              {THUMBNAILS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setThumbnail(t.url)}
                  className={`shrink-0 relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                    thumbnail === t.url ? 'border-primary-fixed scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={t.url} alt={t.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[8px] font-black uppercase tracking-widest text-white text-center">
                    {t.label}
                  </div>
                  {thumbnail === t.url && (
                    <div className="absolute top-1 right-1 bg-primary-fixed text-on-primary-fixed rounded-full p-0.5">
                      <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-2 block">Plan Name</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. HYBRID STRENGTH & FLOW"
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-5 py-3 text-lg font-headline font-bold tracking-tight placeholder:text-outline focus:outline-none focus:border-primary-container/50 transition-colors"
            />
          </div>
          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-2 block">Description</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Explain the philosophy behind this plan…"
              rows={3}
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-5 py-3 text-sm placeholder:text-outline focus:outline-none focus:border-primary-container/50 transition-colors resize-none"
            />
          </div>
        </div>

        {/* ── Plan Type + Difficulty ───────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-surface-container rounded-xl p-5">
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-3 block">Type</label>
            <div className="space-y-2">
              {[
                { key: 'gym',     label: 'Gym',     icon: 'fitness_center' },
                { key: 'running', label: 'Running',  icon: 'directions_run' },
                { key: 'hybrid',  label: 'Hybrid',   icon: 'sports_martial_arts' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setPlanType(t.key)}
                  className={`w-full py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
                    planType === t.key ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-5">
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-3 block">Difficulty</label>
            <div className="space-y-2">
              {['beginner', 'intermediate', 'advanced'].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`w-full py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${
                    difficulty === d ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            RUNNING PLAN BUILDER
            (shown for running + hybrid)
        ══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {(planType === 'running' || planType === 'hybrid') && (
            <motion.section
              key="running-builder"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="mb-10"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
                </div>
                <div>
                  <h2 className="font-headline font-extrabold text-2xl tracking-tight">Running Plan</h2>
                  <p className="text-on-surface-variant text-xs">Define run types and weekly progression</p>
                </div>
              </div>

              {/* ── Run Types ─────────────────────────────────── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">Run Types</h3>
                  <button
                    onClick={() => { setShowAddRunType(s => !s); setAddRTMode('preset'); }}
                    className="flex items-center gap-1.5 text-[10px] text-secondary font-black uppercase tracking-widest hover:text-secondary/80 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Type
                  </button>
                </div>

                {/* Current run types list */}
                {runTypes.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {runTypes.map(rt => (
                      <div key={rt.id} className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/10">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${rt.color}20`, color: rt.color }}>
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{rt.icon || 'directions_run'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm uppercase tracking-tight" style={{ color: rt.color }}>{rt.name}</p>
                          {rt.desc && <p className="text-on-surface-variant text-xs truncate">{rt.desc}</p>}
                        </div>
                        <button onClick={() => removeRunType(rt.id)} className="text-outline/40 hover:text-error transition-colors shrink-0">
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {runTypes.length === 0 && !showAddRunType && (
                  <div className="bg-surface-container rounded-xl px-5 py-6 text-center border border-outline-variant/10 mb-3">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant/30 block mb-1">directions_run</span>
                    <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Add run types to build your plan</p>
                  </div>
                )}

                {/* Add run type panel */}
                <AnimatePresence>
                  {showAddRunType && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
                        {/* Mode tabs */}
                        <div className="flex border-b border-outline-variant/10">
                          {[['preset', 'Choose Preset'], ['custom', 'Custom']].map(([id, label]) => (
                            <button
                              key={id}
                              onClick={() => setAddRTMode(id)}
                              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                addRTMode === id ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {addRTMode === 'preset' ? (
                          <div className="p-3 space-y-1 max-h-56 overflow-y-auto">
                            {RUN_TYPE_PRESETS.map(preset => {
                              const alreadyAdded = runTypes.some(rt => rt.presetKey === preset.key);
                              return (
                                <button
                                  key={preset.key}
                                  onClick={() => !alreadyAdded && addRunTypeFromPreset(preset)}
                                  disabled={alreadyAdded}
                                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                                    alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-container-high active:scale-[0.98]'
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-secondary/10 text-secondary">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{preset.icon}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm text-on-surface uppercase tracking-tight">{preset.name}</p>
                                    <p className="text-on-surface-variant text-xs truncate">{preset.desc}</p>
                                  </div>
                                  {alreadyAdded && (
                                    <span className="material-symbols-outlined text-secondary text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  )}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setShowAddRunType(false)}
                              className="w-full mt-1 py-2.5 rounded-lg border border-outline-variant/20 text-on-surface-variant font-bold text-xs uppercase tracking-wide hover:bg-surface-container-high transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Custom Run Type</p>
                            <input
                              autoFocus type="text" value={newRTName} onChange={e => setNewRTName(e.target.value)}
                              placeholder="Name (e.g. Track Workout)"
                              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                            />
                            <input
                              type="text" value={newRTDesc} onChange={e => setNewRTDesc(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addCustomRunType(); }}
                              placeholder="Description (optional)"
                              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                            />
                            <div className="flex gap-2">
                              <button onClick={addCustomRunType} className="flex-1 py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wide transition-colors active:scale-95">
                                Add Run Type
                              </button>
                              <button
                                onClick={() => { setShowAddRunType(false); setNewRTName(''); setNewRTDesc(''); }}
                                className="px-4 py-2.5 rounded-lg border border-outline-variant/20 text-on-surface-variant font-bold text-xs uppercase tracking-wide hover:bg-surface-container-high transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Progression Weeks ─────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">Progression Weeks</h3>
                </div>

                {/* Week chips */}
                {runWeeks.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 -mx-6 px-6 mb-4">
                    {runWeeks.map((week, i) => (
                      <div key={i} className="shrink-0 relative">
                        <button
                          onClick={() => setSelectedWeek(i)}
                          className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${
                            i === selectedWeek
                              ? 'bg-secondary text-on-secondary block-shadow'
                              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <span className="font-label font-bold text-xs uppercase text-current">Week</span>
                          <span className="font-headline font-black text-3xl tracking-tighter text-current">
                            {String(week.week).padStart(2, '0')}
                          </span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeWeek(i); }}
                          className="absolute -top-2 -right-2 w-[22px] h-[22px] rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant flex items-center justify-center hover:bg-error hover:text-on-error hover:border-error transition-all z-10 shadow-sm touch-manipulation"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                        </button>
                      </div>
                    ))}
                    {/* Add week chip */}
                    <div className="shrink-0">
                      <button
                        onClick={addWeek}
                        className="w-20 h-20 rounded-xl flex flex-col items-center justify-center bg-surface-container border-2 border-dashed border-outline-variant/30 text-on-surface-variant hover:text-secondary hover:border-secondary/50 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-2xl mb-1">add</span>
                        <span className="font-label font-bold text-[10px] uppercase tracking-widest">Add</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container rounded-xl px-5 py-6 text-center border border-outline-variant/10 mb-4">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant/30 block mb-1">calendar_month</span>
                    <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-3">No weeks yet</p>
                    <button
                      onClick={addWeek}
                      className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wide active:scale-95 transition-all"
                    >
                      Add First Week
                    </button>
                  </div>
                )}

                {/* Session editor for selected week */}
                {currentWeekData && runTypes.length > 0 && (
                  <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
                    <div className="px-5 py-3 bg-surface-container-high border-b border-outline-variant/10">
                      <p className="font-headline font-bold text-sm uppercase tracking-wide text-secondary">
                        Week {currentWeekData.week} — Sessions
                      </p>
                    </div>
                    <div className="divide-y divide-outline-variant/10">
                      {runTypes.map(rt => {
                        const rtId = rt.id;
                        const sessionText = (currentWeekData.sessions || {})[rtId] || '';
                        const isEditing   = editingSession?.weekIdx === selectedWeek && editingSession?.rtId === rtId;
                        return (
                          <div key={rtId} className="px-5 py-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${rt.color}20`, color: rt.color }}>
                              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{rt.icon || 'directions_run'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: rt.color }}>{rt.name}</p>
                              {isEditing ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    autoFocus type="text" value={editSessionValue}
                                    onChange={e => setEditSessionValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveSession(); if (e.key === 'Escape') setEditingSession(null); }}
                                    className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                                  />
                                  <button onClick={saveSession} className="text-secondary hover:text-secondary/80 transition-colors shrink-0">
                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  </button>
                                  <button onClick={() => setEditingSession(null)} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors shrink-0">
                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                  </button>
                                </div>
                              ) : (
                                <p className="font-bold text-sm truncate text-on-surface">
                                  {sessionText || <span className="text-on-surface-variant/40 font-normal text-sm normal-case">Tap edit to set session</span>}
                                </p>
                              )}
                            </div>
                            {!isEditing && (
                              <button
                                onClick={() => startEditSession(selectedWeek, rtId, sessionText)}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/10 transition-all shrink-0"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentWeekData && runTypes.length === 0 && (
                  <div className="bg-surface-container rounded-xl px-5 py-5 text-center border border-outline-variant/10">
                    <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Add run types above to fill in sessions</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════
            GYM PLAN BUILDER
            (shown for gym + hybrid)
        ══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {(planType === 'gym' || planType === 'hybrid') && (
            <motion.section
              key="gym-builder"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-6 mb-10"
            >
              {/* Section header */}
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-container/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary-fixed text-base" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                  </div>
                  <div>
                    <h2 className="font-headline font-extrabold text-2xl tracking-tight">Gym Plan</h2>
                    <p className="text-on-surface-variant text-xs">Define your training days and movements</p>
                  </div>
                </div>
                <button
                  onClick={addDay}
                  className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-full font-headline font-bold text-sm flex items-center gap-2 hover:bg-surface-bright transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">add</span> Day
                </button>
              </div>

              <div className="space-y-5">
                {days.map((day, dayIdx) => (
                  <div key={day.id} className="bg-surface-container rounded-xl overflow-hidden">
                    {/* Day header */}
                    <div className="px-5 py-4 bg-surface-container-high flex justify-between items-center gap-3">
                      <input
                        type="text" value={day.name}
                        onChange={e => updateDay(day.id, 'name', e.target.value)}
                        className="flex-1 bg-transparent text-primary-container font-headline font-bold uppercase tracking-wide focus:outline-none placeholder:text-outline-variant"
                        placeholder={`DAY ${dayIdx + 1}`}
                      />
                      <input
                        type="text" value={day.focus}
                        onChange={e => updateDay(day.id, 'focus', e.target.value)}
                        className="w-32 bg-transparent text-on-surface-variant text-xs font-bold uppercase tracking-widest focus:outline-none text-right placeholder:text-outline-variant"
                        placeholder="PUSH / PULL…"
                      />
                      {days.length > 1 && (
                        <button onClick={() => removeDay(day.id)} className="text-error hover:opacity-80 transition-opacity ml-1 shrink-0">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>

                    {/* Exercises */}
                    <div className="p-5 space-y-2">
                      {/* Exercise chips */}
                      {day.exercises.length === 0 && (
                        <p className="text-on-surface-variant/40 text-xs font-bold uppercase tracking-widest text-center py-2">
                          No exercises yet — add one below
                        </p>
                      )}
                      {day.exercises.map(ex => (
                        <div key={ex.id} className="flex items-center gap-3 bg-surface-container-highest rounded-xl px-4 py-3 border-l-4 border-primary-container/40">
                          <div className="flex-1 min-w-0">
                            {/* Editable name */}
                            <input
                              type="text" value={ex.name}
                              onChange={e => updateExercise(day.id, ex.id, 'name', e.target.value)}
                              className="w-full bg-transparent font-headline font-bold text-sm uppercase tracking-tight text-on-surface focus:outline-none placeholder:text-outline-variant"
                              placeholder="Exercise name"
                            />
                            <div className="flex gap-4 mt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-on-surface-variant font-bold uppercase">Sets</span>
                                <input
                                  type="number" value={ex.sets}
                                  onChange={e => updateExercise(day.id, ex.id, 'sets', e.target.value)}
                                  className="w-10 bg-surface-container rounded px-1 py-0.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary-container"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-on-surface-variant font-bold uppercase">Reps</span>
                                <input
                                  type="text" value={ex.reps}
                                  onChange={e => updateExercise(day.id, ex.id, 'reps', e.target.value)}
                                  className="w-14 bg-surface-container rounded px-1 py-0.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary-container"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-on-surface-variant font-bold uppercase">Rest</span>
                                <input
                                  type="text" value={ex.rest}
                                  onChange={e => updateExercise(day.id, ex.id, 'rest', e.target.value)}
                                  className="w-12 bg-surface-container rounded px-1 py-0.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary-container"
                                />
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removeExercise(day.id, ex.id)} className="text-outline/40 hover:text-error transition-colors shrink-0">
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                      ))}

                      {/* Exercise picker toggle */}
                      <AnimatePresence>
                        {showPickerFor === day.id ? (
                          <div>
                            <InlineExercisePicker onAdd={ex => addExerciseToDay(day.id, ex)} />
                            <button
                              onClick={() => setShowPickerFor(null)}
                              className="w-full mt-2 py-2 text-on-surface-variant/50 hover:text-on-surface text-xs font-bold uppercase tracking-widest transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => setShowPickerFor(day.id)}
                            className="flex items-center gap-2 text-on-surface-variant hover:text-primary-fixed transition-colors text-sm font-bold uppercase tracking-widest pt-2 w-full"
                          >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Add Exercise
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}

                {/* Ghost add day */}
                <button
                  onClick={addDay}
                  className="w-full border border-outline-variant/20 border-dashed rounded-xl p-8 flex flex-col items-center justify-center min-h-[100px] group hover:bg-surface-container/30 transition-all"
                >
                  <span className="material-symbols-outlined text-4xl text-outline group-hover:text-primary-container transition-colors mb-2">post_add</span>
                  <span className="font-headline font-bold text-outline group-hover:text-on-surface transition-colors text-sm">Add Training Day</span>
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Error ─────────────────────────────────────────── */}
        {error && (
          <div className="bg-error-container/20 border border-error/20 rounded-lg px-5 py-3 text-error text-sm font-bold mb-4">
            {error}
          </div>
        )}

        {/* ── Publish CTA ───────────────────────────────────── */}
        <div className="glass-panel p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-outline-variant/10">
          <div>
            <h3 className="font-headline font-extrabold text-2xl mb-1">Ready to publish?</h3>
            <p className="text-on-surface-variant text-sm">Your plan will be shared with the KINETIC community.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setPage('home')}
              className="px-6 py-3.5 rounded-full font-headline font-bold text-on-surface hover:bg-surface-container transition-all border border-outline-variant/30 active:scale-95 text-sm uppercase"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="kinetic-gradient px-10 py-3.5 rounded-full font-headline font-black text-on-primary-fixed shadow-[0_8px_30px_rgba(212,251,0,0.2)] hover:shadow-[0_8px_40px_rgba(212,251,0,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase disabled:opacity-60"
            >
              {saving ? 'Publishing…' : 'Share to Community'}
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
