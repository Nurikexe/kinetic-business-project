import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SHEET = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };
const LIME = '#d4fb00';
const CYAN = '#00e3fd';
const INK  = '#080808';

// ── Canvas helpers ─────────────────────────────────────────────────────────

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const test = line + ' ' + words[i];
    if (ctx.measureText(test).width <= maxWidth) { line = test; }
    else { lines.push(line); line = words[i]; }
  }
  lines.push(line);
  return lines;
}

function getFunFact(name, weight) {
  const ex = (name || '').toLowerCase();
  const w  = parseFloat(weight) || 0;
  if (ex.includes('bench')) {
    if (w >= 140) return 'Elite tier. Only 0.1% of the population can bench 3 plates (140 kg).';
    if (w >= 100) return 'Legendary. Only 1.2% of people worldwide can bench press 100 kg.';
    if (w >= 60)  return 'Impressive — roughly the weight of a professional MMA fighter.';
    return 'Every kg added puts you ahead of 90% of the population.';
  }
  if (ex.includes('pull-up') || ex.includes('lat pull')) {
    if (w >= 100) return 'This pull strength is common among world-class rock climbers.';
    if (w >= 50)  return 'Top tier. More pulling power than 95% of gym-goers worldwide.';
    return 'Vertical pulling strength is the best indicator of upper-body health.';
  }
  if (ex.includes('squat')) {
    if (w >= 180) return 'Superhuman. 180 kg+ squats place you in the top 0.5% of all athletes.';
    if (w >= 140) return 'Elite. 140 kg is the benchmark for professional rugby players.';
    return 'Regular squatting increases natural growth hormone and bone density.';
  }
  if (ex.includes('deadlift')) {
    if (w >= 220) return 'Titan. 220 kg is equivalent to lifting a full-grown Siberian Tiger.';
    if (w >= 180) return 'Beast mode. Stronger than 98% of the adult male population.';
    return 'The deadlift is the purest single test of total human strength.';
  }
  if (ex.includes('curl')) {
    if (w >= 60) return 'Giant. Curling 60 kg for reps is a feat very few will ever see.';
    return 'Bicep strength is crucial for elbow stability in heavy compound lifts.';
  }
  if (w >= 100) return `Lifting ${w} kg places you in an elite tier of physical preparedness.`;
  if (w >= 50)  return `${w} kg is more than the average person can lift in a lifetime of training.`;
  return 'Consistency beats intensity. This PR is proof of your dedication.';
}

// ── Card drawing ───────────────────────────────────────────────────────────

