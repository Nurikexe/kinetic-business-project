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

// ── Bar chart ───────────────────────────────────────────────
function BarChart({ data, maxValue, color = '#d4fb00', showValues = false }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end justify-between h-28 gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          {showValues && (
            <span className="text-[8px] text-on-surface-variant font-bold" style={{ opacity: d.value > 0 ? 1 : 0 }}>
              {d.value > 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
            </span>
          )}
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: d.highlight ? color : '#262626',
              minHeight: 4,
            }}
          />
          <span className="text-[9px] text-on-surface-variant font-bold uppercase truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── SVG line chart ───────────────────────────────────────────
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

// ── Activity row (compact) ────────────────────────────────────
function ActivityRow({ session }) {
  const isRun = session.session_type === 'run';
  const title = session.day_name || session.title || 'Workout';
  const dateStr = new Date(session.submitted_at || session.date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-3">
      <div className={`w-2 h-2 rounded-full shrink-0 ${isRun ? 'bg-primary-fixed' : 'bg-secondary'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm truncate">{title}</p>
        <p className={`text-[9px] font-black uppercase tracking-widest ${isRun ? 'text-primary-fixed' : 'text-secondary'}`}>
          {isRun ? 'Running' : 'Gym'}
          {isRun && session.total_distance != null && ` · ${Number(session.total_distance).toFixed(1)} km`}
          {isRun && session.avg_pace && ` · ${session.avg_pace}/km`}
          {!isRun && session.exercises && ` · ${Array.isArray(session.exercises) ? session.exercises.length : '—'} exercises`}
        </p>
      </div>
      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest shrink-0">{dateStr}</span>
    </div>
  );
}

// ── Download CSV helper ──────────────────────────────────────
function downloadCSV(gymData, runData, from, to) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59);

  const gymRows = gymData
    .filter(w => {
      const d = new Date(w.submitted_at || w.date);
      return d >= fromDate && d <= toDate;
    })
    .map(w => {
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      const vol = exercises.reduce((s, ex) => {
        const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
        return s + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
      }, 0);
      return `${w.date},Gym,"${w.day_name || 'Workout'}",${exercises.length} exercises,${Math.round(vol)} kg volume`;
    });

  const runRows = runData
    .filter(r => {
      const d = new Date(r.submitted_at || r.date);
      return d >= fromDate && d <= toDate;
    })
    .map(r => `${r.date},Running,"${r.title || 'Run'}",${r.total_distance ?? 0} km,${r.avg_pace ?? '—'}/km`);

  const all = [...gymRows, ...runRows].sort();
  const csv = [
    'Date,Type,Name,Detail,Volume/Pace',
    ...all,
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kinetic_activities_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('strength');
  const [gymData, setGymData]       = useState([]);
  const [runData, setRunData]       = useState([]);
  const [allGymData, setAllGymData] = useState([]);
  const [allRunData, setAllRunData] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [aiInput, setAiInput]       = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [promptsUsed, setPromptsUsed] = useState(getPromptCount());

  // Download date pickers
  const [dlFrom, setDlFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dlTo, setDlTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Activities section show-more
  const [showAllActivities, setShowAllActivities] = useState(false);

  useEffect(() => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];

    Promise.all([
      // Last 30 days for charts
      supabase.from('workouts').select('*').eq('user_id', user.id).gte('date', since).order('date'),
      supabase.from('run_sessions').select('*').eq('user_id', user.id).gte('date', since).order('date'),
      // All time for recent activities + download
      supabase.from('workouts').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('run_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ]).then(([gymRes, runRes, allGymRes, allRunRes]) => {
      setGymData(gymRes.data ?? []);
      setRunData(runRes.data ?? []);
      setAllGymData(allGymRes.data ?? []);
      setAllRunData(allRunRes.data ?? []);
      setLoading(false);
    });
  }, [user]);

  // ── All activities merged + sorted ─────────────────────────
  const allActivities = [
    ...allGymData.map(s => ({ ...s, session_type: 'gym' })),
    ...allRunData.map(s => ({ ...s, session_type: 'run' })),
  ].sort((a, b) => new Date(b.submitted_at || b.date) - new Date(a.submitted_at || a.date));

  const visibleActivities = showAllActivities ? allActivities : allActivities.slice(0, 8);

  // ── Gym metrics ─────────────────────────────────────────────
  // Weekly volume (last 7 weeks)
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

  // Volume by session (last 10 sessions)
  const volumeBySession = (() => {
    const sessions = [...gymData].reverse().slice(-10);
    return sessions.map((w, i) => {
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      const vol = exercises.reduce((s, ex) => {
        const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
        return s + (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
      }, 0);
      const dayLabel = new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
      return { label: dayLabel, value: Math.round(vol), highlight: i === sessions.length - 1 };
    });
  })();

  // Volume by month (last 6 months from allGymData)
  const volumeByMonth = (() => {
    const months = {};
    allGymData.forEach(w => {
      const d = new Date(w.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = 0;
      const exercises = Array.isArray(w.exercises) ? w.exercises : (w.exercises?.items ?? []);
      exercises.forEach(ex => {
        const reps = parseInt(String(ex.reps || '1').split('-')[0]) || 1;
        months[key] += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 1) * reps;
      });
    });
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    return sorted.map(([key, val], i) => ({
      label: monthNames[parseInt(key.split('-')[1]) - 1],
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

  // ── Run metrics ──────────────────────────────────────────────
  const totalDistance = runData.reduce((s, r) => s + (parseFloat(r.total_distance) || 0), 0);

  // Pace trend last 7 runs
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

  // Distance by session (last 10 runs)
  const distanceBySession = (() => {
    const sessions = [...runData].reverse().slice(-10);
    return sessions.map((r, i) => {
      const dayLabel = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
      return {
        label: dayLabel,
        value: parseFloat(r.total_distance) || 0,
        highlight: i === sessions.length - 1,
      };
    });
  })();

  // Distance by week (last 7 weeks)
  const weeklyDistance = (() => {
    const weeks = {};
    runData.forEach(r => {
      const d = new Date(r.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = 0;
      weeks[key] += parseFloat(r.total_distance) || 0;
    });
    const sorted = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    return sorted.map(([, val], i) => ({
      label: ['W1','W2','W3','W4','W5','W6','W7'][i] || `W${i+1}`,
      value: Math.round(val * 10) / 10,
      highlight: i === sorted.length - 1,
    }));
  })();

  // Distance by month (last 6 months)
  const distanceByMonth = (() => {
    const months = {};
    allRunData.forEach(r => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = 0;
      months[key] += parseFloat(r.total_distance) || 0;
    });
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    return sorted.map(([key, val], i) => ({
      label: monthNames[parseInt(key.split('-')[1]) - 1],
      value: Math.round(val * 10) / 10,
      highlight: i === sorted.length - 1,
    }));
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

        {/* ── Recent Activities ── */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-lg tracking-tight uppercase">All Activities</h3>
            <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">{allActivities.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
            </div>
          ) : allActivities.length === 0 ? (
            <div className="bg-surface-container rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <p className="text-on-surface-variant font-medium text-sm">No activities yet. Log your first workout!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleActivities.map(s => <ActivityRow key={`${s.session_type}-${s.id}`} session={s} />)}
              {allActivities.length > 8 && (
                <button
                  onClick={() => setShowAllActivities(v => !v)}
                  className="w-full py-3 rounded-xl bg-surface-container text-on-surface-variant font-headline font-bold text-xs uppercase tracking-widest hover:bg-surface-container-high transition-colors"
                >
                  {showAllActivities ? 'Show Less' : `Show All ${allActivities.length} Activities`}
                </button>
              )}
            </div>
          )}

          {/* ── Download by date range ── */}
          <div className="mt-4 bg-surface-container/60 border border-outline-variant/15 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
              <p className="font-headline font-bold text-sm uppercase tracking-tight">Download Activities</p>
            </div>
            <p className="text-on-surface-variant text-xs">Export your activities as a CSV between two dates.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">From</label>
                <input
                  type="date"
                  value={dlFrom}
                  max={dlTo}
                  onChange={e => setDlFrom(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-container/50 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant block mb-1">To</label>
                <input
                  type="date"
                  value={dlTo}
                  min={dlFrom}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setDlTo(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-container/50 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={() => downloadCSV(allGymData, allRunData, dlFrom, dlTo)}
              className="w-full py-3 rounded-xl bg-primary-container text-on-primary-fixed font-headline font-bold uppercase text-xs tracking-wide hover:bg-primary-dim transition-colors active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Export CSV
            </button>
          </div>
        </section>

        {/* ── Tab Toggle ── */}
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
                ? <BarChart data={weeklyVolume} showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No gym data yet. Log your first workout!</p>
              }
            </div>

            {/* Volume by Session */}
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Volume by Session</p>
                <p className="text-on-surface-variant text-xs">Last 10 sessions</p>
              </div>
              {volumeBySession.length > 0
                ? <BarChart data={volumeBySession} color="#a8ff78" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No session data yet.</p>
              }
            </div>

            {/* Volume by Month */}
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Monthly Volume</p>
                <p className="text-on-surface-variant text-xs">Last 6 months</p>
              </div>
              {volumeByMonth.length > 0
                ? <BarChart data={volumeByMonth} color="#d4fb00" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">Not enough data for monthly view.</p>
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
            {/* Avg Pace with line chart */}
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

            {/* Distance by Session */}
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Distance by Session</p>
                <p className="text-on-surface-variant text-xs">Last 10 runs (km)</p>
              </div>
              {distanceBySession.length > 0
                ? <BarChart data={distanceBySession} color="#00e3fd" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No run data yet.</p>
              }
            </div>

            {/* Weekly Distance */}
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Weekly Distance</p>
                <p className="text-on-surface-variant text-xs">Last 7 weeks (km)</p>
              </div>
              {weeklyDistance.length > 0
                ? <BarChart data={weeklyDistance} color="#00e3fd" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">No weekly data yet.</p>
              }
            </div>

            {/* Monthly Distance */}
            <div className="bg-surface-container rounded-lg p-6 space-y-5">
              <div>
                <p className="font-label text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">Monthly Distance</p>
                <p className="text-on-surface-variant text-xs">Last 6 months (km)</p>
              </div>
              {distanceByMonth.length > 0
                ? <BarChart data={distanceByMonth} color="#00b4d8" showValues />
                : <p className="text-on-surface-variant text-sm text-center py-4">Not enough data for monthly view.</p>
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
