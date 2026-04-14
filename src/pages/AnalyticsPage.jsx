import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { streamChat } from '../lib/openrouter';

const AI_LIMIT = 10;
const AI_STORAGE_KEY = 'kinetic_ai_prompts_used';

function getPromptCount() {
  try { return parseInt(localStorage.getItem(AI_STORAGE_KEY) || '0'); } catch { return 0; }
}
function incrementPromptCount() {
  try { localStorage.setItem(AI_STORAGE_KEY, String(getPromptCount() + 1)); } catch {}
}

// Simple bar chart component
function BarChart({ data, maxValue, color = '#d4fb00' }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end justify-between h-28 gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: d.highlight ? color : '#262626',
              minHeight: 4,
            }}
          />
          <span className="text-[9px] text-on-surface-variant font-bold uppercase">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// SVG line chart
function LineChart({ points, color = '#00e3fd' }) {
  if (!points || points.length < 2) return (
    <div className="h-24 flex items-center justify-center text-on-surface-variant text-sm">Not enough data</div>
  );
  const max = Math.max(...points.map(p => p.value), 1);
  const min = Math.min(...points.map(p => p.value), 0);
  const range = max - min || 1;
  const w = 400;
  const h = 100;
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - ((p.value - min) / range) * h * 0.85 - h * 0.075,
  }));
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const areaD = `${pathD} L${w},${h} L0,${h} Z`;

  return (
    <div className="relative h-24">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        <path d={areaD} fill={`${color}15`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 5 : 3}
            fill={i === coords.length - 1 ? color : '#0e0e0e'} stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {points.map((p, i) => (
          <span key={i} className="text-[9px] text-on-surface-variant font-bold">{p.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('strength');
  const [gymData, setGymData]       = useState([]);
  const [runData, setRunData]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [aiInput, setAiInput]       = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [promptsUsed, setPromptsUsed] = useState(getPromptCount());

  useEffect(() => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];

    Promise.all([
      supabase.from('workouts').select('*').eq('user_id', user.id).gte('date', since).order('date'),
      supabase.from('run_sessions').select('*').eq('user_id', user.id).gte('date', since).order('date'),
    ]).then(([gymRes, runRes]) => {
      setGymData(gymRes.data ?? []);
      setRunData(runRes.data ?? []);
      setLoading(false);
    });
  }, [user]);

  // ── Gym metrics ───────────────────────────────────────────
  const weeklyVolume = (() => {
    const weeks = {};
    gymData.forEach(w => {
      const d = new Date(w.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = 0;
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      exercises.forEach(ex => {
        const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
        weeks[key] += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
      });
    });
    const sorted = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    return sorted.map(([key, val], i) => ({
      label: ['W1','W2','W3','W4','W5','W6','W7'][i] || `W${i+1}`,
      value: Math.round(val),
      highlight: i === sorted.length - 1,
    }));
  })();

  const totalVolumeKg = weeklyVolume.reduce((s, w) => s + w.value, 0);
  const latestMaxLift = (() => {
    for (let i = gymData.length - 1; i >= 0; i--) {
      const exercises = Array.isArray(gymData[i].exercises) ? gymData[i].exercises : (gymData[i].exercises?.items ?? []);
      const deadlift = exercises.find(e => e.name?.toLowerCase().includes('deadlift'));
      if (deadlift?.weight) return { name: deadlift.name, weight: deadlift.weight };
    }
    return null;
  })();

  // ── Run metrics ───────────────────────────────────────────
  const totalDistance = runData.reduce((s, r) => s + (parseFloat(r.total_distance) || 0), 0);

  const pacePoints = runData.slice(-7).map((r, i) => {
    const paceStr = r.avg_pace || '';
    const [m, s] = paceStr.split(':').map(Number);
    const paceNum = m + (s || 0) / 60;
    return {
      label: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      value: paceNum || 0,
    };
  }).filter(p => p.value > 0);

  const avgPace = (() => {
    if (runData.length === 0) return '—';
    const paces = runData.map(r => {
      const [m, s] = (r.avg_pace || '0:00').split(':').map(Number);
      return m + (s || 0) / 60;
    }).filter(Boolean);
    if (!paces.length) return '—';
    const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
    const mins = Math.floor(avg);
    const secs = Math.round((avg - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  })();

  // ── AI insight ────────────────────────────────────────────
  const buildReport = () => {
    const gymSummary = `Gym sessions last 30 days: ${gymData.length}. Total volume: ${totalVolumeKg.toLocaleString()} kg.`;
    const runSummary = `Running sessions: ${runData.length}. Total distance: ${totalDistance.toFixed(1)} km. Avg pace: ${avgPace}/km.`;
    return `${gymSummary} ${runSummary}`;
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || promptsUsed >= AI_LIMIT || aiStreaming) return;
    const report = buildReport();
    const messages = [
      {
        role: 'system',
        content: `You are an expert fitness coach. The user's training report: ${report}
Give concise, actionable advice. Answer in 3-5 sentences. Be specific and encouraging.`,
      },
      { role: 'user', content: aiInput.trim() },
    ];
    setAiStreaming(true);
    setAiResponse('');
    try {
      await streamChat(messages, (chunk) => setAiResponse(r => r + chunk));
      incrementPromptCount();
      const newCount = getPromptCount();
      setPromptsUsed(newCount);
    } catch (e) {
      setAiResponse('Sorry, something went wrong. Please try again.');
    } finally {
      setAiStreaming(false);
      setAiInput('');
    }
  };

  const promptsLeft = AI_LIMIT - promptsUsed;

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex justify-between items-center px-6 py-4">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
          <span className="material-symbols-outlined text-on-surface-variant">monitoring</span>
        </div>
      </header>

      <div className="px-6 pt-6 max-w-xl mx-auto space-y-8">
        {/* Title */}
        <section>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight uppercase">
            Performance <span className="text-primary-container italic">Lab</span>
          </h2>
          <p className="text-on-surface-variant font-medium text-sm">Real-time training trends — last 30 days</p>
        </section>

        {/* Tab Toggle */}
        <div className="flex bg-surface-container-low p-1.5 rounded-full">
          <button
            onClick={() => setTab('strength')}
            className={`flex-1 py-2.5 px-6 rounded-full font-headline font-bold text-sm tracking-wide uppercase transition-all duration-300 ${tab === 'strength' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Strength
          </button>
          <button
            onClick={() => setTab('running')}
            className={`flex-1 py-2.5 px-6 rounded-full font-headline font-bold text-sm tracking-wide uppercase transition-all duration-300 ${tab === 'running' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Running
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          </div>
        ) : tab === 'strength' ? (
          <>
            {/* Weekly Volume */}
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Weekly Volume</p>
                  <h3 className="font-headline text-4xl font-extrabold tracking-tighter">
                    {totalVolumeKg > 1000 ? `${(totalVolumeKg/1000).toFixed(1)}t` : totalVolumeKg.toLocaleString()}
                    <span className="text-lg font-bold ml-1 text-on-surface-variant">KG</span>
                  </h3>
                </div>
                <div className="bg-secondary-container/20 text-secondary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {gymData.length} sessions
                </div>
              </div>
              {weeklyVolume.length > 0
                ? <BarChart data={weeklyVolume} />
                : <p className="text-on-surface-variant text-sm text-center py-4">No gym data yet. Log your first workout!</p>
              }
            </div>

            {/* Max Lift + Sessions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container rounded-lg p-5 flex flex-col justify-between aspect-square">
                <div className="space-y-1">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                  <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Top Lift</p>
                </div>
                <div>
                  <h4 className="font-headline text-3xl font-extrabold tracking-tighter">
                    {latestMaxLift ? `${latestMaxLift.weight}` : '—'}
                    {latestMaxLift && <span className="text-base text-on-surface-variant">kg</span>}
                  </h4>
                  <p className="text-on-surface-variant text-[10px] font-bold uppercase mt-1">
                    {latestMaxLift?.name ?? 'No data'}
                  </p>
                </div>
              </div>

              <div className="bg-surface-container rounded-lg p-5 flex flex-col justify-between aspect-square">
                <div className="space-y-1">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                  <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Sessions</p>
                </div>
                <div>
                  <h4 className="font-headline text-3xl font-extrabold tracking-tighter">{gymData.length}</h4>
                  <p className="text-on-surface-variant text-[10px] font-bold uppercase">Last 30 days</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Running Pace */}
            <div className="bg-surface-container-low rounded-lg p-6 space-y-4">
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Average Pace</p>
                <h3 className="font-headline text-4xl font-extrabold tracking-tighter">
                  {avgPace}<span className="text-lg font-bold ml-1 text-on-surface-variant">/KM</span>
                </h3>
              </div>
              {pacePoints.length >= 2
                ? <LineChart points={pacePoints} />
                : <p className="text-on-surface-variant text-sm text-center py-4">Log more runs to see your pace trend.</p>
              }
            </div>

            {/* Distance + Sessions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container rounded-lg p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
                </div>
                <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Total Distance</p>
                <h4 className="font-headline text-3xl font-extrabold tracking-tighter">
                  {totalDistance.toFixed(1)}<span className="text-base text-on-surface-variant ml-1">KM</span>
                </h4>
              </div>

              <div className="bg-surface-container rounded-lg p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                </div>
                <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Run Sessions</p>
                <h4 className="font-headline text-3xl font-extrabold tracking-tighter">{runData.length}</h4>
              </div>
            </div>
          </>
        )}

        {/* AI Insight Section */}
        <section className="bg-surface-container/40 backdrop-blur-xl border border-outline-variant/15 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <div>
              <h4 className="font-headline text-sm font-bold uppercase tracking-tight">AI Kinetic Insight</h4>
              <p className="text-xs text-on-surface-variant">{promptsLeft} of {AI_LIMIT} prompts remaining</p>
            </div>
          </div>

          {aiResponse && (
            <div className="bg-surface-container rounded-lg p-4 mb-4 text-sm text-on-surface leading-relaxed">
              {aiResponse}
              {aiStreaming && <span className="inline-block w-1 h-4 bg-primary-container animate-pulse ml-1 align-middle" />}
            </div>
          )}

          {promptsLeft > 0 ? (
            <div className="flex gap-3">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
                placeholder="How can I improve my sessions?"
                className="flex-1 bg-surface-container-highest border border-outline-variant/20 rounded-full px-5 py-3 text-sm placeholder:text-outline focus:outline-none focus:border-primary-container/50 transition-colors"
              />
              <button
                onClick={handleAiSubmit}
                disabled={!aiInput.trim() || aiStreaming}
                className="px-5 py-3 rounded-full bg-primary-container text-on-primary-fixed font-headline font-bold uppercase text-xs tracking-wide disabled:opacity-40 hover:bg-primary-dim transition-colors active:scale-95"
              >
                {aiStreaming ? '…' : 'Ask'}
              </button>
            </div>
          ) : (
            <div className="text-center py-3 text-on-surface-variant text-sm">
              You've used all {AI_LIMIT} AI prompts for this session.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
