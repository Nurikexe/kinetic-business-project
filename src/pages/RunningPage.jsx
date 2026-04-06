import { motion } from 'framer-motion';
import { CalendarCheck, Target, Zap, Heart, Flame, ChevronLeft, ChevronRight, Check, RotateCcw, TableProperties } from 'lucide-react';
import Section from '../components/Section';
import ProgressBar from '../components/ProgressBar';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { RUN_WEEKS } from '../data/defaults';

const SPRING = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 };

const RUN_TYPES = [
  { day: 'Monday', name: 'Tempo Run', desc: 'Speed intervals — builds lactate threshold', icon: <Zap size={17} />, color: '#ffb020' },
  { day: 'Thursday', name: 'Zone 2 Run', desc: 'Easy pace — builds aerobic engine', icon: <Heart size={17} />, color: '#00ccff' },
  { day: 'Saturday', name: 'Long Run', desc: 'Distance focus — builds raw endurance', icon: <Flame size={17} />, color: '#ff3b5c' },
];

export default function RunningPage() {
  const [currentWeek, setCurrentWeek]   = useLocalStorage('ha_run_week', 0);
  const [runCompleted, setRunCompleted] = useLocalStorage('ha_run_completed', () => {
    const obj = {};
    for (let i = 0; i < 8; i++) obj[i] = [false, false, false];
    return obj;
  });
  const [tenkTime, setTenkTime] = useLocalStorage('ha_10k_time', '');

  const weekData  = RUN_WEEKS[currentWeek];
  const weekRuns  = runCompleted[currentWeek] || [false, false, false];
  const doneCnt   = weekRuns.filter(Boolean).length;
  const SESSIONS  = [weekData.mon, weekData.thu, weekData.sat];
  const RUN_LABELS = ['Mon', 'Thu', 'Sat'];

  const toggleRun = (idx) => {
    setRunCompleted(prev => ({
      ...prev,
      [currentWeek]: (prev[currentWeek] || [false,false,false]).map((v,i) => i===idx ? !v : v),
    }));
  };

  const parseMins = (str) => {
    if (!str) return 0;
    const [m, s] = str.split(':');
    return parseInt(m||0) + (parseInt(s||0)/60);
  };

  const mins = parseMins(tenkTime);
  const tenkPct = mins > 0 ? Math.min(100, Math.max(0, ((90 - mins) / 30) * 100)) : 0;

  return (
    <>
      {/* Hero */}
      <div className="pt-7 pb-5 mb-1">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, ...SPRING }}
          className="font-mono text-[10px] tracking-[4px] text-cyan/60 uppercase mb-2"
        >
          8-Week Plan
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...SPRING }}
          className="font-display text-[44px] leading-none tracking-wide uppercase"
        >
          Running <span className="text-cyan">Blueprint</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-[12px] font-body text-text-muted mt-2 tracking-wide font-light"
        >
          Sub-60min 10km · 6:00/km Target Pace
        </motion.p>
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 28 }}
          style={{ originX: 0 }}
          className="h-px bg-gradient-to-r from-cyan/30 via-cyan/10 to-transparent mt-5"
        />
      </div>

      {/* Week Tracker */}
      <Section icon={<CalendarCheck size={15} />} title="This Week" accent="cyan">
        {/* Week nav */}
        <div className="flex items-center gap-3 mb-4">
          <motion.button whileTap={{ scale: 0.9 }} transition={SPRING}
            onClick={() => setCurrentWeek(w => Math.max(0, w-1))} disabled={currentWeek===0}
            className="w-8 h-8 rounded-xl bg-bg-700 border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all">
            <ChevronLeft size={15} />
          </motion.button>

          <motion.span key={currentWeek} initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            transition={SPRING} className="font-display text-xl tracking-[3px] uppercase">
            Week {currentWeek + 1}
          </motion.span>

          <motion.button whileTap={{ scale: 0.9 }} transition={SPRING}
            onClick={() => setCurrentWeek(w => Math.min(7, w+1))} disabled={currentWeek===7}
            className="w-8 h-8 rounded-xl bg-bg-700 border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all">
            <ChevronRight size={15} />
          </motion.button>

          {/* Week dots */}
          <div className="flex gap-1.5 ml-auto">
            {Array.from({length:8}, (_,i) => {
              const wDone = (runCompleted[i]||[]).every(Boolean);
              return (
                <motion.button key={i} whileTap={{ scale:0.8 }} onClick={() => setCurrentWeek(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i===currentWeek ? 'w-4 h-2 bg-cyan' : wDone ? 'w-2 h-2 bg-cyan/35' : 'w-2 h-2 bg-bg-400'
                  }`}
                  style={i===currentWeek ? { boxShadow:'0 0 8px rgba(0,204,255,0.5)' } : {}}
                />
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-baseline gap-1.5 mb-2">
          <motion.span key={doneCnt} initial={{ y:-8, opacity:0 }} animate={{ y:0, opacity:1 }}
            transition={SPRING} className="font-display text-3xl text-text-primary">
            {doneCnt}
          </motion.span>
          <span className="text-sm text-text-muted font-body">/3 runs done</span>
          <motion.button whileTap={{ scale:0.93 }} onClick={() => setRunCompleted(p => ({...p,[currentWeek]:[false,false,false]}))}
            className="ml-auto flex items-center gap-1.5 text-xs text-text-muted hover:text-red font-body transition-colors py-1 px-2.5 rounded-lg hover:bg-red/[0.06]">
            <RotateCcw size={11} /> Reset
          </motion.button>
        </div>

        <div className="h-px bg-bg-500/60 rounded-full overflow-hidden mb-4">
          <motion.div animate={{ width:`${(doneCnt/3)*100}%` }}
            transition={{ type:'spring', stiffness:150, damping:24 }}
            className="h-full bg-gradient-to-r from-cyan/60 to-mint/60" />
        </div>

        {/* Run cards */}
        <div className="grid grid-cols-3 gap-2">
          {RUN_LABELS.map((label, i) => {
            const done = weekRuns[i];
            return (
              <motion.button key={i}
                whileHover={{ y:-2 }} whileTap={{ scale:0.95, y:0 }} transition={SPRING}
                onClick={() => toggleRun(i)}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border transition-colors duration-300 ${
                  done ? 'bg-cyan/[0.07] border-cyan/20' : 'bg-bg-700 border-white/[0.04] hover:border-white/[0.08]'
                }`}
              >
                <span className={`font-mono text-[10px] tracking-widest uppercase ${done ? 'text-cyan' : 'text-text-muted'}`}>
                  {label}
                </span>
                <motion.div animate={done ? { scale:[1,1.2,1] } : { scale:1 }} transition={{ duration:0.3 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    done ? 'bg-cyan' : 'border border-bg-400'
                  }`}>
                  {done && (
                    <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                      transition={{ type:'spring', stiffness:500, damping:25 }}>
                      <Check size={15} strokeWidth={3} className="text-bg-900" />
                    </motion.div>
                  )}
                </motion.div>
                <span className={`font-mono text-[9px] text-center leading-tight tracking-wide ${
                  done ? 'text-cyan' : 'text-text-muted'
                }`}>
                  {SESSIONS[i]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </Section>

      {/* 10K Goal */}
      <Section icon={<Target size={15} />} title="10K Goal" accent="cyan">
        <div className="bg-bg-700/60 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-sm tracking-[2px] uppercase">Current 10K</span>
            <span className="font-mono text-[11px] text-text-muted">&lt; 60:00 target</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input type="text" value={tenkTime} onChange={e => setTenkTime(e.target.value)}
              placeholder="65:00"
              className="w-24 px-3 py-2 bg-bg-600 border border-white/[0.07] rounded-lg text-sm text-center text-text-primary font-mono font-bold outline-none focus:border-cyan/35 transition-colors" />
            <span className="text-xs text-text-muted font-body">min:sec</span>
            <div className="flex-1" />
            <span className={`font-mono text-xs font-bold ${mins > 0 && mins <= 60 ? 'text-cyan' : 'text-text-muted'}`}>
              {mins > 0 ? (mins <= 60 ? '🎯 Goal reached!' : `−${Math.round(mins-60)}min to go`) : ''}
            </span>
          </div>
          <ProgressBar value={tenkPct} max={100} accent="cyan" />
        </div>
      </Section>

      {/* Run Types */}
      <Section icon={<Zap size={15} />} title="Run Types" accent="cyan">
        <div className="space-y-2">
          {RUN_TYPES.map((rt, i) => (
            <motion.div key={i}
              initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i*0.07, ...SPRING }}
              className="flex items-center gap-4 bg-bg-700/60 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${rt.color}12`, color: rt.color }}>
                {rt.icon}
              </div>
              <div className="flex-1">
                <p className="font-mono text-[10px] tracking-[2px] uppercase mb-0.5" style={{ color: rt.color, opacity:0.8 }}>
                  {rt.day}
                </p>
                <p className="font-display text-[15px] tracking-wide uppercase">{rt.name}</p>
                <p className="text-[12px] font-body text-text-muted font-light mt-0.5">{rt.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 8-Week Plan */}
      <Section icon={<TableProperties size={15} />} title="8-Week Plan" accent="cyan">
        <div className="overflow-x-auto -mx-1 px-1 no-scrollbar">
          <table className="w-full border-separate" style={{ borderSpacing: '0 3px', minWidth: 420 }}>
            <thead>
              <tr>
                {['Wk', 'Mon — Tempo', 'Thu — Zone 2', 'Sat — Long'].map(h => (
                  <th key={h} className="font-mono text-[9px] tracking-[2px] uppercase text-text-muted px-3 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RUN_WEEKS.map((w, i) => {
                const isCur  = i === currentWeek;
                const isPast = i < currentWeek;
                const wDone  = (runCompleted[i]||[]).every(Boolean);
                return (
                  <motion.tr key={i}
                    whileHover={{ scale:1.005 }} whileTap={{ scale:0.998 }}
                    onClick={() => setCurrentWeek(i)}
                    className={`cursor-pointer transition-opacity duration-200 ${isPast ? 'opacity-35' : ''}`}
                  >
                    <td className={`px-3 py-2.5 rounded-l-xl font-mono text-xs font-bold tracking-wider ${
                      isCur ? 'border-l-2 border-cyan bg-cyan/[0.07] text-cyan' : 'bg-bg-700 text-text-muted'
                    }`}>
                      W{w.week}{wDone ? ' ✓' : isCur ? ' ◀' : ''}
                    </td>
                    {[w.mon, w.thu, w.sat].map((s, j) => (
                      <td key={j} className={`px-3 py-2.5 font-mono text-[11px] ${j===2?'rounded-r-xl':''} ${
                        isCur ? 'bg-cyan/[0.07] text-text-primary' : 'bg-bg-700 text-text-secondary'
                      }`}>
                        {s}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
