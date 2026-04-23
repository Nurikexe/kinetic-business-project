import { useState } from 'react'
import { motion } from 'framer-motion'

export default function InvoiceForm({ onSubmit, onClose }) {
  const [amount, setAmount]           = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending]         = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) return
    setSending(true)
    await onSubmit({ amount: Number(amount), description })
    setSending(false)
  }

  const platformFee = amount ? (Number(amount) * 0.15).toFixed(2) : '—'
  const payout      = amount ? (Number(amount) * 0.85).toFixed(2) : '—'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-surface-container-low border border-outline/20 rounded-3xl p-7"
      >
        <h2 className="font-headline text-xl font-bold text-on-surface mb-1">Send Payment Request</h2>
        <p className="font-label text-sm text-on-surface-variant mb-6">
          The athlete will receive this invoice in the chat.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2 block">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-label">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="199.00"
                className="w-full bg-surface-container border border-outline/20 rounded-xl pl-8 pr-4 py-3 font-label text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container/50"
              />
            </div>
          </div>

          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2 block">Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Monthly coaching — May 2026"
              className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 font-label text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container/50"
            />
          </div>

          {/* Breakdown */}
          <div className="bg-surface-container rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <p className="font-label text-xs text-on-surface-variant">Athlete pays</p>
              <p className="font-label text-sm font-bold text-on-surface">${amount || '—'}</p>
            </div>
            <div className="flex justify-between">
              <p className="font-label text-xs text-on-surface-variant">Platform fee (15%)</p>
              <p className="font-label text-xs text-outline">−${platformFee}</p>
            </div>
            <div className="flex justify-between border-t border-outline/10 pt-2">
              <p className="font-label text-xs text-on-surface-variant font-bold">Your payout</p>
              <p className="font-label text-sm font-bold text-primary-container">${payout}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-container text-on-surface-variant font-label font-bold py-3 rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !amount || Number(amount) <= 0}
              className="flex-1 bg-primary-container text-on-primary-fixed font-label font-bold py-3 rounded-xl disabled:opacity-50 hover:bg-primary-dim transition-colors"
            >
              {sending ? 'Sending…' : 'Send Invoice'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
