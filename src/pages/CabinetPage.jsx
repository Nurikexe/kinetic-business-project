import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Download, ChevronDown, LogOut,
  Trophy, Dumbbell, Calendar, Loader2,
  Trash2, FileText, FileJson, Printer, AlignLeft,
  LayoutList, CalendarDays, CalendarRange,
  CheckSquare, Square, X, Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const SPRING = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 };

function getWorkoutContent(workout) {
  if (Array.isArray(workout.exercises)) {
    return { exercises: workout.exercises, notes: '' };
  }

  return {
    exercises: workout.exercises?.items || [],
    notes: workout.exercises?.notes || '',
  };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function today() { return new Date().toISOString().split('T')[0]; }

// ── Export helpers ─────────────────────────────────────────────

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV(workouts, displayName) {
  const rows = workouts.flatMap(w =>
    getWorkoutContent(w).exercises.map(e =>
      [w.date, w.day_name, w.day_focus ?? '', e.name, e.sets, e.reps, e.weight || '', `"${(getWorkoutContent(w).notes || '').replaceAll('"', '""')}"`].join(',')
    )
  );
  const csv = ['Date,Day,Focus,Exercise,Sets,Reps,Weight (kg),Notes', ...rows].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `hybrid-athlete-${displayName}-${today()}.csv`);
}

function exportJSON(workouts, displayName) {
  const data = workouts.map(w => ({
    date: w.date, day: w.day_name, focus: w.day_focus ?? '', ...getWorkoutContent(w),
  }));
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `hybrid-athlete-${displayName}-${today()}.json`
  );
}

function exportTXT(workouts, displayName) {
  const sep = '─'.repeat(44);
  const lines = [
    `HYBRID ATHLETE — ${displayName.toUpperCase()}`,
    `Exported: ${formatDate(new Date().toISOString())}  ·  ${workouts.length} sessions`,
    '',
  ];
  workouts.forEach(w => {
    const { exercises, notes } = getWorkoutContent(w);
    lines.push(sep);
    lines.push(`${w.date}  —  ${w.day_name}${w.day_focus ? '  ·  ' + w.day_focus : ''}`);
    if (notes) lines.push(`Note: ${notes}`);
    lines.push('');
    exercises.forEach((e, i) => {
      const weight = e.weight ? `  @  ${e.weight} kg` : '';
      lines.push(`  ${String(i + 1).padStart(2, '0')}.  ${e.name}  —  ${e.sets}×${e.reps}${weight}`);
    });
    lines.push('');
  });
  downloadBlob(
    new Blob([lines.join('\n')], { type: 'text/plain' }),
    `hybrid-athlete-${displayName}-${today()}.txt`
  );
}

