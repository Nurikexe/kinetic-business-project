import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Target, Zap, Heart, Flame,
  ChevronLeft, ChevronRight, ChevronsRight, Check, RotateCcw,
  TableProperties, Pencil, GripVertical, X, Plus, Trash2,
  TrendingUp, Timer, Wind, RefreshCw,
} from 'lucide-react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Section from '../components/Section';
import ProgressBar from '../components/ProgressBar';
import { useUserConfig } from '../context/UserConfigContext';
import { DEFAULT_RUN_TYPES } from '../data/defaults';

const SPRING = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 };

// ── Icon system ────────────────────────────────────────────────
const ICON_MAP = {
  zap:            <Zap size={17} />,
  heart:          <Heart size={17} />,
  flame:          <Flame size={17} />,
  trending_up:    <TrendingUp size={17} />,
  timer:          <Timer size={17} />,
  wind:           <Wind size={17} />,
  refresh_cw:     <RefreshCw size={17} />,
  chevrons_right: <ChevronsRight size={17} />,
};
const renderIcon = (key) => ICON_MAP[key] ?? ICON_MAP.zap;

// ── Default run type catalog (from run_types.md) ──────────────
const RUN_TYPE_CATALOG = [
  { key: 'zone_2_easy',          name: 'Zone 2 Run',          desc: 'Easy pace — builds aerobic engine',             iconKey: 'heart',          color: '#00ccff' },
  { key: 'long_run',             name: 'Long Run',             desc: 'Distance focus — builds raw endurance',         iconKey: 'flame',          color: '#ff3b5c' },
  { key: 'tempo',                name: 'Tempo Run',            desc: 'Speed intervals — builds lactate threshold',    iconKey: 'zap',            color: '#ffb020' },
  { key: 'threshold',            name: 'Threshold Run',        desc: 'Race pace effort — builds speed endurance',     iconKey: 'trending_up',    color: '#ff6b35' },
  { key: 'intervals',            name: 'Intervals',            desc: 'High-intensity repeats — builds VO2 max',       iconKey: 'timer',          color: '#a855f7' },
  { key: 'fartlek',              name: 'Fartlek',              desc: 'Unstructured speed play — builds versatility',  iconKey: 'wind',           color: '#00ffaa' },
  { key: 'hill_repeats',         name: 'Hill Repeats',         desc: 'Uphill efforts — builds strength and power',    iconKey: 'trending_up',    color: '#f59e0b' },
  { key: 'recovery_run',         name: 'Recovery Run',         desc: 'Very easy pace — promotes recovery',            iconKey: 'refresh_cw',     color: '#6b7280' },
  { key: 'progression_run',      name: 'Progression Run',      desc: 'Start slow, finish fast — builds pace control', iconKey: 'trending_up',    color: '#10b981' },
  { key: 'strides',              name: 'Strides',              desc: 'Short accelerations — improves turnover',       iconKey: 'chevrons_right', color: '#00ccff' },
  { key: 'sprint_accelerations', name: 'Sprint Accelerations', desc: 'Max speed sprints — builds top-end speed',      iconKey: 'zap',            color: '#ff3b5c' },
];

const PRESET_COLORS = ['#ffb020', '#00ccff', '#ff3b5c', '#a855f7', '#00ffaa', '#ff6b35', '#10b981', '#6b7280'];

// Resolve iconKey by catalog match for types that lack it (e.g. loaded from Supabase)
const enrichRunType = (rt) => {
  if (rt.iconKey) return rt;
  const match = RUN_TYPE_CATALOG.find(c => c.name === rt.name || c.name === rt.type);
  return { ...rt, iconKey: match?.iconKey ?? 'zap', color: rt.color || match?.color || '#00ccff' };
};

const dayToKey    = (day) => (day || '').slice(0, 3).toLowerCase(); // 'Monday' → 'mon'
const keyToLabel  = (key) => key.charAt(0).toUpperCase() + key.slice(1); // 'mon' → 'Mon'
const getRunTypeId = (rt, i) => String(rt?.id || rt?.key || `${rt?.day || 'day'}-${rt?.name || 'run'}-${i}`);
const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const syncRunTypeDays = (items) => {
  const orderedSlots = [...items.map(rt => rt.day || 'Monday')].sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)
  );

  return items.map((rt, idx) => ({
    ...rt,
    day: orderedSlots[idx] || rt.day || 'Monday',
  }));
};

