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
      <span
        className={`material-symbols-outlined absolute -right-2 -top-2 text-[80px] ${iconColor[variant]}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden
      >
        {icon}
      </span>

      <span
        className={`text-[10px] font-black uppercase tracking-[0.18em] ${
          variant === 'lime' ? 'text-on-primary-container/70' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </span>

      <div>
        <div
          className={`font-headline font-black tracking-tighter leading-none ${
            String(value).length > 5 ? 'text-4xl' : 'text-6xl'
          }`}
        >
          {value}
        </div>
        {unit && (
          <div
            className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
              variant === 'lime' ? 'text-on-primary-container/60' : 'text-on-surface-variant'
            }`}
          >
            {unit}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Activity detail modal ── */
function ActivityDetailModal({ session, onClose }) {
  if (!session) return null;
  const isRun = session.session_type === 'run';

  const title = session.day_name || session.title || 'Workout';
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = session.submitted_at
    ? new Date(session.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : session.exercises?.items ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-surface-container-low rounded-3xl overflow-hidden max-h-[85dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-48 shrink-0 overflow-hidden">
          <img
            src={isRun ? '/run_activity.jpg' : '/gym_activity.jpg'}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="absolute bottom-4 left-5">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isRun ? 'text-primary-fixed' : 'text-secondary'}`}>
              {isRun ? 'Running' : 'Strength'}
            </p>
            <h2 className="font-headline font-black text-2xl uppercase tracking-tight">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Date/time */}
          <div className="flex items-center gap-2 text-on-surface-variant text-xs font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {dateStr}{timeStr ? `, ${timeStr}` : ''}
          </div>

          {isRun ? (
            /* Run stats grid */
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
            /* Gym exercises */
            <>
              {session.day_focus && (
                <div className="bg-secondary-container/10 rounded-xl px-4 py-2 inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                  <span className="text-secondary text-[10px] font-black uppercase tracking-widest">{session.day_focus}</span>
                </div>
              )}

              {exercises.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest">
                    Exercises ({exercises.length})
                  </p>
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
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <button
      onClick={() => onClick(session)}
      className="group w-full bg-surface-container rounded-2xl overflow-hidden flex items-stretch min-h-[120px] hover:bg-surface-container-high transition-colors text-left"
    >
      {/* Photo */}
      <div className="w-28 relative overflow-hidden shrink-0">
        <img
          src={isRun ? '/run_activity.jpg' : '/gym_activity.jpg'}
          alt={title}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-container" />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${typeLabelColor}`}>
          {isRun ? 'Running' : 'Gym'}
        </p>
        <p className="font-headline font-bold text-sm uppercase tracking-tight truncate">{title}</p>

        <div className="flex gap-4 mt-1">
          {isRun ? (
            <>
              {session.total_distance != null && (
                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                  {Number(session.total_distance).toFixed(1)} km
                </span>
              )}
              {session.avg_pace && (
                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                  {session.avg_pace}/km
                </span>
              )}
            </>
          ) : (
            <>
              {session.exercises && (
                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                  {Array.isArray(session.exercises) ? session.exercises.length : '—'} exercises
                </span>
              )}
              {session.day_focus && (
                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest truncate">
                  {session.day_focus}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Date + arrow */}
      <div className="flex flex-col items-end justify-center shrink-0 gap-1 pr-4">
        <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
          {dateStr}
        </span>
        <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
      </div>
    </button>
  );
}

/* ── Community plan card ── */
function CommunityPlanCard({ plan }) {
  const isRun = plan.plan_type === 'running';
  const avatarSrc = isRun ? '/run_activity.jpg' : '/community_avatar1.jpg';

  return (
    <div className="bg-surface-container-low border border-outline-variant/10 p-4 rounded-2xl flex justify-between items-center group hover:bg-surface-container transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border ${isRun ? 'border-primary-fixed/20' : 'border-secondary/20'}`}>
          <img src={avatarSrc} alt={plan.title} className="w-full h-full object-cover" />
        </div>
        <div>
          <h4 className={`font-headline font-extrabold text-sm leading-tight group-hover:${isRun ? 'text-primary-fixed' : 'text-secondary'} transition-colors`}>
            {plan.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
              {plan.plan_type}
            </span>
            {plan.difficulty && (
              <>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="text-[9px] uppercase text-on-surface-variant tracking-widest">
                  {plan.difficulty}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-highest text-on-surface hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors active:scale-90">
          <span className="material-symbols-outlined text-lg">download</span>
        </button>
        <button className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-highest text-on-surface hover:bg-secondary hover:text-on-secondary transition-colors active:scale-90">
          <span className="material-symbols-outlined text-lg">share</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function HomePage({ setPage }) {
  const { user, displayName } = useAuth();
  const { config } = useUserConfig();
  const [period, setPeriod] = useState('week');
  const [gymStats, setGymStats] = useState({ count: 0, totalWeight: 0 });
  const [runStats, setRunStats] = useState({ count: 0, totalDistance: 0 });
  const [recent, setRecent] = useState([]);
  const [communityPlans, setCommunityPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const startDate =
      period === 'week'
        ? new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]
        : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    Promise.all([
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('run_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('community_plans')
        .select('id, title, description, plan_type, difficulty, likes')
        .order('likes', { ascending: false })
        .limit(4),
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

      const allRecent = [
        ...gyms.map(s => ({ ...s, session_type: 'gym' })),
        ...runs.map(s => ({ ...s, session_type: 'run' })),
      ]
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
        .slice(0, 5);

      setRecent(allRecent);
      setCommunityPlans(communityRes.data ?? []);
      setLoading(false);
    });
  }, [user, period]);

  const firstName = displayName ? displayName.split(' ')[0] : null;
  const totalWorkouts = gymStats.count + runStats.count;
  const weightDisplay =
    gymStats.totalWeight > 1000
      ? `${(gymStats.totalWeight / 1000).toFixed(1)}t`
      : `${gymStats.totalWeight}`;

  return (
    <div className="pb-32 min-h-dvh bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">
          KINETIC
        </span>
        <button className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
      </header>

      <div className="px-5 pt-6 max-w-2xl mx-auto space-y-10">

        {/* ── Greeting ── */}
        <section>
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-[0.2em] mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="font-headline font-black text-4xl tracking-tighter uppercase leading-none">
            {firstName ? (
              <>
                Push Harder,{' '}
                <span className="text-primary-fixed" style={{ textShadow: '0 0 30px rgba(212,251,0,0.3)' }}>
                  {firstName}.
                </span>
              </>
            ) : (
              'Push Harder.'
            )}
          </h2>
          <p className="text-on-surface-variant text-sm font-medium mt-2">
            Your fitness hub — keep the momentum going.
          </p>
        </section>

        {/* ── Period toggle ── */}
        <div className="flex bg-surface-container-low p-1 rounded-full w-fit">
          {['week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-5 py-1.5 rounded-full font-headline font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                period === p
                  ? 'bg-primary-container text-on-primary-fixed shadow-[0_2px_12px_rgba(212,251,0,0.2)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* ── Stats bento grid ── */}
        <section className="grid grid-cols-2 gap-3">
          <BentoStat
            label="Workouts"
            value={totalWorkouts}
            icon="bolt"
            variant="dark"
          />
          <BentoStat
            label="Distance"
            value={runStats.totalDistance || 0}
            unit="Kilometers"
            icon="directions_run"
            variant="lime"
          />
          <div className="col-span-2">
            <BentoStat
              label="Weight Lifted"
              value={weightDisplay}
              unit="Kilograms total"
              icon="fitness_center"
              variant="cyan"
            />
          </div>
        </section>

        {/* ── Recent Activity ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-lg tracking-tight uppercase">Recent Activity</h3>
            <button
              onClick={() => setPage('analytics')}
              className="text-primary-fixed text-[10px] font-black tracking-widest uppercase hover:underline"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="bg-surface-container rounded-2xl p-8 text-center">
              <span
                className="material-symbols-outlined text-4xl text-outline mb-3 block"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                fitness_center
              </span>
              <p className="text-on-surface-variant font-medium text-sm">No sessions yet this {period}.</p>
              <p className="text-on-surface-variant/50 text-xs mt-1">Start a workout to see it here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(s => (
                <ActivityRow key={s.id} session={s} onClick={setSelectedSession} />
              ))}
            </div>
          )}
        </section>

        {/* ── Community Workouts ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-lg tracking-tight uppercase">Community Workouts</h3>
            <button className="text-secondary text-[10px] font-black tracking-widest uppercase hover:underline">
              See Trends
            </button>
          </div>

          {/* Create & Share CTA — inside community section */}
          <button
            onClick={() => setPage('create')}
            className="w-full py-4 mb-4 rounded-2xl kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter text-base shadow-[0_8px_30px_rgba(212,251,0,0.15)] hover:shadow-[0_8px_40px_rgba(212,251,0,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              add_circle
            </span>
            Create &amp; Share Workout Plan
          </button>

          {communityPlans.length > 0 ? (
            <div className="space-y-3">
              {communityPlans.map(plan => (
                <CommunityPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container rounded-2xl p-8 text-center">
              <span
                className="material-symbols-outlined text-4xl text-outline mb-3 block"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                groups
              </span>
              <p className="text-on-surface-variant font-medium text-sm">No community plans yet.</p>
              <p className="text-on-surface-variant/50 text-xs mt-1">Be the first to share a workout plan!</p>
            </div>
          )}
        </section>

      </div>

      {/* ── Activity detail modal ── */}
      {selectedSession && (
        <ActivityDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
