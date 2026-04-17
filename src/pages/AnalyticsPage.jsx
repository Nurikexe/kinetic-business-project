import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { streamChat } from '../lib/openrouter';

const AI_LIMIT = 10;
const AI_STORAGE_KEY = 'kinetic_ai_prompts_used';

function getPromptCount() {
  try { return parseInt(localStorage.getItem(AI_STORAGE_KEY) || '0'); } catch { return 0; }
}
function incrementPromptCount() {
  try { localStorage.setItem(AI_STORAGE_KEY, String(getPromptCount() + 1)); } catch {}
}

// ── Bar chart ───────────────────────────────────────────────
// Uses pixel heights (not %) so bars render correctly regardless of flex context
const BAR_H = 120; // px — height of the bar drawing area

function BarChart({ data, maxValue, color = '#d4fb00', showValues = false }) {
  if (!data || data.length === 0) return null;
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div>
      {/* Bar drawing area — explicit pixel height so % heights resolve correctly */}
      <div
        className="flex items-end justify-between gap-1"
        style={{ height: BAR_H }}
      >
        {data.map((d, i) => {
          const barPx = Math.max((d.value / max) * BAR_H, 4);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1"
              style={{ height: BAR_H }}
            >
              {showValues && (
                <span
                  className="text-[8px] font-bold leading-none"
                  style={{
                    color: d.highlight ? color : '#888',
                    opacity: d.value > 0 ? 1 : 0,
                  }}
                >
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
                </span>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: barPx,
                  background: d.highlight
                    ? color
                    : `${color}30`,
                  boxShadow: d.highlight ? `0 0 8px ${color}55` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Labels row */}
      <div className="flex justify-between gap-1 mt-2">
        {data.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center font-bold uppercase truncate"
            style={{
              fontSize: 9,
              color: d.highlight ? color : '#666',
              letterSpacing: '0.06em',
            }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
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
function ActivityDetailModal({ session, onClose }) {
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
      ${session.notes ? `<p style="margin-top:16px;font-size:12px"><b>Notes:</b> ${session.notes}</p>` : ''}
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
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
    if (session.notes) lines.push('', '## Notes', '', session.notes);
    lines.push('', '---', '*Exported from KINETIC*');
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinetic_${title.replace(/\s+/g, '_').toLowerCase()}_${(session.date || 'session')}.md`;
    a.click(); URL.revokeObjectURL(url);
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
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Distance', value: session.total_distance != null ? `${Number(session.total_distance).toFixed(2)} km` : '—' },
                { label: 'Avg Pace', value: session.avg_pace ? `${session.avg_pace}/km` : '—' },
                { label: 'Duration', value: session.duration || '—' },
              ].map(stat => (
                <div key={stat.label} className="bg-surface-container rounded-xl p-4">
                  <p className="text-on-surface-variant text-[9px] font-black uppercase tracking-widest mb-2">{stat.label}</p>
                  <p className="font-headline font-bold text-base">{stat.value}</p>
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
          {session.notes && (
            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest mb-2">Notes</p>
              <p className="text-sm text-on-surface leading-relaxed">{session.notes}</p>
            </div>
          )}
        </div>
        {/* Export bar */}
        <div className="p-4 shrink-0 border-t border-outline-variant/10 bg-surface-container-low">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Export this session</p>
          <div className="flex gap-2">
            <button onClick={exportPDF} className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
            </button>
            <button onClick={exportMD} className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-[10px] tracking-wide active:scale-95 transition-all flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">description</span> Markdown
            </button>
          </div>
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
    const vol = exs.reduce((s, ex) => { const r = parseInt(String(ex.reps || '1').split('-')[0]) || 1; return s + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * r; }, 0);
    return { type: 'gym', date: w.date, name: w.day_name || 'Workout', focus: w.day_focus || '', exercises: exs, volume: Math.round(vol) };
  });
  const runRows = runData.filter(r => {
    const d = new Date(r.submitted_at || r.date); return d >= fromDate && d <= toDate;
  }).map(r => ({
    type: 'run', date: r.date, name: r.title || 'Run', focus: '',
    exercises: [], distance: r.total_distance ?? 0, pace: r.avg_pace ?? '—', duration: r.duration ?? '—'
  }));
  return [...gymRows, ...runRows].sort((a, b) => a.date.localeCompare(b.date));
}

function downloadCSV(gymData, runData, from, to) {
  const rows = buildFilteredRows(gymData, runData, from, to);
  const lines = ['Date,Type,Session,Focus,Exercise,Sets,Reps,Weight (kg),Volume (kg)'];
  rows.forEach(r => {
    if (r.type === 'run') {
      lines.push(`${r.date},Running,"${r.name}",,Distance ${r.distance} km,,,,`);
      lines.push(`,,,,"Avg Pace: ${r.pace}/km  Duration: ${r.duration}",,,,`);
    } else {
      if (r.exercises.length === 0) {
        lines.push(`${r.date},Gym,"${r.name}","${r.focus}",—,,,, ${r.volume} kg total`);
      } else {
        r.exercises.forEach((ex, i) => {
          const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
          const exVol = (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
          lines.push(`${i === 0 ? r.date : ''},${i === 0 ? 'Gym' : ''},"${i === 0 ? r.name : ''}","${i === 0 ? r.focus : ''}","${ex.name || ''}",${ex.sets || ''},${ex.reps || ''},${ex.weight || ''},${Math.round(exVol) || ''}`);
        });
      }
    }
  });
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `kinetic_activities_${from}_to_${to}.csv`; a.click(); URL.revokeObjectURL(url);
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
      @media print{body{padding:16px}.session{page-break-inside:avoid}}
    </style></head><body>
    <div class="meta">KINETIC · ${from} → ${to} · ${rows.length} sessions</div>
    <h1>Activity Log</h1>
    ${sessionBlocks}
    </body></html>`;
  const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
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
    lines.push('---');
    lines.push('');
  });
  lines.push('*Exported from KINETIC*');
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `kinetic_activities_${from}_to_${to}.md`; a.click(); URL.revokeObjectURL(url);
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
  const [aiInput, setAiInput]       = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [promptsUsed, setPromptsUsed] = useState(getPromptCount());

  // Download date pickers
  const [dlFrom, setDlFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dlTo, setDlTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Activities: selection + pagination
  const [selectedSession, setSelectedSession] = useState(null);
  const PAGE_SIZE = 8;
  const [activityPage, setActivityPage] = useState(0);

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
  // Weekly volume (last 7 weeks)
  const weeklyVolume = (() => {
    const weeks = {};
    gymData.forEach(w => {
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
    const sorted = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    return sorted.map(([key, val], i) => ({
      label: ['W1','W2','W3','W4','W5','W6','W7'][i] || `W${i+1}`,
      value: Math.round(val),
      highlight: i === sorted.length - 1,
    }));
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
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    return sorted.map(([key, val], i) => ({
      label: monthNames[parseInt(key.split('-')[1]) - 1],
      value: Math.round(val),
      highlight: i === sorted.length - 1,
    }));
  })();

  const totalVolumeKg = weeklyVolume.reduce((s, w) => s + w.value, 0);

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
          bests[name] = { weight, date: w.date };
        }
      });
    });
    return Object.entries(bests)
      .sort(([,a],[,b]) => b.weight - a.weight)
      .slice(0, 6)
      .map(([name, { weight, date }]) => ({ name, weight, date }));
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

  // Distance by week (last 7 weeks)
  const weeklyDistance = (() => {
    const weeks = {};
    runData.forEach(r => {
      const d = new Date(r.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = 0;
      weeks[key] += parseFloat(r.total_distance) || 0;
    });
    const sorted = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    return sorted.map(([, val], i) => ({
      label: ['W1','W2','W3','W4','W5','W6','W7'][i] || `W${i+1}`,
      value: Math.round(val * 10) / 10,
      highlight: i === sorted.length - 1,
    }));
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
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    return sorted.map(([key, val], i) => ({
      label: monthNames[parseInt(key.split('-')[1]) - 1],
      value: Math.round(val * 10) / 10,
      highlight: i === sorted.length - 1,
    }));
  })();

  // ── AI insight ────────────────────────────────────────────
  const buildReport = () => {
    const gymSummary = `Gym sessions last 30 days: ${gymData.length}. Total volume: ${totalVolumeKg.toLocaleString()} kg.`;
    const runSummary = `Running sessions: ${runData.length}. Total distance: ${totalDistance.toFixed(1)} km. Avg pace: ${avgPace}/km.`;
    return `${gymSummary} ${runSummary}`;
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || promptsUsed >= AI_LIMIT || aiStreaming) return;
    const report = buildReport();
    const messages = [
      {
        role: 'system',
        content: `You are an expert fitness coach. The user's training report: ${report}
Give concise, actionable advice. Answer in 3-5 sentences. Be specific and encouraging.`,
      },
      { role: 'user', content: aiInput.trim() },
    ];
    setAiStreaming(true);
    setAiResponse('');
    try {
      await streamChat(messages, (chunk) => setAiResponse(r => r + chunk));
      incrementPromptCount();
      const newCount = getPromptCount();
      setPromptsUsed(newCount);
    } catch (e) {
      setAiResponse('Sorry, something went wrong. Please try again.');
    } finally {
      setAiStreaming(false);
      setAiInput('');
    }
  };

  const promptsLeft = AI_LIMIT - promptsUsed;

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex justify-between items-center px-6 py-4">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
          <span className="material-symbols-outlined text-on-surface-variant">monitoring</span>
        </div>
      </header>

      <div className="px-6 pt-6 max-w-xl mx-auto space-y-8">
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

        {/* ── Modal ── */}
        {selectedSession && <ActivityDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />}

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
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Weekly Volume</p>
                  <h3 className="font-headline text-4xl font-extrabold tracking-tighter">
                    {totalVolumeKg >= 1000 ? `${(totalVolumeKg/1000).toFixed(1)}t` : totalVolumeKg.toLocaleString()}
                    <span className="text-lg font-bold ml-1 text-on-surface-variant">KG</span>
                  </h3>
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
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
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
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
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
              <div className="bg-surface-container rounded-lg p-6 space-y-4">
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
                    <p className="text-on-surface-variant text-xs">All-time best weights per exercise</p>
                  </div>
                  <span className="material-symbols-outlined text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                </div>
                <div className="space-y-2">
                  {personalRecords.map(({ name, weight, date }, i) => (
                    <div key={name} className="flex items-center gap-3 py-2 border-b border-outline-variant/10 last:border-0">
                      <span
                        className="text-xs font-black w-5 text-center"
                        style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b87333' : '#555' }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{name}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="font-headline font-extrabold text-lg" style={{ color: '#d4fb00' }}>
                        {weight}<span className="text-xs text-on-surface-variant ml-0.5">kg</span>
                      </span>
                    </div>
                  ))}
                </div>
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
            <div className="bg-surface-container-low rounded-lg p-6 space-y-4">
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
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-container rounded-lg p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Distance</p>
                <p className="font-headline text-xl font-extrabold">{totalDistance.toFixed(1)}<span className="text-xs text-on-surface-variant ml-0.5">km</span></p>
                <p className="text-[9px] text-on-surface-variant">30 days</p>
              </div>
              <div className="bg-surface-container rounded-lg p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Sessions</p>
                <p className="font-headline text-xl font-extrabold">{runData.length}</p>
                <p className="text-[9px] text-on-surface-variant">30 days</p>
              </div>
              <div className="bg-surface-container rounded-lg p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Avg/Run</p>
                <p className="font-headline text-xl font-extrabold">
                  {runData.length > 0 ? (totalDistance / runData.length).toFixed(1) : '—'}
                  <span className="text-xs text-on-surface-variant ml-0.5">km</span>
                </p>
                <p className="text-[9px] text-on-surface-variant">per session</p>
              </div>
            </div>

            {/* Distance by Session */}
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
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
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
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
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
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

        {/* AI Insight Section */}
        <section className="bg-surface-container/40 backdrop-blur-xl border border-outline-variant/15 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <div>
              <h4 className="font-headline text-sm font-bold uppercase tracking-tight">AI Kinetic Insight</h4>
              <p className="text-xs text-on-surface-variant">{promptsLeft} of {AI_LIMIT} prompts remaining</p>
            </div>
          </div>

          {aiResponse && (
            <div className="bg-surface-container rounded-lg p-4 mb-4 text-sm text-on-surface leading-relaxed">
              {aiResponse}
              {aiStreaming && <span className="inline-block w-1 h-4 bg-primary-container animate-pulse ml-1 align-middle" />}
            </div>
          )}

          {promptsLeft > 0 ? (
            <div className="flex gap-3">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
                placeholder="How can I improve my sessions?"
                className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-full px-5 py-3 text-sm placeholder:text-outline focus:outline-none focus:border-primary-container/50 transition-colors"
              />
              <button
                onClick={handleAiSubmit}
                disabled={!aiInput.trim() || aiStreaming}
                className="px-5 py-3 rounded-full bg-primary-container text-on-primary-fixed font-headline font-bold uppercase text-xs tracking-wide disabled:opacity-40 hover:bg-primary-dim transition-colors active:scale-95"
              >
                {aiStreaming ? '…' : 'Ask'}
              </button>
            </div>
          ) : (
            <div className="text-center py-3 text-on-surface-variant text-sm">
              You've used all {AI_LIMIT} AI prompts for this session.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
