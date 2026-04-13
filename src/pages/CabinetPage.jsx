import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { supabase } from '../lib/supabase';

function StatPill({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-headline font-bold text-2xl">{value}</span>
      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</span>
    </div>
  );
}

export default function CabinetPage() {
  const { user, displayName, logout } = useAuth();
  const { config }                    = useUserConfig();
  const [workoutCount, setWorkoutCount] = useState('—');
  const [runCount, setRunCount]       = useState('—');
  const [loggingOut, setLoggingOut]   = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => setWorkoutCount(count ?? 0));
    supabase.from('run_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => setRunCount(count ?? 0));
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const email = user?.email ?? '';
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() ?? '?';

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 text-on-surface-variant hover:text-error transition-colors text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          {loggingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </header>

      <div className="px-6 pt-8 max-w-xl mx-auto">
        {/* Profile hero */}
        <section className="mb-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center mb-4">
            <span className="font-headline font-black text-3xl text-on-primary-fixed">{initials}</span>
          </div>
          <h2 className="font-headline font-black text-4xl tracking-tighter uppercase italic mb-1">{displayName || 'Athlete'}</h2>
          <p className="text-on-surface-variant text-sm">{email}</p>

          <div className="flex gap-8 mt-6">
            <StatPill label="Gym Sessions" value={workoutCount} />
            <div className="w-px bg-outline-variant/30" />
            <StatPill label="Run Sessions" value={runCount} />
            <div className="w-px bg-outline-variant/30" />
            <StatPill label="Gym Days/wk" value={config.gym_day_count ?? '—'} />
          </div>
        </section>

        {/* Goals */}
        {config.gym_goals && (
          <div className="bg-surface-container rounded-lg p-5 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-fixed mb-2">Strength Goals</p>
            <p className="text-on-surface-variant text-sm">
              {typeof config.gym_goals === 'string'
                ? config.gym_goals
                : Array.isArray(config.gym_goals) ? config.gym_goals.join(' · ') : ''}
            </p>
          </div>
        )}

        {/* Running target */}
        {config.ten_k_target && (
          <div className="bg-surface-container rounded-lg p-5 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">Running Target</p>
            <p className="text-on-surface-variant text-sm">{config.ten_k_target}</p>
          </div>
        )}

        {/* App info */}
        <div className="bg-surface-container-low rounded-lg p-5 mt-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">About</p>
          <div className="space-y-2 text-sm text-on-surface-variant">
            <div className="flex justify-between">
              <span>App</span>
              <span className="font-bold text-on-surface">KINETIC</span>
            </div>
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-bold text-on-surface">2.0.0</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full mt-6 py-4 rounded-full border border-error/30 text-error font-headline font-bold uppercase tracking-tighter hover:bg-error/10 transition-colors active:scale-95 disabled:opacity-50"
        >
          {loggingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
