import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Wind, User } from 'lucide-react';
import GymPage from './pages/GymPage';
import RunningPage from './pages/RunningPage';
import CabinetPage from './pages/CabinetPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserConfigProvider } from './context/UserConfigContext';
import { useLocalStorage } from './hooks/useLocalStorage';

const BG_IMAGES = {
  gym:     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
  running: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80',
  cabinet: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
};

const SPRING      = { type: 'spring', stiffness: 380, damping: 36, mass: 0.8 };
const PAGE_SPRING = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 };

function AppShell() {
  const { user, displayName, loading } = useAuth();
  const [page, setPage] = useLocalStorage('ha_page', 'gym');

  // Still resolving session from Supabase
  if (loading) {
    return (
      <div className="min-h-dvh grain bg-bg-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-mint/30 border-t-mint animate-spin" />
          <p className="font-mono text-[10px] tracking-[3px] text-text-muted uppercase">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const accentColor = page === 'running'
    ? 'rgba(0,204,255,0.04)'
    : 'rgba(0,255,170,0.04)';

  const TABS = [
    { id: 'gym',     label: 'Gym',        icon: Dumbbell },
    { id: 'running', label: 'Run',        icon: Wind },
    { id: 'cabinet', label: displayName || 'Me', icon: User },
  ];

  return (
    <UserConfigProvider>
      <div className="min-h-dvh grain relative">

        {/* ── BACKGROUND ── */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <AnimatePresence mode="sync">
            <motion.div
              key={page === 'cabinet' ? 'gym' : page}
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
          <div className="absolute inset-0 bg-bg-900/[0.91]" />
          <div
            className="absolute inset-0 transition-colors duration-700"
            style={{
              background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accentColor} 0%, transparent 70%)`,
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg-900 to-transparent" />
        </div>

        {/* ── NAV ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-14">
          <div className="absolute inset-0 bg-bg-900/60 backdrop-blur-2xl border-b border-white/[0.05]" />

          <div className="relative font-display text-xl tracking-[4px] uppercase">
            <span className={`transition-colors duration-500 ${page === 'running' ? 'text-cyan' : 'text-mint'}`}>
              Hybrid
            </span>
            <span className="text-text-muted"> Athlete</span>
          </div>

          <div className="relative flex gap-0.5 bg-bg-700/70 rounded-xl p-1 border border-white/[0.05]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-body font-semibold tracking-wide transition-colors duration-200 ${
                  page === tab.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {page === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    transition={SPRING}
                    className={`absolute inset-0 rounded-lg border ${
                      page === 'running'
                        ? 'bg-cyan/[0.08] border-cyan/20'
                        : 'bg-mint/[0.08] border-mint/20'
                    }`}
                  />
                )}
                <tab.icon size={13} className="relative z-10 flex-shrink-0" />
                <span className="relative z-10 font-display tracking-[1.5px] text-[12px] max-w-[72px] truncate">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* ── CONTENT ── */}
        <main className="relative z-10 pt-14 pb-16 px-4 max-w-xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
              transition={PAGE_SPRING}
            >
              {page === 'gym'     && <GymPage />}
              {page === 'running' && <RunningPage />}
              {page === 'cabinet' && <CabinetPage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </UserConfigProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
