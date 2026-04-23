import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SPEC_COLORS = {
  strength:  'bg-primary-container/20 text-primary-container',
  running:   'bg-secondary-container/20 text-secondary-container',
  hybrid:    'bg-tertiary-container/20 text-tertiary-container',
  nutrition: 'bg-error-container/20 text-error-container',
};

function SpecBadge({ label }) {
  const cls = SPEC_COLORS[label.toLowerCase()] || 'bg-surface-container text-on-surface-variant';
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${cls}`}>{label}</span>
  );
}

export default function CoachProfilePage({ coach, setPage, onRequestSent }) {
  const { user } = useAuth();
  const [existingRequest, setExistingRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage]     = useState('');
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    let mounted = true;
    const loadRequest = async () => {
      const { data } = await supabase
        .from('coach_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_id', coach.id)
        .maybeSingle();
      if (mounted) setExistingRequest(data);
    };

    loadRequest();

    const channel = supabase
      .channel(`coach_profile_request_${coach.id}_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'coach_requests',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new?.coach_id === coach.id || payload.old?.coach_id === coach.id) {
          loadRequest();
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user.id, coach.id]);

  const sendRequest = async () => {
    setSending(true);
    setError('');
    // Upsert profile so coach can see user display name
    await supabase.from('profiles').upsert({
      user_id:      user.id,
      display_name: user.user_metadata?.display_name || user.email,
      avatar_url:   user.user_metadata?.avatar_url || '',
    }, { onConflict: 'user_id' });

    const { data, error: err } = await supabase
      .from('coach_requests')
      .insert({ user_id: user.id, coach_id: coach.id, message })
      .select()
      .single();

    if (err) {
      setError(err.message || 'Failed to send request.');
      setSending(false);
      return;
    }
    setExistingRequest(data);
    setShowModal(false);
    onRequestSent(data);
  };

  const statusBanner = existingRequest ? {
    pending:  { icon: 'schedule',      text: 'Request pending — awaiting coach response', color: 'text-tertiary-container' },
    accepted: { icon: 'check_circle',  text: 'Coach accepted! Open chat to get started.',  color: 'text-primary-container' },
    declined: { icon: 'cancel',        text: 'Coach declined your request.',               color: 'text-error-container' },
  }[existingRequest.status] : null;

  return (
    <div className="min-h-dvh bg-background pb-20">
      {/* Hero */}
      <div className="relative bg-surface-container-low px-4 pt-12 pb-8">
        <button
          onClick={() => setPage('coaches')}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>

        <div className="flex flex-col items-center text-center gap-3 max-w-xl mx-auto">
          {coach.avatar_url ? (
            <img src={coach.avatar_url} alt={coach.display_name} className="w-24 h-24 rounded-2xl object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
            </div>
          )}
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">{coach.display_name}</h1>
            <p className="font-label text-sm text-primary-container font-bold mt-1">
              ${Number(coach.price_per_month).toFixed(0)} / month
            </p>
            {!coach.is_available && (
              <p className="font-label text-xs text-error-container mt-1 uppercase tracking-wider">Currently Unavailable</p>
            )}
          </div>

          {coach.specializations?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {coach.specializations.map(s => <SpecBadge key={s} label={s} />)}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 max-w-xl mx-auto space-y-5 mt-5">
        {/* Status banner */}
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-surface-container-low border border-outline/10 rounded-2xl p-4"
          >
            <span className={`material-symbols-outlined text-xl ${statusBanner.color}`}
              style={{ fontVariationSettings: "'FILL' 1" }}>
              {statusBanner.icon}
            </span>
            <p className={`font-label text-sm font-medium ${statusBanner.color}`}>{statusBanner.text}</p>
            {existingRequest?.status === 'accepted' && (
              <button
                onClick={() => onRequestSent(existingRequest)}
                className="ml-auto bg-primary-container text-on-primary-fixed font-label text-xs font-bold px-4 py-2 rounded-full"
              >
                Open Chat
              </button>
            )}
          </motion.div>
        )}

        {/* Bio */}
        {coach.bio && (
          <div className="bg-surface-container-low border border-outline/10 rounded-2xl p-4">
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2">About</p>
            <p className="font-label text-sm text-on-surface leading-relaxed">{coach.bio}</p>
          </div>
        )}

        {/* Certifications */}
        {coach.certifications?.length > 0 && (
          <div className="bg-surface-container-low border border-outline/10 rounded-2xl p-4">
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-3">Certifications</p>
            <div className="space-y-2">
              {coach.certifications.map((cert, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm text-primary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <p className="font-label text-sm text-on-surface">{cert}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What you get */}
        <div className="bg-surface-container-low border border-outline/10 rounded-2xl p-4">
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-3">What&apos;s Included</p>
          <div className="space-y-2">
            {[
              'Personalised workout plan editing',
              'Direct chat with your coach',
              'Progress review & feedback',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-sm text-primary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <p className="font-label text-sm text-on-surface">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!existingRequest && coach.is_available && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-primary-container text-on-primary-fixed font-headline font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform"
          >
            Hire {coach.display_name.split(' ')[0]}
          </button>
        )}
      </div>

      {/* Request modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              className="w-full max-w-xl bg-surface-container-low rounded-t-3xl p-6 pb-10"
            >
              <div className="w-10 h-1 bg-outline/30 rounded-full mx-auto mb-6" />
              <h2 className="font-headline text-lg font-bold text-on-surface mb-1">Send a Request</h2>
              <p className="font-label text-xs text-on-surface-variant mb-5">
                Introduce yourself to {coach.display_name}
              </p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell the coach about your goals, experience, and what you're looking for…"
                rows={5}
                className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 font-label text-sm text-on-surface placeholder:text-outline resize-none focus:outline-none focus:border-primary-container/50"
              />
              {error && <p className="font-label text-xs text-error-container mt-2">{error}</p>}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-surface-container text-on-surface-variant font-label font-bold py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={sendRequest}
                  disabled={sending}
                  className="flex-1 bg-primary-container text-on-primary-fixed font-label font-bold py-3 rounded-xl disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
