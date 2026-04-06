import { motion } from 'framer-motion';

export default function ProgressBar({ value, max, accent = 'mint' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="h-[3px] bg-bg-500/80 rounded-full overflow-visible relative">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
        className={`h-full rounded-full relative ${
          accent === 'mint'
            ? 'bg-gradient-to-r from-mint/70 via-mint to-cyan/80'
            : 'bg-gradient-to-r from-cyan/70 via-cyan to-mint/80'
        }`}
      >
        {pct > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
            className={`absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-bg-800 ${
              accent === 'mint' ? 'bg-mint' : 'bg-cyan'
            }`}
            style={{
              boxShadow: accent === 'mint'
                ? '0 0 8px 2px rgba(0,255,170,0.5)'
                : '0 0 8px 2px rgba(0,204,255,0.5)',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
