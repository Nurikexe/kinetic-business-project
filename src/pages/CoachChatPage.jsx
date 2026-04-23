import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function PaymentCard({ payment, isOwn, onPay }) {
  const isPaid = payment.status === 'paid';
  return (
    <div className={`max-w-[80%] ${isOwn ? 'self-end' : 'self-start'}`}>
      <div className="bg-surface-container border border-outline/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Payment Request</p>
        </div>
        <div>
          <p className="font-headline text-2xl font-bold text-on-surface">${Number(payment.amount).toFixed(2)}</p>
          {payment.description && (
            <p className="font-label text-xs text-on-surface-variant mt-1">{payment.description}</p>
          )}
        </div>
        <div className="text-[10px] font-label text-outline space-y-0.5">
          <p>Platform fee (15%): ${Number(payment.platform_fee).toFixed(2)}</p>
          <p>Coach receives: ${Number(payment.coach_payout).toFixed(2)}</p>
        </div>
        {!isOwn && !isPaid && (
          <button
            onClick={() => onPay(payment)}
            className="w-full bg-primary-container text-on-primary-fixed font-label font-bold text-sm py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            Pay Now
          </button>
        )}
        {isPaid && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-base"
              style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="font-label text-xs text-primary-container font-bold">Paid — workout access unlocked</p>
          </div>
        )}
      </div>
      <p className="font-label text-[10px] text-outline mt-1 px-1">
        {new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

function Bubble({ msg, isOwn }) {
  return (
    <div className={`flex flex-col max-w-[75%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}>
      <div className={`px-4 py-2.5 rounded-2xl font-label text-sm leading-relaxed ${
        isOwn
          ? 'bg-primary-container text-on-primary-fixed rounded-br-md'
          : 'bg-surface-container text-on-surface rounded-bl-md'
      }`}>
        {msg.content}
      </div>
      <p className="font-label text-[10px] text-outline mt-1">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

export default function CoachChatPage({ coach, request, setPage }) {
  const { user } = useAuth();
  const [messages, setMessages]   = useState([]);
  const [payments, setPayments]   = useState({});
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [paying, setPaying]       = useState(null);
  const [status, setStatus]       = useState(request.status);
  const bottomRef = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: msgs }, { data: pmts }] = await Promise.all([
        supabase.from('messages').select('*').eq('request_id', request.id).order('created_at'),
        supabase.from('payment_requests').select('*').eq('request_id', request.id),
      ]);
      if (!mounted) return;
      setMessages(msgs ?? []);
      const map = {};
      (pmts ?? []).forEach(p => { map[p.id] = p; });
      setPayments(map);
    }
    load();
    return () => { mounted = false; };
  }, [request.id]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('chat_' + request.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `request_id=eq.${request.id}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'payment_requests',
        filter: `request_id=eq.${request.id}`,
      }, payload => {
        setPayments(prev => ({ ...prev, [payload.new.id]: payload.new }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [request.id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    await supabase.from('messages').insert({
      request_id:   request.id,
      sender_id:    user.id,
      content,
      message_type: 'text',
    });
    setSending(false);
  };

  const handlePay = async (payment) => {
    setPaying(payment.id);
    await supabase
      .from('payment_requests')
      .update({ status: 'paid' })
      .eq('id', payment.id);
    setPayments(prev => ({ ...prev, [payment.id]: { ...prev[payment.id], status: 'paid' } }));
    setPaying(null);
  };

  const isPending = status === 'pending';

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-surface-container-low border-b border-outline/10 flex-shrink-0">
        <button
          onClick={() => setPage('coaches')}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0"
        >
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        {coach?.avatar_url ? (
          <img src={coach.avatar_url} alt={coach?.display_name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant">person</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-on-surface truncate">{coach?.display_name ?? 'Coach'}</p>
          <p className={`font-label text-[10px] font-bold uppercase tracking-wider ${
            status === 'accepted' ? 'text-primary-container' : 'text-outline'
          }`}>{status}</p>
        </div>
      </div>

      {/* Status banner for pending */}
      {isPending && (
        <div className="px-4 py-3 bg-tertiary-container/10 border-b border-outline/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary-container text-lg">schedule</span>
          <p className="font-label text-xs text-on-surface-variant">
            Waiting for <strong>{coach?.display_name}</strong> to accept your request before chat opens.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isPending ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-4xl text-outline mb-3 block">chat_bubble</span>
            <p className="font-label text-sm text-on-surface-variant">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col"
                >
                  {msg.message_type === 'payment_request' && payments[msg.payment_request_id] ? (
                    <PaymentCard
                      payment={payments[msg.payment_request_id]}
                      isOwn={msg.sender_id === user.id}
                      onPay={paying ? () => {} : handlePay}
                    />
                  ) : (
                    <Bubble msg={msg} isOwn={msg.sender_id === user.id} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isPending && (
        <div className="px-4 py-4 pb-8 bg-surface-container-low border-t border-outline/10 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder="Message…"
              rows={1}
              className="flex-1 bg-surface-container border border-outline/20 rounded-2xl px-4 py-3 font-label text-sm text-on-surface placeholder:text-outline resize-none focus:outline-none focus:border-primary-container/50 max-h-32"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-on-primary-fixed text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