const parseGoalTargets = (value) => {
  const fallback = [{ id: 'goal-1', distance: '10K', pace: '6:00' }];
  if (!value) return fallback;

  if (value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((goal, i) => ({
          id: goal.id || `goal-${i + 1}`,
          distance: (goal.distance || '10K').toUpperCase(),
          pace: goal.pace || '6:00',
        }));
      }
    } catch {
      return fallback;
    }
  }

  const [distance, pace] = value.includes('|') ? value.split('|') : ['10K', value];
  return [{ id: 'goal-1', distance: (distance || '10K').toUpperCase(), pace: pace || '6:00' }];
};

// ── Sortable run type card ─────────────────────────────────────
function SortableRunType({ id, rt, i }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`origin-center ${isDragging ? 'z-0 scale-[0.985] opacity-30' : 'z-10'}`}
    >
      <RunTypeCard rt={rt} i={i} attributes={attributes} listeners={listeners} isOverlay={false} />
    </div>
  );
}

function ThisWeekCard({ rt, done, content, onToggle, attributes = {}, listeners = {}, isOverlay = false }) {
  const e = enrichRunType(rt);

  return (
    <motion.div
      whileHover={!isOverlay ? { y: -2 } : undefined}
      whileTap={!isOverlay ? { scale: 0.98 } : undefined}
      transition={SPRING}
      onClick={!isOverlay ? onToggle : undefined}
      className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border transition-colors duration-300 select-none ${
        isOverlay
          ? 'bg-bg-700/95 border-cyan/25 shadow-[0_26px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] cursor-grabbing'
          : done
          ? 'bg-cyan/[0.07] border-cyan/20'
          : 'bg-bg-700 border-white/[0.04] hover:border-white/[0.08] cursor-pointer'
      }`}
    >
      <div
        {...attributes} {...listeners}
        className={`absolute top-1.5 right-1.5 touch-none ${isOverlay ? 'cursor-grabbing text-text-primary/60' : 'cursor-grab active:cursor-grabbing text-text-muted/30 hover:text-text-muted/70'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={10} />
      </div>
      <span className={`font-mono text-[10px] tracking-widest uppercase ${done ? 'text-cyan' : 'text-text-muted'}`}>
        {dayToKey(e.day).toUpperCase()}
      </span>
      <motion.div animate={done ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
          done ? 'bg-cyan' : 'border border-bg-400'
        }`}>
        {done && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
            <Check size={15} strokeWidth={3} className="text-bg-900" />
          </motion.div>
        )}
      </motion.div>
      <span className={`font-mono text-[9px] text-center leading-tight tracking-wide px-1 ${done ? 'text-cyan' : 'text-text-muted'}`}>
        {content ?? ''}
      </span>
    </motion.div>
  );
}

function SortableThisWeekCard({ id, rt, done, content, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'scale-[0.985] opacity-30' : ''}>
      <ThisWeekCard
        rt={rt}
        done={done}
        content={content}
        onToggle={onToggle}
        attributes={attributes}
        listeners={listeners}
      />
    </div>
  );
}

function RunTypeCard({ rt, i = 0, attributes = {}, listeners = {}, isOverlay = false }) {
  const e = enrichRunType(rt);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={isOverlay ? { duration: 0.12 } : { delay: i * 0.07, ...SPRING }}
      className={`flex items-center gap-3 rounded-2xl p-4 backdrop-blur-sm select-none ${
        isOverlay
          ? 'bg-bg-700/95 border border-cyan/25 shadow-[0_26px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] scale-[1.02] cursor-grabbing'
          : 'bg-bg-700/60 border border-white/[0.06]'
      }`}
    >
      <span {...attributes} {...listeners}
        className={`touch-none flex-shrink-0 ${isOverlay ? 'cursor-grabbing text-text-primary/70' : 'cursor-grab active:cursor-grabbing text-text-muted/40 hover:text-text-muted/70'}`}>
        <GripVertical size={14} />
      </span>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${e.color}12`, color: e.color }}>
        {renderIcon(e.iconKey)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] tracking-[2px] uppercase mb-0.5" style={{ color: e.color, opacity: 0.8 }}>
          {e.day}
        </p>
        <p className="font-display text-[15px] tracking-wide uppercase">{e.name}</p>
        <p className="text-[12px] font-body text-text-muted font-light mt-0.5">{e.desc}</p>
      </div>
    </motion.div>
  );
}

