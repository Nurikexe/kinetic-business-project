import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SHEET = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };
const ACCENT = '#d4fb00';

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawPRCard(canvas, { name, weight, date, selectedSets }) {
  const DPR = Math.min(window.devicePixelRatio || 2, 3);
  const W = 480;
  const setCount = selectedSets.length;
  // Header block + weight block + optional sets section
  const H = setCount > 0 ? 296 + setCount * 48 : 272;

  // Only set pixel buffer — CSS handles display size
  canvas.width = W * DPR;
  canvas.height = H * DPR;

  const ctx = canvas.getContext('2d');
  // Fully clear so outside the card stays transparent
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(DPR, DPR);

  // ── Clip everything to the card shape ──────────────────────
  const R = 22;
  roundedRect(ctx, 0, 0, W, H, R);
  ctx.save();
  ctx.clip();

  // Dark gradient background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1c1c1c');
  bg.addColorStop(1, '#0f0f0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent header strip
  const strip = ctx.createLinearGradient(0, 0, W, 0);
  strip.addColorStop(0, ACCENT);
  strip.addColorStop(0.55, 'rgba(212,251,0,0.18)');
  strip.addColorStop(1, 'rgba(212,251,0,0)');
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, W, 52);

  // Subtle glow behind weight number
  const glow = ctx.createRadialGradient(W * 0.25, 185, 10, W * 0.25, 185, 160);
  glow.addColorStop(0, 'rgba(212,251,0,0.12)');
  glow.addColorStop(1, 'rgba(212,251,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 70, W, 200);

  ctx.restore();

  // ── Header text ────────────────────────────────────────────
  ctx.fillStyle = '#0a0a0a';
  ctx.font = 'bold 11px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PERSONAL RECORD', 20, 34);

  const dateStr = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font = '11px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - 20, 34);

  // ── Exercise name ──────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 15px system-ui,-apple-system,sans-serif';
  let exName = (name || '').toUpperCase();
  while (ctx.measureText(exName).width > W - 40 && exName.length > 3) {
    exName = exName.slice(0, -1);
  }
  if (exName !== (name || '').toUpperCase()) exName += '…';
  ctx.fillText(exName, 20, 86);

  // ── Weight (huge) ──────────────────────────────────────────
  ctx.fillStyle = ACCENT;
  ctx.font = `bold 128px system-ui,-apple-system,sans-serif`;
  const weightStr = String(weight);
  ctx.fillText(weightStr, 14, 216);

  // kg unit right of the number
  const wW = ctx.measureText(weightStr).width;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font = 'bold 30px system-ui,-apple-system,sans-serif';
  ctx.fillText('KG', 14 + wW + 10, 206);

  // ── Sets section ───────────────────────────────────────────
  if (selectedSets.length > 0) {
    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 238);
    ctx.lineTo(W - 20, 238);
    ctx.stroke();

    let y = 270;
    selectedSets.forEach((set, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.font = '12px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SET ${i + 1}`, 20, y);

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = 'bold 12px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'right';
      const sw = set.weight ? `${set.weight} KG` : `${weight} KG`;
      const sr = set.reps || '—';
      ctx.fillText(`${sw}  ×  ${sr}`, W - 20, y);
      y += 48;
    });
  }

  // ── Branding ───────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.font = 'bold 10px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('KINETIC', W - 20, H - 14);
}

export default function PRShareModal({ pr, onClose }) {
  const canvasRef = useRef(null);
  const [selectedSets, setSelectedSets] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);

  const hasSets = pr.sets && pr.sets.length > 0;

  useEffect(() => {
    setSelectedSets(hasSets ? pr.sets.map(() => true) : []);
  }, [pr, hasSets]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = hasSets ? pr.sets.filter((_, i) => selectedSets[i]) : [];
    drawPRCard(canvas, { name: pr.name, weight: pr.weight, date: pr.date, selectedSets: active });
  }, [pr, selectedSets, hasSets]);

  useEffect(() => { redraw(); }, [redraw]);

  const toggleSet = (i) =>
    setSelectedSets(prev => { const n = [...prev]; n[i] = !n[i]; return n; });

  const toggleAll = () => {
    const allOn = selectedSets.every(Boolean);
    setSelectedSets(prev => prev.map(() => !allOn));
  };

  const getBlob = () => new Promise((resolve, reject) => {
    const canvas = canvasRef.current;
    if (!canvas) return reject(new Error('Canvas not ready'));
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png');
  });

  const handleShare = async () => {
    setSharing(true);
    setShareStatus(null);
    try {
      const blob = await getBlob();
      const file = new File([blob], `PR_${pr.name.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${pr.name} — ${pr.weight}kg PR` });
        setShareStatus('success');
      } else {
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
        transition={{ duration: 0.18 }}
      >
        <motion.div className="absolute inset-0 bg-black/75" onClick={onClose} />

        <motion.div
          className="relative bg-surface-container rounded-t-3xl flex flex-col overflow-hidden"
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
          <div className="flex items-center gap-3 px-5 py-3 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Share PR</p>
              <h3 className="font-headline font-black text-xl tracking-tight text-on-surface truncate">{pr.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant shrink-0"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
            {/* Canvas preview — checkerboard bg shows transparency */}
            <div
              className="w-full overflow-hidden rounded-2xl"
              style={{
                backgroundImage: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)',
                backgroundSize: '16px 16px',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </div>

            {/* Set checkboxes */}
            {hasSets && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Include Sets
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
                        background: selectedSets[i] ? 'rgba(212,251,0,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selectedSets[i] ? 'rgba(212,251,0,0.22)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                        style={{
                          background: selectedSets[i] ? ACCENT : 'transparent',
                          border: `2px solid ${selectedSets[i] ? ACCENT : 'rgba(255,255,255,0.22)'}`,
                        }}
                      >
                        {selectedSets[i] && (
                          <span className="material-symbols-outlined text-black" style={{ fontSize: 13, fontVariationSettings: "'wght' 700" }}>check</span>
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

            {shareStatus === 'success' && (
              <p className="text-center text-sm font-bold" style={{ color: ACCENT }}>
                Saved — overlay it on your photo as a sticker.
              </p>
            )}
            {shareStatus === 'error' && (
              <p className="text-center text-sm font-bold text-red-400">Something went wrong. Try again.</p>
            )}
          </div>

          {/* Share button */}
          <div className="px-4 pb-8 pt-3 shrink-0 border-t border-outline-variant/10">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-base disabled:opacity-50"
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
