import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SHEET = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };
const ACCENT = '#d4fb00';
const CARD_BG = 'rgba(18,18,18,0.95)';

function drawPRCard(canvas, { name, weight, date, selectedSets }) {
  const DPR = Math.min(window.devicePixelRatio || 2, 3);
  const W = 560;
  const setCount = selectedSets.length;
  const H = setCount > 0 ? 320 + setCount * 40 : 280;

  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(DPR, DPR);

  // Card background (rounded rect)
  const r = 24;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(W - r, 0);
  ctx.arcTo(W, 0, W, r, r);
  ctx.lineTo(W, H - r);
  ctx.arcTo(W, H, W - r, H, r);
  ctx.lineTo(r, H);
  ctx.arcTo(0, H, 0, H - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(18,18,18,0.95)';
  ctx.fill();

  // Accent top stripe (gradient)
  const grad = ctx.createLinearGradient(0, 0, W * 0.7, 0);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, 'rgba(212,251,0,0)');
  const stripeClip = new Path2D();
  stripeClip.moveTo(r, 0);
  stripeClip.lineTo(W - r, 0);
  stripeClip.arcTo(W, 0, W, r, r);
  stripeClip.lineTo(W, 5);
  stripeClip.lineTo(0, 5);
  stripeClip.lineTo(0, r);
  stripeClip.arcTo(0, 0, r, 0, r);
  stripeClip.closePath();
  ctx.save();
  ctx.clip(stripeClip);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 5);
  ctx.restore();

  // "PERSONAL RECORD" label
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 11px system-ui,-apple-system,sans-serif';
  ctx.letterSpacing = '0.12em';
  ctx.textAlign = 'left';
  ctx.fillText('PERSONAL RECORD', 32, 44);

  // Date (right-aligned)
  const dateStr = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '12px system-ui,-apple-system,sans-serif';
  ctx.letterSpacing = '0';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - 32, 44);

  // Exercise name
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 26px system-ui,-apple-system,sans-serif';
  let exName = name || '';
  while (ctx.measureText(exName).width > W - 64 && exName.length > 3) {
    exName = exName.slice(0, -1);
  }
  if (exName !== name) exName += '…';
  ctx.fillText(exName, 32, 88);

  // Weight (big)
  ctx.fillStyle = ACCENT;
  ctx.font = `bold 108px system-ui,-apple-system,sans-serif`;
  const weightStr = String(weight);
  ctx.fillText(weightStr, 28, 210);

  // kg unit
  const wW = ctx.measureText(weightStr).width;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = 'bold 28px system-ui,-apple-system,sans-serif';
  ctx.fillText('kg', 28 + wW + 10, 202);

  // Sets section
  if (selectedSets.length > 0) {
    const sepY = 232;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, sepY);
    ctx.lineTo(W - 32, sepY);
    ctx.stroke();

    let y = sepY + 28;
    selectedSets.forEach((set, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '13px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Set ${i + 1}`, 32, y);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'right';
      const setWeight = set.weight ? `${set.weight}kg` : `${weight}kg`;
      const setReps = set.reps || '—';
      ctx.fillText(`${setWeight} × ${setReps}`, W - 32, y);
      y += 40;
    });
  }

  // Branding (bottom right)
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = 'bold 11px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('KINETIC', W - 32, H - 20);
}

export default function PRShareModal({ pr, onClose }) {
  const canvasRef = useRef(null);
  const [selectedSets, setSelectedSets] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState(null); // 'success' | 'error' | null

  const hasSets = pr.sets && pr.sets.length > 0;

  useEffect(() => {
    if (hasSets) {
      setSelectedSets(pr.sets.map(() => true));
    } else {
      setSelectedSets([]);
    }
  }, [pr, hasSets]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = hasSets
      ? pr.sets.filter((_, i) => selectedSets[i])
      : [];
    drawPRCard(canvas, { name: pr.name, weight: pr.weight, date: pr.date, selectedSets: active });
  }, [pr, selectedSets, hasSets]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const toggleSet = (i) => {
    setSelectedSets(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const toggleAll = () => {
    const allOn = selectedSets.every(Boolean);
    setSelectedSets(prev => prev.map(() => !allOn));
  };

  const getBlob = () => new Promise((resolve, reject) => {
    const canvas = canvasRef.current;
    if (!canvas) return reject(new Error('Canvas not ready'));
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')), 'image/png');
  });

  const handleShare = async () => {
    setSharing(true);
    setShareStatus(null);
    try {
      const blob = await getBlob();
      const file = new File([blob], `PR_${pr.name.replace(/\s+/g, '_')}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${pr.name} — ${pr.weight}kg PR`,
        });
        setShareStatus('success');
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PR_${pr.name.replace(/\s+/g, '_')}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setShareStatus('success');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setShareStatus('error');
    } finally {
      setSharing(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative bg-surface-container rounded-t-3xl overflow-hidden flex flex-col"
          style={{ maxHeight: '92dvh' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={SHEET}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-outline-variant/40" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <div>
              <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant">Share PR</p>
              <h3 className="font-headline font-black text-xl tracking-tight text-on-surface truncate" style={{ maxWidth: 260 }}>
                {pr.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-5">
            {/* Canvas preview */}
            <div className="flex justify-center">
              <div className="overflow-hidden rounded-2xl" style={{ maxWidth: '100%' }}>
                <canvas
                  ref={canvasRef}
                  style={{ display: 'block', width: '100%', height: 'auto', maxWidth: 560 }}
                />
              </div>
            </div>

            {/* Set checkboxes */}
            {hasSets && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant">
                    Select Sets to Include
                  </p>
                  <button
                    onClick={toggleAll}
                    className="text-xs font-bold"
                    style={{ color: ACCENT }}
                  >
                    {selectedSets.every(Boolean) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {pr.sets.map((set, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSet(i)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                      style={{
                        background: selectedSets[i] ? 'rgba(212,251,0,0.08)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selectedSets[i] ? 'rgba(212,251,0,0.25)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: selectedSets[i] ? ACCENT : 'transparent',
                          border: `2px solid ${selectedSets[i] ? ACCENT : 'rgba(255,255,255,0.25)'}`,
                        }}
                      >
                        {selectedSets[i] && (
                          <span className="material-symbols-outlined text-black" style={{ fontSize: 14, fontVariationSettings: "'wght' 700" }}>check</span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-on-surface-variant">Set {i + 1}</span>
                      <div className="flex-1" />
                      <span className="text-sm font-bold text-on-surface">
                        {set.weight ? `${set.weight}kg` : `${pr.weight}kg`}
                        {set.reps && <span className="text-on-surface-variant font-normal"> × {set.reps}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status feedback */}
            {shareStatus === 'success' && (
              <p className="text-center text-sm font-bold" style={{ color: ACCENT }}>
                Saved! Overlay it on your photo as a sticker.
              </p>
            )}
            {shareStatus === 'error' && (
              <p className="text-center text-sm font-bold text-red-400">
                Something went wrong. Try again.
              </p>
            )}
          </div>

          {/* Share button */}
          <div className="px-5 pb-8 pt-3 shrink-0 border-t border-outline-variant/10">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-base transition-opacity disabled:opacity-50"
              style={{ background: ACCENT, color: '#0a0a0a' }}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {sharing ? 'hourglass_top' : 'ios_share'}
              </span>
              {sharing ? 'Preparing…' : 'Share as Sticker'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
