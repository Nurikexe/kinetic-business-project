import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { useActiveSession } from '../context/ActiveSessionContext';
import { supabase } from '../lib/supabase';
import EditProgressionModal from '../components/EditProgressionModal';

function paceToMinutes(str) {
  const [m, s] = (str || '').split(':').map(Number);
  if (!m && !s) return 0;
  return (m || 0) + (s || 0) / 60;
}

function minutesToPace(min) {
  if (!min || min <= 0) return '—';
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

let segCounter = 0;
function newSeg() { return { id: `seg-${++segCounter}`, distance: '', pace: '' }; }

const RT_COLORS = ['#ffb020', '#00ccff', '#ff3b5c', '#00e3fd', '#7c3aed', '#10b981'];

const RUN_TYPE_PRESETS = [
  { key: 'zone_2_easy',         name: 'Zone 2 Easy',         desc: 'Low intensity aerobic base',       icon: 'directions_run', defaultSession: '30 min easy jog' },
  { key: 'long_run',            name: 'Long Run',             desc: 'Distance & endurance',             icon: 'route',          defaultSession: '8 km long run' },
  { key: 'tempo',               name: 'Tempo',                desc: 'Comfortably hard pace',            icon: 'speed',          defaultSession: '20 min tempo' },
  { key: 'threshold',           name: 'Threshold',            desc: 'Lactate threshold training',       icon: 'whatshot',       defaultSession: '3 × 5 min @ threshold' },
  { key: 'intervals',           name: 'Intervals',            desc: 'High intensity repeats',           icon: 'timer',          defaultSession: '6 × 400m' },
  { key: 'fartlek',             name: 'Fartlek',              desc: 'Unstructured speed play',          icon: 'shuffle',        defaultSession: '25 min fartlek' },
  { key: 'hill_repeats',        name: 'Hill Repeats',         desc: 'Strength & power',                 icon: 'landscape',      defaultSession: '8 × hill repeats' },
  { key: 'recovery_run',        name: 'Recovery Run',         desc: 'Easy active recovery',             icon: 'self_improvement', defaultSession: '20 min recovery jog' },
  { key: 'progression_run',     name: 'Progression',          desc: 'Gradually increasing pace',        icon: 'trending_up',    defaultSession: '6 km progression run' },
  { key: 'strides',             name: 'Strides',              desc: 'Short controlled accelerations',   icon: 'sprint',         defaultSession: '6 × 80m strides' },
  { key: 'sprint_accelerations',name: 'Sprint Accelerations', desc: 'Max speed development',            icon: 'bolt',           defaultSession: '5 × 60m sprints' },
];

const DEFAULT_WARMUP_EXERCISES = [
  { id: 'wu-def-1',  name: 'Easy Walk / Light Jog — 2 min' },
  { id: 'wu-def-2',  name: 'Ankle Circles — 10 each direction per foot' },
  { id: 'wu-def-3',  name: 'Toe Raises — 15 reps' },
  { id: 'wu-def-4',  name: 'Heel Raises — 15 reps' },
  { id: 'wu-def-5',  name: 'Leg Swings Front/Back — 10 each leg' },
  { id: 'wu-def-6',  name: 'Leg Swings Side-to-Side — 10 each leg' },
  { id: 'wu-def-7',  name: 'Walking Lunges — 8 each side' },
  { id: 'wu-def-8',  name: 'Glute Bridges — 15 reps' },
  { id: 'wu-def-9',  name: 'Bodyweight Squats — 15 reps' },
  { id: 'wu-def-10', name: 'Lateral Band Walks — 10 steps each side' },
  { id: 'wu-def-11', name: 'High Knees — 20 sec' },
  { id: 'wu-def-12', name: 'Butt Kicks — 20 sec' },
  { id: 'wu-def-13', name: 'High Skips / A-Skips — 20 sec' },
  { id: 'wu-def-14', name: 'Straight-Leg Bounds — 20 sec' },
  { id: 'wu-def-15', name: 'Strides — 3 × 40-60m relaxed accelerations' },
];

// ── Active Run Session ────────────────────────────────────────
function ActiveRunSession({ onFinish, onCancel }) {
  const { user }                      = useAuth();
  const { runSession, setRunSession } = useActiveSession();

  const { runType, segments: savedSegments, notes: savedNotes, elapsed: savedElapsed } = runSession;

  const [segments, setSegments] = useState(savedSegments);
  const [notes, setNotes]       = useState(savedNotes);
  const [elapsed, setElapsed]   = useState(savedElapsed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    setRunSession(s => ({ ...s, segments, notes, elapsed }));
  }, [segments, notes, elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (success) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [success]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const updateSeg = (id, field, val) =>
    setSegments(s => s.map(seg => seg.id === id ? { ...seg, [field]: val } : seg));

  const addSegment = () => setSegments(s => [...s, newSeg()]);
  const removeSeg  = (id) => setSegments(s => s.length > 1 ? s.filter(seg => seg.id !== id) : s);

  const totals = (() => {
    let totalDist = 0, weightedPace = 0;
    segments.forEach(seg => {
      const dist = parseFloat(seg.distance) || 0;
      const pace = paceToMinutes(seg.pace);
      totalDist    += dist;
      weightedPace += pace * dist;
    });
    const avgPace = totalDist > 0 ? weightedPace / totalDist : 0;
    return { totalDistance: Math.round(totalDist * 100) / 100, avgPace: minutesToPace(avgPace) };
  })();

  const handleSubmit = async () => {
    if (totals.totalDistance === 0) { setError('Please enter at least one segment with distance.'); return; }
    setSubmitting(true);
    setError('');
    const { error: dbErr } = await supabase.from('run_sessions').insert({
      user_id:         user.id,
      date:            new Date().toISOString().split('T')[0],
      title:           runType?.name || 'Run',
      run_type:        runType?.key || runType?.type || 'run',
      segments:        segments.filter(s => s.distance),
      total_distance:  totals.totalDistance,
      avg_pace:        totals.avgPace,
      notes,
      duration_seconds: elapsed,
    });
    setSubmitting(false);
    if (dbErr) { setError(dbErr.message); return; }

    setSuccess(true);
    setTimeout(() => {
      const { weekIdx, rtId, id } = runType || {};
      setRunSession(null);
      onFinish(weekIdx, rtId || id);
    }, 1500);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6"
      >
        <div className="w-28 h-28 rounded-full bg-primary-container/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-6xl text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-headline font-black text-4xl uppercase tracking-tighter text-on-surface">Run Saved!</h2>
          <p className="text-on-surface-variant text-sm">
            <span className="text-secondary font-bold">{totals.totalDistance} km</span> logged at{' '}
            <span className="text-secondary font-bold">{totals.avgPace}/km</span>
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-background pb-44">
      <div className="sticky top-0 z-50 bg-secondary shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-secondary/60">Active Run</p>
            <h2 className="font-headline font-black text-xl uppercase tracking-tight text-on-secondary line-clamp-1">
              {runType?.name || 'Run Session'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="font-mono text-2xl font-bold text-on-secondary leading-none">{formatTime(elapsed)}</span>
              <span className="text-[9px] uppercase font-black text-on-secondary/40 tracking-tighter">Elapsed</span>
            </div>
            <button onClick={onCancel} className="w-10 h-10 rounded-full bg-on-secondary/10 flex items-center justify-center text-on-secondary hover:bg-on-secondary/20 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 max-w-xl mx-auto space-y-6">
        <div className="bg-surface-container rounded-2xl p-6 grid grid-cols-2 gap-6 border border-outline-variant/10 shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary/70">Total Distance</p>
            <p className="font-headline font-black text-4xl tracking-tighter text-on-surface">
              {totals.totalDistance || '0.0'}
              <span className="text-sm text-on-surface-variant ml-1 uppercase font-black tracking-widest">km</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-fixed/70">Avg Pace</p>
            <p className="font-headline font-black text-4xl tracking-tighter text-on-surface">
              {totals.avgPace}
              <span className="text-sm text-on-surface-variant ml-1 uppercase font-black tracking-widest">/km</span>
            </p>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm">
          <div className="px-5 py-4 bg-surface-container-high flex items-center justify-between border-b border-outline-variant/10">
            <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface">Distance &amp; Pace</h3>
            <div className="px-2.5 py-1 rounded-full bg-secondary/10 text-[10px] text-secondary font-black uppercase tracking-widest">
              {segments.length} segment{segments.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-3 px-1">
              <span className="text-[10px] text-on-surface-variant font-black uppercase text-center tracking-tighter">Distance (km)</span>
              <span className="text-[10px] text-on-surface-variant font-black uppercase text-center tracking-tighter">Pace (min/km)</span>
              <span />
            </div>
            {segments.map((seg) => (
              <div key={seg.id} className="grid grid-cols-[1fr_1fr_2.5rem] gap-3 items-center">
                <input
                  type="number" inputMode="decimal" step="0.1" value={seg.distance}
                  onChange={e => updateSeg(seg.id, 'distance', e.target.value)}
                  placeholder="5.0"
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-3 text-center font-headline font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                />
                <input
                  type="text" inputMode="numeric" value={seg.pace}
                  onChange={e => updateSeg(seg.id, 'pace', e.target.value)}
                  placeholder="6:00"
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-3 text-center font-headline font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                />
                <button onClick={() => removeSeg(seg.id)} className="text-outline/40 hover:text-error transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">remove_circle</span>
                </button>
              </div>
            ))}
            <button
              onClick={addSegment}
              className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center gap-2 text-on-surface-variant text-xs font-black uppercase tracking-widest hover:border-secondary/50 hover:text-secondary transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Segment
            </button>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-secondary text-sm">edit_note</span>
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Session Notes</label>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did you feel? Any pain? (e.g. 'felt knee pain', 'crushed it!')"
            rows={3}
            className="w-full bg-surface-container-highest rounded-xl px-4 py-4 text-sm placeholder:text-outline/50 resize-none focus:outline-none border border-outline-variant/20 focus:ring-2 focus:ring-secondary/40 transition-all"
          />
        </div>

        {error && (
          <div className="bg-error-container/20 border border-error/20 rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-error">error</span>
            <p className="text-error text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="h-10" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 rounded-2xl bg-secondary text-on-secondary font-headline font-black uppercase tracking-tighter text-xl shadow-[0_12px_40px_rgba(0,227,253,0.3)] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3 group"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-on-secondary/30 border-t-on-secondary rounded-full animate-spin" />
                <span>Saving Run…</span>
              </>
            ) : (
              <>
                <span>Finish &amp; Submit</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Running Plan View ─────────────────────────────────────────
export default function RunningPage() {
  const { config, updateConfig, loaded } = useUserConfig();
  const { runSession, setRunSession }    = useActiveSession();
  const [toast, setToast]               = useState(null);
  const [showProgressionEdit, setShowProgressionEdit] = useState(false);

  // Week session editing
  const [editingSession, setEditingSession]   = useState(null); // { weekIdx, rtId }
  const [editSessionValue, setEditSessionValue] = useState('');

  // Run types management
  const [showAddRunType, setShowAddRunType] = useState(false);
  const [addRunTypeMode, setAddRunTypeMode] = useState('preset'); // 'preset' | 'custom'
  const [newRTName, setNewRTName]           = useState('');
  const [newRTDesc, setNewRTDesc]           = useState('');

  // Goals management
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');

  // Warm-up exercises management
  const [warmupChecked, setWarmupChecked]     = useState(new Set());
  const [showAddWarmup, setShowAddWarmup]     = useState(false);
  const [addWarmupMode, setAddWarmupMode]     = useState('picker'); // 'picker' | 'custom'
  const [newWarmupName, setNewWarmupName]     = useState('');
  const [editingWarmupId, setEditingWarmupId] = useState(null);
  const [editWarmupValue, setEditWarmupValue] = useState('');
  const [viewingRunType, setViewingRunType] = useState(null);

  const {
    run_types:             runTypes        = [],
    run_week:              runWeek         = 0,
    run_weeks:             runWeeks        = [],
    run_completed:         runCompleted    = {},
    run_goals:             runGoals        = [],
    run_warmup_exercises:  warmupExercises = [],
    lifts            = [],
    show_performance = true,
  } = config;

  const isRunTarget = (l) => {
    const u = (l.unit || '').toLowerCase();
    const n = (l.name || '').toLowerCase();
    return ['km', 'mile', 'miles', 'min/km', 'min/mile'].includes(u) || n.includes('run');
  };

  const runLifts = lifts.filter(l => isRunTarget(l));
  const gymLifts = lifts.filter(l => !isRunTarget(l));

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const markRunDone = useCallback((weekIdx, rtId) => {
    if (weekIdx == null || !rtId) return;
    const weekKey = String(weekIdx);
    const current = runCompleted[weekKey] || {};
    updateConfig({ run_completed: { ...runCompleted, [weekKey]: { ...current, [rtId]: true } } });
  }, [runCompleted, updateConfig]);

  // ── Week management ──────────────────────────────────────────
  const addWeek = () => {
    const newWeekNum = runWeeks.length + 1;
    const sessions = {};
    runTypes.forEach(rt => {
      const preset = RUN_TYPE_PRESETS.find(p => p.key === rt.presetKey);
      sessions[rt.id] = preset?.defaultSession || '30 min run';
    });
    updateConfig({ run_weeks: [...runWeeks, { week: newWeekNum, sessions }] });
    showToast('Week added!');
  };

  const removeWeek = (idx) => {
    const updatedWeeks = runWeeks.filter((_, i) => i !== idx);
    const newCurrent = runWeek >= updatedWeeks.length ? Math.max(0, updatedWeeks.length - 1) : runWeek;
    updateConfig({ run_weeks: updatedWeeks, run_week: newCurrent });
    showToast('Week removed!');
  };

  // ── Week session editing ─────────────────────────────────────
  const startEditSession = (weekIdx, rtId, val) => {
    setEditingSession({ weekIdx, rtId });
    setEditSessionValue(val);
  };

  const saveSession = () => {
    if (!editingSession) return;
    const { weekIdx, rtId } = editingSession;
    const updatedWeeks = runWeeks.map((w, i) =>
      i === weekIdx ? { ...w, sessions: { ...(w.sessions || {}), [rtId]: editSessionValue } } : w
    );
    updateConfig({ run_weeks: updatedWeeks });
    setEditingSession(null);
    showToast('Session updated!');
  };

  const cancelEditSession = () => setEditingSession(null);

  // ── Run types ─────────────────────────────────────────────────
  const startRun = (runType) => {
    setRunSession({ runType, segments: [newSeg()], notes: '', elapsed: 0 });
  };

  const startWeekRun = (weekIdx, rtId, name) => {
    setRunSession({
      runType: { name, id: rtId, rtId, weekIdx },
      segments: [newSeg()],
      notes: '',
      elapsed: 0,
    });
  };

  const addRunTypeFromPreset = (preset) => {
    if (runTypes.some(rt => rt.presetKey === preset.key)) { showToast('Already added!'); return; }
    const color = RT_COLORS[runTypes.length % RT_COLORS.length];
    const newRT = { id: `rt-${Date.now()}`, name: preset.name, desc: preset.desc, color, icon: preset.icon, presetKey: preset.key };
    const updatedWeeks = runWeeks.map(w => ({
      ...w, sessions: { ...(w.sessions || {}), [newRT.id]: preset.defaultSession },
    }));
    updateConfig({ run_types: [...runTypes, newRT], run_weeks: updatedWeeks });
    setShowAddRunType(false);
    showToast(`${preset.name} added!`);
  };

  const addCustomRunType = () => {
    if (!newRTName.trim()) return;
    const color = RT_COLORS[runTypes.length % RT_COLORS.length];
    const newRT = { id: `rt-${Date.now()}`, name: newRTName.trim(), desc: newRTDesc.trim(), color, icon: 'directions_run', presetKey: null };
    const updatedWeeks = runWeeks.map(w => ({
      ...w, sessions: { ...(w.sessions || {}), [newRT.id]: '30 min run' },
    }));
    updateConfig({ run_types: [...runTypes, newRT], run_weeks: updatedWeeks });
    setNewRTName(''); setNewRTDesc(''); setShowAddRunType(false);
    showToast('Run type added!');
  };

  const removeRunType = (key) => {
    const rtToRemove = runTypes.find(rt => (rt.id || rt.key || rt.name) === key);
    const updatedTypes = runTypes.filter(rt => (rt.id || rt.key || rt.name) !== key);
    const updatedWeeks = rtToRemove
      ? runWeeks.map(w => { const s = { ...(w.sessions || {}) }; delete s[rtToRemove.id]; return { ...w, sessions: s }; })
      : runWeeks;
    updateConfig({ run_types: updatedTypes, run_weeks: updatedWeeks });
    showToast('Run type removed!');
  };

  // ── Goals ─────────────────────────────────────────────────────
  const addGoal = () => {
    if (!newGoalText.trim()) return;
    updateConfig({ run_goals: [...runGoals, { id: `goal-${Date.now()}`, text: newGoalText.trim() }] });
    setNewGoalText(''); setShowAddGoal(false);
    showToast('Goal added!');
  };

  const removeGoal = (id) => {
    updateConfig({ run_goals: runGoals.filter(g => g.id !== id) });
    showToast('Goal removed!');
  };

  // ── Warm-up exercises ─────────────────────────────────────────
  const toggleWarmup = (id) => {
    setWarmupChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addWarmupFromPreset = (preset) => {
    if (warmupExercises.some(e => e.id === preset.id)) return;
    updateConfig({ run_warmup_exercises: [...warmupExercises, preset] });
    showToast('Exercise added!');
  };

  const addWarmup = () => {
    if (!newWarmupName.trim()) return;
    updateConfig({ run_warmup_exercises: [...warmupExercises, { id: `wu-${Date.now()}`, name: newWarmupName.trim() }] });
    setNewWarmupName(''); setShowAddWarmup(false); setAddWarmupMode('picker');
    showToast('Exercise added!');
  };

  const startEditWarmup = (id, name) => { setEditingWarmupId(id); setEditWarmupValue(name); };

  const saveWarmup = () => {
    if (!editWarmupValue.trim()) return;
    updateConfig({
      run_warmup_exercises: warmupExercises.map(e =>
        e.id === editingWarmupId ? { ...e, name: editWarmupValue.trim() } : e
      ),
    });
    setEditingWarmupId(null);
    showToast('Exercise updated!');
  };

  const removeWarmup = (id) => {
    updateConfig({ run_warmup_exercises: warmupExercises.filter(e => e.id !== id) });
    if (editingWarmupId === id) setEditingWarmupId(null);
    showToast('Exercise removed!');
  };

  const saveLifts = useCallback(({ lifts: newRunLifts }) => {
    updateConfig({ lifts: [...gymLifts, ...newRunLifts] });
    setShowProgressionEdit(false);
    showToast('Targets updated!');
  }, [gymLifts, updateConfig, showToast]);

  const updateLiftCurrent = useCallback((liftKey, val) => {
    const newLifts = lifts.map(l => l.key === liftKey ? { ...l, current: val } : l);
    updateConfig({ lifts: newLifts });
  }, [lifts, updateConfig]);

  // ─────────────────────────────────────────────────────────────
  const currentWeekData = runWeeks[runWeek] || null;
  const enriched        = runTypes.map(rt => ({ color: '#00e3fd', ...rt }));

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
      </div>
    );
  }

  if (runSession) {
    return (
      <ActiveRunSession
        onFinish={(weekIdx, rtId) => { markRunDone(weekIdx, rtId); showToast('Run submitted!'); }}
        onCancel={() => setRunSession(null)}
      />
    );
  }

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex justify-between items-center px-6 py-4">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
        </div>
      </header>

      <div className="px-6 pt-6 max-w-xl mx-auto">

        {/* ── Page title ──────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="font-headline font-extrabold text-3xl tracking-tighter uppercase mb-1">Running Plan</h2>
        </section>

        {/* ── Performance Targets ──────────────────────── */}
        {runLifts.length > 0 && (
          <section className="mb-8">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-0.5">
                  Performance
                </p>
                <h3 className="font-headline font-extrabold text-2xl uppercase tracking-tighter leading-none">
                  Targets
                </h3>
              </div>
              <div className="flex items-center gap-3 pb-0.5">
                <button
                  onClick={() => updateConfig({ show_performance: !show_performance })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                    show_performance ? 'bg-secondary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
                      show_performance ? 'translate-x-[18px] bg-on-secondary' : 'translate-x-[3px] bg-on-surface-variant/40'
                    }`}
                  />
                </button>
                <button
                  onClick={() => setShowProgressionEdit(true)}
                  className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/60 hover:text-secondary uppercase font-black tracking-widest transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                  Edit
                </button>
              </div>
            </div>
            <AnimatePresence>
              {show_performance && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3">
                    {runLifts.map((lift, i) => {
                      // For running goals, maxVal might need to be different. 
                      // If it's KM, maybe target * 1.5. If it's pace, it's weird.
                      // For now, mirroring GymPage logic with slight adjustment for units.
                      const maxVal  = lift.unit === 'km' 
                        ? Math.ceil((lift.target * 1.5) / 5) * 5 
                        : Math.ceil((lift.target * 1.25) / 5) * 5;
                      const pct     = lift.target > 0 ? Math.min(100, Math.round((lift.current / lift.target) * 100)) : 0;
                      const fillPct = maxVal > 0 ? Math.min(100, (lift.current / maxVal) * 100) : 0;
                      const reached = pct >= 100;

                      return (
                        <motion.div
                          key={lift.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.3 }}
                          className="rounded-2xl bg-surface-container overflow-hidden"
                        >
                          <div
                            className="h-[2px] transition-all duration-500"
                            style={{
                              background: `linear-gradient(to right, #00e3fd ${fillPct}%, rgba(255,255,255,0.04) ${fillPct}%)`,
                            }}
                          />
                          <div className="px-5 pt-4 pb-5">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/40 mb-0.5">
                                  {lift.unit}{lift.prefix ? ` · ${lift.prefix}` : ''}
                                </p>
                                <h4 className="font-headline font-bold text-[15px] uppercase tracking-tight text-on-surface leading-tight">
                                  {lift.name}
                                </h4>
                              </div>
                              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                reached
                                  ? 'bg-secondary text-on-secondary'
                                  : 'bg-surface-container-highest text-on-surface-variant'
                              }`}>
                                {reached ? '✓ Done' : `${pct}%`}
                              </div>
                            </div>
                            <div className="flex items-end justify-between mb-5">
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">
                                  Current
                                </p>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-headline font-black text-[40px] leading-none tracking-tighter text-on-surface">
                                    {lift.prefix || ''}{lift.current}
                                  </span>
                                  <span className="text-on-surface-variant/60 text-sm font-bold leading-none mb-1">
                                    {lift.unit}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right pb-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">
                                  Target
                                </p>
                                <div className="flex items-baseline gap-1 justify-end">
                                  <span className="font-headline font-bold text-2xl leading-none tracking-tighter text-on-surface-variant/50">
                                    {lift.prefix || ''}{lift.target}
                                  </span>
                                  <span className="text-on-surface-variant/30 text-xs font-bold leading-none mb-0.5">
                                    {lift.unit}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <input
                              type="range"
                              className="kinetic-slider w-full running-slider"
                              min={0}
                              max={maxVal}
                              step={lift.unit === 'km' ? 0.5 : 2.5}
                              value={lift.current}
                              onChange={e => updateLiftCurrent(lift.key, parseFloat(e.target.value))}
                              style={{
                                background: `linear-gradient(to right, #00e3fd ${fillPct}%, rgba(38,38,38,1) ${fillPct}%)`,
                              }}
                            />
                            <div className="flex justify-between mt-2">
                              <span className="text-[9px] font-bold text-on-surface-variant/25">0</span>
                              <span className="text-[9px] font-bold text-on-surface-variant/25">{maxVal} {lift.unit}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── Week selector ───────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Weeks</h3>
          </div>
          {runWeeks.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pt-3 pb-4 -mt-3 -mx-6 px-6">
              {runWeeks.map((week, i) => {
                const weekDone = Object.values(runCompleted[String(i)] || {}).filter(Boolean).length;
                const allDone  = enriched.length > 0 && weekDone >= enriched.length;
                return (
                  <div key={i} className="shrink-0 relative">
                    <button
                      onClick={() => updateConfig({ run_week: i })}
                      className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                        i === runWeek ? 'bg-primary-container text-on-primary-fixed block-shadow'
                        : allDone     ? 'bg-surface-container text-secondary'
                        :               'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="font-label font-bold text-xs uppercase text-current">Week</span>
                      <span className="font-headline font-black text-3xl tracking-tighter text-current">
                        {String(week.week || i + 1).padStart(2, '0')}
                      </span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeWeek(i); }}
                      className="absolute -top-2 -right-2 w-[22px] h-[22px] rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant flex items-center justify-center hover:bg-error hover:text-on-error hover:border-error transition-all z-10 shadow-sm touch-manipulation active:scale-90"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  </div>
                );
              })}
              <div className="shrink-0">
                <button
                  onClick={addWeek}
                  className="w-20 h-20 rounded-lg flex flex-col items-center justify-center bg-surface-container border-2 border-dashed border-outline-variant/30 text-on-surface-variant hover:text-secondary hover:border-secondary/50 transition-all active:scale-95 touch-manipulation"
                >
                  <span className="material-symbols-outlined text-2xl mb-1">add</span>
                  <span className="font-label font-bold text-[10px] uppercase tracking-widest">Add</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container rounded-xl px-5 py-6 text-center border border-outline-variant/10">
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-3">No weeks yet</p>
              <button
                onClick={addWeek}
                className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wide active:scale-95 transition-all"
              >
                Add First Week
              </button>
            </div>
          )}
        </div>

        {/* ── Week sessions ───────────────────────────────── */}
        {currentWeekData && (
          <div className="mb-8 space-y-3">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">
              Week {currentWeekData.week} Sessions
            </h3>
            {enriched.length === 0 ? (
              <div className="bg-surface-container rounded-xl px-5 py-8 text-center border border-outline-variant/10">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-2">directions_run</span>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Add run types below to build your week</p>
              </div>
            ) : (
              enriched.map((rt) => {
                const rtId        = rt.id || rt.key || rt.name;
                const sessionText = (currentWeekData.sessions || {})[rtId] || '';
                const done        = !!(runCompleted[String(runWeek)] || {})[rtId];
                const isEditing   = editingSession?.weekIdx === runWeek && editingSession?.rtId === rtId;

                return (
                  <div
                    key={rtId}
                    className={`rounded-lg overflow-hidden bg-surface-container border border-outline-variant/10 ${done ? 'opacity-60' : ''}`}
                  >
                    <div className="px-5 py-4 flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${rt.color}20`, color: rt.color }}
                      >
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {rt.icon || 'directions_run'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: rt.color }}>
                          {rt.name}
                        </p>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              autoFocus
                              type="text"
                              value={editSessionValue}
                              onChange={e => setEditSessionValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveSession(); if (e.key === 'Escape') cancelEditSession(); }}
                              className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                            />
                            <button onClick={saveSession} className="text-secondary hover:text-secondary/80 transition-colors shrink-0">
                              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </button>
                            <button onClick={cancelEditSession} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors shrink-0">
                              <span className="material-symbols-outlined text-lg">cancel</span>
                            </button>
                          </div>
                        ) : (
                          <h4 className="font-headline font-bold text-base uppercase tracking-tight truncate">
                            {sessionText || <span className="text-on-surface-variant/40 font-normal normal-case text-sm">No session set</span>}
                          </h4>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingRunType({ ...rt, sessionText, weekIdx: runWeek, rtId })}
                              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/10 transition-all touch-manipulation"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                            </button>
                            {!done && (
                              <button
                                onClick={() => startEditSession(runWeek, rtId, sessionText)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/10 transition-all touch-manipulation"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                            )}
                          </div>
                        )}
                        {done && !isEditing && (
                          <span className="material-symbols-outlined text-primary-fixed text-2xl mx-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        )}
                        {!done && !isEditing && (
                          <button
                            onClick={() => startWeekRun(runWeek, rtId, rt.name)}
                            className="px-4 py-2.5 min-h-[40px] rounded-full bg-secondary/10 text-secondary font-bold text-xs uppercase tracking-wide hover:bg-secondary/20 active:scale-95 transition-all touch-manipulation"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Warm-up Exercises ───────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Warm-up Exercises</h3>
            <button
              onClick={() => { setShowAddWarmup(s => !s); setAddWarmupMode('picker'); }}
              className="flex items-center gap-1.5 text-[10px] text-secondary font-black uppercase tracking-widest hover:text-secondary/80 transition-colors min-h-[36px] px-1 touch-manipulation"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Exercise
            </button>
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            {warmupExercises.length === 0 && !showAddWarmup ? (
              <div className="px-5 py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-2">self_improvement</span>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">No warm-up exercises yet</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {warmupExercises.map(ex => {
                  const checked   = warmupChecked.has(ex.id);
                  const isEditing = editingWarmupId === ex.id;
                  return (
                    <div key={ex.id} className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${checked ? 'bg-primary-container/5' : ''}`}>
                      <button
                        onClick={() => toggleWarmup(ex.id)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all touch-manipulation ${
                          checked ? 'bg-primary-fixed border-primary-fixed' : 'border-outline-variant/40 hover:border-secondary/60'
                        }`}
                      >
                        {checked && (
                          <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}>check</span>
                        )}
                      </button>
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            autoFocus type="text" value={editWarmupValue}
                            onChange={e => setEditWarmupValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveWarmup(); if (e.key === 'Escape') setEditingWarmupId(null); }}
                            className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                          />
                          <button onClick={saveWarmup} className="text-secondary hover:text-secondary/80 transition-colors shrink-0">
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          </button>
                          <button onClick={() => setEditingWarmupId(null)} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors shrink-0">
                            <span className="material-symbols-outlined text-lg">cancel</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className={`flex-1 text-sm font-bold transition-all ${checked ? 'line-through text-on-surface-variant/50' : 'text-on-surface'}`}>
                            {ex.name}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEditWarmup(ex.id, ex.name)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/10 transition-all touch-manipulation">
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button onClick={() => removeWarmup(ex.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-outline/40 hover:text-error hover:bg-error/5 transition-all touch-manipulation">
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <AnimatePresence>
              {showAddWarmup && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-outline-variant/10"
                >
                  {/* Mode tabs */}
                  <div className="flex border-b border-outline-variant/10">
                    <button
                      onClick={() => setAddWarmupMode('picker')}
                      className={`flex-1 py-3 min-h-[44px] text-[10px] font-black uppercase tracking-widest transition-colors ${addWarmupMode === 'picker' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant'}`}
                    >
                      From Defaults
                    </button>
                    <button
                      onClick={() => setAddWarmupMode('custom')}
                      className={`flex-1 py-3 min-h-[44px] text-[10px] font-black uppercase tracking-widest transition-colors ${addWarmupMode === 'custom' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant'}`}
                    >
                      Custom
                    </button>
                  </div>

                  {addWarmupMode === 'picker' ? (
                    <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/10">
                      {DEFAULT_WARMUP_EXERCISES.filter(d => !warmupExercises.some(e => e.id === d.id)).length === 0 ? (
                        <p className="px-5 py-6 text-center text-xs font-bold uppercase tracking-widest text-on-surface-variant/50">All defaults added</p>
                      ) : (
                        DEFAULT_WARMUP_EXERCISES
                          .filter(d => !warmupExercises.some(e => e.id === d.id))
                          .map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => addWarmupFromPreset(preset)}
                              className="w-full flex items-center gap-3 px-5 py-3.5 min-h-[48px] text-left hover:bg-surface-container-high active:scale-[0.99] transition-all touch-manipulation"
                            >
                              <span className="material-symbols-outlined text-secondary/60 text-base shrink-0">add_circle</span>
                              <span className="text-sm font-bold text-on-surface leading-snug">{preset.name}</span>
                            </button>
                          ))
                      )}
                    </div>
                  ) : (
                    <div className="px-5 py-4 flex items-center gap-3">
                      <input
                        autoFocus type="text" value={newWarmupName}
                        onChange={e => setNewWarmupName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addWarmup(); if (e.key === 'Escape') { setShowAddWarmup(false); setNewWarmupName(''); } }}
                        placeholder="e.g. Hip Circles, Leg Swings"
                        className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-3 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                      />
                      <button onClick={addWarmup} className="px-4 py-3 min-h-[44px] rounded-lg bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wide transition-colors active:scale-95 shrink-0 touch-manipulation">
                        Save
                      </button>
                    </div>
                  )}

                  <div className="px-5 pb-3">
                    <button
                      onClick={() => { setShowAddWarmup(false); setNewWarmupName(''); setAddWarmupMode('picker'); }}
                      className="w-full py-3 min-h-[44px] rounded-lg border border-outline-variant/20 text-on-surface-variant font-bold text-xs uppercase tracking-wide hover:bg-surface-container-high transition-all mt-2"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {warmupExercises.length > 0 && (
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-[10px] text-on-surface-variant/50 font-black uppercase tracking-widest">
                {warmupChecked.size}/{warmupExercises.length} completed
              </p>
              {warmupChecked.size > 0 && (
                <button
                  onClick={() => setWarmupChecked(new Set())}
                  className="text-[10px] text-on-surface-variant/50 hover:text-on-surface-variant font-black uppercase tracking-widest transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Goals ───────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Goals</h3>
            <button
              onClick={() => setShowAddGoal(s => !s)}
              className="flex items-center gap-1.5 text-[10px] text-secondary font-black uppercase tracking-widest hover:text-secondary/80 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Goal
            </button>
          </div>
          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            {runGoals.length === 0 && !showAddGoal ? (
              <div className="px-5 py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-2">flag</span>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">No goals yet</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {runGoals.map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="material-symbols-outlined text-secondary text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                    <p className="flex-1 text-sm font-bold text-on-surface">{goal.text}</p>
                    <button onClick={() => removeGoal(goal.id)} className="text-outline/40 hover:text-error transition-colors shrink-0">
                      <span className="material-symbols-outlined text-lg">remove_circle</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <AnimatePresence>
              {showAddGoal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-outline-variant/10"
                >
                  <div className="px-5 py-4 flex items-center gap-3">
                    <input
                      autoFocus type="text" value={newGoalText}
                      onChange={e => setNewGoalText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addGoal(); if (e.key === 'Escape') { setShowAddGoal(false); setNewGoalText(''); } }}
                      placeholder="e.g. Run 10K in 55 min"
                      className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={addGoal} className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wide transition-colors active:scale-95">
                        Save
                      </button>
                      <button 
                        onClick={() => { setShowAddGoal(false); setNewGoalText(''); }}
                        className="w-9 h-9 rounded-lg border border-outline-variant/20 text-on-surface-variant flex items-center justify-center hover:bg-surface-container-highest transition-colors active:scale-95"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Manage Run Types ────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Manage Run Types</h3>
            <button
              onClick={() => { setShowAddRunType(s => !s); setAddRunTypeMode('preset'); }}
              className="flex items-center gap-1.5 text-[10px] text-secondary font-black uppercase tracking-widest hover:text-secondary/80 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Type
            </button>
          </div>

          <div className="space-y-3">
            {enriched.map(rt => {
              const rtKey = rt.id || rt.key || rt.name;
              return (
                <div key={rtKey} className="w-full bg-surface-container rounded-lg overflow-hidden flex items-stretch border border-outline-variant/10">
                  <button
                    onClick={() => setViewingRunType(rt)}
                    className="flex-1 min-w-0 p-4 flex items-center gap-4 hover:bg-surface-container-high transition-colors active:scale-[0.98] text-left overflow-hidden"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${rt.color}20`, color: rt.color }}>
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {rt.icon || 'directions_run'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="font-headline font-bold uppercase tracking-tight truncate" style={{ color: rt.color }}>{rt.name}</p>
                      {rt.desc && <p className="text-on-surface-variant text-xs truncate">{rt.desc}</p>}
                    </div>
                  </button>
                  <button
                    onClick={() => removeRunType(rtKey)}
                    className="px-4 border-l border-outline-variant/10 text-outline/40 hover:text-error hover:bg-error/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {showAddRunType && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
                  {/* Mode tabs */}
                  <div className="flex border-b border-outline-variant/10">
                    <button
                      onClick={() => setAddRunTypeMode('preset')}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${addRunTypeMode === 'preset' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Choose Preset
                    </button>
                    <button
                      onClick={() => setAddRunTypeMode('custom')}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${addRunTypeMode === 'custom' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Custom
                    </button>
                  </div>

                  {addRunTypeMode === 'preset' ? (
                    <div className="p-3 space-y-1">
                      {RUN_TYPE_PRESETS.map(preset => {
                        const alreadyAdded = runTypes.some(rt => rt.presetKey === preset.key);
                        return (
                          <button
                            key={preset.key}
                            onClick={() => !alreadyAdded && addRunTypeFromPreset(preset)}
                            disabled={alreadyAdded}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-container-high active:scale-[0.98]'}`}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-secondary/10 text-secondary">
                              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{preset.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm text-on-surface uppercase tracking-tight">{preset.name}</p>
                              <p className="text-on-surface-variant text-xs truncate">{preset.desc}</p>
                            </div>
                            {alreadyAdded && (
                              <span className="material-symbols-outlined text-secondary text-lg shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            )}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setShowAddRunType(false)}
                        className="w-full mt-2 py-2.5 rounded-lg border border-outline-variant/20 text-on-surface-variant font-bold text-xs uppercase tracking-wide hover:bg-surface-container-high transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Custom Run Type</p>
                      <input
                        autoFocus type="text" value={newRTName}
                        onChange={e => setNewRTName(e.target.value)}
                        placeholder="Name (e.g. Track Workout)"
                        className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                      />
                      <input
                        type="text" value={newRTDesc}
                        onChange={e => setNewRTDesc(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCustomRunType(); if (e.key === 'Escape') { setShowAddRunType(false); setNewRTName(''); setNewRTDesc(''); } }}
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

          {enriched.length === 0 && !showAddRunType && (
            <div className="bg-surface-container rounded-xl px-5 py-8 text-center border border-outline-variant/10 mt-3">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-2">directions_run</span>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">No run types yet</p>
            </div>
          )}
        </section>

        {/* ── Free Run ─────────────────────────────────────── */}
        <button
          onClick={() => startRun({ name: 'Free Run', key: 'free', id: 'free' })}
          className="w-full py-4 rounded-full border border-secondary/30 text-secondary font-headline font-bold uppercase tracking-tighter hover:bg-secondary/10 transition-colors active:scale-95"
        >
          Start Free Run
        </button>
      </div>

      {/* ── Toast ─────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary-fixed px-6 py-3 rounded-full font-bold text-sm shadow-lg z-50 whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {showProgressionEdit && (
        <EditProgressionModal
          lifts={runLifts}
          onSave={saveLifts}
          onClose={() => setShowProgressionEdit(false)}
        />
      )}

      {/* ── Run Type Detail Modal ───────────────────────── */}
      <AnimatePresence>
        {viewingRunType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 backdrop-blur-sm px-4 pb-10"
            onClick={() => setViewingRunType(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-xl bg-surface-container rounded-[2.5rem] overflow-hidden shadow-2xl border border-outline-variant/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-10">
                <div className="flex items-center gap-6 mb-8">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{ background: `${viewingRunType.color || '#00e3fd'}20`, color: viewingRunType.color || '#00e3fd' }}
                  >
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {viewingRunType.icon || 'directions_run'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: viewingRunType.color || '#00e3fd' }}>
                      Run Type Detail
                    </p>
                    <h2 className="font-headline font-black text-4xl uppercase tracking-tighter leading-none text-on-surface">
                      {viewingRunType.name}
                    </h2>
                  </div>
                </div>

                <div className="space-y-8">
                  {viewingRunType.sessionText && (
                    <div className="bg-secondary/5 rounded-2xl p-6 border border-secondary/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">
                        Today's session
                      </p>
                      <p className="text-on-surface text-2xl font-black uppercase tracking-tight leading-loose">
                        {viewingRunType.sessionText}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-4">
                      Description & Focus
                    </p>
                    <p className="text-on-surface text-xl leading-relaxed font-medium italic">
                      {viewingRunType.desc || 'No description provided for this session type.'}
                    </p>
                  </div>

                  {viewingRunType.presetKey && (
                    <div className="bg-surface-container-highest/30 rounded-2xl p-4 border border-outline-variant/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-sm text-secondary">info</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Training Note</p>
                      </div>
                      <p className="text-xs text-on-surface-variant/80 italic">
                        This is a preset training type designed to build specific physiological adaptations.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-12 flex flex-col gap-4">
                  <button
                    onClick={() => { startRun(viewingRunType); setViewingRunType(null); }}
                    className="w-full py-6 rounded-2xl bg-secondary text-on-secondary font-headline font-black uppercase tracking-tighter text-2xl shadow-[0_20px_50px_rgba(0,227,253,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
                  >
                    <span>Start Session</span>
                    <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  </button>
                  <button
                    onClick={() => setViewingRunType(null)}
                    className="w-full py-4 rounded-xl text-on-surface-variant font-black text-xs uppercase tracking-[0.2em] hover:bg-surface-container-highest transition-colors active:scale-95"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
