import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useUserConfig } from '../context/UserConfigContext';

function StatCard({ label, value, unit, icon, accent }) {
  const accentClass = accent === 'lime'
    ? 'bg-primary-container text-on-primary-container'
    : accent === 'cyan'
    ? 'bg-secondary-container/30 text-secondary'
    : 'bg-surface-container-low text-on-surface-variant';

  return (
    <div className={`rounded-lg p-6 flex flex-col justify-between min-h-[160px] ${accentClass}`}>
      <div className="flex justify-between items-start">
        <span className="font-label font-bold tracking-widest text-xs uppercase opacity-70">{label}</span>
        <span className="material-symbols-outlined text-xl opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <div className="font-headline font-black text-5xl tracking-tighter">{value}</div>
        {unit && <div className="font-bold text-xs mt-1 uppercase opacity-70">{unit}</div>}
      </div>
    </div>
  );
}

function ActivityCard({ session }) {
  const isRun = session.session_type === 'run';
  return (
    <div className="bg-surface-container rounded-lg p-5 hover:bg-surface-container-high transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 text-primary-fixed">
            {isRun ? 'Running' : 'Gym'}
          </p>
          <h4 className="font-headline font-bold text-lg tracking-tight">{session.day_name || session.title || 'Workout'}</h4>
        </div>
        <span className="text-on-surface-variant text-xs font-bold">
          {new Date(session.submitted_at || session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <div className="flex gap-6">
        {isRun ? (
          <>
            {session.total_distance != null && (
              <div>
                <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">Distance</p>
                <p className="font-headline font-bold">{Number(session.total_distance).toFixed(1)} km</p>
              </div>
            )}
            {session.avg_pace && (
              <div>
                <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">Pace</p>
                <p className="font-headline font-bold">{session.avg_pace}/km</p>
              </div>
            )}
          </>
        ) : (
          <>
            {session.exercises && (
              <div>
                <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">Exercises</p>
                <p className="font-headline font-bold">
                  {Array.isArray(session.exercises) ? session.exercises.length : '—'}
                </p>
              </div>
            )}
            {session.day_focus && (
              <div>
                <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">Focus</p>
                <p className="font-headline font-bold text-sm">{session.day_focus}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function HomePage({ setPage }) {
  const { user, displayName } = useAuth();
  const { config } = useUserConfig();
  const [period, setPeriod]         = useState('week');
  const [gymStats, setGymStats]     = useState({ count: 0, totalWeight: 0 });
  const [runStats, setRunStats]     = useState({ count: 0, totalDistance: 0 });
  const [recent, setRecent]         = useState([]);
  const [communityPlans, setCommunityPlans] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const startDate = period === 'week'
      ? new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    Promise.all([
      supabase.from('workouts').select('*').eq('user_id', user.id).gte('date', startDate).order('submitted_at', { ascending: false }),
      supabase.from('run_sessions').select('*').eq('user_id', user.id).gte('date', startDate).order('submitted_at', { ascending: false }),
      supabase.from('community_plans').select('id, title, description, plan_type, difficulty, likes').order('likes', { ascending: false }).limit(4),
    ]).then(([gymRes, runRes, communityRes]) => {
      const gyms = gymRes.data ?? [];
      const runs = runRes.data ?? [];

      // Gym stats
      let totalWeight = 0;
      gyms.forEach(w => {
        const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
        exercises.forEach(ex => {
          if (ex.weight && ex.sets && ex.reps) {
            const repsNum = parseInt(String(ex.reps).split('-')[0]) || 1;
            totalWeight += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * repsNum;
          }
        });
      });

      // Run stats
      let totalDistance = 0;
      runs.forEach(r => totalDistance += parseFloat(r.total_distance) || 0);

      setGymStats({ count: gyms.length, totalWeight: Math.round(totalWeight) });
      setRunStats({ count: runs.length, totalDistance: Math.round(totalDistance * 10) / 10 });

      // Combined recent activity (last 5)
      const allRecent = [
        ...gyms.map(s => ({ ...s, session_type: 'gym' })),
        ...runs.map(s => ({ ...s, session_type: 'run' })),
      ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 5);

      setRecent(allRecent);
      setCommunityPlans(communityRes.data ?? []);
      setLoading(false);
    });
  }, [user, period]);

  const greeting = displayName ? `Push Harder, ${displayName.split(' ')[0]}.` : 'Push Harder.';
  const totalWorkouts = gymStats.count + runStats.count;

  return (
    <div className="pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
        <button className="text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <div className="px-6 pt-8 max-w-2xl mx-auto">
        {/* Greeting */}
        <section className="mb-8">
          <h2 className="font-headline font-extrabold text-4xl tracking-tighter uppercase mb-1">{greeting}</h2>
          <p className="text-on-surface-variant font-medium">Your fitness hub. Keep the momentum going.</p>
        </section>

        {/* Period toggle */}
        <div className="flex bg-surface-container-low p-1 rounded-full mb-8 w-fit">
          <button
            onClick={() => setPeriod('week')}
            className={`px-5 py-2 rounded-full font-headline font-bold text-sm uppercase tracking-wide transition-all ${period === 'week' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-5 py-2 rounded-full font-headline font-bold text-sm uppercase tracking-wide transition-all ${period === 'month' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            This Month
          </button>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4 mb-10">
          <StatCard label="Total Workouts" value={totalWorkouts} icon="bolt" />
          <StatCard label="Distance" value={runStats.totalDistance || 0} unit="Kilometers" icon="directions_run" accent="lime" />
          <div className="col-span-2">
            <StatCard
              label="Weight Lifted"
              value={gymStats.totalWeight > 1000 ? `${(gymStats.totalWeight / 1000).toFixed(1)}t` : `${gymStats.totalWeight}`}
              unit="Kilograms"
              icon="fitness_center"
              accent="cyan"
            />
          </div>
        </section>

        {/* Create Plan CTA */}
        <section className="mb-10">
          <button
            onClick={() => setPage('create')}
            className="w-full py-5 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter text-lg shadow-[0_8px_30px_rgba(212,251,0,0.15)] hover:shadow-[0_8px_40px_rgba(212,251,0,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Create &amp; Share Workout Plan
          </button>
        </section>

        {/* Recent Activity */}
        <section className="mb-10">
          <div className="flex justify-between items-end mb-5">
            <h3 className="font-headline font-bold text-xl tracking-tight uppercase">Recent Activity</h3>
            <button className="text-primary-fixed text-xs font-bold tracking-widest uppercase hover:underline">View All</button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="bg-surface-container rounded-lg p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block">fitness_center</span>
              <p className="text-on-surface-variant font-medium">No sessions yet this {period}.</p>
              <p className="text-on-surface-variant/60 text-sm mt-1">Start a workout to see it here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(s => <ActivityCard key={s.id} session={s} />)}
            </div>
          )}
        </section>

        {/* Community Plans */}
        {communityPlans.length > 0 && (
          <section className="mb-10">
            <div className="flex justify-between items-end mb-5">
              <h3 className="font-headline font-bold text-xl tracking-tight uppercase">Community Plans</h3>
              <button className="text-secondary text-xs font-bold tracking-widest uppercase hover:underline">Browse All</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {communityPlans.map(plan => (
                <div key={plan.id} className="bg-surface-container rounded-lg p-5 flex justify-between items-center">
                  <div>
                    <p className="font-headline font-bold uppercase tracking-tight">{plan.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed">{plan.plan_type}</span>
                      {plan.difficulty && <span className="text-[10px] text-on-surface-variant uppercase">{plan.difficulty}</span>}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-on-surface-variant text-xs">
                    <span className="material-symbols-outlined text-sm">favorite</span>
                    {plan.likes ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
