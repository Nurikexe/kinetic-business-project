import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useUserConfig } from '../context/UserConfigContext';



/* ── Bento stat card ── */
function BentoStat({ label, value, unit, icon, variant = 'dark' }) {
  const base = 'rounded-2xl p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden';
  const styles = {
    lime: `${base} bg-primary-container text-on-primary-fixed`,
    dark: `${base} bg-surface-container-low text-on-surface`,
    cyan: `${base} bg-surface-container text-on-surface`,
  };
  const iconColor = {
    lime: 'text-on-primary-container opacity-40',
    dark: 'text-primary-fixed opacity-60',
    cyan: 'text-secondary opacity-60',
  };
  return (
    <div className={styles[variant]}>
      <span className={`material-symbols-outlined absolute -right-2 -top-2 text-[80px] ${iconColor[variant]}`}
        style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>{icon}</span>
      <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${variant === 'lime' ? 'text-on-primary-container/70' : 'text-on-surface-variant'}`}>
        {label}
      </span>
      <div>
        <div className={`font-headline font-black tracking-tighter leading-none ${String(value).length > 5 ? 'text-4xl' : 'text-6xl'}`}>
          {value}
        </div>
        {unit && (
          <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${variant === 'lime' ? 'text-on-primary-container/60' : 'text-on-surface-variant'}`}>
            {unit}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Body scroll lock hook ── */
function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

/* ── Activity detail modal ── */
function ActivityDetailModal({ session, onClose }) {
  useBodyScrollLock(!!session);
  if (!session) return null;
  const isRun = session.session_type === 'run';
  const title = session.day_name || session.title || 'Workout';
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = session.submitted_at
    ? new Date(session.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;
  const exercises = Array.isArray(session.exercises) ? session.exercises : session.exercises?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="flex min-h-full items-end sm:items-center justify-center p-0">
        <div className="relative w-full max-w-xl bg-surface-container-low rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden mt-10 sm:mt-0"
          onClick={e => e.stopPropagation()}>
          <div className="relative h-48 shrink-0 overflow-hidden">
            <img src={isRun ? '/run_activity.jpg' : '/gym_activity.jpg'} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent" />
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <div className="absolute bottom-4 left-5">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isRun ? 'text-primary-fixed' : 'text-secondary'}`}>
                {isRun ? 'Running' : 'Strength'}
              </p>
              <h2 className="font-headline font-black text-2xl uppercase tracking-tight">{title}</h2>
            </div>
          </div>
          <div className="p-5 space-y-5">
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
      </div>
    </div>
  );
}

/* ── Activity card (with photo) ── */
function ActivityRow({ session, onClick }) {
  const isRun = session.session_type === 'run';
  const typeLabelColor = isRun ? 'text-primary-fixed' : 'text-secondary';
  const title = session.day_name || session.title || 'Workout';
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <button onClick={() => onClick(session)}
      className="group w-full bg-surface-container rounded-2xl overflow-hidden flex items-stretch min-h-[120px] hover:bg-surface-container-high transition-colors text-left">
      <div className="w-28 relative overflow-hidden shrink-0">
        <img src={isRun ? '/run_activity.jpg' : '/gym_activity.jpg'} alt={title}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-container" />
      </div>
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${typeLabelColor}`}>{isRun ? 'Running' : 'Gym'}</p>
        <p className="font-headline font-bold text-sm uppercase tracking-tight truncate">{title}</p>
        <div className="flex gap-4 mt-1">
          {isRun ? (
            <>
              {session.total_distance != null && <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{Number(session.total_distance).toFixed(1)} km</span>}
              {session.avg_pace && <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{session.avg_pace}/km</span>}
            </>
          ) : (
            <>
              {session.exercises && <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{Array.isArray(session.exercises) ? session.exercises.length : '—'} exercises</span>}
              {session.day_focus && <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest truncate">{session.day_focus}</span>}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end justify-center shrink-0 gap-1 pr-4">
        <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{dateStr}</span>
        <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
      </div>
    </button>
  );
}

/* ── PDF generator ── */
function downloadPlanAsPDF(plan) {
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
function CommunityPlanModal({ plan, onClose, onUsePlan, isLiked, onLike, isOwn }) {
  useBodyScrollLock(!!plan);
  const [confirming, setConfirming] = useState(false);
  const [applied, setApplied] = useState(false);
  if (!plan) return null;

  const pd = plan.plan_data ?? {};
  const isGym = plan.plan_type === 'gym';
  const isRun = plan.plan_type === 'running';
  const isHybrid = plan.plan_type === 'hybrid';
  const accentClass = isRun ? 'text-primary-fixed' : isHybrid ? 'text-tertiary' : 'text-secondary';
  const heroBg = isRun ? '/run_activity.jpg' : '/gym_activity.jpg';
  const authorName = pd.author_name ?? 'Nurassyl';

  const handleUse = () => {
    if (!confirming) { setConfirming(true); return; }
    onUsePlan(plan);
    setApplied(true);
    setConfirming(false);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md sm:p-4" onClick={onClose}>
      <div className="flex min-h-full items-end sm:items-center justify-center p-0">
        <div className="relative w-full max-w-xl bg-surface-container-low rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden mt-10 sm:mt-0"
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
          <div className="p-5 space-y-5">

          {/* Author + likes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/30 shrink-0">
                <img src="/community_avatar1.jpg" alt={authorName} className="w-full h-full object-cover" />
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
                  <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
                    <div>
                      <span className="font-headline font-black text-sm uppercase">{day.name}</span>
                      {day.focus && <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest ml-2">{day.focus}</span>}
                    </div>
                    <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{day.schedule}</span>
                  </div>
                  <div className="px-4 py-2 space-y-1.5">
                    {(day.exercises || []).map((ex, ei) => (
                      <div key={ei} className="flex items-center justify-between py-1">
                        <span className="text-sm font-medium">{ex.name}</span>
                        <span className="text-on-surface-variant text-xs font-bold">{ex.sets}×{ex.reps}</span>
                      </div>
                    ))}
                  </div>
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
                      <div key={i} className="bg-surface-container rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary-fixed">Week {w.week}</span>
                        </div>
                        <div className="space-y-1">
                          {[{ label: 'Mon', val: w.mon }, { label: 'Thu', val: w.thu }, { label: 'Sat', val: w.sat }].map(d => (
                            <div key={d.label} className="flex gap-3 text-xs">
                              <span className="text-on-surface-variant font-bold w-7 shrink-0">{d.label}</span>
                              <span className="text-on-surface">{d.val}</span>
                            </div>
                          ))}
                        </div>
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
        <div className="p-4 pt-0 space-y-2 shrink-0">
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
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Community plan card ── */
function CommunityPlanCard({ plan, onClick, isLiked, onLike, isOwn }) {
  const isRun = plan.plan_type === 'running';
  const isHybrid = plan.plan_type === 'hybrid';
  const avatarSrc = isRun ? '/run_activity.jpg' : '/community_avatar1.jpg';
  const accentHover = isRun ? 'group-hover:text-primary-fixed' : isHybrid ? 'group-hover:text-tertiary' : 'group-hover:text-secondary';

  return (
    <button onClick={() => onClick(plan)}
      className="w-full bg-surface-container-low border border-outline-variant/10 p-4 rounded-2xl flex justify-between items-center group hover:bg-surface-container transition-colors text-left active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border ${isRun ? 'border-primary-fixed/20' : 'border-secondary/20'}`}>
          <img src={avatarSrc} alt={plan.title} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h4 className={`font-headline font-extrabold text-sm leading-tight truncate ${accentHover} transition-colors`}>
            {plan.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{plan.plan_type}</span>
            {plan.difficulty && (
              <>
                <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0" />
                <span className="text-[9px] uppercase text-on-surface-variant tracking-widest">{plan.difficulty}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span
          role="button"
          onClick={e => { e.stopPropagation(); if (!isOwn) onLike(plan.id); }}
          title={isOwn ? "You can't like your own plan" : undefined}
          className={`flex items-center gap-1 transition-transform ${isOwn ? 'opacity-40 cursor-default' : 'active:scale-90'}`}
        >
          <span
            className={`material-symbols-outlined text-base transition-colors ${isLiked ? 'text-error' : 'text-on-surface-variant'}`}
            style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
          >favorite</span>
          <span className={`text-xs font-bold ${isLiked ? 'text-error' : 'text-on-surface-variant'}`}>{plan.likes ?? 0}</span>
        </span>
        <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
      </div>
    </button>
  );
}

/* ── Main Page ── */
export default function HomePage({ setPage }) {
  const { user, displayName } = useAuth();
  const { config, updateConfig } = useUserConfig();
  const [period, setPeriod] = useState('week');
  const [gymStats, setGymStats] = useState({ count: 0, totalWeight: 0 });
  const [runStats, setRunStats] = useState({ count: 0, totalDistance: 0 });
  const [recent, setRecent] = useState([]);
  const [communityPlans, setCommunityPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAllCommunity, setShowAllCommunity] = useState(false);

  // Liked plan IDs — persisted in user_config so they survive across sessions
  const likedPlans = config.liked_plans ?? [];

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const startDate =
      period === 'week'
        ? new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]
        : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    Promise.all([
      supabase.from('workouts').select('*').eq('user_id', user.id).gte('date', startDate).order('submitted_at', { ascending: false }),
      supabase.from('run_sessions').select('*').eq('user_id', user.id).gte('date', startDate).order('submitted_at', { ascending: false }),
      supabase.from('community_plans').select('id, user_id, title, description, plan_type, difficulty, likes, plan_data, created_at').order('likes', { ascending: false }).order('created_at', { ascending: true }),
    ]).then(([gymRes, runRes, communityRes]) => {
      const gyms = gymRes.data ?? [];
      const runs = runRes.data ?? [];

      let totalWeight = 0;
      gyms.forEach(w => {
        const exercises = Array.isArray(w.exercises) ? w.exercises : w.exercises?.items ?? [];
        exercises.forEach(ex => {
          if (ex.weight && ex.sets && ex.reps) {
            const repsNum = parseInt(String(ex.reps).split('-')[0]) || 1;
            totalWeight += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * repsNum;
          }
        });
      });

      let totalDistance = 0;
      runs.forEach(r => (totalDistance += parseFloat(r.total_distance) || 0));

      setGymStats({ count: gyms.length, totalWeight: Math.round(totalWeight) });
      setRunStats({ count: runs.length, totalDistance: Math.round(totalDistance * 10) / 10 });

      setRecent([
        ...gyms.map(s => ({ ...s, session_type: 'gym' })),
        ...runs.map(s => ({ ...s, session_type: 'run' })),
      ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 5));

      setCommunityPlans(communityRes.data ?? []);
      setLoading(false);
    });
  }, [user, period]);

  /* Toggle like on a community plan with robust optimistic rollback */
  const handleLike = async (planId) => {
    if (!user) return;

    const alreadyLiked = likedPlans.includes(planId);
    const delta = alreadyLiked ? -1 : 1;
    const newLikedPlans = alreadyLiked
      ? likedPlans.filter(id => id !== planId)
      : [...likedPlans, planId];

    // Capture current UI local state for potential rollback
    const originalPlans = [...communityPlans];
    const planToUpdate = communityPlans.find(p => p.id === planId);
    const originalLikes = planToUpdate?.likes ?? 0;
    const newLikes = Math.max(0, originalLikes + delta);

    // 1. Optimistically update local component UI state
    setCommunityPlans(prev =>
      prev.map(p => p.id === planId ? { ...p, likes: newLikes } : p)
    );
    setSelectedPlan(prev =>
      prev?.id === planId ? { ...prev, likes: newLikes } : prev
    );

    // 2. Persist liked list in user_config optimistically
    updateConfig({ liked_plans: newLikedPlans }, { immediate: true });

    // 3. Perform the actual database operation
    const { data: actualLikes, error } = await supabase
      .rpc('toggle_plan_like', { plan_id: planId, delta });

    if (error || typeof actualLikes !== 'number') {
      console.error('Like count sync failed:', error?.message || 'Invalid RPC response format. Schema update required.');
      
      // Rollback UI to accurately reflect the real failed DB state
      setCommunityPlans(originalPlans);
      setSelectedPlan(prev =>
        prev?.id === planId ? { ...prev, likes: originalLikes } : prev
      );
      
      // Reset user_config context state
      updateConfig({ liked_plans: likedPlans }, { immediate: true });
    } else {
      // Keep UI synced cleanly with the authoritative value returned by the database
      setCommunityPlans(prev =>
        prev.map(p => p.id === planId ? { ...p, likes: actualLikes } : p)
      );
      setSelectedPlan(prev =>
        prev?.id === planId ? { ...prev, likes: actualLikes } : prev
      );
    }
  };

  /* Apply a community plan to the user's config */
  const handleUsePlan = (plan) => {
    const pd = plan.plan_data ?? {};
    const isGym = plan.plan_type === 'gym';
    const isRun = plan.plan_type === 'running';

    if (isGym && pd.days) {
      const gymDays = pd.days.map((d, i) => ({
        id: i + 1,
        num: `Day ${i + 1}`,
        name: d.name,
        sub: d.focus || '',
        schedule: d.schedule || '',
        exercises: (d.exercises || []).map((ex, j) => ({
          id: `ex-${i}-${j}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: '',
        })),
      }));
      updateConfig({
        gym_days: gymDays,
        gym_day_count: gymDays.length,
        completed: Array(gymDays.length).fill(false),
        ...(pd.goals ? { gym_goals: pd.goals } : {}),
        ...(pd.rules ? { gym_rules: pd.rules } : {}),
      }, { immediate: true });
    }

    if (isRun && pd.weeks) {
      updateConfig({
        run_weeks: pd.weeks,
        run_types: (pd.run_types || []).map(rt => ({
          day: rt.day,
          name: rt.name,
          desc: rt.desc,
          iconKey: rt.iconKey || 'zap',
          color: rt.color,
        })),
        run_week: 0,
        run_completed: Object.fromEntries(Array.from({ length: pd.weeks.length }, (_, i) => [i, [false, false, false]])),
      }, { immediate: true });
    }

    if (plan.plan_type === 'hybrid') {
      if (pd.days) {
        const gymDays = pd.days.map((d, i) => ({
          id: i + 1, num: `Day ${i + 1}`, name: d.name, sub: d.focus || '', schedule: d.schedule || '',
          exercises: (d.exercises || []).map((ex, j) => ({ id: `ex-${i}-${j}`, name: ex.name, sets: ex.sets, reps: ex.reps, weight: '' })),
        }));
        updateConfig({ gym_days: gymDays, gym_day_count: gymDays.length, completed: Array(gymDays.length).fill(false) }, { immediate: true });
      }
      if (pd.weeks) {
        updateConfig({
          run_weeks: pd.weeks,
          run_types: (pd.run_types || []).map(rt => ({ day: rt.day, name: rt.name, desc: rt.desc, iconKey: rt.iconKey || 'zap', color: rt.color })),
          run_week: 0,
          run_completed: Object.fromEntries(Array.from({ length: pd.weeks.length }, (_, i) => [i, [false, false, false]])),
        }, { immediate: true });
      }
    }
  };

  const firstName = displayName ? displayName.split(' ')[0] : null;
  const totalWorkouts = gymStats.count + runStats.count;
  const weightDisplay = gymStats.totalWeight > 1000 ? `${(gymStats.totalWeight / 1000).toFixed(1)}t` : `${gymStats.totalWeight}`;

  return (
    <div className="pb-32 min-h-dvh bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex justify-between items-center px-6 py-4">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        </div>
      </header>

      <div className="px-5 pt-6 max-w-xl mx-auto space-y-10">

        {/* ── Greeting ── */}
        <section>
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-[0.2em] mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="font-headline font-black text-4xl tracking-tighter uppercase leading-none">
            {firstName ? (
              <>Push Harder,{' '}
                <span className="text-primary-fixed" style={{ textShadow: '0 0 30px rgba(212,251,0,0.3)' }}>{firstName}.</span>
              </>
            ) : 'Push Harder.'}
          </h2>
          <p className="text-on-surface-variant text-sm font-medium mt-2">Your fitness hub — keep the momentum going.</p>
        </section>

        {/* ── Period toggle ── */}
        <div className="flex bg-surface-container-low p-1 rounded-full w-fit">
          {['week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-5 py-1.5 rounded-full font-headline font-bold text-xs uppercase tracking-wider transition-all duration-200 ${period === p ? 'bg-primary-container text-on-primary-fixed shadow-[0_2px_12px_rgba(212,251,0,0.2)]' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* ── Stats bento grid ── */}
        <section className="grid grid-cols-2 gap-3">
          <BentoStat label="Workouts" value={totalWorkouts} icon="bolt" variant="dark" />
          <BentoStat label="Distance" value={runStats.totalDistance || 0} unit="Kilometers" icon="directions_run" variant="lime" />
          <div className="col-span-2">
            <BentoStat label="Weight Lifted" value={weightDisplay} unit="Kilograms total" icon="fitness_center" variant="cyan" />
          </div>
        </section>

        {/* ── Recent Activity ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-lg tracking-tight uppercase">Recent Activity</h3>
            <button onClick={() => setPage('analytics')} className="text-primary-fixed text-[10px] font-black tracking-widest uppercase hover:underline">
              View All
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="bg-surface-container rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <p className="text-on-surface-variant font-medium text-sm">No sessions yet this {period}.</p>
              <p className="text-on-surface-variant/50 text-xs mt-1">Start a workout to see it here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(s => <ActivityRow key={s.id} session={s} onClick={setSelectedSession} />)}
            </div>
          )}
        </section>

        {/* ── Community Workouts ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-lg tracking-tight uppercase">Community Workouts</h3>
            {communityPlans.length > 3 && (
              <button
                onClick={() => setShowAllCommunity(true)}
                className="text-secondary text-[10px] font-black tracking-widest uppercase hover:underline"
              >
                See All
              </button>
            )}
          </div>

          <button onClick={() => setPage('create')}
            className="w-full py-4 mb-4 rounded-2xl kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter text-base shadow-[0_8px_30px_rgba(212,251,0,0.15)] hover:shadow-[0_8px_40px_rgba(212,251,0,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Create &amp; Share Workout Plan
          </button>

          {communityPlans.length > 0 ? (
            <div className="space-y-3">
              {communityPlans.slice(0, 3).map(plan => (
                <CommunityPlanCard
                  key={plan.id}
                  plan={plan}
                  onClick={setSelectedPlan}
                  isLiked={likedPlans.includes(plan.id)}
                  onLike={handleLike}
                  isOwn={plan.user_id === user?.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              <p className="text-on-surface-variant font-medium text-sm">No community plans yet.</p>
              <p className="text-on-surface-variant/50 text-xs mt-1">Be the first to share a workout plan!</p>
            </div>
          )}
        </section>

      </div>

      {/* ── Modals ── */}
      {selectedSession && <ActivityDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
      {selectedPlan && (
        <CommunityPlanModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onUsePlan={handleUsePlan}
          isLiked={likedPlans.includes(selectedPlan.id)}
          onLike={handleLike}
          isOwn={selectedPlan.user_id === user?.id}
        />
      )}
      {showAllCommunity && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md sm:p-4" onClick={() => setShowAllCommunity(false)}>
          <div className="flex min-h-full items-end sm:items-center justify-center p-0">
            <div className="relative w-full max-w-2xl bg-surface-container-low rounded-t-3xl sm:rounded-3xl shadow-2xl mt-16 sm:mt-0 flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-outline-variant/10 bg-surface-container-low/90 backdrop-blur-xl rounded-t-3xl sm:rounded-t-3xl">
                <h2 className="font-headline font-black text-xl tracking-tight uppercase">All Community Plans</h2>
                <button onClick={() => setShowAllCommunity(false)} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary-fixed transition-colors">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              <div className="p-5 space-y-3">
                {communityPlans.map(plan => (
                  <CommunityPlanCard
                    key={plan.id}
                    plan={plan}
                    onClick={setSelectedPlan}
                    isLiked={likedPlans.includes(plan.id)}
                    onLike={handleLike}
                    isOwn={plan.user_id === user?.id}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
