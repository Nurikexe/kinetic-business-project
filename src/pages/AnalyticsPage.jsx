import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { streamChat } from '../lib/openrouter';
import PRShareModal from '../components/PRShareModal';

const AI_LIMIT = 20;
const RESET_HOURS = 5;
const AI_STORAGE_KEY = 'kinetic_ai_state_v2';

function getAiState() {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return { count: 0, resetAt: Date.now() + RESET_HOURS * 3600 * 1000 };
    const s = JSON.parse(raw);
    // If reset time has passed, start fresh
    if (Date.now() >= s.resetAt) {
      const fresh = { count: 0, resetAt: Date.now() + RESET_HOURS * 3600 * 1000 };
      localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return s;
  } catch { return { count: 0, resetAt: Date.now() + RESET_HOURS * 3600 * 1000 }; }
}
function incrementAiState() {
  try {
    const s = getAiState();
    s.count += 1;
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(s));
    return s;
  } catch { return { count: 1, resetAt: Date.now() + RESET_HOURS * 3600 * 1000 }; }
}
function fmtCountdown(ms) {
  if (ms <= 0) return '0:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── SVG Bar chart ─────────────────────────────────────────────
function BarChart({ data, maxValue, color = '#d4fb00', showValues = false }) {
  if (!data || data.length === 0) return null;

  const CHART_W = 340;
  const CHART_H = 140;
  const PAD_LEFT = 8;
  const PAD_RIGHT = 8;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 28;
  const DRAW_W = CHART_W - PAD_LEFT - PAD_RIGHT;
  const DRAW_H = CHART_H - PAD_TOP - PAD_BOTTOM;

  const raw = data.map(d => d.value);
  const max = maxValue || Math.max(...raw, 1);
  // Use a nice ceiling so bars never fill 100%, giving breathing room
  const yMax = max * 1.2;

  const n = data.length;
  const GAP = Math.max(2, Math.round(DRAW_W / n * 0.18));
  const barW = Math.max(6, (DRAW_W - GAP * (n - 1)) / n);

  // Grid lines at 0%, 33%, 66%, 100% of yMax
  const gridLines = [0, 0.33, 0.66, 1].map(f => ({
    y: PAD_TOP + DRAW_H - f * DRAW_H,
    val: Math.round(yMax * f),
  }));

  const gradId = `bar-grad-${color.replace('#', '')}`;
  const glowId = `bar-glow-${color.replace('#', '')}`;

  const fmtVal = (v) => {
    if (v === 0) return '';
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
  };

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: CHART_H, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${gradId}-dim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.06" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {gridLines.map(({ y, val }, gi) => (
        <g key={gi}>
          <line
            x1={PAD_LEFT} y1={y} x2={CHART_W - PAD_RIGHT} y2={y}
            stroke={`${color}15`}
            strokeWidth={gi === 0 ? 1.5 : 0.75}
            strokeDasharray={gi === 0 ? 'none' : '3 4'}
          />
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = Math.max(4, (d.value / yMax) * DRAW_H);
        const x = PAD_LEFT + i * (barW + GAP);
        const y = PAD_TOP + DRAW_H - barH;
        const r = Math.min(4, barW / 2);
        const isHighlight = d.highlight;
        const fillId = isHighlight ? gradId : `${gradId}-dim`;

        return (
          <g key={i}>
            {/* Glow bar behind (highlight only) */}
            {isHighlight && (
              <rect
                x={x - 1} y={y - 1} width={barW + 2} height={barH + 1}
                rx={r + 1}
                fill={color}
                opacity={0.18}
                filter={`url(#${glowId})`}
              />
            )}
            {/* Main bar */}
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={r}
              fill={`url(#${fillId})`}
            />
            {/* Top cap highlight */}
            {isHighlight && barH > 8 && (
              <rect
                x={x + 1} y={y + 1} width={barW - 2} height={2}
                rx={1}
                fill={color}
                opacity={0.6}
              />
            )}
            {/* Value label above bar */}
            {showValues && d.value > 0 && (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={9}
                fontWeight="800"
                fontFamily="monospace"
                fill={isHighlight ? color : `${color}80`}
                letterSpacing="0.03em"
              >
                {fmtVal(d.value)}
              </text>
            )}
            {/* X-axis label */}
            <text
              x={x + barW / 2}
              y={CHART_H - 6}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight="700"
              fill={isHighlight ? color : '#555'}
              letterSpacing="0.07em"
              style={{ textTransform: 'uppercase' }}
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line
        x1={PAD_LEFT} y1={PAD_TOP + DRAW_H}
        x2={CHART_W - PAD_RIGHT} y2={PAD_TOP + DRAW_H}
        stroke={`${color}30`} strokeWidth={1}
      />
    </svg>
  );
}

// ── SVG line chart ───────────────────────────────────────────
function LineChart({ points, color = '#00e3fd' }) {
  if (!points || points.length < 2) return (
    <div className="h-28 flex items-center justify-center text-on-surface-variant text-sm">Not enough data</div>
  );
  const values = points.map(p => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 400;
  const H = 110;
  const PAD = 10;

  const coords = points.map((p, i) => ({
    x: PAD + (i / (points.length - 1)) * (W - PAD * 2),
    y: PAD + ((max - p.value) / range) * (H - PAD * 2),
  }));

  const pathD  = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaD  = `${pathD} L${coords[coords.length-1].x},${H} L${coords[0].x},${H} Z`;

  // format pace (decimal minutes) back to M:SS
  const fmtVal = (v) => {
    if (v > 3 && v < 20) { // likely a pace value
      const m = Math.floor(v);
      const s = Math.round((v - m) * 60);
      return `${m}:${String(s).padStart(2,'0')}`;
    }
    return v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(1);
  };

  const last = coords[coords.length - 1];

  return (
    <div className="relative" style={{ height: H + 24 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#lg-${color.replace('#','')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y}
            r={i === coords.length - 1 ? 5 : 3}
            fill={i === coords.length - 1 ? color : '#111'}
            stroke={color} strokeWidth="2"
          />
        ))}
        {/* Latest value tooltip */}
        <text x={Math.min(last.x + 8, W - 40)} y={last.y - 8}
          fill={color} fontSize="10" fontWeight="bold" fontFamily="monospace">
          {fmtVal(points[points.length-1].value)}
        </text>
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between px-1 mt-1">
        {points.map((p, i) => (
          <span key={i} className="text-[9px] text-on-surface-variant font-bold">{p.label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Activity row (clickable) ────────────────────────────────────
function ActivityRow({ session, onClick }) {
  const isRun = session.session_type === 'run';
  const title = session.day_name || session.title || 'Workout';
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <button
      onClick={() => onClick(session)}
      className="w-full flex items-center gap-3 bg-surface-container hover:bg-surface-container-high active:scale-[0.99] rounded-xl px-4 py-3 transition-all text-left"
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${isRun ? 'bg-primary-fixed' : 'bg-secondary'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm truncate">{title}</p>
        <p className={`text-[9px] font-black uppercase tracking-widest ${isRun ? 'text-primary-fixed' : 'text-secondary'}`}>
          {isRun ? 'Running' : 'Gym'}
          {isRun && session.total_distance != null && ` · ${Number(session.total_distance).toFixed(1)} km`}
          {isRun && session.avg_pace && ` · ${session.avg_pace}/km`}
          {!isRun && session.exercises && ` · ${Array.isArray(session.exercises) ? session.exercises.length : '—'} exercises`}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{dateStr}</span>
        <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
      </div>
    </button>
  );
}

// ── Activity Detail Modal ─────────────────────────────────────
function ActivityDetailModal({ session, onClose, onDelete }) {
  if (!session) return null;
  const isRun = session.session_type === 'run';
  const title = session.day_name || session.title || 'Workout';
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeStr = session.submitted_at
    ? new Date(session.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;
  const exercises = Array.isArray(session.exercises) ? session.exercises : session.exercises?.items ?? [];
  const sessionNotes = session.notes || session.exercises?.notes || '';

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const table = isRun ? 'run_sessions' : 'workouts';
    const { error } = await supabase.from(table).delete().eq('id', session.id);
    if (!error) {
      onDelete(session);   // removes from local state + closes modal
    } else {
      console.error('Delete failed:', error.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const exportPDF = () => {
    const exRows = exercises.map(ex =>
      `<tr><td>${ex.name || ''}</td><td>${ex.sets || ''}x${ex.reps || ''}</td><td>${ex.weight ? ex.weight + ' kg' : '—'}</td></tr>`
    ).join('');
    const body = isRun
      ? `<table><tr><th>Stat</th><th>Value</th></tr>
           <tr><td>Distance</td><td>${session.total_distance ?? '—'} km</td></tr>
           <tr><td>Avg Pace</td><td>${session.avg_pace ?? '—'}/km</td></tr>
           <tr><td>Duration</td><td>${session.duration ?? '—'}</td></tr></table>`
      : exercises.length
         ? `<table><thead><tr><th>Exercise</th><th>Sets×Reps</th><th>Weight</th></tr></thead><tbody>${exRows}</tbody></table>`
         : '<p>No exercises recorded.</p>';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Helvetica,sans-serif;color:#111;padding:32px;font-size:13px}
      h1{font-size:22px;font-weight:900;text-transform:uppercase;margin-bottom:4px}.meta{color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:12px}
      table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#111;color:#fff;padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase}
      td{padding:6px 10px;border-bottom:1px solid #eee}@media print{body{padding:20px}}</style></head>
      <body><div class="meta">${isRun ? 'RUNNING' : 'GYM'} · ${dateStr}${timeStr ? ' · ' + timeStr : ''} · KINETIC</div>
      <h1>${title}</h1>${body}
      ${sessionNotes ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px">
        <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#b45309;margin-bottom:6px;letter-spacing:1px">Feedback</div>
        <div style="font-size:13px;line-height:1.6;color:#444">${sessionNotes}</div>
      </div>` : ''}
      </body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  const exportMD = () => {
    const lines = [
      `# ${title}`, ``,
      `**Type:** ${isRun ? 'Running' : 'Gym Workout'}`,
      `**Date:** ${dateStr}${timeStr ? ' · ' + timeStr : ''}`, ``,
    ];
    if (isRun) {
      lines.push('## Stats', '', '| Stat | Value |', '|------|-------|');
      lines.push(`| Distance | ${session.total_distance ?? '—'} km |`);
      lines.push(`| Avg Pace | ${session.avg_pace ?? '—'}/km |`);
      lines.push(`| Duration | ${session.duration ?? '—'} |`);
    } else {
      if (session.day_focus) lines.push(`**Focus:** ${session.day_focus}`, '');
      if (exercises.length) {
        lines.push('## Exercises', '', '| Exercise | Sets×Reps | Weight |', '|----------|-----------|--------|');
        exercises.forEach(ex => lines.push(`| ${ex.name || ''} | ${ex.sets || ''}x${ex.reps || ''} | ${ex.weight ? ex.weight + ' kg' : '—'} |`));
      }
    }
    if (sessionNotes) lines.push('', '## Feedback', '', `> ${sessionNotes}`);
    lines.push('', '---', '*Exported from KINETIC*');
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `kinetic_${title.replace(/\s+/g, '_').toLowerCase()}_${(session.date || 'session')}.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const exportCSV = () => {
    const lines = ['Session Details', `Title,${title}`, `Type,${isRun ? 'Running' : 'Gym Workout'}`, `Date,"${dateStr}${timeStr ? ' · ' + timeStr : ''}"`, ''];
    if (isRun) {
      lines.push('Stats');
      lines.push(`Distance,${session.total_distance ?? 0} km`);
      lines.push(`Avg Pace,${session.avg_pace ?? '—'}/km`);
      lines.push(`Duration,${session.duration ?? '—'}`);
    } else {
      if (session.day_focus) lines.push(`Focus,${session.day_focus}`);
      lines.push('', 'Exercises');
      lines.push('Exercise,Sets,Reps,Weight (kg)');
      exercises.forEach(ex => lines.push(`"${ex.name || ''}",${ex.sets || ''},${ex.reps || ''},${ex.weight || ''}`));
    }
    if (sessionNotes) lines.push('', 'Feedback', `"${sessionNotes.replace(/"/g, '""')}"`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `kinetic_${title.replace(/\s+/g, '_').toLowerCase()}_${(session.date || 'session')}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] max-w-xl bg-surface-container-low rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-0" onClick={e => e.stopPropagation()}>
        {/* Hero */}
        <div className="relative h-44 shrink-0 overflow-hidden">
          <img src={isRun ? '/run_activity.jpg' : '/gym_activity.jpg'} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="absolute bottom-4 left-5">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isRun ? 'text-primary-fixed' : 'text-secondary'}`}>{isRun ? 'Running' : 'Strength'}</p>
            <h2 className="font-headline font-black text-2xl uppercase tracking-tight">{title}</h2>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 overscroll-contain">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {dateStr}{timeStr ? `, ${timeStr}` : ''}
          </div>
          {isRun ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Distance', value: session.total_distance != null ? `${Number(session.total_distance).toFixed(2)} km` : '—' },
                { label: 'Avg Pace', value: session.avg_pace ? `${session.avg_pace}/km` : '—' },
                { label: 'Duration', value: session.duration || '—' },
              ].map(stat => (
                <div key={stat.label} className="bg-surface-container rounded-xl p-3">
                  <p className="text-on-surface-variant text-[9px] font-black uppercase tracking-widest mb-1.5 truncate">{stat.label}</p>
                  <p className="font-headline font-bold text-sm leading-tight">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <>
              {session.day_focus && (
                <div className="bg-secondary-container/10 rounded-xl px-4 py-2 inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  <span className="text-secondary text-[10px] font-black uppercase tracking-widest">{session.day_focus}</span>
                </div>
              )}
              {exercises.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest">Exercises ({exercises.length})</p>
                  {exercises.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-container rounded-xl px-4 py-3">
                      <p className="font-headline font-bold text-sm">{ex.name}</p>
                      <p className="text-on-surface-variant text-xs font-bold">
                        {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ''}
                        {ex.weight ? ` @ ${ex.weight}kg` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-on-surface-variant text-sm text-center py-4">No exercise details recorded.</p>
              )}
            </>
          )}
          {sessionNotes && (
            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest mb-2">Feedback</p>
              <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{sessionNotes}</p>
            </div>
          )}
        </div>

        {/* Footer: export + delete */}
        <div className="p-4 shrink-0 border-t border-outline-variant/10 bg-surface-container-low space-y-3">
          {/* Export row */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Export this session</p>
            <div className="flex gap-2">
              <button onClick={exportPDF} className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
              </button>
              <button onClick={exportMD} className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-sm">description</span> Markdown
              </button>
              <button onClick={exportCSV} className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-sm">table_view</span> CSV
              </button>
            </div>
          </div>

          {/* Delete row */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full py-3 rounded-xl font-headline font-bold uppercase text-xs tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2 ${
              confirmDelete
                ? 'bg-error text-on-error shadow-[0_4px_20px_rgba(255,80,80,0.3)]'
                : 'bg-surface-container hover:bg-error/10 text-error'
            } disabled:opacity-40`}
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              {deleting ? 'hourglass_empty' : 'delete'}
            </span>
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete Session'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Bulk export helpers ───────────────────────────────────────
function buildFilteredRows(gymData, runData, from, to) {
  const fromDate = new Date(from);
  const toDate = new Date(to); toDate.setHours(23, 59, 59);
  const gymRows = gymData.filter(w => {
    const d = new Date(w.submitted_at || w.date); return d >= fromDate && d <= toDate;
  }).map(w => {
    const exs = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
    const fdb = w.exercises?.notes || w.notes || '';
    const vol = exs.reduce((s, ex) => { const r = parseInt(String(ex.reps || '1').split('-')[0]) || 1; return s + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * r; }, 0);
    return { type: 'gym', date: w.date, name: w.day_name || 'Workout', focus: w.day_focus || '', exercises: exs, volume: Math.round(vol), notes: fdb };
  });
  const runRows = runData.filter(r => {
    const d = new Date(r.submitted_at || r.date); return d >= fromDate && d <= toDate;
  }).map(r => ({
    type: 'run', date: r.date, name: r.title || 'Run', focus: '',
    exercises: [], distance: r.total_distance ?? 0, pace: r.avg_pace ?? '—', duration: r.duration ?? '—', notes: r.notes || ''
  }));
  return [...gymRows, ...runRows].sort((a, b) => a.date.localeCompare(b.date));
}

function downloadCSV(gymData, runData, from, to) {
  const rows = buildFilteredRows(gymData, runData, from, to);
  const lines = ['Date,Type,Session,Focus,Exercise,Sets,Reps,Weight (kg),Volume (kg),Notes'];
  rows.forEach(r => {
    if (r.type === 'run') {
      lines.push(`${r.date},Running,"${r.name}",,Distance ${r.distance} km,,,,`);
      lines.push(`,,,,"Avg Pace: ${r.pace}/km  Duration: ${r.duration}",,,,`);
      if (r.notes) lines.push(`,,,,,,,,,"${r.notes.replace(/"/g, '""')}"`);
    } else {
      if (r.exercises.length === 0) {
        lines.push(`${r.date},Gym,"${r.name}","${r.focus}",—,,,,${r.volume} kg total,"${r.notes.replace(/"/g, '""')}"`);
      } else {
        r.exercises.forEach((ex, i) => {
          const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
          const exVol = (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
          // Notes only on the last exercise row of each session
          const notesCell = (i === r.exercises.length - 1 && r.notes) ? `"${r.notes.replace(/"/g, '""')}"` : '';
          lines.push(`${i === 0 ? r.date : ''},${i === 0 ? 'Gym' : ''},"${i === 0 ? r.name : ''}","${i === 0 ? r.focus : ''}","${ex.name || ''}",${ex.sets || ''},${ex.reps || ''},${ex.weight || ''},${Math.round(exVol) || ''},${notesCell}`);
        });
      }
    }
  });
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `kinetic_activities_${from}_to_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function downloadAllPDF(gymData, runData, from, to) {
  const rows = buildFilteredRows(gymData, runData, from, to);
  const sessionBlocks = rows.map(r => {
    if (r.type === 'run') {
      return `
        <div class="session">
          <div class="session-header">
            <span class="session-date">${r.date}</span>
            <span class="session-type run">Running</span>
            <span class="session-name">${r.name}</span>
          </div>
          <table><thead><tr><th>Distance</th><th>Avg Pace</th><th>Duration</th></tr></thead>
          <tbody><tr><td>${r.distance} km</td><td>${r.pace}/km</td><td>${r.duration}</td></tr></tbody></table>
          ${r.notes ? `<div class="notes"><span class="notes-label">Feedback</span>${r.notes}</div>` : ''}
        </div>`;
    }
    const exRows = r.exercises.length
      ? r.exercises.map(ex => {
          const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
          const vol = (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
          return `<tr><td>${ex.name || '—'}</td><td>${ex.sets || '—'}</td><td>${ex.reps || '—'}</td><td>${ex.weight ? ex.weight + ' kg' : '—'}</td><td>${vol ? Math.round(vol) + ' kg' : '—'}</td></tr>`;
        }).join('')
      : `<tr><td colspan="5" style="color:#999">No exercises recorded</td></tr>`;
    return `
      <div class="session">
        <div class="session-header">
          <span class="session-date">${r.date}</span>
          <span class="session-type gym">Gym</span>
          <span class="session-name">${r.name}</span>
          ${r.focus ? `<span class="session-focus">${r.focus}</span>` : ''}
          <span class="session-vol">${r.volume} kg total</span>
        </div>
        <table><thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th>Volume</th></tr></thead>
        <tbody>${exRows}</tbody></table>
        ${r.notes ? `<div class="notes"><span class="notes-label">Feedback</span>${r.notes}</div>` : ''}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>KINETIC Activity Log</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Helvetica,sans-serif;color:#111;padding:32px;font-size:12px}
      h1{font-size:20px;font-weight:900;text-transform:uppercase;margin-bottom:4px}
      .meta{color:#666;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px}
      .session{margin-bottom:24px;page-break-inside:avoid}
      .session-header{display:flex;align-items:baseline;gap:10px;margin-bottom:6px;flex-wrap:wrap}
      .session-date{font-size:10px;color:#888;font-weight:700;min-width:90px}
      .session-type{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding:2px 7px;border-radius:99px}
      .session-type.gym{background:#111;color:#fff}
      .session-type.run{background:#0ea5e9;color:#fff}
      .session-name{font-size:14px;font-weight:900;text-transform:uppercase}
      .session-focus{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px}
      .session-vol{margin-left:auto;font-size:10px;font-weight:700;color:#555}
      table{width:100%;border-collapse:collapse}
      th{background:#f5f5f5;padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#555}
      td{padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:11px}
      .notes{margin-top:8px;padding:8px 10px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 4px 4px 0;font-size:11px;color:#444;line-height:1.5}
      .notes-label{display:block;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#b45309;margin-bottom:3px}
      @media print{body{padding:16px}.session{page-break-inside:avoid}}
    </style></head><body>
    <div class="meta">KINETIC · ${from} → ${to} · ${rows.length} sessions</div>
    <h1>Activity Log</h1>
    ${sessionBlocks}
    </body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}

function downloadAllMD(gymData, runData, from, to) {
  const rows = buildFilteredRows(gymData, runData, from, to);
  const lines = [
    '# KINETIC Activity Log',
    '',
    `**Period:** ${from} → ${to}`,
    `**Total sessions:** ${rows.length}`,
    '',
    '---',
    '',
  ];
  rows.forEach(r => {
    lines.push(`## ${r.date} — ${r.name}`);
    lines.push('');
    if (r.type === 'run') {
      lines.push(`**Type:** Running`);
      lines.push('');
      lines.push('| Stat | Value |');
      lines.push('|------|-------|');
      lines.push(`| Distance | ${r.distance} km |`);
      lines.push(`| Avg Pace | ${r.pace}/km |`);
      lines.push(`| Duration | ${r.duration} |`);
    } else {
      lines.push(`**Type:** Gym Workout${r.focus ? `  ·  **Focus:** ${r.focus}` : ''}`);
      lines.push(`**Total Volume:** ${r.volume} kg`);
      lines.push('');
      if (r.exercises.length > 0) {
        lines.push('| Exercise | Sets | Reps | Weight | Volume |');
        lines.push('|----------|------|------|--------|--------|');
        r.exercises.forEach(ex => {
          const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
          const vol = (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
          lines.push(`| ${ex.name || '—'} | ${ex.sets || '—'} | ${ex.reps || '—'} | ${ex.weight ? ex.weight + ' kg' : '—'} | ${vol ? Math.round(vol) + ' kg' : '—'} |`);
        });
      } else {
        lines.push('_No exercises recorded_');
      }
    }
    lines.push('');
    if (r.notes) {
      lines.push(`> 💬 **Feedback:** ${r.notes}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  lines.push('*Exported from KINETIC*');
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `kinetic_activities_${from}_to_${to}.md`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ── Main Page ────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('strength');
  const [gymData, setGymData]       = useState([]);
  const [runData, setRunData]       = useState([]);
  const [allGymData, setAllGymData] = useState([]);
  const [allRunData, setAllRunData] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [aiInput, setAiInput]         = useState('');
  const [aiResponse, setAiResponse]   = useState('');
  const [aiStreaming, setAiStreaming]  = useState(false);
  const [aiContextLoading, setAiContextLoading] = useState(false);
  const [aiState, setAiState]         = useState(getAiState);
  const [countdown, setCountdown]     = useState(() => Math.max(0, getAiState().resetAt - Date.now()));

  // Countdown timer — tick every second
  useEffect(() => {
    const tick = () => {
      const s = getAiState();
      setAiState(s);
      setCountdown(Math.max(0, s.resetAt - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Download date pickers
  const [dlFrom, setDlFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dlTo, setDlTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Activities: selection + pagination
  const [selectedSession, setSelectedSession] = useState(null);
  const PAGE_SIZE = 5;
  const [activityPage, setActivityPage] = useState(0);
  const [sharePr, setSharePr] = useState(null);
  const [showAllPrs, setShowAllPrs] = useState(false);

  // Scroll-lock while modal is open
  useEffect(() => {
    if (!selectedSession) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [selectedSession]);

  useEffect(() => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];

    Promise.all([
      // Last 30 days for charts
      supabase.from('workouts').select('*').eq('user_id', user.id).gte('date', since).order('date'),
      supabase.from('run_sessions').select('*').eq('user_id', user.id).gte('date', since).order('date'),
      // All time for recent activities + download
      supabase.from('workouts').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('run_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ]).then(([gymRes, runRes, allGymRes, allRunRes]) => {
      setGymData(gymRes.data ?? []);
      setRunData(runRes.data ?? []);
      setAllGymData(allGymRes.data ?? []);
      setAllRunData(allRunRes.data ?? []);
      setLoading(false);
    });
  }, [user]);

  // ── All activities merged + sorted ─────────────────────────
  const allActivities = [
    ...allGymData.map(s => ({ ...s, session_type: 'gym' })),
    ...allRunData.map(s => ({ ...s, session_type: 'run' })),
  ].sort((a, b) => new Date(b.submitted_at || b.date) - new Date(a.submitted_at || a.date));

  const totalPages = Math.ceil(allActivities.length / PAGE_SIZE);
  const pagedActivities = allActivities.slice(activityPage * PAGE_SIZE, (activityPage + 1) * PAGE_SIZE);

  // ── Gym metrics ─────────────────────────────────────────────
  // Weekly volume (last 8 weeks)
  const weeklyVolume = (() => {
    const weeks = {};
    allGymData.forEach(w => {
      const d = new Date(w.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = 0;
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      exercises.forEach(ex => {
        const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
        weeks[key] += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
      });
    });

    const result = [];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - today.getDay() - (i * 7));
      const key = d.toISOString().split('T')[0];
      const val = weeks[key] || 0;
      result.push({
        label: i === 0 ? 'Now' : `${i}w`,
        value: Math.round(val),
        highlight: i === 0,
      });
    }
    return result;
  })();

  // Volume by session (last 10 sessions)
  const volumeBySession = (() => {
    const sessions = [...gymData].reverse().slice(-10);
    return sessions.map((w, i) => {
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      const vol = exercises.reduce((s, ex) => {
        const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
        return s + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
      }, 0);
      const dayLabel = new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
      return { label: dayLabel, value: Math.round(vol), highlight: i === sessions.length - 1 };
    });
  })();

  // Volume by month (last 6 months from allGymData)
  const volumeByMonth = (() => {
    const months = {};
    allGymData.forEach(w => {
      const d = new Date(w.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = 0;
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      exercises.forEach(ex => {
        const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
        months[key] += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
      });
    });
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const val = months[key] || 0;
      result.push({
        label: monthNames[d.getMonth()],
        value: Math.round(val),
        highlight: i === 0,
      });
    }
    return result;
  })();

  // Total volume (last 30 days)
  const totalVolumeKg = gymData.reduce((s, w) => {
    const exs = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
    return s + exs.reduce((ss, ex) => {
      const r = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
      return ss + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * r;
    }, 0);
  }, 0);

  // ── Week-over-week volume delta ─────────────────────────────
  const wowDelta = (() => {
    if (weeklyVolume.length < 2) return null;
    const curr = weeklyVolume[weeklyVolume.length - 1].value;
    const prev = weeklyVolume[weeklyVolume.length - 2].value;
    if (!prev) return null;
    return Math.round(((curr - prev) / prev) * 100);
  })();

  // ── Muscle group breakdown (last 30 days) ───────────────────
  const muscleGroups = (() => {
    const MUSCLE_KEYWORDS = {
      'Chest':    ['bench','chest','push','fly','pec','dip'],
      'Back':     ['row','pull','deadlift','lat','cable pull','back','chin'],
      'Legs':     ['squat','leg','lunge','hamstring','calf','glute','hip thrust'],
      'Shoulders':['shoulder','ohp','lateral','front raise','military'],
      'Arms':     ['curl','tricep','bicep','hammer','skull','extension'],
      'Core':     ['plank','crunch','ab','core','sit-up','russian'],
    };
    const totals = {};
    gymData.forEach(w => {
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      exercises.forEach(ex => {
        const name = (ex.name || '').toLowerCase();
        let matched = false;
        for (const [group, kws] of Object.entries(MUSCLE_KEYWORDS)) {
          if (kws.some(k => name.includes(k))) {
            const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
            totals[group] = (totals[group] || 0) + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
            matched = true; break;
          }
        }
        if (!matched) {
          const reps2 = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
          totals['Other'] = (totals['Other'] || 0) + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps2;
        }
      });
    });
    const COLORS = {
      Chest: '#d4fb00', Back: '#00e3fd', Legs: '#ff6b8a',
      Shoulders: '#f97316', Arms: '#a78bfa', Core: '#34d399', Other: '#6b7280',
    };
    const entries = Object.entries(totals).sort(([,a],[,b]) => b - a);
    const total = entries.reduce((s,[,v]) => s + v, 0) || 1;
    return entries.map(([name, value]) => ({
      name, value: Math.round(value),
      pct: Math.round((value / total) * 100),
      color: COLORS[name] || '#6b7280',
    }));
  })();

  // ── Personal Records (best weight per exercise, all time) ────
  const personalRecords = (() => {
    const bests = {};
    allGymData.forEach(w => {
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      exercises.forEach(ex => {
        const name = ex.name;
        if (!name) return;
        const weight = parseFloat(ex.weight) || 0;
        if (weight > 0 && (!bests[name] || weight > bests[name].weight)) {
          bests[name] = { weight, date: w.date, sets: Array.isArray(ex.all_sets) ? ex.all_sets : [] };
        }
      });
    });
    return Object.entries(bests)
      .sort(([,a],[,b]) => b.weight - a.weight)
      .map(([name, { weight, date, sets }]) => ({ name, weight, date, sets }));
  })();

  const latestMaxLift = personalRecords[0] ?? null;

  // ── Run metrics ──────────────────────────────────────────────
  const totalDistance = runData.reduce((s, r) => s + (parseFloat(r.total_distance) || 0), 0);

  // Pace trend last 7 runs
  const pacePoints = runData.slice(-7).map((r, i) => {
    const paceStr = r.avg_pace || '';
    const [m, s] = paceStr.split(':').map(Number);
    const paceNum = m + (s || 0) / 60;
    return {
      label: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      value: paceNum || 0,
    };
  }).filter(p => p.value > 0);

  const avgPace = (() => {
    if (runData.length === 0) return '—';
    const paces = runData.map(r => {
      const [m, s] = (r.avg_pace || '0:00').split(':').map(Number);
      return m + (s || 0) / 60;
    }).filter(Boolean);
    if (!paces.length) return '—';
    const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
    const mins = Math.floor(avg);
    const secs = Math.round((avg - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  })();

  // Distance by session (last 10 runs)
  const distanceBySession = (() => {
    const sessions = runData.slice(-10);
    return sessions.map((r, i) => {
      const dayLabel = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
      return {
        label: dayLabel,
        value: parseFloat(r.total_distance) || 0,
        highlight: i === sessions.length - 1,
      };
    });
  })();

  // ── Pace improvement (first vs last run in 30 days) ──────────
  const paceImprovement = (() => {
    const withPace = runData.filter(r => r.avg_pace);
    if (withPace.length < 2) return null;
    const parsePace = (s) => { const [m,sec] = (s||'0:00').split(':').map(Number); return m + (sec||0)/60; };
    const first = parsePace(withPace[0].avg_pace);
    const last  = parsePace(withPace[withPace.length - 1].avg_pace);
    return Math.round((first - last) * 60); // positive = faster (fewer secs/km)
  })();

  // Distance by week (last 8 weeks)
  const weeklyDistance = (() => {
    const weeks = {};
    allRunData.forEach(r => {
      const d = new Date(r.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = 0;
      weeks[key] += parseFloat(r.total_distance) || 0;
    });
    const result = [];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - today.getDay() - (i * 7));
      const key = d.toISOString().split('T')[0];
      const val = weeks[key] || 0;
      result.push({
        label: i === 0 ? 'Now' : `${i}w`,
        value: Math.round(val * 10) / 10,
        highlight: i === 0,
      });
    }
    return result;
  })();

  // Distance by month (last 6 months)
  const distanceByMonth = (() => {
    const months = {};
    allRunData.forEach(r => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = 0;
      months[key] += parseFloat(r.total_distance) || 0;
    });
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const val = months[key] || 0;
      result.push({
        label: monthNames[d.getMonth()],
        value: Math.round(val * 10) / 10,
        highlight: i === 0,
      });
    }
    return result;
  })();

  // ── AI insight ────────────────────────────────────────────
  const buildRichContext = async () => {
    // Fetch targeted data: last 10 workouts with exercises, last 10 runs, user_config
    const [wRes, rRes, cfgRes] = await Promise.all([
      supabase.from('workouts')
        .select('date, day_name, day_focus, exercises, notes')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10),
      supabase.from('run_sessions')
        .select('date, title, total_distance, avg_pace, duration, notes')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10),
      supabase.from('user_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const workouts = wRes.data ?? [];
    const runs = rRes.data ?? [];
    const cfg = cfgRes.data ?? {};

    // Personal records from already-loaded allGymData
    const prs = personalRecords.slice(0, 5);

    // Build concise context string
    const lines = [];

    // User profile / plan goals
    if (cfg.sex && cfg.sex !== 'not_specified') lines.push(`User sex: ${cfg.sex}.`);
    if (cfg.athleteType) lines.push(`Athlete type: ${cfg.athleteType}.`);
    if (cfg.goals?.primary) lines.push(`Primary goal: ${cfg.goals.primary}.`);
    if (cfg.goals?.targetWeight) lines.push(`Target weight: ${cfg.goals.targetWeight} kg.`);
    if (cfg.workoutPlan?.days?.length) {
      const planDays = cfg.workoutPlan.days.map(d => `${d.name}(${d.focus || 'general'})`).join(', ');
      lines.push(`Current workout plan days: ${planDays}.`);
    }

    // Last 10 gym sessions
    if (workouts.length > 0) {
      lines.push(`\nRecent gym sessions (${workouts.length}):`);
      workouts.forEach(w => {
        const exs = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
        const vol = exs.reduce((s, ex) => {
          const r = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
          return s + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * r;
        }, 0);
        const exNames = exs.slice(0, 5).map(e => `${e.name}(${e.sets}x${e.reps}${e.weight ? `@${e.weight}kg` : ''})`).join(', ');
        lines.push(`  • ${w.date} — ${w.day_name || 'Workout'}${w.day_focus ? ` [${w.day_focus}]` : ''}: ${exNames || 'no details'}. Volume≈${Math.round(vol)}kg.${w.notes ? ` Notes: ${w.notes}` : ''}`);
      });
    }

    // Last 10 runs
    if (runs.length > 0) {
      lines.push(`\nRecent runs (${runs.length}):`);
      runs.forEach(r => {
        lines.push(`  • ${r.date} — ${r.title || 'Run'}: ${r.total_distance ?? '?'}km, pace ${r.avg_pace ?? '?'}/km, ${r.duration ?? '?'}${r.notes ? `. Notes: ${r.notes}` : ''}`);
      });
    }

    // PRs
    if (prs.length > 0) {
      lines.push(`\nPersonal records (all-time best weight): ${prs.map(p => `${p.name} ${p.weight}kg`).join(', ')}.`);
    }

    // Summary stats
    lines.push(`\nLast 30 days: ${gymData.length} gym sessions, total volume ${totalVolumeKg.toLocaleString()}kg. ${runData.length} runs, ${totalDistance.toFixed(1)}km total, avg pace ${avgPace}/km.`);

    return lines.join('\n');
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || aiState.count >= AI_LIMIT || aiStreaming) return;
    setAiStreaming(true);
    setAiContextLoading(true);
    setAiResponse('');
    try {
      const context = await buildRichContext();
      setAiContextLoading(false);
      const messages = [
        {
          role: 'system',
          content: `You are KINETIC AI, an expert hybrid athlete coach. Use the user's real training data below to give highly personalized, actionable advice. Be specific, reference their actual numbers, and be encouraging. Answer in 3-6 sentences.

=== USER TRAINING DATA ===
${context}
=== END DATA ===`,
        },
        { role: 'user', content: aiInput.trim() },
      ];
      await streamChat(messages, (chunk) => setAiResponse(r => r + chunk));
      const newState = incrementAiState();
      setAiState(newState);
      setCountdown(Math.max(0, newState.resetAt - Date.now()));
    } catch (e) {
      setAiContextLoading(false);
      setAiResponse('Sorry, something went wrong. Please try again.');
    } finally {
      setAiStreaming(false);
      setAiInput('');
    }
  };

  const promptsLeft = AI_LIMIT - aiState.count;

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex justify-between items-center px-6 py-4">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
          <span className="material-symbols-outlined text-on-surface-variant">monitoring</span>
        </div>
      </header>

      <div className="px-5 pt-6 max-w-xl mx-auto space-y-8">
        {/* Title */}
        <section>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight uppercase">
            Performance <span className="text-primary-container italic">Lab</span>
          </h2>
          <p className="text-on-surface-variant font-medium text-sm">Real-time training trends — last 30 days</p>
        </section>

        {/* ── Recent Activities ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-lg tracking-tight uppercase">All Activities</h3>
            <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">{allActivities.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
            </div>
          ) : allActivities.length === 0 ? (
            <div className="bg-surface-container rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <p className="text-on-surface-variant font-medium text-sm">No activities yet. Log your first workout!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagedActivities.map(s => (
                <ActivityRow key={`${s.session_type}-${s.id}`} session={s} onClick={setSelectedSession} />
              ))}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                    disabled={activityPage === 0}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-headline font-bold text-xs uppercase tracking-widest hover:bg-surface-container-high transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {activityPage + 1} / {totalPages} &nbsp;·&nbsp; {allActivities.length} total
                  </span>
                  <button
                    onClick={() => setActivityPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={activityPage === totalPages - 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-headline font-bold text-xs uppercase tracking-widest hover:bg-surface-container-high transition-colors disabled:opacity-30"
                  >
                    Next <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Download by date range ── */}
          <div className="mt-4 bg-surface-container/60 border border-outline-variant/15 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
              <p className="font-headline font-bold text-sm uppercase tracking-tight">Export Activities</p>
            </div>
            <p className="text-on-surface-variant text-xs">Download your activities in your preferred format.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">From</label>
                <input
                  type="date"
                  value={dlFrom}
                  max={dlTo}
                  onChange={e => setDlFrom(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-container/50 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">To</label>
                <input
                  type="date"
                  value={dlTo}
                  min={dlFrom}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setDlTo(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-container/50 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(allGymData, allRunData, dlFrom, dlTo)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">table_view</span> CSV
              </button>
              <button
                onClick={() => downloadAllPDF(allGymData, allRunData, dlFrom, dlTo)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
              </button>
              <button
                onClick={() => downloadAllMD(allGymData, allRunData, dlFrom, dlTo)}
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">description</span> .MD
              </button>
            </div>
          </div>
        </section>

        {/* ── AI Coach Section (right after activities) ── */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(212,251,0,0.06) 0%, rgba(0,227,253,0.06) 100%)',
            border: '1px solid rgba(212,251,0,0.18)',
            borderRadius: '1.25rem',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glow blobs */}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160,
            background: 'radial-gradient(circle, rgba(212,251,0,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -30, left: -30, width: 120, height: 120,
            background: 'radial-gradient(circle, rgba(0,227,253,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="relative p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 44, height: 44, borderRadius: '0.875rem',
                  background: 'linear-gradient(135deg, #d4fb00 0%, #9bdd00 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(212,251,0,0.4)',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined text-black text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <div>
                  <h4 className="font-headline font-black text-sm uppercase tracking-wide" style={{ color: '#d4fb00', letterSpacing: '0.08em' }}>Kinetic AI Coach</h4>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Powered by your real data</p>
                </div>
              </div>
              {/* Prompts badge + timer */}
              <div className="flex flex-col items-end gap-1">
                <div style={{
                  background: promptsLeft > 5 ? 'rgba(212,251,0,0.15)' : promptsLeft > 0 ? 'rgba(249,115,22,0.15)' : 'rgba(255,107,138,0.15)',
                  border: `1px solid ${promptsLeft > 5 ? 'rgba(212,251,0,0.3)' : promptsLeft > 0 ? 'rgba(249,115,22,0.3)' : 'rgba(255,107,138,0.3)'}`,
                  borderRadius: '2rem',
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: 900,
                  color: promptsLeft > 5 ? '#d4fb00' : promptsLeft > 0 ? '#f97316' : '#ff6b8a',
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                }}>
                  {promptsLeft}/{AI_LIMIT} left
                </div>
                {countdown > 0 && (
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: '#666',
                    fontFamily: 'monospace', letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 10 }}>timer</span>
                    resets in {fmtCountdown(countdown)}
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar for prompts */}
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: 99,
                width: `${(promptsLeft / AI_LIMIT) * 100}%`,
                background: promptsLeft > 5
                  ? 'linear-gradient(90deg, #d4fb00, #9bdd00)'
                  : promptsLeft > 0
                  ? 'linear-gradient(90deg, #f97316, #fb923c)'
                  : '#ff6b8a',
                boxShadow: promptsLeft > 5 ? '0 0 8px rgba(212,251,0,0.6)' : 'none',
                transition: 'width 0.5s ease',
              }} />
            </div>

            {/* Context loading indicator */}
            {aiContextLoading && (
              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#00e3fd' }}>
                <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#00e3fd', borderTopColor: 'transparent' }} />
                Fetching your training data…
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.875rem',
                padding: '1rem',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--on-surface)',
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-sm" style={{ color: '#d4fb00', fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#d4fb00' }}>AI Response</span>
                </div>
                {aiResponse}
                {aiStreaming && <span className="inline-block w-0.5 h-4 animate-pulse ml-1 align-middle" style={{ background: '#d4fb00' }} />}
              </div>
            )}

            {/* Input area */}
            {promptsLeft > 0 ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
                  placeholder="Ask about your training…"
                  disabled={aiStreaming || aiContextLoading}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(212,251,0,0.2)',
                    borderRadius: '3rem',
                    padding: '12px 20px',
                    fontSize: 13,
                    color: 'var(--on-surface)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(212,251,0,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(212,251,0,0.2)'}
                />
                <button
                  onClick={handleAiSubmit}
                  disabled={!aiInput.trim() || aiStreaming || aiContextLoading}
                  style={{
                    background: !aiInput.trim() || aiStreaming || aiContextLoading
                      ? 'rgba(212,251,0,0.3)'
                      : 'linear-gradient(135deg, #d4fb00 0%, #9bdd00 100%)',
                    border: 'none',
                    borderRadius: '3rem',
                    padding: '12px 22px',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: !aiInput.trim() || aiStreaming || aiContextLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: !aiInput.trim() || aiStreaming || aiContextLoading ? 'none' : '0 4px 20px rgba(212,251,0,0.4)',
                    fontFamily: 'var(--font-headline, inherit)',
                    flexShrink: 0,
                  }}
                >
                  {aiStreaming ? '…' : 'Ask'}
                </button>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(255,107,138,0.08)',
                border: '1px solid rgba(255,107,138,0.2)',
                borderRadius: '0.875rem',
              }}>
                <span className="material-symbols-outlined block mb-1" style={{ color: '#ff6b8a', fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>
                <p className="text-sm font-bold" style={{ color: '#ff6b8a' }}>Daily limit reached</p>
                <p className="text-xs text-on-surface-variant mt-1">Resets in <span style={{ fontFamily: 'monospace', color: '#ff6b8a', fontWeight: 700 }}>{fmtCountdown(countdown)}</span></p>
              </div>
            )}

            {/* Quick prompts */}
            {promptsLeft > 0 && !aiStreaming && !aiResponse && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Quick ask</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'How is my progress?',
                    'Am I overtraining?',
                    'What should I focus on?',
                    'Improve my pace?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setAiInput(q); }}
                      style={{
                        background: 'rgba(212,251,0,0.08)',
                        border: '1px solid rgba(212,251,0,0.15)',
                        borderRadius: '2rem',
                        padding: '5px 12px',
                        fontSize: 11,
                        color: 'var(--on-surface-variant)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontWeight: 600,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,251,0,0.16)'; e.currentTarget.style.color = '#d4fb00'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,251,0,0.08)'; e.currentTarget.style.color = 'var(--on-surface-variant)'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Modal ── */}
        {selectedSession && (
          <ActivityDetailModal
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onDelete={(deleted) => {
              if (deleted.session_type === 'run') {
                setAllRunData(prev => prev.filter(r => r.id !== deleted.id));
              } else {
                setAllGymData(prev => prev.filter(w => w.id !== deleted.id));
              }
              setSelectedSession(null);
            }}
          />
        )}
        {sharePr && (
          <PRShareModal pr={sharePr} onClose={() => setSharePr(null)} />
        )}

        {/* All PRs popup */}
        {showAllPrs && createPortal(
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowAllPrs(false)} />
            <div className="relative bg-surface-container rounded-t-3xl flex flex-col" style={{ maxHeight: '88dvh' }}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-outline-variant/40" />
              </div>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant">All Records</p>
                  <h3 className="font-headline font-black text-xl tracking-tight text-on-surface">Personal Records</h3>
                </div>
                <button
                  onClick={() => setShowAllPrs(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant shrink-0"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              {/* Scrollable list */}
              <div className="overflow-y-auto flex-1 px-5 pb-8">
                <div className="space-y-1">
                  {personalRecords.map((pr, i) => (
                    <button
                      key={pr.name}
                      onClick={() => { setShowAllPrs(false); setSharePr(pr); }}
                      className="w-full flex items-center gap-3 py-3 px-2 rounded-xl transition-colors hover:bg-surface-container-highest active:bg-surface-container-highest border-b border-outline-variant/10 last:border-0"
                    >
                      <span
                        className="text-xs font-black w-6 text-center shrink-0"
                        style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b87333' : '#555' }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate">{pr.name}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="font-headline font-extrabold text-lg shrink-0" style={{ color: '#d4fb00' }}>
                        {pr.weight}<span className="text-xs text-on-surface-variant ml-0.5">kg</span>
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: 18 }}>ios_share</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── Tab Toggle ── */}
        <div className="flex bg-surface-container-low p-1.5 rounded-full">
          <button
            onClick={() => setTab('strength')}
            className={`flex-1 py-2.5 px-6 rounded-full font-headline font-bold text-sm tracking-wide uppercase transition-all duration-300 ${tab === 'strength' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Strength
          </button>
          <button
            onClick={() => setTab('running')}
            className={`flex-1 py-2.5 px-6 rounded-full font-headline font-bold text-sm tracking-wide uppercase transition-all duration-300 ${tab === 'running' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Running
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          </div>
        ) : tab === 'strength' ? (
          <>
            {/* Weekly Volume */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(212,251,0,0.04) 0%, rgba(18,18,18,0.97) 60%)',
                border: '1px solid rgba(212,251,0,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(212,251,0,0.08)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Total Volume</p>
                  <h3 className="font-headline text-4xl font-extrabold tracking-tighter">
                    {totalVolumeKg >= 1000 ? `${(totalVolumeKg/1000).toFixed(1)}t` : totalVolumeKg.toLocaleString()}
                    <span className="text-lg font-bold ml-1 text-on-surface-variant">KG</span>
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">30 days</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold">
                    {gymData.length} sessions
                  </div>
                  {wowDelta !== null && (
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      style={{
                        background: wowDelta >= 0 ? '#d4fb0022' : '#ff6b8a22',
                        color: wowDelta >= 0 ? '#d4fb00' : '#ff6b8a',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {wowDelta >= 0 ? 'trending_up' : 'trending_down'}
                      </span>
                      {wowDelta >= 0 ? '+' : ''}{wowDelta}% vs last week
                    </div>
                  )}
                </div>
              </div>
              {weeklyVolume.length > 0
                ? <BarChart data={weeklyVolume} showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No gym data yet. Log your first workout!</p>
              }
            </div>

            {/* Volume by Session */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(168,255,120,0.04) 0%, rgba(18,18,18,0.97) 60%)',
                border: '1px solid rgba(168,255,120,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(168,255,120,0.08)',
              }}
            >
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Volume by Session</p>
                <p className="text-on-surface-variant text-xs">Last 10 sessions</p>
              </div>
              {volumeBySession.length > 0
                ? <BarChart data={volumeBySession} color="#a8ff78" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No session data yet.</p>
              }
            </div>

            {/* Volume by Month */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(212,251,0,0.04) 0%, rgba(18,18,18,0.97) 60%)',
                border: '1px solid rgba(212,251,0,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(212,251,0,0.08)',
              }}
            >
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Monthly Volume</p>
                <p className="text-on-surface-variant text-xs">Last 6 months</p>
              </div>
              {volumeByMonth.length > 0
                ? <BarChart data={volumeByMonth} color="#d4fb00" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">Not enough data for monthly view.</p>
              }
            </div>

            {/* Muscle Group Breakdown */}
            {muscleGroups.length > 0 && (
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{
                  background: 'linear-gradient(145deg, rgba(100,100,100,0.05) 0%, rgba(18,18,18,0.97) 60%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <div>
                  <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Muscle Focus</p>
                  <p className="text-on-surface-variant text-xs">Volume split by muscle group · last 30 days</p>
                </div>
                <div className="space-y-3">
                  {muscleGroups.map(({ name, pct, color }) => (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold" style={{ color }}>{name}</span>
                        <span className="text-[10px] font-bold text-on-surface-variant">{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: `${color}20` }}>
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Records */}
            {personalRecords.length > 0 && (
              <div className="bg-surface-container rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Personal Records</p>
                    <p className="text-on-surface-variant text-xs">All-time best weights · tap to share</p>
                  </div>
                  <span className="material-symbols-outlined text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                </div>
                <div className="space-y-1">
                  {personalRecords.slice(0, 5).map((pr, i) => (
                    <button
                      key={pr.name}
                      onClick={() => setSharePr(pr)}
                      className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors hover:bg-surface-container-highest active:bg-surface-container-highest border-b border-outline-variant/10 last:border-0"
                    >
                      <span
                        className="text-xs font-black w-5 text-center shrink-0"
                        style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b87333' : '#555' }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate">{pr.name}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="font-headline font-extrabold text-lg shrink-0" style={{ color: '#d4fb00' }}>
                        {pr.weight}<span className="text-xs text-on-surface-variant ml-0.5">kg</span>
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: 18 }}>ios_share</span>
                    </button>
                  ))}
                </div>
                {personalRecords.length > 5 && (
                  <button
                    onClick={() => setShowAllPrs(true)}
                    className="w-full text-center text-xs font-bold py-2 rounded-xl"
                    style={{ color: '#d4fb00' }}
                  >
                    See all {personalRecords.length} records
                  </button>
                )}
              </div>
            )}

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container rounded-lg p-5 flex flex-col justify-between" style={{ minHeight: 120 }}>
                <div className="space-y-1">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                  <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Top Lift</p>
                </div>
                <div>
                  <h4 className="font-headline text-3xl font-extrabold tracking-tighter">
                    {latestMaxLift ? `${latestMaxLift.weight}` : '—'}
                    {latestMaxLift && <span className="text-base text-on-surface-variant">kg</span>}
                  </h4>
                  <p className="text-on-surface-variant text-[10px] font-bold uppercase mt-1 truncate">
                    {latestMaxLift?.name ?? 'No data'}
                  </p>
                </div>
              </div>

              <div className="bg-surface-container rounded-lg p-5 flex flex-col justify-between" style={{ minHeight: 120 }}>
                <div className="space-y-1">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                  <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Sessions</p>
                </div>
                <div>
                  <h4 className="font-headline text-3xl font-extrabold tracking-tighter">{gymData.length}</h4>
                  <p className="text-on-surface-variant text-[10px] font-bold uppercase">Last 30 days</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Avg Pace + trend */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(0,227,253,0.05) 0%, rgba(18,18,18,0.97) 60%)',
                border: '1px solid rgba(0,227,253,0.14)',
                boxShadow: 'inset 0 1px 0 rgba(0,227,253,0.08)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Average Pace</p>
                  <h3 className="font-headline text-4xl font-extrabold tracking-tighter">
                    {avgPace}<span className="text-lg font-bold ml-1 text-on-surface-variant">/KM</span>
                  </h3>
                </div>
                {paceImprovement !== null && (
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mt-1"
                    style={{
                      background: paceImprovement > 0 ? '#34d39922' : paceImprovement < 0 ? '#ff6b8a22' : '#55555522',
                      color: paceImprovement > 0 ? '#34d399' : paceImprovement < 0 ? '#ff6b8a' : '#888',
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {paceImprovement > 0 ? 'trending_up' : paceImprovement < 0 ? 'trending_down' : 'remove'}
                    </span>
                    {paceImprovement > 0 ? `${paceImprovement}s faster` : paceImprovement < 0 ? `${Math.abs(paceImprovement)}s slower` : 'No change'}
                  </div>
                )}
              </div>
              {pacePoints.length >= 2
                ? <LineChart points={pacePoints} />
                : <p className="text-on-surface-variant text-sm text-center py-4">Log more runs to see your pace trend.</p>
              }
            </div>

            {/* Stats summary row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Distance</p>
                <p className="font-headline text-lg font-extrabold leading-tight">{totalDistance.toFixed(1)}<span className="text-xs text-on-surface-variant ml-0.5">km</span></p>
                <p className="text-[9px] text-on-surface-variant">30 days</p>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Sessions</p>
                <p className="font-headline text-lg font-extrabold leading-tight">{runData.length}</p>
                <p className="text-[9px] text-on-surface-variant">30 days</p>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Avg/Run</p>
                <p className="font-headline text-lg font-extrabold leading-tight">
                  {runData.length > 0 ? (totalDistance / runData.length).toFixed(1) : '—'}
                  <span className="text-xs text-on-surface-variant ml-0.5">km</span>
                </p>
                <p className="text-[9px] text-on-surface-variant">per session</p>
              </div>
            </div>

            {/* Distance by Session */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(0,227,253,0.04) 0%, rgba(18,18,18,0.97) 60%)',
                border: '1px solid rgba(0,227,253,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(0,227,253,0.08)',
              }}
            >
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Distance by Session</p>
                <p className="text-on-surface-variant text-xs">Last 10 runs (km)</p>
              </div>
              {distanceBySession.length > 0
                ? <BarChart data={distanceBySession} color="#00e3fd" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No run data yet.</p>
              }
            </div>

            {/* Weekly Distance */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(0,227,253,0.04) 0%, rgba(18,18,18,0.97) 60%)',
                border: '1px solid rgba(0,227,253,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(0,227,253,0.08)',
              }}
            >
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Weekly Distance</p>
                <p className="text-on-surface-variant text-xs">Last 7 weeks (km)</p>
              </div>
              {weeklyDistance.length > 0
                ? <BarChart data={weeklyDistance} color="#00e3fd" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No weekly data yet.</p>
              }
            </div>

            {/* Monthly Distance */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(0,180,216,0.04) 0%, rgba(18,18,18,0.97) 60%)',
                border: '1px solid rgba(0,180,216,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(0,180,216,0.08)',
              }}
            >
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Monthly Distance</p>
                <p className="text-on-surface-variant text-xs">Last 6 months (km)</p>
              </div>
              {distanceByMonth.length > 0
                ? <BarChart data={distanceByMonth} color="#00b4d8" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">Not enough data for monthly view.</p>
              }
            </div>
          </>
        )}


      </div>
    </div>
  );
}
