import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const STATUS_META = {
  pending:  { label: 'Pending',  color: 'text-tertiary-container', bg: 'bg-tertiary-container/10' },
  accepted: { label: 'Active',   color: 'text-primary-container',  bg: 'bg-primary-container/10' },
  declined: { label: 'Declined', color: 'text-error-container',    bg: 'bg-error-container/10' },
}

function RequestCard({ request, profile, onAccept, onDecline, onChat }) {
  const meta   = STATUS_META[request.status] ?? STATUS_META.pending
  const name   = profile?.display_name || 'Unknown User'
  const avatar = profile?.avatar_url || ''
  const [loading, setLoading] = useState(false)

  const act = async (fn) => { setLoading(true); await fn(); setLoading(false) }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-surface-container-low border border-outline/10 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-start gap-4">
        {avatar ? (
          <img src={avatar} alt={name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant">person</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-headline font-bold text-on-surface">{name}</p>
            <span className={`font-label text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${meta.color} ${meta.bg}`}>
              {meta.label}
            </span>
          </div>
          <p className="font-label text-xs text-outline mt-0.5">
            {new Date(request.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {request.message && (
        <p className="font-label text-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3 leading-relaxed">
          &ldquo;{request.message}&rdquo;
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {request.status === 'pending' && (
          <>
            <button
              onClick={() => act(onAccept)}
              disabled={loading}
              className="flex-1 bg-primary-container text-on-primary-fixed font-label font-bold text-sm py-2.5 rounded-xl disabled:opacity-50 hover:bg-primary-dim transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => act(onDecline)}
              disabled={loading}
              className="flex-1 bg-surface-container text-on-surface-variant font-label font-bold text-sm py-2.5 rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Decline
            </button>
          </>
        )}
        {request.status === 'accepted' && (
          <button
            onClick={onChat}
            className="flex-1 bg-primary-container text-on-primary-fixed font-label font-bold text-sm py-2.5 rounded-xl hover:bg-primary-dim transition-colors"
          >
            Open Chat
          </button>
        )}
        {request.status === 'declined' && (
          <p className="font-label text-xs text-outline">Request was declined.</p>
        )}
      </div>
    </motion.div>
  )
}

export default function RequestsPage({ coach, onOpenChat }) {
  const [requests, setRequests] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('pending')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('coach_requests')
        .select('*')
        .eq('coach_id', coach.id)
        .order('created_at', { ascending: false })

      if (!mounted) return
      setRequests(data ?? [])

      if (data?.length) {
        const userIds = [...new Set(data.map(r => r.user_id))]
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds)
        if (mounted) {
          const map = {}
          ;(profs ?? []).forEach(p => { map[p.user_id] = p })
          setProfiles(map)
        }
      }
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('requests_coach_' + coach.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'coach_requests',
        filter: `coach_id=eq.${coach.id}`,
      }, () => load())
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [coach.id])

  const updateStatus = async (id, status) => {
    await supabase
      .from('coach_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const filtered = requests.filter(r => filter === 'all' ? true : r.status === filter)

  const counts = {
    pending:  requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    declined: requests.filter(r => r.status === 'declined').length,
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-outline/10 flex-shrink-0">
        <h1 className="font-headline text-2xl font-bold text-on-surface">Requests</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">Manage incoming athlete requests</p>

        <div className="flex gap-2 mt-5">
          {[['pending', 'Pending', counts.pending], ['accepted', 'Active', counts.accepted], ['declined', 'Declined', counts.declined], ['all', 'All', requests.length]].map(([val, label, count]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
                filter === val
                  ? 'bg-primary-container text-on-primary-fixed'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">inbox</span>
            <p className="font-headline text-lg text-on-surface-variant">No {filter === 'all' ? '' : filter} requests</p>
            <p className="font-label text-sm text-outline mt-1">New requests will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-4xl">
            <AnimatePresence>
              {filtered.map(req => (
                <RequestCard
                  key={req.id}
                  request={req}
                  profile={profiles[req.user_id]}
                  onAccept={() => updateStatus(req.id, 'accepted')}
                  onDecline={() => updateStatus(req.id, 'declined')}
                  onChat={() => onOpenChat(req)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