function drawPRCard(canvas, { name, weight, date, selectedSets }) {
  const DPR    = Math.min(window.devicePixelRatio || 2, 3);
  const W      = 480;
  const setCount = selectedSets.length;
  // Heights: header(46) + exercise(54) + weight(128) + divider(18) + fact(80) + [sets] + bottom(28)
  const H = setCount > 0 ? 354 + setCount * 46 : 354;

  canvas.width  = W * DPR;
  canvas.height = H * DPR;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(DPR, DPR);

  // ── Clip entire card ────────────────────────────────────────
  roundedRect(ctx, 0, 0, W, H, 20);
  ctx.save();
  ctx.clip();

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // Diagonal carbon-fiber texture
  ctx.save();
  ctx.globalAlpha = 0.024;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 13) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // Atmospheric lime glow (left half, behind weight)
  const glow = ctx.createRadialGradient(100, 200, 0, 100, 200, 280);
  glow.addColorStop(0, 'rgba(212,251,0,0.10)');
  glow.addColorStop(0.5, 'rgba(212,251,0,0.03)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 60, W * 0.75, H);

  // ── Lime header block ────────────────────────────────────────
  ctx.fillStyle = LIME;
  ctx.fillRect(0, 0, W, 46);

  // Diagonal right-notch cut from header (dynamic slash feel)
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(W - 72, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 46);
  ctx.closePath();
  ctx.fill();

  // ── Left accent bar ──────────────────────────────────────────
  ctx.fillStyle = LIME;
  ctx.fillRect(0, 46, 5, H - 74);

  // ── Bottom lime bar ──────────────────────────────────────────
  ctx.fillStyle = LIME;
  ctx.fillRect(0, H - 28, W, 28);

  // Bottom-left triangle notch
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, H - 28);
  ctx.lineTo(28, H - 28);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); // end card clip

  // ── Header text ─────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PERSONAL RECORD', 16, 30);

  const dateStr = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : '';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.font = '9px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - 80, 28); // clear the notch

  // ── Registration cross marker (top-right, below header) ─────
  const cx = W - 32, cy = 62, cs = 8;
  ctx.strokeStyle = 'rgba(212,251,0,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - cs, cy); ctx.lineTo(cx + cs, cy);
  ctx.moveTo(cx, cy - cs); ctx.lineTo(cx, cy + cs);
  ctx.stroke();
  // Small circle at center
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // ── Exercise label + name ────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(212,251,0,0.5)';
  ctx.font = 'bold 9px system-ui,-apple-system,sans-serif';
  ctx.fillText('EXERCISE', 16, 64);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui,-apple-system,sans-serif';
  let exName = (name || '').toUpperCase();
  while (ctx.measureText(exName).width > W - 32 && exName.length > 3) {
    exName = exName.slice(0, -1);
  }
  if (exName !== (name || '').toUpperCase()) exName += '…';
  ctx.fillText(exName, 16, 92);

  // Underline (full width of the name)
  const exW = ctx.measureText(exName).width;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 98); ctx.lineTo(16 + exW, 98); ctx.stroke();

  // ── Weight number ────────────────────────────────────────────
  const weightStr = String(weight);
  ctx.font = 'bold 136px system-ui,-apple-system,sans-serif';

  // Speed lines to the left of the number (momentum effect)
  const BASE_Y = 220;
  for (let i = 0; i < 5; i++) {
    const ly     = BASE_Y - 56 + i * 22;
    const lLen   = 10 + i * 9;
    const lAlpha = 0.03 + i * 0.025;
    ctx.fillStyle = `rgba(212,251,0,${lAlpha})`;
    ctx.fillRect(0, ly, lLen, i === 2 ? 2 : 1);
  }

  // Cyan chromatic-aberration ghost (3px offset)
  ctx.fillStyle = CYAN + '3d'; // 0x3d ≈ 24% opacity
  ctx.textAlign = 'left';
  ctx.fillText(weightStr, 14, 222);

  // Main lime number
  ctx.fillStyle = LIME;
  ctx.fillText(weightStr, 10, 219);

  // KG unit beside number
  const wW = ctx.measureText(weightStr).width;
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.font = 'bold 30px system-ui,-apple-system,sans-serif';
  ctx.fillText('KG', 10 + wW + 12, 207);

  // ── Double-rule divider ──────────────────────────────────────
  const DIV_Y = 234;
  ctx.strokeStyle = 'rgba(212,251,0,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(16, DIV_Y);     ctx.lineTo(W - 16, DIV_Y);     ctx.stroke();
  ctx.strokeStyle = 'rgba(212,251,0,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, DIV_Y + 4); ctx.lineTo(W - 16, DIV_Y + 4); ctx.stroke();

  // ── Strength Fact block ──────────────────────────────────────
  const fact = getFunFact(name, weight);
  const FBY  = DIV_Y + 14;
  const FBH  = 74;

  ctx.fillStyle = 'rgba(212,251,0,0.038)';
  ctx.fillRect(16, FBY, W - 32, FBH);
  // Left lime stripe
  ctx.fillStyle = 'rgba(212,251,0,0.55)';
  ctx.fillRect(16, FBY, 3, FBH);

  ctx.fillStyle = LIME;
  ctx.font = 'bold 8px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STRENGTH FACT', 26, FBY + 14);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '11px system-ui,-apple-system,sans-serif';
  const factLines = wrapText(ctx, fact, W - 68);
  let fy = FBY + 28;
  factLines.slice(0, 4).forEach(line => {
    ctx.fillText(line, 26, fy);
    fy += 14;
  });

  // ── Sets section ─────────────────────────────────────────────
  if (selectedSets.length > 0) {
    const SET_START = FBY + FBH + 18;

    ctx.fillStyle = 'rgba(212,251,0,0.38)';
    ctx.font = 'bold 9px system-ui,-apple-system,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SETS', 16, SET_START);

    let sy = SET_START + 16;
    selectedSets.forEach((set, i) => {
      // Badge
      ctx.fillStyle = 'rgba(212,251,0,0.1)';
      ctx.fillRect(16, sy - 12, 22, 16);
      ctx.fillStyle = LIME;
      ctx.font = 'bold 9px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}`, 21, sy);

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = 'bold 13px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'right';
      const sw = set.weight ? `${set.weight} KG` : `${weight} KG`;
      ctx.fillText(`${sw}  ×  ${set.reps || '—'}`, W - 16, sy);

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(16, sy + 10); ctx.lineTo(W - 16, sy + 10); ctx.stroke();
      sy += 46;
    });
  }

  // ── Bottom bar text ──────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = 'bold 11px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('KINETIC', 36, H - 8);

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.font = '9px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('// PERFORMANCE SYSTEM', W - 14, H - 8);
}

