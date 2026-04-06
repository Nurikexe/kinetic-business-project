import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Wind } from 'lucide-react';
import GymPage from './pages/GymPage';
import RunningPage from './pages/RunningPage';
import { useLocalStorage } from './hooks/useLocalStorage';

const BG_IMAGES = {
  gym: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
  running: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80',
};

const SPRING = { type: 'spring', stiffness: 380, damping: 36, mass: 0.8 };
const PAGE_SPRING = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 };

export default function App() {
  const [page, setPage] = useLocalStorage('ha_page', 'gym');
  const isGym = page === 'gym';

  return (
    <div className="min-h-dvh grain relative">

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={page}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${BG_IMAGES[page]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          />
        </AnimatePresence>
        {/* Darkening overlay — 91% so photo is just barely felt */}
        <div className="absolute inset-0 bg-bg-900/[0.91]" />
        <div className={`absolute inset-0 transition-colors duration-700 ${
          isGym
            ? 'bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,255,170,0.04)_0%,transparent_70%)]'
            : 'bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,204,255,0.04)_0%,transparent_70%)]'
        }`} />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg-900 to-transparent" />
      </div>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-14">
        {/* Glass pill */}
        <div className="absolute inset-0 bg-bg-900/60 backdrop-blur-2xl border-b border-white/[0.05]" />

        <div className="relative font-display text-xl tracking-[4px] uppercase">
          <span className={`transition-colors duration-500 ${isGym ? 'text-mint' : 'text-cyan'}`}>
            Hybrid
          </span>
          <span className="text-text-muted"> Athlete</span>
        </div>

        <div className="relative flex gap-0.5 bg-bg-700/70 rounded-xl p-1 border border-white/[0.05]">
          {[
            { id: 'gym', label: 'Gym', icon: Dumbbell },
            { id: 'running', label: 'Run', icon: Wind },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-body font-semibold tracking-wide transition-colors duration-200 ${
                page === tab.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {page === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  transition={SPRING}
                  className={`absolute inset-0 rounded-lg border ${
                    isGym
                      ? 'bg-mint/[0.08] border-mint/20'
                      : 'bg-cyan/[0.08] border-cyan/20'
                  }`}
                />
              )}
              <tab.icon size={14} className="relative z-10" />
              <span className="relative z-10 font-display tracking-[2px] text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <main className="relative z-10 pt-14 pb-16 px-4 max-w-xl mx-auto">
        <AnimatePresence mode="wait" initial={false}>
          {isGym ? (
            <motion.div
              key="gym"
              initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
              transition={PAGE_SPRING}
            >
              <GymPage />
            </motion.div>
          ) : (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
              transition={PAGE_SPRING}
            >
              <RunningPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
