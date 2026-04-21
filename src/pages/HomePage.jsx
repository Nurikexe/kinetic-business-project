import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useUserConfig } from '../context/UserConfigContext';
import { CommunityPlanCard, CommunityPlanModal, downloadPlanAsPDF } from '../components/CommunityPlan';



/* ── Bento stat card ── */
function BentoStat({ label, value, unit, icon, variant = 'dark' }) {
  const base = 'rounded-2xl p-5 flex flex-col justify-between min-h-[130px] relative overflow-hidden';
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
        <div className={`font-headline font-black tracking-tighter leading-none ${String(value).length > 4 ? 'text-4xl' : 'text-5xl'}`}>
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


/* ── Activity detail modal ── */
function ActivityDetailModal({ session, onClose }) {
  if (!session) return null;
  const isRun = session.session_type === 'run';
  const title = session.day_name || session.title || 'Workout';
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = session.submitted_at
    ? new Date(session.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;
  const exercises = Array.isArray(session.exercises) ? session.exercises : session.exercises?.items ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] max-w-xl bg-surface-container-low rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-0"
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
          {session.notes && (
            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest mb-2">Notes</p>
              <p className="text-sm text-on-surface leading-relaxed">{session.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
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

  // Lock scroll natively when any modal is active
  useEffect(() => {
    if (selectedSession || selectedPlan || showAllCommunity) {
      const scrollY = window.scrollY;
      const prevPosition = document.body.style.position;
      const prevTop = document.body.style.top;
      const prevWidth = document.body.style.width;
      const prevOverflow = document.body.style.overflow;
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = prevPosition;
        document.body.style.top = prevTop;
        document.body.style.width = prevWidth;
        document.body.style.overflow = prevOverflow;
        window.scrollTo(0, scrollY);
      };
    }
  }, [selectedSession, selectedPlan, showAllCommunity]);

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
      supabase.from('community_plans').select('*').order('likes', { ascending: false }).order('created_at', { ascending: false }),
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
      ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 3));

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

  /* Delete a community plan (only if own) */
  const handleDeletePlan = async (planId) => {
    const { error } = await supabase.from('community_plans').delete().eq('id', planId);
    if (!error) {
      setCommunityPlans(prev => prev.filter(p => p.id !== planId));
      setSelectedPlan(null);
    } else {
      console.error('Failed to delete plan:', error.message);
      alert('Could not delete plan. Please try again.');
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
            <div className="bg-surface-container rounded-2xl p-6 text-center">
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
              {/* ── Your Shared Workouts section ── */}
              {communityPlans.some(p => p.user_id === user?.id) && (
                <div className="mb-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-4">Your Shared Workouts</p>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 pb-4 snap-x snap-mandatory">
                    {communityPlans
                      .filter(p => p.user_id === user?.id)
                      .map(plan => (
                        <div key={plan.id} className="min-w-[280px] w-[280px] snap-center">
                          <CommunityPlanCard
                            plan={plan}
                            onClick={setSelectedPlan}
                            isLiked={likedPlans.includes(plan.id)}
                            onLike={handleLike}
                            isOwn={true}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-4">Community Feed</p>
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
            <div className="bg-surface-container rounded-2xl p-6 text-center">
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
          onDeletePlan={handleDeletePlan}
        />
      )}
      {showAllCommunity && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md sm:p-4" onClick={() => setShowAllCommunity(false)}>
          <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] max-w-2xl bg-surface-container-low rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden min-h-0"
            onClick={e => e.stopPropagation()}>
            <div className="shrink-0 z-10 flex items-center justify-between p-5 border-b border-outline-variant/10 bg-surface-container-low/90 backdrop-blur-xl">
              <h2 className="font-headline font-black text-xl tracking-tight uppercase">All Community Plans</h2>
                <button onClick={() => setShowAllCommunity(false)} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary-fixed transition-colors">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto flex-1 overscroll-contain">
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
        </div>,
        document.body
      )}
    </div>
  );
}
