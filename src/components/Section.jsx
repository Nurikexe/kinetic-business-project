import { motion } from 'framer-motion';

export default function Section({ icon, title, subtitle, action, children, accent = 'mint' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="mb-7"
    >
      <div className="flex items-center gap-3 mb-3.5">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
          accent === 'mint'
            ? 'bg-mint/[0.10] text-mint border-mint/15'
            : 'bg-cyan/[0.10] text-cyan border-cyan/20'
        }`}>
          {icon}
        </div>
        <h2 className="font-display text-[17px] font-semibold tracking-[0.18em] uppercase text-text-primary">
          {title}
        </h2>
        {(subtitle || action) && (
          <div className="ml-auto flex items-center gap-2">
            {subtitle && (
              <span className="text-[11px] text-text-muted font-body font-light tracking-wider">{subtitle}</span>
            )}
            {action}
          </div>
        )}
      </div>
      {children}
    </motion.section>
  );
}
