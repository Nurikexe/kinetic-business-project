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
export default function CabinetPage({ setPage, triggerOnboarding }) {
  const { user, displayName, logout, updateUserMetadata } = useAuth();
  const { config, updateConfig } = useUserConfig();

  const [workoutCount, setWorkoutCount] = useState('—');
  const [runCount, setRunCount] = useState('—');
  const [bestDistance, setBestDistance] = useState(null);
  const [totalWeight, setTotalWeight] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Name change
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName);
  const [updatingName, setUpdatingName] = useState(false);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleUpdateName = async () => {
    if (!tempName.trim() || tempName === displayName) {
      setIsEditingName(false);
      return;
    }
    setUpdatingName(true);
    const { error } = await updateUserMetadata({ display_name: tempName.trim() });
    if (error) {
      alert('Failed to update name: ' + error);
    }
    setUpdatingName(false);
    setIsEditingName(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      // 1. Call the RPC to delete the user record from auth.users
      // This will automatically trigger the ON DELETE CASCADE on all related tables
      const { error } = await supabase.rpc('delete_user');
      
      if (error) {
        console.error('RPC deletion failed, falling back to manual purge:', error.message);
        // Fallback: Delete application data manually if RPC hasn't been created yet
        const tables = ['workouts', 'run_sessions', 'community_plans', 'user_config'];
        for (const table of tables) {
          await supabase.from(table).delete().eq('user_id', user.id);
        }
      }

      // 2. Clear local data
      localStorage.clear();
      sessionStorage.clear();

      // 3. Finally logout
      await logout();
    } catch (err) {
      console.error('Critical deletion error:', err);
      alert('An error occurred during account deletion. Your data may still persist.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const email = user?.email ?? '';
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() ?? '?';

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
              <div className="w-full h-full rounded-[1.6rem] bg-surface-container-highest overflow-hidden relative border border-white/5 flex items-center justify-center">
                {config.avatar_url ? (
                  <img src={config.avatar_url} alt={displayName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-surface-container-highest via-primary-container/20 to-surface-container-highest flex items-center justify-center relative overflow-hidden transition-opacity duration-300 group-hover:opacity-20">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--primary-fixed) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                    <span className="font-headline font-black text-4xl text-primary-fixed drop-shadow-2xl relative z-10">{initials}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-[2px]">
                  <span className="material-symbols-outlined text-white text-2xl animate-bounce">photo_camera</span>
                  <span className="text-[9px] text-white font-black uppercase tracking-[0.2em] mt-1">Update</span>
                </div>
              </div>
              <div className="absolute -inset-1 rounded-[2.2rem] border border-primary-fixed/20 -z-10 animate-pulse" />
            </button>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center shadow-lg border-4 border-background transform transition-transform group-hover:rotate-12 group-hover:scale-110">
              <span className="material-symbols-outlined text-black font-black text-xl">edit</span>
            </div>
          </div>

          {/* Name + email */}
          <div className="w-full">
            {isEditingName ? (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={tempName}
                    placeholder="Enter your name"
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    className="bg-surface-container-highest border-2 border-primary-fixed/30 rounded-2xl px-5 py-3 font-headline font-black text-3xl uppercase italic tracking-tighter text-on-surface focus:outline-none focus:border-primary-fixed transition-all w-full"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Press Enter to</span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-primary-fixed">Save</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdateName} disabled={updatingName} className="flex-1 bg-primary-fixed text-black py-3 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-primary-fixed/20 active:scale-95 transition-all">
                    {updatingName ? 'Applying...' : 'Confirm Identity'}
                  </button>
                  <button onClick={() => setIsEditingName(false)} className="px-6 bg-surface-container-high text-on-surface-variant rounded-xl font-black uppercase text-[11px] tracking-[0.2em] active:scale-95 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-1 group/name cursor-pointer" onClick={() => { setTempName(displayName); setIsEditingName(true); }}>
                <div className="flex items-center gap-3">
                  <h2 className="font-headline font-black text-5xl tracking-tighter uppercase italic leading-none transition-all group-hover/name:text-primary-fixed" style={{ textShadow: '0 0 40px rgba(212,251,0,0.15)' }}>
                    {displayName || 'Athlete'}
                  </h2>
                  <div className="w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant/10 flex items-center justify-center text-on-surface-variant group-hover/name:bg-primary-fixed group-hover/name:text-black transition-all">
                    <span className="material-symbols-outlined text-sm font-black">edit</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-40 group-hover/name:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[10px]">touch_app</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tap to change name</span>
                </div>
              </div>
            )}
            <p className="text-on-surface-variant text-xs font-medium mt-3 px-1">{email}</p>
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
          <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3 px-1">Personal Details</h3>
          <div className="bg-surface-container-low rounded-2xl p-5 space-y-4 border border-outline-variant/10">
            <div>
              <label className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest block mb-3">Biological Sex</label>
              <div className="flex gap-2">
                {[
                  { id: 'male', label: 'Male', icon: 'male' },
                  { id: 'female', label: 'Female', icon: 'female' },
                  { id: 'not_specified', label: 'Rather not say', icon: 'person' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => updateConfig({ sex: opt.id })} className={`flex-1 py-3 px-2 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${config.sex === opt.id ? 'bg-primary-container border-primary-fixed text-on-primary-fixed' : 'bg-surface-container border-transparent text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Settings Row Section ── */}
        <section>
          <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3 px-1">App Preferences</h3>
          <div className="flex flex-col gap-1">
            <SettingsRow icon="straighten" label="Measurement Units" right="Metric (KG/KM)" />
            <SettingsRow icon="bar_chart" label="Onboarding & Plan" onClick={() => { sessionStorage.setItem('ha_force_onboarding', '1'); triggerOnboarding(); }} />
          </div>
        </section>

        {/* ── Contact ── */}
        <section>
          <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3 px-1">Get in Touch</h3>
          <div
            className="relative rounded-3xl overflow-hidden border border-white/5"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)' }}
          >
            {/* subtle grid texture */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />
            <div className="relative p-5 pb-4">
              <p className="text-on-surface-variant/60 text-[11px] font-medium leading-relaxed tracking-wide mb-5 italic">
                Have a suggestion or question? Feel free to reach out.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="https://instagram.com/yaboinurik"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 active:scale-[0.98] transition-all duration-300 group overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(120deg, rgba(168,85,247,0.06) 0%, rgba(236,72,153,0.06) 100%)' }} />
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
                  >
                    <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant/50">Instagram</p>
                    <p className="text-[15px] font-black tracking-tight text-on-surface group-hover:text-white transition-colors">@yaboinurik</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-on-surface-variant/30 group-hover:text-on-surface-variant/70 transition-colors">
                    <span className="material-symbols-outlined text-base">arrow_outward</span>
                  </div>
                </a>

                <a
                  href="https://t.me/heavygrind"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 active:scale-[0.98] transition-all duration-300 group overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(120deg, rgba(34,158,217,0.06) 0%, rgba(34,158,217,0.02) 100%)' }} />
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #229ED9, #1a7ab5)' }}
                  >
                    <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant/50">Telegram</p>
                    <p className="text-[15px] font-black tracking-tight text-on-surface group-hover:text-white transition-colors">@heavygrind</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-on-surface-variant/30 group-hover:text-on-surface-variant/70 transition-colors">
                    <span className="material-symbols-outlined text-base">arrow_outward</span>
                  </div>
                </a>
              </div>
            </div>
            {/* bottom strip */}
            <div className="px-5 py-3 border-t border-white/[0.04] text-center">
              <span className="text-[9px] text-on-surface-variant/25 font-black uppercase tracking-[0.3em]">Built by Nurasyl</span>
            </div>
          </div>
        </section>

        {/* ── Danger zone ── */}
        <div className="flex flex-col gap-1">
          <SettingsRow icon="logout" label={loggingOut ? 'Signing out…' : 'Sign Out'} onClick={handleLogout} />
          <SettingsRow icon="delete_forever" label="Delete Account & Data" destructive onClick={() => setShowDeleteConfirm(true)} />
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

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-sm border border-error/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500" onClick={e => e.stopPropagation()}>
             <div className="p-8 text-center">
                <div className="w-20 h-20 bg-error/10 text-error rounded-3xl flex items-center justify-center mx-auto mb-8">
                   <span className="material-symbols-outlined text-4xl font-black">warning</span>
                </div>
                <h3 className="font-headline font-black text-3xl uppercase italic tracking-tighter text-on-surface mb-3">Irreversible Action</h3>
                <p className="text-on-surface-variant text-[11px] leading-relaxed mb-8 px-4 font-medium opacity-60 italic">
                   "Warning: You are about to initiate a complete wipe of your athletic profile and history. This action cannot be undone."
                </p>
                <div className="space-y-6">
                  <div className="text-left bg-surface-container-low p-6 rounded-2xl border border-outline-variant/5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-error mb-4 block text-center">
                      Type <span className="underline decoration-2 underline-offset-4">DELETE</span> to authorize
                    </label>
                    <input
                      type="text"
                      placeholder="DELETE"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                      className="w-full bg-surface-container-highest border-2 border-outline-variant/10 rounded-xl px-4 py-4 text-center font-headline font-black text-2xl tracking-[0.3em] text-on-surface focus:border-error focus:outline-none transition-all placeholder:opacity-10"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleDeleteAccount} 
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting} 
                      className="w-full bg-error text-on-error py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] disabled:opacity-20 transition-all hover:bg-error/90 active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isDeleting ? 'Purging Data...' : 'Permanently Wipe Profile'}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 text-on-surface-variant font-black uppercase tracking-[0.2em] text-[10px] hover:text-on-surface transition-colors">Hold on, Cancel</button>
                  </div>
                </div>
             </div>
             <div className="bg-error/5 py-4 border-t border-error/5 text-center">
                <span className="text-[9px] text-error/30 font-black uppercase tracking-[0.4em]">Protocol: Security Wipe</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
