import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserConfig } from '../context/UserConfigContext';
import { supabase } from '../lib/supabase';
import { DEFAULT_AVATARS } from '../data/avatars';

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

/* ── Avatar Picker Modal ── */
function AvatarPickerModal({ currentAvatar, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6" onClick={onClose}>
      <div className="bg-surface-container rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="font-headline font-black text-xl uppercase tracking-tight">Choose Avatar</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 grid grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
          {DEFAULT_AVATARS.map((url, i) => (
            <button
              key={i}
              onClick={() => { onSelect(url); onClose(); }}
              className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all duration-300 hover:scale-110 active:scale-95 ${
                currentAvatar === url ? 'border-primary-fixed shadow-[0_0_20px_rgba(212,251,0,0.4)]' : 'border-outline-variant/30 hover:border-primary-fixed/50'
              }`}
            >
              <img src={url} alt={`Avatar ${i+1}`} className="w-full h-full object-cover" />
              {currentAvatar === url && (
                <div className="absolute inset-0 bg-primary-fixed/20 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="bg-primary-fixed rounded-full p-1 shadow-lg">
                    <span className="material-symbols-outlined text-black font-black text-sm">check</span>
                  </div>
                </div>
              )}
            </button>
          ))}
          {/* Option for no avatar */}
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className={`flex flex-col items-center justify-center rounded-xl aspect-square border-2 transition-all bg-surface-container-highest ${
              currentAvatar === null ? 'border-primary-fixed scale-95' : 'border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-on-surface-variant">person_off</span>
            <span className="text-[8px] font-black uppercase mt-1">None</span>
          </button>
        </div>
        <div className="p-4 bg-surface-container-low text-center">
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Select an identity</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function CabinetPage({ setPage }) {
  const { user, displayName, logout } = useAuth();
  const { config, updateConfig } = useUserConfig();

  const [workoutCount, setWorkoutCount] = useState('—');
  const [runCount, setRunCount] = useState('—');
  const [bestDistance, setBestDistance] = useState(null);
  const [totalWeight, setTotalWeight] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
          {/* Avatar Container */}
          <div className="relative group">
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="relative w-28 h-28 p-1.5 rounded-[2rem] bg-gradient-to-br from-primary-fixed/30 to-secondary/30 transition-all duration-500 hover:rotate-2 active:scale-90"
              style={{
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              }}
            >
              {/* Inner wrapper for image/initials */}
              <div className="w-full h-full rounded-[1.6rem] bg-surface-container-highest overflow-hidden relative border border-white/5 flex items-center justify-center">
                {config.avatar_url ? (
                  <img
                    src={config.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-surface-container-highest via-primary-container/20 to-surface-container-highest flex items-center justify-center relative overflow-hidden">
                    {/* Decorative pattern for placeholder */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--primary-fixed) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                    <span className="font-headline font-black text-4xl text-primary-fixed drop-shadow-2xl relative z-10">{initials}</span>
                  </div>
                )}

                {/* Glassy overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-[2px]">
                  <span className="material-symbols-outlined text-white text-2xl animate-bounce">photo_camera</span>
                  <span className="text-[9px] text-white font-black uppercase tracking-[0.2em] mt-1">Update</span>
                </div>
              </div>

              {/* Decorative rings */}
              <div className="absolute -inset-1 rounded-[2.2rem] border border-primary-fixed/20 -z-10 animate-pulse" />
              <div className="absolute -inset-2 rounded-[2.4rem] border border-primary-fixed/5 -z-20" />
            </button>

            {/* Change Hint Badge (Always visible on mobile/placeholder) */}
            <div
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center shadow-lg border-4 border-background transform transition-transform group-hover:rotate-12 group-hover:scale-110"
              style={{ boxShadow: '0 10px 25px rgba(212,251,0,0.4)' }}
            >
              <span className="material-symbols-outlined text-black font-black text-xl">edit</span>
            </div>

            {/* Profile Glow */}
            <div className="absolute -inset-10 bg-primary-container/10 blur-[60px] -z-30 rounded-full" />
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
            {config.gym_day_count > 0 && (
              <>
                <div className="w-px h-8 bg-outline-variant/30" />
                <StatPill label="Days / Week" value={config.gym_day_count} />
              </>
            )}
          </div>
        </section>


        {/* ── Sex Selection ── */}
        <section>
          <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3 px-1">
            Personal Details
          </h3>
          <div className="bg-surface-container-low rounded-2xl p-5 space-y-4 border border-outline-variant/10">
            <div>
              <label className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest block mb-3">Biological Sex</label>
              <div className="flex gap-2">
                {[
                  { id: 'male', label: 'Male', icon: 'male' },
                  { id: 'female', label: 'Female', icon: 'female' },
                  { id: 'not_specified', label: 'Rather not say', icon: 'person' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateConfig({ sex: opt.id })}
                    className={`flex-1 py-3 px-2 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                      config.sex === opt.id
                        ? 'bg-primary-container border-primary-fixed text-on-primary-fixed shadow-[0_4px_15px_rgba(212,251,0,0.15)]'
                        : 'bg-surface-container border-transparent text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter">{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-on-surface-variant/60 mt-3 italic leading-relaxed">
                * Used by KINETIC AI to personalize intensity, recovery metrics, and physiological advice.
              </p>
            </div>
          </div>
        </section>


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

        {/* ── Contact & Feedback ── */}
        <section>
          <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3 px-1">
            Contact &amp; Feedback
          </h3>
          <p className="text-on-surface-variant text-xs px-1 mb-3">Have a question or suggestion? Reach out directly.</p>
          <div className="flex flex-col gap-2">
            {/* Instagram */}
            <a
              href="https://instagram.com/yaboinurik"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-surface-container-low hover:bg-surface-container rounded-xl p-4 transition-colors group text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-sm">Instagram</p>
                <p className="text-on-surface-variant text-xs">@yaboinurik</p>
              </div>
              <span className="material-symbols-outlined text-outline text-sm group-hover:text-on-surface transition-colors">open_in_new</span>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/heavygrind"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-surface-container-low hover:bg-surface-container rounded-xl p-4 transition-colors group text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#229ED9' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.800-.945-.611-.332-1.143.317-1.823.217-.233 3.985-3.648 4.057-3.958.01-.041.01-.191-.074-.271s-.208-.053-.299-.031c-.127.031-2.152 1.365-6.075 4.004-.575.395-1.096.589-1.563.579-.515-.011-1.504-.291-2.24-.532-.901-.295-1.619-.451-1.556-.951.033-.261.379-.529 1.038-.802 4.064-1.770 6.773-2.937 8.128-3.501 3.871-1.609 4.674-1.888 5.196-1.898z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-sm">Telegram</p>
                <p className="text-on-surface-variant text-xs">@heavygrind</p>
              </div>
              <span className="material-symbols-outlined text-outline text-sm group-hover:text-on-surface transition-colors">open_in_new</span>
            </a>
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

      {/* ── Avatar Picker ── */}
      {showAvatarPicker && (
        <AvatarPickerModal
          currentAvatar={config.avatar_url}
          onSelect={(url) => updateConfig({ avatar_url: url })}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}