// ── Modal component ────────────────────────────────────────────────────────

export default function PRShareModal({ pr, onClose }) {
  const canvasRef = useRef(null);
  const [selectedSets, setSelectedSets] = useState([]);
  const [sharing, setSharing]   = useState(false);
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
        const a   = document.createElement('a');
        a.href = url; a.download = `PR_${pr.name.replace(/\s+/g, '_')}.png`;
        a.click(); URL.revokeObjectURL(url);
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
        className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* Backdrop */}
        <motion.div className="absolute inset-0 bg-black/80" onClick={onClose} />

        {/* Sheet */}
        <motion.div
          className="relative w-full sm:max-w-md flex flex-col overflow-hidden"
          style={{
            maxHeight: '92dvh',
            background: '#111111',
            borderRadius: '24px 24px 0 0',
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={SHEET}
        >
          {/* Lime top accent line */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${LIME} 0%, rgba(212,251,0,0.3) 60%, transparent 100%)` }} />

          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-9 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: LIME }}>
                Share PR
              </p>
              <h3 className="font-headline font-black text-lg tracking-tight text-white truncate mt-0.5">
                {pr.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">

            {/* Canvas preview */}
            <div
              className="w-full overflow-hidden rounded-2xl"
              style={{
                // Checkerboard pattern to show transparency clearly
                backgroundImage: `
                  linear-gradient(45deg, #1e1e1e 25%, transparent 25%),
                  linear-gradient(-45deg, #1e1e1e 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #1e1e1e 75%),
                  linear-gradient(-45deg, transparent 75%, #1e1e1e 75%)
                `,
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                backgroundColor: '#171717',
              }}
            >
              {/* Preview label */}
              <div
                className="flex items-center justify-between px-3 py-1.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Preview
                </span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Transparent PNG
                </span>
              </div>
              <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </div>

            {/* Set checkboxes */}
            {hasSets && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Include Sets
                  </p>
                  <button
                    onClick={toggleAll}
                    className="text-xs font-bold"
                    style={{ color: LIME }}
                  >
                    {selectedSets.every(Boolean) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {pr.sets.map((set, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSet(i)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: selectedSets[i]
                          ? 'rgba(212,251,0,0.06)'
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selectedSets[i] ? 'rgba(212,251,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {/* Custom checkbox */}
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background:   selectedSets[i] ? LIME : 'transparent',
                          border: `1.5px solid ${selectedSets[i] ? LIME : 'rgba(255,255,255,0.2)'}`,
                        }}
                      >
                        {selectedSets[i] && (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 12, color: '#0a0a0a', fontVariationSettings: "'wght' 700" }}
                          >
                            check
                          </span>
                        )}
                      </div>

                      {/* Set label */}
                      <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Set {i + 1}
                      </span>

                      <div className="flex-1" />

                      {/* Set data */}
                      <span className="text-sm font-bold text-white">
                        {set.weight ? `${set.weight}kg` : `${pr.weight}kg`}
                        {set.reps && (
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                            {' '}× {set.reps}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status messages */}
            {shareStatus === 'success' && (
              <p className="text-center text-xs font-bold" style={{ color: LIME }}>
                Saved — overlay it on your story as a sticker.
              </p>
            )}
            {shareStatus === 'error' && (
              <p className="text-center text-xs font-bold text-red-400">
                Something went wrong. Try again.
              </p>
            )}
          </div>

          {/* Share button */}
          <div
            className="px-4 pb-8 pt-3 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest transition-opacity disabled:opacity-40"
              style={{ background: LIME, color: '#0a0a0a', letterSpacing: '0.12em' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
              >
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