// ── Sortable week row ─────────────────────────────────────────
function SortableWeekRow({ week, idx, isCur, isPast, wDone, editingIdx, onSelect, onEdit, editRow, dayKeys }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(idx) });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <motion.tr
      ref={setNodeRef}
      style={style}
      whileHover={!isDragging ? { scale: 1.003 } : {}}
      className={`transition-opacity duration-200 ${isPast ? 'opacity-35' : ''}`}
    >
      <td className={`px-2 py-2.5 rounded-l-xl font-mono text-xs font-bold tracking-wider select-none ${
        isCur ? 'border-l-2 border-cyan bg-cyan/[0.07] text-cyan' : 'bg-bg-700 text-text-muted'
      }`}>
        <div className="flex items-center gap-1.5">
          <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted/40 hover:text-text-muted/70 touch-none">
            <GripVertical size={12} />
          </span>
          <button onClick={() => onSelect(idx)} className="hover:text-text-primary transition-colors">
            W{week.week}{wDone ? ' ✓' : isCur ? ' ◀' : ''}
          </button>
        </div>
      </td>

      {editingIdx === idx ? (
        dayKeys.map((key, j) => (
          <td key={key} className={`px-2 py-1.5 bg-cyan/[0.05] ${j === dayKeys.length - 1 ? 'rounded-r-xl' : ''}`}>
            <input
              value={week[key] ?? ''}
              onChange={e => editRow(idx, key, e.target.value)}
              className="w-full bg-bg-800 border border-cyan/20 rounded-lg px-2 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-cyan/40 transition-colors"
            />
          </td>
        ))
      ) : (
        dayKeys.map((key, j) => (
          <td key={key} className={`px-3 py-2.5 font-mono text-[11px] cursor-pointer ${j === dayKeys.length - 1 ? 'rounded-r-xl' : ''} ${
            isCur ? 'bg-cyan/[0.07] text-text-primary' : 'bg-bg-700 text-text-secondary'
          }`} onClick={() => onSelect(idx)}>
            {week[key] ?? '—'}
          </td>
        ))
      )}

      <td className="pl-1 pr-0 py-2.5 bg-transparent">
        <button
          onClick={() => onEdit(editingIdx === idx ? null : idx)}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
            editingIdx === idx ? 'text-cyan bg-cyan/10' : 'text-text-muted/40 hover:text-text-muted'
          }`}
        >
          {editingIdx === idx ? <X size={11} /> : <Pencil size={11} />}
        </button>
      </td>
    </motion.tr>
  );
}

// ── Edit run session modal ────────────────────────────────────
function EditRunSessionModal({ sessions, onSave, onClose }) {
  const [local, setLocal] = useState(sessions.map(s => ({ ...enrichRunType(s) })));

  const update = (i, field, val) =>
    setLocal(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const applyPreset = (i, presetKey) => {
    const preset = RUN_TYPE_CATALOG.find(c => c.key === presetKey);
    if (!preset) return;
    setLocal(prev => prev.map((s, idx) => idx === i
      ? { ...s, name: preset.name, desc: preset.desc, iconKey: preset.iconKey, color: preset.color, _presetKey: presetKey }
      : s));
  };

  const add    = () => setLocal(prev => [...prev, { day: 'Monday', name: '', desc: '', iconKey: 'zap', color: '#00ccff' }]);
  const remove = (i) => setLocal(prev => prev.filter((_, idx) => idx !== i));

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
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={e => e.stopPropagation()}
          className="bg-bg-700 border border-white/[0.07] rounded-2xl w-full max-w-md max-h-[88dvh] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <h3 className="font-display text-lg tracking-[2px] uppercase">Edit Run Sessions</h3>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-500 text-text-muted hover:text-text-primary transition-colors">
              <X size={17} />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {local.map((s, i) => (
              <div key={i} className="bg-bg-800 rounded-xl p-3 border border-white/[0.04] space-y-2 group">
                {/* Day selector + delete */}
                <div className="flex gap-2 items-center">
                  <select
                    value={s.day || 'Monday'}
                    onChange={e => update(i, 'day', e.target.value)}
                    className="flex-1 px-2.5 py-2 bg-bg-900 border border-white/[0.06] rounded-lg text-sm text-text-primary font-body outline-none focus:border-cyan/30 transition-colors"
                  >
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <motion.button whileTap={{ scale: 0.88 }} onClick={() => remove(i)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={13} />
                  </motion.button>
                </div>

                {/* Preset picker */}
                <select
                  value={s._presetKey || ''}
                  onChange={e => applyPreset(i, e.target.value)}
                  className="w-full px-2.5 py-2 bg-bg-900 border border-white/[0.06] rounded-lg text-sm text-text-muted font-body outline-none focus:border-cyan/30 transition-colors"
                >
                  <option value="">— Pick from presets —</option>
                  {RUN_TYPE_CATALOG.map(c => (
                    <option key={c.key} value={c.key}>{c.name}</option>
                  ))}
                </select>

                {/* Name */}
                <input value={s.name || ''} onChange={e => update(i, 'name', e.target.value)}
                  placeholder="Session name (e.g. Tempo Run)"
                  className="w-full px-2.5 py-2 bg-bg-900 border border-white/[0.06] rounded-lg text-sm text-text-primary font-body outline-none focus:border-cyan/30 transition-colors" />

                {/* Description */}
                <input value={s.desc || ''} onChange={e => update(i, 'desc', e.target.value)}
                  placeholder="Description"
                  className="w-full px-2.5 py-2 bg-bg-900 border border-white/[0.06] rounded-lg text-sm text-text-muted font-body outline-none focus:border-cyan/30 transition-colors" />

                {/* Color + icon preview */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}20`, color: s.color }}>
                    {renderIcon(s.iconKey)}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => update(i, 'color', c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${s.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={add}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.08] text-text-muted hover:text-cyan hover:border-cyan/25 transition-colors text-sm font-body">
              <Plus size={13} /> Add Session Type
            </motion.button>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-white/[0.05]">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/[0.08] text-text-secondary text-sm font-body font-medium hover:bg-bg-600 transition-colors">
              Cancel
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onSave(local)}
              className="flex-1 py-3 rounded-xl bg-cyan/[0.12] border border-cyan/25 text-cyan text-sm font-body font-semibold hover:bg-cyan/[0.18] transition-colors">
              Save
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Add to weekly plan modal ──────────────────────────────────
function AddToWeeklyPlanModal({ newTypes, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(newTypes.map((_, i) => i)));

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(6,7,9,0.85)', backdropFilter: 'blur(14px)' }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="bg-bg-700 border border-white/[0.07] rounded-2xl w-full max-w-sm flex flex-col overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h3 className="font-display text-base tracking-[2px] uppercase">Add to Weekly Plan?</h3>
            <p className="text-[11px] font-body text-text-muted mt-1">New day columns will appear in your 8-week schedule</p>
          </div>

          <div className="p-5 space-y-2">
            {newTypes.map((rt, i) => {
              const e = enrichRunType(rt);
              return (
                <motion.button key={i} onClick={() => toggle(i)} whileTap={{ scale: 0.97 }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    selected.has(i) ? 'bg-cyan/[0.07] border-cyan/20' : 'bg-bg-800 border-white/[0.04] hover:border-white/[0.08]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    selected.has(i) ? 'bg-cyan border-cyan' : 'border-white/20'
                  }`}>
                    {selected.has(i) && <Check size={11} strokeWidth={3} className="text-bg-900" />}
                  </div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${e.color}20`, color: e.color }}>
                    {renderIcon(e.iconKey)}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-display text-[13px] tracking-wide uppercase">{e.name}</p>
                    <p className="font-mono text-[10px] text-text-muted">{e.day}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-white/[0.05]">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/[0.08] text-text-secondary text-sm font-body font-medium hover:bg-bg-600 transition-colors">
              Skip
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => onConfirm(newTypes.filter((_, i) => selected.has(i)))}
              disabled={selected.size === 0}
              className="flex-1 py-3 rounded-xl bg-cyan/[0.12] border border-cyan/25 text-cyan text-sm font-body font-semibold hover:bg-cyan/[0.18] transition-colors disabled:opacity-40">
              Add Selected
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function RunningPage() {
  const { config, updateConfig } = useUserConfig();
  const currentWeek  = config.run_week     ?? 0;
  const runCompleted = config.run_completed ?? {};
  const currentRunPace = config.ten_k_time ?? '';
  const runWeeks     = config.run_weeks    ?? [];
  const runTypes     = (config.run_types   ?? DEFAULT_RUN_TYPES).map(enrichRunType);

  const dayKeys  = runTypes.map(rt => dayToKey(rt.day));
  const dayLabels = dayKeys.map(keyToLabel);

  const [editingRowIdx,    setEditingRowIdx]   = useState(null);
  const [editingSessions,  setEditingSessions] = useState(false);
  const [pendingNewTypes,  setPendingNewTypes] = useState(null);
  const [editingTarget,    setEditingTarget]   = useState(false);
  const [activeTypeId,     setActiveTypeId]    = useState(null);
  const [activeTypeSurface, setActiveTypeSurface] = useState('list');

  const goals = parseGoalTargets(config.ten_k_target);
  const goalsSummary = goals.map(goal => `${goal.distance} @ ${goal.pace}/km`).join(' · ');
  const saveGoals = (nextGoals) => {
    updateConfig({
      ten_k_target: JSON.stringify(
        nextGoals
          .filter(goal => goal.distance.trim() || goal.pace.trim())
          .map((goal, i) => ({
            id: goal.id || `goal-${i + 1}`,
            distance: (goal.distance || '10K').toUpperCase(),
            pace: goal.pace || '6:00',
          }))
      ),
    });
  };

  const weekData = runWeeks[currentWeek] ?? {};

  // Completion helpers — supports both legacy arrays and keyed objects
  const getWeekCompletion = (weekIdx) => {
    const raw = runCompleted[weekIdx];
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const obj = {};
      dayKeys.forEach((k, i) => { obj[k] = raw[i] ?? false; });
      return obj;
    }
    return raw;
  };

  const weekCompletion = getWeekCompletion(currentWeek);
  const doneCnt        = dayKeys.filter(k => weekCompletion[k]).length;
  const totalRuns      = dayKeys.length;

  const toggleRun = (dayKey) => {
    const cur = getWeekCompletion(currentWeek);
    updateConfig({
      run_completed: { ...runCompleted, [currentWeek]: { ...cur, [dayKey]: !cur[dayKey] } },
    });
  };

  const resetWeek = () => {
    const empty = {};
    dayKeys.forEach(k => { empty[k] = false; });
    updateConfig({ run_completed: { ...runCompleted, [currentWeek]: empty } });
  };

  const editRow = (weekIdx, key, val) => {
    updateConfig({
      run_weeks: runWeeks.map((w, i) => i === weekIdx ? { ...w, [key]: val } : w),
    });
  };

  // DnD — weeks table
  const weekSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const weekIds     = runWeeks.map((_, i) => String(i));

  const handleWeekDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx       = weekIds.indexOf(active.id);
    const newIdx       = weekIds.indexOf(over.id);
    const newWeeks     = arrayMove([...runWeeks], oldIdx, newIdx);
    const newCompleted = { ...runCompleted,
      [newIdx]: runCompleted[oldIdx],
      [oldIdx]: runCompleted[newIdx],
    };
    updateConfig({
      run_weeks:     newWeeks,
      run_week:      newIdx === currentWeek ? oldIdx : oldIdx === currentWeek ? newIdx : currentWeek,
      run_completed: newCompleted,
    });
  };

  // DnD — run types list
  const typeSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const typeIds     = runTypes.map((rt, i) => getRunTypeId(rt, i));

  const handleTypeDragEnd = ({ active, over }) => {
    setActiveTypeId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = typeIds.indexOf(active.id);
    const newIdx = typeIds.indexOf(over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove([...runTypes], oldIdx, newIdx);
    updateConfig({ run_types: syncRunTypeDays(reordered) });
  };

  const activeRunType = activeTypeId == null ? null : runTypes[typeIds.indexOf(activeTypeId)];

  // 10K goal progress
  const parseMins = (str) => {
    if (!str) return 0;
    const [m, s] = str.split(':');
    return parseInt(m || 0) + (parseInt(s || 0) / 60);
  };
  const paceMins       = parseMins(currentRunPace);
  const targetPaceMins = Math.min(...goals.map(goal => parseMins(goal.pace) || 6));
  const pacePct        = paceMins > 0 ? Math.min(100, Math.max(0, ((targetPaceMins + 2 - paceMins) / 2) * 100)) : 0;

  // Save run types → detect new types with new day keys → prompt for weekly plan
  const handleSaveRunTypes = (updated) => {
    const prevNames     = new Set(runTypes.map(rt => rt.name));
    const curDayKeys    = new Set(dayKeys);
    const added         = updated.filter(rt => rt.name && !prevNames.has(rt.name));
    const newDayTypes   = added.filter(rt => !curDayKeys.has(dayToKey(rt.day)));
    updateConfig({ run_types: updated });
    setEditingSessions(false);
    if (newDayTypes.length > 0) setPendingNewTypes(newDayTypes);
  };

  // Confirm adding new types to weekly plan
  const handleAddToWeeklyPlan = (typesToAdd) => {
    if (typesToAdd.length === 0) { setPendingNewTypes(null); return; }
    const newWeeks = runWeeks.map(w => {
      const updated = { ...w };
      typesToAdd.forEach(rt => {
        const key = dayToKey(rt.day);
        if (!(key in updated)) updated[key] = '—';
      });
      return updated;
    });
    const newCompleted = {};
    for (let i = 0; i < runWeeks.length; i++) {
      const cur = getWeekCompletion(i);
      const extended = { ...cur };
      typesToAdd.forEach(rt => {
        const key = dayToKey(rt.day);
        if (!(key in extended)) extended[key] = false;
      });
      newCompleted[i] = extended;
    }
    updateConfig({ run_weeks: newWeeks, run_completed: { ...runCompleted, ...newCompleted } });
    setPendingNewTypes(null);
  };

  return (
    <>
      {/* Hero */}
      <div className="pt-7 pb-5 mb-1">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, ...SPRING }}
          className="font-mono text-[10px] tracking-[4px] text-cyan/60 uppercase mb-2"
        >
          {runWeeks.length}-Week Plan
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...SPRING }}
          className="font-display text-[44px] leading-none tracking-wide uppercase"
        >
          Running <span className="text-cyan">Blueprint</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-[12px] font-body text-text-muted mt-2 tracking-wide font-light"
        >
          {goalsSummary}
        </motion.p>
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 28 }}
          style={{ originX: 0 }}
          className="h-px bg-gradient-to-r from-cyan/30 via-cyan/10 to-transparent mt-5"
        />
      </div>

      {/* Week Tracker */}
      <Section icon={<CalendarCheck size={15} />} title="This Week" accent="cyan">
        <div className="flex items-center gap-3 mb-4">
          <motion.button whileTap={{ scale: 0.9 }} transition={SPRING}
            onClick={() => updateConfig({ run_week: Math.max(0, currentWeek - 1) })}
            disabled={currentWeek === 0}
            className="w-8 h-8 rounded-xl bg-bg-700 border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all">
            <ChevronLeft size={15} />
          </motion.button>

          <motion.span key={currentWeek} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            transition={SPRING} className="font-display text-xl tracking-[3px] uppercase">
            Week {currentWeek + 1}
          </motion.span>

          <motion.button whileTap={{ scale: 0.9 }} transition={SPRING}
            onClick={() => updateConfig({ run_week: Math.min(runWeeks.length - 1, currentWeek + 1) })}
            disabled={currentWeek >= runWeeks.length - 1}
            className="w-8 h-8 rounded-xl bg-bg-700 border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all">
            <ChevronRight size={15} />
          </motion.button>

          <div className="flex gap-1.5 ml-auto">
            {runWeeks.map((_, i) => {
              const wComp = getWeekCompletion(i);
              const wDone = dayKeys.length > 0 && dayKeys.every(k => wComp[k]);
              return (
                <motion.button key={i} whileTap={{ scale: 0.8 }}
                  onClick={() => updateConfig({ run_week: i })}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentWeek ? 'w-4 h-2 bg-cyan' : wDone ? 'w-2 h-2 bg-cyan/35' : 'w-2 h-2 bg-bg-400'
                  }`}
                  style={i === currentWeek ? { boxShadow: '0 0 8px rgba(0,204,255,0.5)' } : {}}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          <motion.span key={doneCnt} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={SPRING} className="font-display text-3xl text-text-primary">
            {doneCnt}
          </motion.span>
          <span className="text-sm text-text-muted font-body">/{totalRuns} runs done</span>
          <motion.button whileTap={{ scale: 0.93 }}
            onClick={resetWeek}
            className="ml-auto flex items-center gap-1.5 text-xs text-text-muted hover:text-red font-body transition-colors py-1 px-2.5 rounded-lg hover:bg-red/[0.06]">
            <RotateCcw size={11} /> Reset
          </motion.button>
        </div>

        <div className="h-px bg-bg-500/60 rounded-full overflow-hidden mb-4">
          <motion.div animate={{ width: `${(doneCnt / Math.max(1, totalRuns)) * 100}%` }}
            transition={{ type: 'spring', stiffness: 150, damping: 24 }}
            className="h-full bg-gradient-to-r from-cyan/60 to-mint/60" />
        </div>

        <DndContext
          sensors={typeSensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => { setActiveTypeId(active.id); setActiveTypeSurface('week'); }}
          onDragCancel={() => setActiveTypeId(null)}
          onDragEnd={handleTypeDragEnd}
        >
          <SortableContext items={typeIds} strategy={rectSortingStrategy}>
            <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${totalRuns}, minmax(0, 1fr))` }}>
              {runTypes.map((rt, i) => {
                const dayKey = dayKeys[i];
                return (
                  <SortableThisWeekCard
                    key={typeIds[i]}
                    id={typeIds[i]}
                    rt={rt}
                    done={weekCompletion[dayKey] ?? false}
                    content={weekData[dayKey] ?? ''}
                    onToggle={() => toggleRun(dayKey)}
                  />
                );
              })}
            </div>
          </SortableContext>
          {typeof document !== 'undefined' && createPortal(
            <DragOverlay dropAnimation={{
              duration: 220,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
              {activeRunType ? (
                activeTypeSurface === 'week'
                  ? <ThisWeekCard rt={activeRunType} done={false} content={weekData[dayToKey(activeRunType.day)] ?? ''} onToggle={() => {}} isOverlay />
                  : <RunTypeCard rt={activeRunType} isOverlay />
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </Section>

      {/* Goal */}
      <Section icon={<Target size={15} />} title="Goals" accent="cyan">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[2px] uppercase text-text-muted">Current pace and targets</span>
            {editingTarget ? (
              <motion.button
                onClick={() => setEditingTarget(false)}
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-1 font-mono text-[11px] text-cyan transition-colors"
              >
                Done <Check size={10} />
              </motion.button>
            ) : (
              <motion.button
                onClick={() => setEditingTarget(true)}
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-cyan transition-colors"
              >
                Edit goals <Pencil size={9} className="opacity-50 ml-0.5" />
              </motion.button>
            )}
          </div>

          <div className="bg-bg-700/60 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-display text-sm tracking-[2px] uppercase">Current Pace</span>
              <div className="flex-1" />
              <span className={`font-mono text-xs font-bold ${paceMins > 0 && paceMins <= targetPaceMins ? 'text-cyan' : 'text-text-muted'}`}>
                {paceMins > 0 ? (paceMins <= targetPaceMins ? 'Goal pace reached!' : `${(paceMins - targetPaceMins).toFixed(2)} min/km to go`) : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <input type="text" value={currentRunPace}
                onChange={e => updateConfig({ ten_k_time: e.target.value })}
                placeholder="5:00"
                className="w-24 px-3 py-2 bg-bg-600 border border-white/[0.07] rounded-lg text-sm text-center text-text-primary font-mono font-bold outline-none focus:border-cyan/35 transition-colors" />
              <span className="text-xs text-text-muted font-body">min/km</span>
            </div>
            <ProgressBar value={pacePct} max={100} accent="cyan" />
          </div>

          {goals.map((goal, idx) => (
            <div key={goal.id} className="bg-bg-700/60 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-[2px] uppercase text-text-muted mb-1">
                    Goal {idx + 1}
                  </p>
                  {editingTarget ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={goal.distance}
                        onChange={(e) => saveGoals(goals.map(item => item.id === goal.id ? { ...item, distance: e.target.value.toUpperCase() } : item))}
                        className="w-16 px-2 py-1.5 bg-bg-600 border border-white/[0.07] rounded-lg text-center font-mono text-[11px] text-text-primary outline-none focus:border-cyan/35"
                      />
                      <input
                        type="text"
                        value={goal.pace}
                        onChange={(e) => saveGoals(goals.map(item => item.id === goal.id ? { ...item, pace: e.target.value } : item))}
                        className="w-16 px-2 py-1.5 bg-bg-600 border border-white/[0.07] rounded-lg text-center font-mono text-[11px] text-text-primary outline-none focus:border-cyan/35"
                      />
                      <span className="font-mono text-[11px] text-text-muted">/km</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl tracking-[2px] uppercase text-text-primary">{goal.distance}</span>
                      <span className="font-mono text-sm text-text-muted">{goal.pace}/km</span>
                    </div>
                  )}
                </div>
                {editingTarget && (
                  <button
                    onClick={() => saveGoals(goals.filter(item => item.id !== goal.id))}
                    disabled={goals.length === 1}
                    className="text-[11px] text-text-muted hover:text-red disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {editingTarget && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => saveGoals([...goals, { id: `goal-${Date.now()}`, distance: '5K', pace: '5:00' }])}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-cyan/20 text-cyan hover:bg-cyan/[0.06] transition-colors text-sm font-body"
            >
              <Plus size={13} /> Add Goal
            </motion.button>
          )}
        </div>
      </Section>

      {/* Run Types */}
      <Section
        icon={<Zap size={15} />}
        title="Run Types"
        accent="cyan"
        action={
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setEditingSessions(true)}
            className="flex items-center gap-1.5 text-[11px] font-body text-text-muted hover:text-cyan transition-colors px-2 py-1 rounded-lg hover:bg-cyan/[0.06]">
            <Pencil size={11} /> Edit
          </motion.button>
        }
      >
        <p className="text-[10px] font-mono text-text-muted/50 mb-3 tracking-wider">
          Drag to reorder
        </p>
        <DndContext
          sensors={typeSensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => { setActiveTypeId(active.id); setActiveTypeSurface('list'); }}
          onDragCancel={() => setActiveTypeId(null)}
          onDragEnd={handleTypeDragEnd}
        >
          <SortableContext items={typeIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {runTypes.map((rt, i) => (
                <SortableRunType key={typeIds[i]} id={typeIds[i]} rt={rt} i={i} />
              ))}
            </div>
          </SortableContext>
          {typeof document !== 'undefined' && createPortal(
            <DragOverlay dropAnimation={{
              duration: 220,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
              {activeRunType && activeTypeSurface === 'list' ? <RunTypeCard rt={activeRunType} isOverlay /> : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </Section>

      {/* 8-Week Plan */}
      <Section icon={<TableProperties size={15} />} title="Weekly Plan" accent="cyan">
        <p className="text-[10px] font-mono text-text-muted/50 mb-2 tracking-wider">
          Drag rows to reorder · click ✏ to edit session content
        </p>
        <div className="overflow-x-auto -mx-1 px-1 no-scrollbar">
          <table className="w-full border-separate" style={{ borderSpacing: '0 3px', minWidth: 380 }}>
            <thead>
              <tr>
                {['Wk', ...dayLabels, ''].map(h => (
                  <th key={h} className="font-mono text-[9px] tracking-[2px] uppercase text-text-muted px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <DndContext sensors={weekSensors} collisionDetection={closestCenter} onDragEnd={handleWeekDragEnd}>
              <SortableContext items={weekIds} strategy={verticalListSortingStrategy}>
                <tbody>
                  {runWeeks.map((w, i) => {
                    const isCur  = i === currentWeek;
                    const isPast = i < currentWeek;
                    const wComp  = getWeekCompletion(i);
                    const wDone  = dayKeys.length > 0 && dayKeys.every(k => wComp[k]);
                    return (
                      <SortableWeekRow
                        key={i}
                        week={w}
                        idx={i}
                        isCur={isCur}
                        isPast={isPast}
                        wDone={wDone}
                        editingIdx={editingRowIdx}
                        onSelect={(idx) => updateConfig({ run_week: idx })}
                        onEdit={setEditingRowIdx}
                        editRow={editRow}
                        dayKeys={dayKeys}
                      />
                    );
                  })}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>

        {/* Add week */}
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={() => {
            const n = runWeeks.length + 1;
            const emptyWeek = { week: n };
            dayKeys.forEach(k => { emptyWeek[k] = ''; });
            updateConfig({ run_weeks: [...runWeeks, emptyWeek] });
          }}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.08] text-text-muted hover:text-cyan hover:border-cyan/25 transition-colors text-sm font-body"
        >
          <Plus size={13} /> Add Week
        </motion.button>
      </Section>

      {/* Edit run sessions modal */}
      {editingSessions && (
        <EditRunSessionModal
          sessions={runTypes}
          onSave={handleSaveRunTypes}
          onClose={() => setEditingSessions(false)}
        />
      )}

      {/* Add to weekly plan modal */}
      {pendingNewTypes && (
        <AddToWeeklyPlanModal
          newTypes={pendingNewTypes}
          onConfirm={handleAddToWeeklyPlan}
          onClose={() => setPendingNewTypes(null)}
        />
      )}
    </>
  );
}
