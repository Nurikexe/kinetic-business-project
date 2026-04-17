import { useState } from 'react';
import { createPortal } from 'react-dom';

/* ── PDF generator ── */
export function downloadPlanAsPDF(plan) {
  const pd = plan.plan_data ?? {};
  const isGym = plan.plan_type === 'gym';
  const isRun = plan.plan_type === 'running';

  let bodyHtml = '';

  if (isGym && pd.days) {
    bodyHtml = pd.days.map(day => `
      <div class="day">
        <div class="day-header">
          <span class="day-name">${day.name}</span>
          <span class="day-focus">${day.focus || ''}</span>
          <span class="day-schedule">${day.schedule || ''}</span>
        </div>
        <table>
          <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th></tr></thead>
          <tbody>
            ${(day.exercises || []).map(ex => `<tr><td>${ex.name}</td><td>${ex.sets}</td><td>${ex.reps}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
    if (pd.goals) bodyHtml += `<div class="section"><strong>Goals:</strong> ${pd.goals}</div>`;
    if (pd.rules) bodyHtml += `<div class="section"><strong>Rules:</strong><ul>${pd.rules.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
  } else if (isRun && pd.weeks) {
    bodyHtml = `
      <table>
        <thead><tr><th>Week</th><th>Monday (Tempo)</th><th>Thursday (Zone 2)</th><th>Saturday (Long)</th></tr></thead>
        <tbody>
          ${pd.weeks.map(w => `<tr><td>Week ${w.week}</td><td>${w.mon}</td><td>${w.thu}</td><td>${w.sat}</td></tr>`).join('')}
        </tbody>
      </table>`;
    if (pd.goal) bodyHtml += `<div class="section"><strong>Goal:</strong> ${pd.goal}</div>`;
  } else {
    bodyHtml = `<p>${plan.description || ''}</p>`;
    if (pd.overview) bodyHtml += `<div class="section"><strong>Overview:</strong> ${pd.overview}</div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${plan.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; padding: 32px; font-size: 13px; }
    h1 { font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .desc { color: #444; font-size: 13px; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 16px; }
    .author { font-size: 12px; font-weight: 700; margin-bottom: 20px; }
    .day { margin-bottom: 24px; }
    .day-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
    .day-name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .day-focus { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .day-schedule { font-size: 11px; color: #aaa; margin-left: auto; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #111; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 6px 10px; border-bottom: 1px solid #eee; }
    tr:last-child td { border-bottom: none; }
    .section { margin-top: 16px; }
    .section ul { margin-top: 8px; padding-left: 20px; }
    .section li { margin-bottom: 4px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="meta">${plan.plan_type.toUpperCase()} · ${plan.difficulty?.toUpperCase() ?? ''} · KINETIC</div>
  <h1>${plan.title}</h1>
  <div class="author">By ${pd.author_name ?? 'Nurassyl'}</div>
  <div class="desc">${plan.description ?? ''}</div>
  ${bodyHtml}
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

/* ── Community plan modal ── */
export function CommunityPlanModal({ plan, onClose, onUsePlan, isLiked, onLike, isOwn, onDeletePlan }) {
  const [confirming, setConfirming] = useState(false);
  const [applied, setApplied] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState({});

  if (!plan) return null;

  const pd = plan.plan_data ?? {};
  const isGym = plan.plan_type === 'gym';
  const isRun = plan.plan_type === 'running';
  const isHybrid = plan.plan_type === 'hybrid';
  const accentClass = isRun ? 'text-primary-fixed' : isHybrid ? 'text-tertiary' : 'text-secondary';
  const heroBg = pd.thumbnail_url || (isRun ? '/run_activity.jpg' : '/gym_activity.jpg');
  const authorName = pd.author_name || 'Community Member';

  const handleUse = () => {
    if (!confirming) { setConfirming(true); return; }
    onUsePlan(plan);
    setApplied(true);
    setConfirming(false);
    setTimeout(onClose, 1200);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md sm:p-4" onClick={onClose}>
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] max-w-xl bg-surface-container-low rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-0"
        onClick={e => e.stopPropagation()}>

          {/* ── Hero ── */}
          <div className="relative h-44 shrink-0 overflow-hidden">
            <img src={heroBg} alt={plan.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/50 to-transparent" />
            <button onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <div className="absolute bottom-4 left-5 right-14">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${accentClass}`}>
                {plan.plan_type} · {plan.difficulty}
              </p>
              <h2 className="font-headline font-black text-xl uppercase tracking-tight leading-tight">{plan.title}</h2>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="p-5 space-y-5 overflow-y-auto flex-1 overscroll-contain">

          {/* Author + likes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-outline-variant/30 shrink-0 bg-surface-container-highest flex items-center justify-center">
                {(plan.author?.avatar_url || pd.author_avatar_url) ? (
                  <img 
                    src={plan.author?.avatar_url || pd.author_avatar_url} 
                    alt={authorName} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="font-headline font-black text-xs text-primary-fixed">
                    {authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-headline font-bold text-sm">{authorName}</p>
                <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">Author</p>
              </div>
            </div>
            <button
              onClick={() => { if (!isOwn) onLike(plan.id); }}
              disabled={isOwn}
              title={isOwn ? "You can't like your own plan" : undefined}
              className={`flex items-center gap-1.5 transition-transform ${isOwn ? 'opacity-40 cursor-default' : 'active:scale-90'}`}
            >
              <span
                className={`material-symbols-outlined text-xl transition-colors ${isLiked ? 'text-error' : 'text-on-surface-variant'}`}
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >favorite</span>
              <span className={`text-sm font-bold ${isLiked ? 'text-error' : 'text-on-surface-variant'}`}>{plan.likes ?? 0}</span>
            </button>
          </div>

          {/* Description */}
          {plan.description && (
            <p className="text-on-surface-variant text-sm leading-relaxed">{plan.description}</p>
          )}

          {/* ── Gym plan: days + exercises ── */}
          {isGym && pd.days && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {pd.days.length}-Day Program
              </p>
              {pd.days.map((day, di) => (
                <div key={di} className="bg-surface-container rounded-2xl overflow-hidden">
                  <div 
                    className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-surface-container-high transition-colors"
                    onClick={() => setExpandedDays(prev => ({ ...prev, [di]: !prev[di] }))}
                  >
                    <div>
                      <span className="font-headline font-black text-sm uppercase">{day.name}</span>
                      {day.focus && <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest ml-2">{day.focus}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{day.schedule}</span>
                      <span className="material-symbols-outlined text-outline text-lg transition-transform" style={{ transform: expandedDays[di] ? 'rotate(180deg)' : 'none' }}>
                        expand_more
                      </span>
                    </div>
                  </div>
                  {expandedDays[di] && (
                    <div className="px-4 py-2 space-y-1.5 border-t border-outline-variant/10">
                      {(day.exercises || []).map((ex, ei) => (
                        <div key={ei} className="flex items-center justify-between py-1">
                          <span className="text-sm font-medium">{ex.name}</span>
                          <span className="text-on-surface-variant text-xs font-bold">{ex.sets}×{ex.reps}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {pd.goals && (
                <div className="bg-primary-container/10 rounded-xl px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Goals</p>
                  <p className="text-sm font-bold text-primary-fixed">{pd.goals}</p>
                </div>
              )}
              {pd.rules && (
                <div className="bg-surface-container rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Rules</p>
                  {pd.rules.map((r, i) => (
                    <div key={i} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                      <span className="text-primary-fixed font-black shrink-0">→</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Running plan: run types + weekly schedule ── */}
          {isRun && pd.run_types && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Run Types</p>
              <div className="grid grid-cols-3 gap-2">
                {pd.run_types.map((rt, i) => (
                  <div key={i} className="bg-surface-container rounded-xl p-3 text-center">
                    <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: rt.color }} />
                    <p className="font-headline font-bold text-xs uppercase leading-tight">{rt.name}</p>
                    <p className="text-on-surface-variant text-[9px] mt-1">{rt.day}</p>
                  </div>
                ))}
              </div>
              {pd.weeks && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant pt-1">
                    {pd.weeks.length}-Week Schedule
                  </p>
                  <div className="space-y-1.5">
                    {pd.weeks.map((w, i) => (
                      <div key={i} className="bg-surface-container rounded-xl overflow-hidden">
                        <div 
                          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-surface-container-high transition-colors"
                          onClick={() => setExpandedWeeks(prev => ({ ...prev, [i]: !prev[i] }))}
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary-fixed">Week {w.week}</span>
                          <span className="material-symbols-outlined text-outline text-lg transition-transform" style={{ transform: expandedWeeks[i] ? 'rotate(180deg)' : 'none' }}>
                            expand_more
                          </span>
                        </div>
                        {expandedWeeks[i] && (
                          <div className="px-4 pb-3 space-y-1 border-t border-outline-variant/10 pt-2">
                            {[{ label: 'Mon', val: w.mon }, { label: 'Thu', val: w.thu }, { label: 'Sat', val: w.sat }].map(d => (
                              <div key={d.label} className="flex gap-3 text-xs">
                                <span className="text-on-surface-variant font-bold w-7 shrink-0">{d.label}</span>
                                <span className="text-on-surface">{d.val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {pd.goal && (
                    <div className="bg-primary-container/10 rounded-xl px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Goal</p>
                      <p className="text-sm font-bold text-primary-fixed">{pd.goal}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Hybrid plan ── */}
          {isHybrid && pd.overview && (
            <div className="bg-surface-container rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Weekly Structure</p>
              <p className="text-sm text-on-surface leading-relaxed">{pd.overview}</p>
              <div className="grid grid-cols-2 gap-2">
                {pd.gym_days && <div className="bg-surface-container-high rounded-xl p-3 text-center">
                  <p className="font-headline font-black text-2xl">{pd.gym_days}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Gym Days</p>
                </div>}
                {pd.run_days && <div className="bg-surface-container-high rounded-xl p-3 text-center">
                  <p className="font-headline font-black text-2xl">{pd.run_days}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Run Days</p>
                </div>}
              </div>
              {pd.notes && <p className="text-xs text-on-surface-variant italic">{pd.notes}</p>}
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="p-4 pt-4 space-y-2 shrink-0 border-t border-outline-variant/10 bg-surface-container-low">
          {applied ? (
            <div className="w-full py-4 rounded-2xl bg-surface-container flex items-center justify-center gap-2 text-primary-fixed font-headline font-black uppercase text-sm tracking-wide">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Plan Applied!
            </div>
          ) : confirming ? (
            <div className="space-y-2">
              <p className="text-center text-xs text-on-surface-variant px-2">
                This will replace your current {isRun ? 'running' : isGym ? 'gym' : 'workout'} plan. Continue?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)}
                  className="flex-1 py-3 rounded-2xl bg-surface-container text-on-surface font-headline font-bold uppercase text-xs tracking-wide active:scale-95 transition-all">
                  Cancel
                </button>
                <button onClick={handleUse}
                  className="flex-1 py-3 rounded-2xl kinetic-gradient text-on-primary-fixed font-headline font-black uppercase text-xs tracking-wide active:scale-95 transition-all">
                  Yes, Apply
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => downloadPlanAsPDF(plan)}
                  className="flex-1 py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface font-headline font-bold uppercase text-xs tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">download</span>
                  Download PDF
                </button>
                <button
                  onClick={handleUse}
                  className="flex-1 py-3 rounded-2xl kinetic-gradient text-on-primary-fixed font-headline font-black uppercase text-xs tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,251,0,0.2)]">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  Use this Plan
                </button>
              </div>
              {isOwn && onDeletePlan && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this plan? This cannot be undone.')) {
                      onDeletePlan(plan.id);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl border border-error/30 text-error font-headline font-bold uppercase text-[10px] tracking-widest hover:bg-error/10 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Delete Plan
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Community plan card ── */
export function CommunityPlanCard({ plan, onClick, isLiked, onLike, isOwn }) {
  const isRun = plan.plan_type === 'running';
  const isHybrid = plan.plan_type === 'hybrid';
  const avatarSrc = plan.plan_data?.thumbnail_url || (isRun ? '/run_activity.jpg' : '/community_avatar1.jpg');
  const accentHover = isRun ? 'group-hover:text-primary-fixed' : isHybrid ? 'group-hover:text-tertiary' : 'group-hover:text-secondary';

  return (
    <button onClick={() => onClick(plan)}
      className="w-full bg-surface-container-low border border-outline-variant/10 p-4 rounded-3xl flex justify-between items-center gap-4 group hover:bg-surface-container transition-all text-left active:scale-[0.98] snap-start">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 border ${isRun ? 'border-primary-fixed/20' : 'border-secondary/20'} shadow-sm`}>
          <img src={avatarSrc} alt={plan.title} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={`font-headline font-black text-lg uppercase tracking-tight truncate mb-2 ${accentHover} transition-colors`}>
            {plan.title}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-4 h-4 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-variant/10">
                {(plan.author?.avatar_url || plan.plan_data?.author_avatar_url) ? (
                  <img 
                    src={plan.author?.avatar_url || plan.plan_data?.author_avatar_url} 
                    alt={plan.plan_data?.author_name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-[6px] font-black text-primary-fixed uppercase">
                    {(plan.plan_data?.author_name || 'M').charAt(0)}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-[0.1em] truncate">
                by <span className="text-on-surface">{plan.plan_data?.author_name || 'Member'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isRun ? 'bg-primary-fixed/10 text-primary-fixed' : 'bg-secondary/10 text-secondary'}`}>
                {plan.plan_type}
              </span>
              {plan.difficulty && (
                <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                  {plan.difficulty}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span
          role="button"
          onClick={e => { e.stopPropagation(); if (onLike && !isOwn) onLike(plan.id); }}
          className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all ${isOwn || !onLike ? 'opacity-20 cursor-default' : 'hover:bg-error/10 active:scale-90 border border-outline-variant/10'}`}
        >
          <span
            className={`material-symbols-outlined text-lg transition-colors ${isLiked ? 'text-error' : 'text-on-surface-variant'}`}
            style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
          >favorite</span>
          <span className={`text-[9px] font-black ${isLiked ? 'text-error' : 'text-on-surface-variant'}`}>{plan.likes ?? 0}</span>
        </span>
      </div>
    </button>
  );
}
