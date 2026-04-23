import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import InvoiceForm from '../components/InvoiceForm'

function PaymentBubble({ payment, isOwn }) {
  const isPaid = payment.status === 'paid'
  return (
    <div className={`max-w-sm ${isOwn ? 'self-end' : 'self-start'}`}>
      <div className="bg-surface-container border border-outline/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Payment Request</p>
        </div>
        <p className="font-headline text-2xl font-bold text-on-surface">${Number(payment.amount).toFixed(2)}</p>
        {payment.description && (
          <p className="font-label text-xs text-on-surface-variant">{payment.description}</p>
        )}
        <div className="text-[10px] font-label text-outline space-y-0.5 border-t border-outline/10 pt-2">
          <p>Platform fee (15%): ${Number(payment.platform_fee).toFixed(2)}</p>
          <p>Your payout (85%): ${Number(payment.coach_payout).toFixed(2)}</p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isPaid ? 'bg-primary-container/10' : 'bg-surface-container-high'}`}>
          <span className={`material-symbols-outlined text-base ${isPaid ? 'text-primary-container' : 'text-outline'}`}
            style={{ fontVariationSettings: isPaid ? "'FILL' 1" : "'FILL' 0" }}>
            {isPaid ? 'check_circle' : 'schedule'}
          </span>
          <p className={`font-label text-xs font-bold ${isPaid ? 'text-primary-container' : 'text-outline'}`}>
            {isPaid ? 'Paid — workout access granted' : 'Awaiting payment'}
          </p>
        </div>
      </div>
      <p className="font-label text-[10px] text-outline mt-1 px-1">
        {new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

function Bubble({ msg, isOwn }) {
  return (
    <div className={`flex flex-col max-w-[70%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}>
      <div className={`px-4 py-2.5 rounded-2xl font-label text-sm leading-relaxed ${
        isOwn
          ? 'bg-primary-container text-on-primary-fixed rounded-br-sm'
          : 'bg-surface-container text-on-surface rounded-bl-sm'
      }`}>
        {msg.content}
      </div>
      <p className="font-label text-[10px] text-outline mt-1">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

function ConversationList({ requests, profiles, selectedId, onSelect }) {
  return (
    <div className="w-72 bg-surface-container-low border-r border-outline/10 flex flex-col flex-shrink-0">
      <div className="px-5 py-5 border-b border-outline/10">
        <h2 className="font-headline text-base font-bold text-on-surface">Active Chats</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="text-center py-12 px-4">
            <span className="material-symbols-outlined text-3xl text-outline mb-2 block">chat_bubble</span>
            <p className="font-label text-xs text-on-surface-variant">No active conversations yet.</p>
          </div>
        ) : (
          requests.map(req => {
            const profile = profiles[req.user_id]
            const name    = profile?.display_name || 'Athlete'
            const avatar  = profile?.avatar_url || ''
            const active  = req.id === selectedId
            return (
              <button
                key={req.id}
                onClick={() => onSelect(req)}
                className={`w-full flex items-center gap-3 px-5 py-4 border-b border-outline/5 transition-colors text-left ${
                  active ? 'bg-primary-container/10' : 'hover:bg-surface-container'
                }`}
              >
                {avatar ? (
                  <img src={avatar} alt={name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-headline text-sm font-bold truncate ${active ? 'text-primary-container' : 'text-on-surface'}`}>
                    {name}
                  </p>
                  <p className="font-label text-[10px] text-outline">
                    Since {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function ChatPage({ coach, initialRequest, onViewData }) {
  const [acceptedRequests, setAcceptedRequests] = useState([])
  const [profiles, setProfiles]   = useState({})
  const [selectedRequest, setSelectedRequest] = useState(initialRequest || null)
  const [messages, setMessages]   = useState([])
  const [payments, setPayments]   = useState({})
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const bottomRef = useRef(null)

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  // Load accepted requests + profiles
  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('coach_requests')
        .select('*')
        .eq('coach_id', coach.id)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false })

      if (!mounted) return
      setAcceptedRequests(data ?? [])

      if (data?.length) {
        const ids = [...new Set(data.map(r => r.user_id))]
        const { data: profs } = await supabase.from('profiles').select('*').in('user_id', ids)
        if (mounted) {
          const map = {}
          ;(profs ?? []).forEach(p => { map[p.user_id] = p })
          setProfiles(map)
        }
        // Auto-select if none selected
        if (!selectedRequest && data.length > 0) setSelectedRequest(data[0])
      }
    }
    load()
    return () => { mounted = false }
  }, [coach.id])

  // Load messages + payments for selected request
  useEffect(() => {
    if (!selectedRequest) return
    let mounted = true

    async function load() {
      const [{ data: msgs }, { data: pmts }, { data: access }] = await Promise.all([
        supabase.from('messages').select('*').eq('request_id', selectedRequest.id).order('created_at'),
        supabase.from('payment_requests').select('*').eq('request_id', selectedRequest.id),
        supabase.from('workout_access').select('id').eq('coach_id', coach.id).eq('user_id', selectedRequest.user_id).maybeSingle(),
      ])
      if (!mounted) return
      setMessages(msgs ?? [])
      const map = {}
      ;(pmts ?? []).forEach(p => { map[p.id] = p })
      setPayments(map)
      setHasAccess(!!access)
    }
    load()

    const channel = supabase
      .channel('coach_chat_' + selectedRequest.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `request_id=eq.${selectedRequest.id}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
        scrollToBottom()
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'payment_requests',
        filter: `request_id=eq.${selectedRequest.id}`,
      }, payload => {
        setPayments(prev => ({ ...prev, [payload.new.id]: payload.new }))
        if (payload.new.status === 'paid') setHasAccess(true)
      })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [selectedRequest?.id, coach.id])

  useEffect(() => { scrollToBottom() }, [messages])

  const sendMessage = async () => {
    if (!text.trim() || sending || !selectedRequest) return
    setSending(true)
    const content = text.trim()
    setText('')
    const { data: newMsg } = await supabase.from('messages').insert({
      request_id:   selectedRequest.id,
      sender_id:    coach.user_id,
      content,
      message_type: 'text',
    }).select().single()
    if (newMsg) {
      setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
    }
    setSending(false)
  }

  const sendInvoice = async ({ amount, description }) => {
    const { data: payment } = await supabase
      .from('payment_requests')
      .insert({
        request_id: selectedRequest.id,
        coach_id:   coach.id,
        user_id:    selectedRequest.user_id,
        amount:     Number(amount),
        description,
      })
      .select()
      .single()

    if (payment) {
      setPayments(prev => ({ ...prev, [payment.id]: payment }))
      const { data: newMsg } = await supabase.from('messages').insert({
        request_id:         selectedRequest.id,
        sender_id:          coach.user_id,
        content:            `Payment request: $${Number(amount).toFixed(2)}`,
        message_type:       'payment_request',
        payment_request_id: payment.id,
      }).select().single()
      if (newMsg) {
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
      }
    }
    setShowInvoice(false)
  }

  const selectedProfile = selectedRequest ? profiles[selectedRequest.user_id] : null

  return (
    <div className="h-full flex overflow-hidden">
      <ConversationList
        requests={acceptedRequests}
        profiles={profiles}
        selectedId={selectedRequest?.id}
        onSelect={req => { setSelectedRequest(req); setMessages([]); setPayments({}) }}
      />

      {selectedRequest ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-outline/10 bg-surface-container-low flex items-center gap-3 flex-shrink-0">
            {selectedProfile?.avatar_url ? (
              <img src={selectedProfile.avatar_url} alt={selectedProfile.display_name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-headline font-bold text-on-surface">
                {selectedProfile?.display_name || 'Athlete'}
              </p>
              <p className="font-label text-[10px] text-on-surface-variant">Active coaching relationship</p>
            </div>
            <button
              onClick={() => onViewData(selectedRequest)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label text-xs font-bold transition-all ${
                hasAccess
                  ? 'bg-primary-container text-on-primary-fixed hover:bg-primary-dim'
                  : 'bg-surface-container text-outline cursor-not-allowed'
              }`}
              disabled={!hasAccess}
              title={hasAccess ? 'View athlete data' : 'Unlocked after payment'}
            >
              <span className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: hasAccess ? "'FILL' 1" : "'FILL' 0" }}>
                {hasAccess ? 'bar_chart' : 'lock'}
              </span>
              Athlete Data
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-5xl text-outline mb-3 block">chat_bubble</span>
                <p className="font-label text-sm text-on-surface-variant">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-3xl">
                <AnimatePresence initial={false}>
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col"
                    >
                      {msg.message_type === 'payment_request' && payments[msg.payment_request_id] ? (
                        <PaymentBubble
                          payment={payments[msg.payment_request_id]}
                          isOwn={msg.sender_id === coach.user_id}
                        />
                      ) : (
                        <Bubble msg={msg} isOwn={msg.sender_id === coach.user_id} />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-outline/10 bg-surface-container-low flex-shrink-0">
            <div className="flex gap-3 items-end max-w-3xl">
              <button
                onClick={() => setShowInvoice(true)}
                className="w-11 h-11 rounded-xl bg-surface-container border border-outline/20 flex items-center justify-center flex-shrink-0 hover:bg-surface-container-high transition-colors"
                title="Send payment request"
              >
                <span className="material-symbols-outlined text-xl text-on-surface-variant">receipt_long</span>
              </button>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
                placeholder="Message…"
                rows={1}
                className="flex-1 bg-surface-container border border-outline/20 rounded-xl px-4 py-3 font-label text-sm text-on-surface placeholder:text-outline resize-none focus:outline-none focus:border-primary-container/50 max-h-32"
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-primary-dim transition-colors"
              >
                <span className="material-symbols-outlined text-on-primary-fixed text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">chat_bubble</span>
            <p className="font-headline text-lg text-on-surface-variant">Select a conversation</p>
            <p className="font-label text-sm text-outline mt-1">Choose an athlete from the list to start chatting.</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showInvoice && (
          <InvoiceForm
            onSubmit={sendInvoice}
            onClose={() => setShowInvoice(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
