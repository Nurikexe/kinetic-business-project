import { motion } from 'framer-motion';

export default function ProgressBar({ value, max, accent = 'mint' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="h-[7px] bg-white/[0.06] rounded-full overflow-visible relative">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
        className={`h-full rounded-full relative shadow-[0_0_24px_rgba(255,255,255,0.08)] ${
          accent === 'mint'
            ? 'bg-gradient-to-r from-mint/85 via-mint to-cyan/85'
            : 'bg-gradient-to-r from-mint/80 via-cyan to-cyan/90'
        }`}
      >
        {pct > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
            className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[3px] border-bg-800 ${
              accent === 'mint' ? 'bg-mint' : 'bg-cyan'
            }`}
            style={{
              boxShadow: accent === 'mint'
                ? '0 0 16px 3px rgba(113,215,201,0.42)'
                : '0 0 16px 3px rgba(214,238,99,0.35)',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
