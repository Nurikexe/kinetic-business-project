import { motion } from 'framer-motion';

export default function Section({ icon, title, subtitle, children, accent = 'mint' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="mb-7"
    >
      <div className="flex items-center gap-3 mb-3.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          accent === 'mint' ? 'bg-mint/[0.08] text-mint' : 'bg-cyan/[0.08] text-cyan'
        }`}>
          {icon}
        </div>
        <h2 className="font-display text-base tracking-[3px] uppercase text-text-primary">
          {title}
        </h2>
        {subtitle && (
          <span className="ml-auto text-[11px] text-text-muted font-body font-light tracking-wider">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}
