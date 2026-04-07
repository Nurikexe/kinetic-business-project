import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Wind, User } from 'lucide-react';
import GymPage from './pages/GymPage';
import RunningPage from './pages/RunningPage';
import CabinetPage from './pages/CabinetPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserConfigProvider, useUserConfig } from './context/UserConfigContext';
import { useLocalStorage } from './hooks/useLocalStorage';
import OnboardingModal from './components/OnboardingModal';
import { buildOnboardingConfig } from './data/onboarding';

const BG_IMAGES = {
  gym:     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
  running: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80',
  cabinet: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
};

const SPRING      = { type: 'spring', stiffness: 380, damping: 36, mass: 0.8 };
const PAGE_SPRING = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 };

function AppContent({ page, setPage, displayName }) {
  const { loaded, hasConfigRow, updateConfig } = useUserConfig();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(() => sessionStorage.getItem('ha_force_onboarding') === '1');
  const showOnboarding = (forceOnboarding || (loaded && !hasConfigRow)) && !onboardingDismissed;

  useEffect(() => {
    if (forceOnboarding && hasConfigRow) {
      sessionStorage.removeItem('ha_force_onboarding');
      setForceOnboarding(false);
    }
  }, [forceOnboarding, hasConfigRow]);

  const applyOnboarding = (mode, answers = {}) => {
    const { config } = buildOnboardingConfig(mode, answers);
    updateConfig(config, { immediate: true });
    sessionStorage.removeItem('ha_force_onboarding');
    setForceOnboarding(false);
    setOnboardingDismissed(true);
    setPage('gym');
  };

  const accentColor = page === 'running'
    ? 'rgba(214,238,99,0.07)'
    : 'rgba(113,215,201,0.07)';

  const TABS = [
    { id: 'gym',     label: 'Gym',        icon: Dumbbell },
    { id: 'running', label: 'Run',        icon: Wind },
    { id: 'cabinet', label: displayName || 'Me', icon: User },
  ];

  return (
    <>
      <div className="min-h-dvh grain relative">
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

        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-5 h-14">
          <div className="absolute inset-0 bg-bg-900/62 backdrop-blur-2xl border-b border-white/[0.05]" />

          <div className="relative min-w-0 font-display text-[17px] sm:text-[21px] font-semibold tracking-[-0.03em]">
            <span className={`transition-colors duration-500 ${page === 'running' ? 'text-cyan' : 'text-mint'}`}>
              Hybrid
            </span>
            <span className="text-text-secondary"> Athlete</span>
          </div>

          <div className="relative ml-3 flex gap-0.5 rounded-2xl border border-white/[0.06] bg-bg-700/78 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                className={`relative flex min-w-0 items-center gap-1 px-2 py-1.5 sm:gap-1.5 sm:px-3 rounded-xl text-[13px] font-body font-semibold tracking-wide transition-colors duration-200 ${
                  page === tab.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {page === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    transition={SPRING}
                    className={`absolute inset-0 rounded-xl border shadow-[0_12px_28px_rgba(0,0,0,0.22)] ${
                      page === 'running'
                        ? 'bg-cyan/[0.12] border-cyan/20'
                        : 'bg-mint/[0.12] border-mint/18'
                    }`}
                  />
                )}
                <tab.icon size={12} className="relative z-10 flex-shrink-0 sm:size-[13px]" />
                <span className="relative z-10 max-w-[56px] truncate font-body text-[10px] tracking-[0.08em] uppercase sm:max-w-[72px] sm:text-[12px]">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <main className="relative z-10 mx-auto max-w-xl px-3 pt-14 pb-20 sm:px-4 sm:pb-16">
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

      {showOnboarding && (
        <OnboardingModal displayName={displayName} onApply={applyOnboarding} />
      )}
    </>
  );
}

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

  return (
    <UserConfigProvider>
      <AppContent page={page} setPage={setPage} displayName={displayName} />
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
