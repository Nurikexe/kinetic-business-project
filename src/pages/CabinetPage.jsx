import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { supabase } from '../lib/supabase';

/* ── Tiny stat pill ── */
function StatPill({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-headline font-black text-2xl tracking-tighter">{value}</span>
      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mt-0.5">{label}</span>
    </div>
  );
}

/* ── Record bento card ── */
function RecordCard({ icon, iconColor, label, value, unit, sub, variant = 'dark', className = '' }) {
  const cardBg = {
    dark: 'bg-surface-container',
    lime: 'bg-primary-container',
    cyan: 'bg-surface-container border-l-4 border-secondary',
  };
  const textColor = variant === 'lime' ? 'text-on-primary-fixed' : 'text-on-surface';
  const subColor  = variant === 'lime' ? 'text-on-primary-container/70' : 'text-on-surface-variant';

  return (
    <div className={`${cardBg[variant]} rounded-2xl p-5 flex flex-col justify-between min-h-[120px] ${className}`}>
      <div className="flex justify-between items-start">
        <span
          className={`material-symbols-outlined ${iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        {variant === 'lime' && (
          <span className="text-[9px] font-black uppercase tracking-widest bg-on-primary-container/10 text-on-primary-fixed px-2 py-0.5 rounded-full">
            Best
          </span>
        )}
      </div>
      <div>
        <div className={`font-headline font-black text-4xl tracking-tighter ${textColor}`}>
          {value}
          {unit && <span className="text-sm font-bold ml-1 tracking-wide">{unit}</span>}
        </div>
        <p className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${subColor}`}>{label}</p>
        {sub && <p className={`text-[9px] mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Settings row ── */
function SettingsRow({ icon, label, right, destructive = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors group text-left ${
        destructive
          ? 'bg-surface-container-low hover:bg-error/10 text-error'
          : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
      }`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`material-symbols-outlined text-xl ${
            destructive ? 'text-error' : 'text-on-surface-variant group-hover:text-primary-fixed transition-colors'
          }`}
        >
          {icon}
        </span>
        <span className="font-body font-medium text-sm">{label}</span>
      </div>
      {right ? (
        <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{right}</span>
      ) : (
        <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
      )}
    </button>
  );
}

/* ── Main Page ── */
export default function CabinetPage({ setPage }) {
  const { user, displayName, logout } = useAuth();
  const { config } = useUserConfig();

  const [workoutCount, setWorkoutCount] = useState('—');
  const [runCount, setRunCount] = useState('—');
  const [bestDistance, setBestDistance] = useState(null);
  const [totalWeight, setTotalWeight] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setWorkoutCount(count ?? 0));

    supabase
      .from('run_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setRunCount(count ?? 0));

    // Best single run distance
    supabase
      .from('run_sessions')
      .select('total_distance')
      .eq('user_id', user.id)
      .order('total_distance', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.total_distance) setBestDistance(Number(data.total_distance).toFixed(1));
      });

    // Total weight ever lifted
    supabase
      .from('workouts')
      .select('exercises')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        let total = 0;
        data.forEach(w => {
          const exs = Array.isArray(w.exercises) ? w.exercises : w.exercises?.items ?? [];
          exs.forEach(ex => {
            if (ex.weight && ex.sets && ex.reps) {
              const repsNum = parseInt(String(ex.reps).split('-')[0]) || 1;
              total += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * repsNum;
            }
          });
        });
        if (total > 0)
          setTotalWeight(total >= 1000 ? `${(total / 1000).toFixed(1)}t` : `${Math.round(total)}`);
      });
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const email = user?.email ?? '';
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() ?? '?';

  const goals = config.gym_goals
    ? typeof config.gym_goals === 'string'
      ? config.gym_goals
      : Array.isArray(config.gym_goals)
      ? config.gym_goals.join(' · ')
      : ''
    : null;

  return (
    <div className="pb-32 min-h-dvh bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex justify-between items-center px-6 py-4">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">
            KINETIC
          </span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-error transition-colors text-xs font-black uppercase tracking-widest disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </header>

      <div className="px-5 pt-6 max-w-xl mx-auto space-y-8">

        {/* ── Profile Hero ── */}
        <section className="flex flex-col items-start gap-5">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center"
              style={{ boxShadow: '0 0 40px rgba(212,251,0,0.2)' }}
            >
              <span className="font-headline font-black text-3xl text-on-primary-fixed">{initials}</span>
            </div>
            {/* Subtle glow ring */}
            <div className="absolute -inset-1 rounded-2xl bg-primary-container/10 -z-10 blur-sm" />
          </div>

          {/* Name + email */}
          <div>
            <h2
              className="font-headline font-black text-5xl tracking-tighter uppercase italic leading-none"
              style={{ textShadow: '0 0 40px rgba(212,251,0,0.15)' }}
            >
              {displayName || 'Athlete'}
            </h2>
            <p className="text-on-surface-variant text-xs font-medium mt-2">{email}</p>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-6 pt-1">
            <StatPill label="Gym Sessions" value={workoutCount} />
            <div className="w-px h-8 bg-outline-variant/30" />
            <StatPill label="Run Sessions" value={runCount} />
            {config.gym_day_count && (
              <>
                <div className="w-px h-8 bg-outline-variant/30" />
                <StatPill label="Days / Week" value={config.gym_day_count} />
              </>
            )}
          </div>
        </section>

        {/* ── Personal Records bento ── */}
        {(bestDistance || totalWeight || goals || config.ten_k_target) && (
          <section>
            <div className="flex justify-between items-baseline mb-4">
              <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Records &amp; Goals</h3>
              <span className="text-[9px] font-black uppercase tracking-widest text-secondary">Your Data</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {bestDistance && (
                <RecordCard
                  icon="directions_run"
                  iconColor="text-on-primary-container"
                  label="Best Run"
                  value={bestDistance}
                  unit="km"
                  variant="lime"
                  className="col-span-1"
                />
              )}

              {totalWeight && (
                <RecordCard
                  icon="fitness_center"
                  iconColor="text-secondary"
                  label="Total Lifted"
                  value={totalWeight}
                  unit={totalWeight.includes('t') ? '' : 'kg'}
                  variant="cyan"
                  className="col-span-1"
                />
              )}

              {goals && (
                <div className="col-span-2 bg-surface-container rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-fixed mb-2">
                    Strength Goals
                  </p>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{goals}</p>
                </div>
              )}

              {config.ten_k_target && (
                <div className="col-span-2 bg-surface-container rounded-2xl p-5 border-l-4 border-secondary">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary mb-2">
                    Running Target
                  </p>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{config.ten_k_target}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Settings ── */}
        <section>
          <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3 px-1">
            App Preferences
          </h3>
          <div className="flex flex-col gap-1">
            <SettingsRow
              icon="straighten"
              label="Measurement Units"
              right="Metric (KG/KM)"
            />
            <SettingsRow
              icon="bar_chart"
              label="Onboarding &amp; Plan"
              onClick={() => {
                sessionStorage.setItem('ha_force_onboarding', '1');
                window.location.reload();
              }}
            />
          </div>
        </section>

        {/* ── About ── */}
        <section>
          <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3 px-1">
            About
          </h3>
          <div className="bg-surface-container-low rounded-2xl p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">App</span>
                <span className="font-headline font-bold text-primary-fixed">KINETIC</span>
              </div>
              <div className="h-px bg-outline-variant/10" />
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Version</span>
                <span className="font-bold text-on-surface">2.0.0</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Danger zone ── */}
        <div className="flex flex-col gap-1">
          <SettingsRow
            icon="logout"
            label={loggingOut ? 'Signing out…' : 'Sign Out'}
            destructive
            onClick={handleLogout}
          />
        </div>

      </div>
    </div>
  );
}
