import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SPRING = { type: 'spring', stiffness: 260, damping: 30 };

const SPEC_COLORS = {
  strength: 'bg-primary-container/20 text-primary-container',
  running:  'bg-secondary-container/20 text-secondary-container',
  hybrid:   'bg-tertiary-container/20 text-tertiary-container',
  nutrition: 'bg-error-container/20 text-error-container',
};

function SpecBadge({ label }) {
  const cls = SPEC_COLORS[label.toLowerCase()] || 'bg-surface-container text-on-surface-variant';
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function CoachCard({ coach, onSelect }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(coach)}
      className="w-full text-left bg-surface-container-low border border-outline/10 rounded-2xl p-4 flex gap-4 items-start active:bg-surface-container"
    >
      {coach.avatar_url ? (
        <img src={coach.avatar_url} alt={coach.display_name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-2xl text-on-surface-variant">person</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-headline font-bold text-on-surface truncate">{coach.display_name}</p>
          <p className="font-label text-xs text-primary-container font-bold whitespace-nowrap">
            ${Number(coach.price_per_month).toFixed(0)}/mo
          </p>
        </div>
        {coach.bio && (
          <p className="font-label text-xs text-on-surface-variant mt-1 line-clamp-2">{coach.bio}</p>
        )}
        {coach.specializations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {coach.specializations.map(s => <SpecBadge key={s} label={s} />)}
          </div>
        )}
        {!coach.is_available && (
          <p className="font-label text-[10px] text-outline mt-1 uppercase tracking-wider">Unavailable</p>
        )}
      </div>
    </motion.button>
  );
}

function RequestCard({ request, coach, onOpenChat }) {
  const statusColor = {
    pending:  'text-tertiary-container',
    accepted: 'text-primary-container',
    declined: 'text-error-container',
  }[request.status] || 'text-on-surface-variant';

  const statusLabel = {
    pending:  'Pending',
    accepted: 'Active',
    declined: 'Declined',
  }[request.status] || request.status;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-low border border-outline/10 rounded-2xl p-4 flex items-center gap-4"
    >
      {coach?.avatar_url ? (
        <img src={coach.avatar_url} alt={coach.display_name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-xl text-on-surface-variant">person</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-on-surface truncate">{coach?.display_name ?? 'Coach'}</p>
        <p className={`font-label text-xs font-bold uppercase tracking-wider ${statusColor}`}>{statusLabel}</p>
      </div>
      {request.status === 'accepted' && (
        <button
          onClick={() => onOpenChat(coach, request)}
          className="bg-primary-container text-on-primary-fixed font-label text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
        >
          Chat
        </button>
      )}
    </motion.div>
  );
}

export default function CoachesPage({ setPage, onSelectCoach, onOpenChat }) {
  const { user } = useAuth();
  const [tab, setTab]         = useState('browse');
  const [coaches, setCoaches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [coachMap, setCoachMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: coachData }, { data: reqData }] = await Promise.all([
        supabase.from('coaches').select('*').eq('is_available', true).order('created_at', { ascending: false }),
        supabase.from('coach_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (!mounted) return;
      setCoaches(coachData ?? []);
      setRequests(reqData ?? []);

      if (reqData?.length) {
        const coachIds = [...new Set(reqData.map(r => r.coach_id))];
        const { data: reqCoaches } = await supabase
          .from('coaches').select('*').in('id', coachIds);
        if (mounted) {
          const map = {};
          (reqCoaches ?? []).forEach(c => { map[c.id] = c; });
          setCoachMap(map);
        }
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [user.id]);

  const filtered = search.trim()
    ? coaches.filter(c =>
        c.display_name.toLowerCase().includes(search.toLowerCase()) ||
        c.bio?.toLowerCase().includes(search.toLowerCase()) ||
        c.specializations?.some(s => s.toLowerCase().includes(search.toLowerCase()))
      )
    : coaches;

  return (
    <div className="min-h-dvh bg-background pb-36 pt-4 px-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Coaches</h1>
          <p className="font-label text-xs text-on-surface-variant mt-0.5">Find your personal trainer</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-xl text-primary-container">group</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {['browse', 'my coaches'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-primary-container text-on-primary-fixed'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {t}
            {t === 'my coaches' && requests.length > 0 && (
              <span className="ml-1.5 bg-on-primary-fixed/20 rounded-full px-1.5">{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'browse' ? (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Search */}
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or specialty…"
                className="w-full bg-surface-container-low border border-outline/20 rounded-xl pl-10 pr-4 py-3 font-label text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container/50"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-4xl text-outline mb-3 block">group_off</span>
                <p className="font-label text-sm text-on-surface-variant">No coaches found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(coach => (
                  <motion.div key={coach.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <CoachCard coach={coach} onSelect={onSelectCoach} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-4xl text-outline mb-3 block">person_search</span>
                <p className="font-label text-sm text-on-surface-variant">No active coach requests yet</p>
                <button
                  onClick={() => setTab('browse')}
                  className="mt-4 font-label text-xs text-primary-container font-bold"
                >
                  Browse coaches →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.map(req => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    coach={coachMap[req.coach_id]}
                    onOpenChat={onOpenChat}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