function exportPDF(workouts, displayName) {
  const rows = workouts.map(w => `
    <section style="margin-bottom:24px;page-break-inside:avoid">
      <h3 style="margin:0 0 4px;font-size:14px;color:#00ffaa">${w.date} — ${w.day_name}${w.day_focus ? ' · ' + w.day_focus : ''}</h3>
      ${getWorkoutContent(w).notes ? `<p style="margin:0 0 10px;font-size:12px;color:#888">${getWorkoutContent(w).notes}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1a1a1a;color:#888">
            <th style="text-align:left;padding:4px 8px">#</th>
            <th style="text-align:left;padding:4px 8px">Exercise</th>
            <th style="padding:4px 8px">Sets</th>
            <th style="padding:4px 8px">Reps</th>
            <th style="padding:4px 8px">Weight</th>
          </tr>
        </thead>
        <tbody>
          ${getWorkoutContent(w).exercises.map((e, i) => `
            <tr style="border-bottom:1px solid #222">
              <td style="padding:4px 8px;color:#555">${String(i + 1).padStart(2, '0')}</td>
              <td style="padding:4px 8px">${e.name}</td>
              <td style="padding:4px 8px;text-align:center">${e.sets}</td>
              <td style="padding:4px 8px;text-align:center">${e.reps}</td>
              <td style="padding:4px 8px;text-align:center">${e.weight ? e.weight + ' kg' : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </section>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Hybrid Athlete — ${displayName}</title>
    <style>
      body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#eee;padding:32px;max-width:800px;margin:0 auto}
      h1{font-size:28px;letter-spacing:4px;text-transform:uppercase;color:#00ffaa;margin-bottom:4px}
      p{color:#666;font-size:12px;margin-bottom:32px}
      @media print{body{background:#fff;color:#000}h1{color:#000}h3{color:#000}}
    </style></head><body>
    <h1>Hybrid Athlete</h1>
    <p>${displayName} · Exported ${formatDate(new Date().toISOString())} · ${workouts.length} sessions</p>
    ${rows}
    <script>window.onload=()=>window.print()</script>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// ── Grouping helpers ───────────────────────────────────────────

function groupByMonth(workouts) {
  const map = new Map();
  workouts.forEach(w => {
    const d   = new Date(w.date || w.submitted_at);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(w);
  });
  return [...map.entries()];
}

function groupByWeek(workouts) {
  const map = new Map();
  workouts.forEach(w => {
    const d     = new Date(w.date || w.submitted_at);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const key = `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(w);
  });
  return [...map.entries()];
}

// ── Workout entry card ─────────────────────────────────────────

function WorkoutEntry({ workout, onDelete, selectMode, isSelected, onToggleSelect }) {
  const [open, setOpen]         = useState(false);
  const [confirming, setConfirm] = useState(false);
  const { exercises, notes } = getWorkoutContent(workout);

  return (
    <motion.div layout className="bg-bg-700 border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* Checkbox in select mode */}
        {selectMode ? (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => onToggleSelect(workout.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected ? 'bg-mint border-mint' : 'border-white/20 hover:border-white/40'
            }`}
          >
            {isSelected && <CheckSquare size={12} className="text-bg-900" />}
          </motion.button>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-mint/[0.08] border border-mint/15 flex items-center justify-center flex-shrink-0">
            <Dumbbell size={14} className="text-mint" />
          </div>
        )}

        <button onClick={() => setOpen(v => !v)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-body font-semibold text-text-primary leading-none mb-1">
            {workout.day_name}
            {workout.day_focus && <span className="text-text-muted font-normal"> — {workout.day_focus}</span>}
          </p>
          <p className="font-mono text-[10px] text-text-muted tracking-wider">
            {formatDate(workout.date)} · {exercises.length} exercises
          </p>
        </button>

        {/* Delete (hidden in select mode) */}
        {!selectMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <AnimatePresence mode="wait">
              {confirming ? (
                <motion.div key="confirm"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1"
                >
                  <button onClick={() => setConfirm(false)}
                    className="text-[11px] font-body text-text-muted hover:text-text-primary px-2 py-1 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => onDelete(workout.id)}
                    className="text-[11px] font-body text-red bg-red/10 hover:bg-red/20 px-2 py-1 rounded-lg transition-colors font-semibold">
                    Delete
                  </button>
                </motion.div>
              ) : (
                <motion.button key="trash"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setConfirm(true)}
                  className="p-1.5 rounded-lg text-text-muted/40 hover:text-red hover:bg-red/10 transition-colors"
                >
                  <Trash2 size={13} />
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button onClick={() => setOpen(v => !v)}
              animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
              className="p-1.5 text-text-muted hover:text-text-secondary transition-colors">
              <ChevronDown size={15} />
            </motion.button>
          </div>
        )}

        {/* Expand toggle in select mode */}
        {selectMode && (
          <motion.button onClick={() => setOpen(v => !v)}
            animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
            className="p-1.5 text-text-muted hover:text-text-secondary transition-colors">
            <ChevronDown size={15} />
          </motion.button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-1.5 border-t border-white/[0.04]">
              {notes && (
                <div className="mb-2 rounded-xl bg-bg-800/80 border border-white/[0.04] px-3 py-2.5">
                  <p className="font-mono text-[9px] tracking-[2px] uppercase text-mint/60 mb-1">Workout Note</p>
                  <p className="text-[12px] font-body text-text-secondary leading-relaxed">{notes}</p>
                </div>
              )}
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
                  <span className="font-mono text-[10px] text-text-muted w-4 text-right flex-shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[13px] font-body text-text-secondary">{ex.name}</span>
                  <span className="font-mono text-[11px] text-mint/80 font-bold">{ex.sets}×{ex.reps}</span>
                  {ex.weight && <span className="font-mono text-[11px] text-text-muted">{ex.weight}kg</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Group header ───────────────────────────────────────────────

function GroupHeader({ label, count }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1 first:pt-0">
      <span className="font-mono text-[10px] tracking-[2px] uppercase text-mint/70">{label}</span>
      <span className="font-mono text-[10px] text-text-muted/40">{count}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function CabinetPage() {
  const { user, displayName, logout } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Filters
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // View
  const [groupMode, setGroupMode] = useState('all'); // 'all' | 'month' | 'week'

  // Selection
  const [selectMode,     setSelectMode]     = useState(false);
  const [selected,       setSelected]       = useState(new Set());
  const [bulkDeleting,   setBulkDeleting]   = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load workouts:', error.message);
        setWorkouts(data || []);
        setFetching(false);
      });
  }, [user?.id]);

  const handleDelete = async (id) => {
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (!error) setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const ids = [...selected];
    const { error } = await supabase.from('workouts').delete().in('id', ids);
    if (!error) {
      setWorkouts(prev => prev.filter(w => !selected.has(w.id)));
      setSelected(new Set());
      setSelectMode(false);
    }
    setBulkDeleting(false);
  };

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selected.size === filteredWorkouts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredWorkouts.map(w => w.id)));
    }
  };

  // Filtered workouts (for display + export)
  const filteredWorkouts = useMemo(() => workouts.filter(w => {
    const d = w.date || w.submitted_at?.split('T')[0] || '';
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  }), [workouts, fromDate, toDate]);

  const isFiltered = fromDate || toDate;

  // Grouped display
  const groups = useMemo(() => {
    if (groupMode === 'month') return groupByMonth(filteredWorkouts);
    if (groupMode === 'week')  return groupByWeek(filteredWorkouts);
    return [['', filteredWorkouts]];
  }, [filteredWorkouts, groupMode]);

  // Stats
  const totalSets = workouts.reduce((s, w) =>
    s + getWorkoutContent(w).exercises.reduce((ss, e) => ss + (e.sets || 0), 0), 0
  );
  const freq = {};
  workouts.forEach(w => getWorkoutContent(w).exercises.forEach(e => { freq[e.name] = (freq[e.name] || 0) + 1; }));
  const topExercise = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

  const EXPORT_FORMATS = [
    { label: 'CSV',  icon: <FileText size={13} />,  action: () => exportCSV(filteredWorkouts, displayName)  },
    { label: 'JSON', icon: <FileJson size={13} />,  action: () => exportJSON(filteredWorkouts, displayName) },
    { label: 'TXT',  icon: <AlignLeft size={13} />, action: () => exportTXT(filteredWorkouts, displayName)  },
    { label: 'PDF',  icon: <Printer size={13} />,   action: () => exportPDF(filteredWorkouts, displayName)  },
  ];

  return (
    <>
      {/* Hero */}
      <div className="pt-7 pb-5 mb-1">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, ...SPRING }}
          className="font-mono text-[10px] tracking-[4px] text-mint/60 uppercase mb-2"
        >
          Personal Cabinet
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...SPRING }}
          className="flex items-center justify-between"
        >
          <h1 className="font-display text-[40px] leading-none tracking-wide uppercase">
            <span className="text-mint">{displayName}</span>
          </h1>
          <motion.button whileTap={{ scale: 0.93 }} onClick={logout}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red transition-colors py-1.5 px-3 rounded-lg hover:bg-red/[0.07] font-body border border-white/[0.06]">
            <LogOut size={12} /> Sign out
          </motion.button>
        </motion.div>
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 28 }}
          style={{ originX: 0 }}
          className="h-px bg-gradient-to-r from-mint/30 via-mint/10 to-transparent mt-5"
        />
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, ...SPRING }}
        className="grid grid-cols-3 gap-2 mb-4"
      >
        {[
          { icon: <Calendar size={14} />, label: 'Sessions',  value: workouts.length },
          { icon: <Dumbbell size={14} />, label: 'Total Sets', value: totalSets },
          { icon: <Trophy size={14} />,   label: 'Top Lift',   value: topExercise ? topExercise[0].split(' ')[0] : '—' },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-bg-700 border border-white/[0.05] rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="text-mint/70">{icon}</div>
            <p className="font-display text-xl leading-none text-text-primary">{value}</p>
            <p className="font-mono text-[9px] tracking-[2px] uppercase text-text-muted">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Export section */}
      {workouts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="mb-4 bg-bg-700/50 border border-white/[0.06] rounded-2xl p-4"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download size={13} className="text-mint/70" />
              <span className="font-mono text-[10px] tracking-[3px] uppercase text-text-muted">Export</span>
              {isFiltered && (
                <span className="font-mono text-[10px] text-mint/60">
                  ({filteredWorkouts.length}/{workouts.length})
                </span>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-body px-2.5 py-1 rounded-lg border transition-colors ${
                showFilter || isFiltered
                  ? 'text-mint border-mint/25 bg-mint/[0.07]'
                  : 'text-text-muted border-white/[0.06] hover:text-mint hover:border-mint/20'
              }`}
            >
              <Filter size={10} />
              {isFiltered ? 'Filtered' : 'Date range'}
            </motion.button>
          </div>

          {/* Date range filter */}
          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.04]">
                  <div className="flex-1">
                    <p className="font-mono text-[9px] tracking-[2px] uppercase text-text-muted mb-1">From</p>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-bg-900 border border-white/[0.06] rounded-lg font-mono text-[11px] text-text-primary outline-none focus:border-mint/30 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-[9px] tracking-[2px] uppercase text-text-muted mb-1">To</p>
                    <input
                      type="date"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-bg-900 border border-white/[0.06] rounded-lg font-mono text-[11px] text-text-primary outline-none focus:border-mint/30 transition-colors"
                    />
                  </div>
                  {isFiltered && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => { setFromDate(''); setToDate(''); }}
                      className="mt-5 p-2 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-colors"
                    >
                      <X size={13} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Format buttons */}
          <div className="grid grid-cols-4 gap-2">
            {EXPORT_FORMATS.map(({ label, icon, action }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={action}
                disabled={filteredWorkouts.length === 0}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-mint/20 bg-mint/[0.06] text-mint font-body hover:bg-mint/[0.10] transition-colors disabled:opacity-30"
              >
                {icon}
                <span className="text-[10px] font-mono tracking-[1px]">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* History header */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-3">
          <User size={14} className="text-mint/70" />
          <span className="font-mono text-[10px] tracking-[3px] uppercase text-text-muted">
            Workout History
          </span>
          {workouts.length > 0 && (
            <span className="font-mono text-[10px] text-text-muted/50 ml-auto">
              {isFiltered ? `${filteredWorkouts.length} of ${workouts.length}` : `${workouts.length} entries`}
            </span>
          )}
        </div>

        {/* Toolbar: group mode + select */}
        {!fetching && workouts.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {/* Group mode pills */}
            <div className="flex gap-1 bg-bg-700 border border-white/[0.05] rounded-xl p-1">
              {[
                { key: 'all',   icon: <LayoutList size={11} />,    label: 'All'   },
                { key: 'month', icon: <CalendarDays size={11} />,   label: 'Month' },
                { key: 'week',  icon: <CalendarRange size={11} />,  label: 'Week'  },
              ].map(({ key, icon, label }) => (
                <motion.button key={key} whileTap={{ scale: 0.93 }}
                  onClick={() => setGroupMode(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-body transition-colors ${
                    groupMode === key
                      ? 'bg-mint/[0.12] text-mint border border-mint/20'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {icon} {label}
                </motion.button>
              ))}
            </div>

            {/* Select mode toggle */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => { setSelectMode(v => !v); setSelected(new Set()); }}
              className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-body transition-colors ${
                selectMode
                  ? 'bg-red/[0.08] border-red/20 text-red'
                  : 'border-white/[0.06] text-text-muted hover:text-text-secondary'
              }`}
            >
              {selectMode ? <X size={11} /> : <CheckSquare size={11} />}
              {selectMode ? 'Cancel' : 'Select'}
            </motion.button>
          </div>
        )}

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selectMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex items-center gap-2 p-3 bg-bg-700 border border-white/[0.06] rounded-xl">
                <motion.button whileTap={{ scale: 0.93 }} onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-[11px] font-body text-text-muted hover:text-text-primary transition-colors">
                  {selected.size === filteredWorkouts.length && filteredWorkouts.length > 0
                    ? <CheckSquare size={12} className="text-mint" />
                    : <Square size={12} />
                  }
                  {selected.size === filteredWorkouts.length && filteredWorkouts.length > 0 ? 'Deselect all' : 'Select all'}
                </motion.button>
                <span className="font-mono text-[10px] text-text-muted/50 ml-1">
                  {selected.size > 0 ? `${selected.size} selected` : ''}
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkDelete}
                  disabled={selected.size === 0 || bulkDeleting}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red/10 border border-red/20 text-red text-[11px] font-body font-semibold hover:bg-red/20 transition-colors disabled:opacity-30"
                >
                  {bulkDeleting
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Trash2 size={11} />
                  }
                  Delete {selected.size > 0 ? `(${selected.size})` : ''}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Workout list */}
      {fetching ? (
        <div className="flex items-center justify-center py-16 gap-2 text-text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="font-mono text-[11px] tracking-[2px] uppercase">Loading…</span>
        </div>
      ) : workouts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center py-12 text-text-muted/60 font-body text-sm"
        >
          No workouts yet. Submit your first session from the Gym page.
        </motion.div>
      ) : filteredWorkouts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-10 text-text-muted/50 font-body text-sm"
        >
          No workouts in selected date range.
          <button onClick={() => { setFromDate(''); setToDate(''); }}
            className="ml-2 text-mint/70 hover:text-mint underline underline-offset-2 transition-colors">
            Clear filter
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, ...SPRING }}
          className="space-y-4 pb-4"
        >
          {groups.map(([groupLabel, groupWorkouts]) => (
            <div key={groupLabel}>
              {groupLabel && <GroupHeader label={groupLabel} count={`${groupWorkouts.length} session${groupWorkouts.length !== 1 ? 's' : ''}`} />}
              <div className="space-y-2">
                <AnimatePresence>
                  {groupWorkouts.map(w => (
                    <motion.div
                      key={w.id}
                      layout
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <WorkoutEntry
                        workout={w}
                        onDelete={handleDelete}
                        selectMode={selectMode}
                        isSelected={selected.has(w.id)}
                        onToggleSelect={toggleSelect}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </>
  );
}
