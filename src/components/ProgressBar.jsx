import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function ProgressBar({
  value,
  max,
  min = 0,
  accent = 'mint',
  onChange,
  invert = false,
  step = 1,
}) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const range = Math.max(max - min, step || 1);
  const normalizedValue = Math.min(max, Math.max(min, Number(value) || 0));
  const rawPct = ((normalizedValue - min) / range) * 100;
  const pct = Math.min(100, Math.max(0, invert ? 100 - rawPct : rawPct));

  const updateFromClientX = (clientX) => {
    if (!trackRef.current || !onChange) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const normalizedRatio = invert ? 1 - ratio : ratio;
    const nextValue = min + normalizedRatio * range;
    const steppedValue = Math.round(nextValue / step) * step;
    onChange(Math.min(max, Math.max(min, steppedValue)));
  };

  return (
    <div
      ref={trackRef}
      className={`h-[7px] bg-white/[0.06] rounded-full overflow-visible relative ${onChange ? 'cursor-pointer touch-none' : ''}`}
      onPointerDown={(event) => {
        if (!onChange) return;
        setDragging(true);
        updateFromClientX(event.clientX);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging || !onChange) return;
        updateFromClientX(event.clientX);
      }}
      onPointerUp={(event) => {
        if (!onChange) return;
        updateFromClientX(event.clientX);
        setDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }}
      onPointerLeave={() => setDragging(false)}
    >
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
            animate={{ scale: dragging ? 1.08 : 1 }}
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
