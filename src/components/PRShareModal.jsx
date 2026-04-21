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
  strip.addColorStop(0.4, ACCENT + 'cc');
  strip.addColorStop(1, 'transparent');
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, W, 48);

  // Spotlight glow behind weight
  const spotlight = ctx.createRadialGradient(80, 160, 0, 80, 160, 240);
  spotlight.addColorStop(0, ACCENT + '20');
  spotlight.addColorStop(1, 'transparent');
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, 60, W, 180);

  ctx.restore();

  // ── Header Content ─────────────────────────────────────────
  ctx.fillStyle = '#0a0a0a';
  ctx.font = 'black 10px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PERSONAL RECORD', 20, 30);

  const dateStr = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.font = 'bold 10px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr.toUpperCase(), W - 20, 30);

  // ── Exercise name ──────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.fillStyle = 'white';
  ctx.font = 'black 22px system-ui,-apple-system,sans-serif';
  let exName = (name || '').toUpperCase();
  while (ctx.measureText(exName).width > W - 180 && exName.length > 3) {
    exName = exName.slice(0, -1);
  }
  if (exName !== (name || '').toUpperCase()) exName += '…';
  ctx.fillText(exName, 20, 84);

  // ── Weight (Luxury Typography) ──────────────────────────────
  ctx.fillStyle = ACCENT;
  ctx.font = `black 140px system-ui,-apple-system,sans-serif`;
  const weightStr = String(weight);
  ctx.fillText(weightStr, 12, 218);

  // kg unit 
  const wW = ctx.measureText(weightStr).width;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = 'black 32px system-ui,-apple-system,sans-serif';
  ctx.fillText('KG', 12 + wW + 12, 204);

  // ── Luxury Fact Box (Right-aligned) ────────────────────────
  const fact = getFunFact(name, weight);
  ctx.save();

  // Vertical accent line
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(W - 165, 75);
  ctx.lineTo(W - 165, 145);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Tiny "FACT" label
  ctx.fillStyle = ACCENT;
  ctx.font = 'black 8px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STRENGTH FACT', W - 155, 84);

  // The fact text - High visibility
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'medium 11px system-ui,-apple-system,sans-serif';
  const factLines = wrapText(ctx, fact, 135);
  let fy = 100;
  factLines.forEach(line => {
    ctx.fillText(line, W - 155, fy);
    fy += 15;
  });
  ctx.restore();

  // ── Sets section ───────────────────────────────────────────
  if (selectedSets.length > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 238);
    ctx.lineTo(W - 20, 238);
    ctx.stroke();

    let y = 270;
    selectedSets.forEach((set, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SET ${i + 1}`, 20, y);

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 12px system-ui,-apple-system,sans-serif';
      ctx.textAlign = 'right';
      const sw = set.weight ? `${set.weight} KG` : `${weight} KG`;
      const sr = set.reps || '—';
      ctx.fillText(`${sw}  ×  ${sr}`, W - 20, y);
      y += 48;
    });
  }

  // ── Branding ───────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = 'black 10px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('KINETIC // SYSTEM', W - 20, H - 14);
}


function getFunFact(name, weight) {
  const ex = (name || '').toLowerCase();
  const w = parseFloat(weight) || 0;

  if (ex.includes('bench')) {
    if (w >= 140) return "Elite: Only 0.1% of the population can bench press 3 plates (140kg).";
    if (w >= 100) return "Legendary: Only 1.2% of people worldwide can bench press 100kg.";
    if (w >= 60) return "Impressive: This is roughly the weight of a professional MMA fighter.";
    return "Progress is power. Every kg added puts you ahead of 90% of the population.";
  }
  if (ex.includes('pull-up') || ex.includes('lat pull')) {
    if (w >= 100) return "Incredible: This pull strength is common among world-class climbers.";
    if (w >= 50) return "Top Tier: You have more pulling power than 95% of gym-goers.";
    return "Vertical pulling strength is the best indicator of overall upper body health.";
  }
  if (ex.includes('squat')) {
    if (w >= 180) return "Superhuman: 180kg+ squats put you in the top 0.5% of all athletes.";
    if (w >= 140) return "Elite: 140kg is a common benchmark for professional rugby players.";
    return "Regular squatting increases natural growth hormone and bone density.";
  }
  if (ex.includes('deadlift')) {
    if (w >= 220) return "Titan: 220kg is equivalent to lifting a full-grown Siberian Tiger.";
    if (w >= 180) return "Beast: You are now stronger than 98% of the adult male population.";
    return "The deadlift is the purest test of total human strength.";
  }
  if (ex.includes('curl')) {
    if (w >= 60) return "Giant: Curling 60kg for reps is a feat of strength few will ever see.";
    return "Bicep strength is crucial for elbow stability in heavy compound lifts.";
  }

  // Generic fallback
  if (w >= 100) return `Lifting ${w}kg puts you in an elite tier of physical preparedness.`;
  if (w >= 50) return `${w}kg is more than the average person can lift in a lifetime.`;
  return "Consistency beats intensity. This PR is proof of your dedication.";
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
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
        className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <motion.div className="absolute inset-0 bg-black/75" onClick={onClose} />

        <motion.div
          className="relative w-full sm:max-w-md bg-surface-container rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
          style={{ maxHeight: '92dvh' }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
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
