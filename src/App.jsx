import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserConfigProvider, useUserConfig } from './context/UserConfigContext';
import { ActiveSessionProvider, useActiveSession } from './context/ActiveSessionContext';
import { useLocalStorage } from './hooks/useLocalStorage';

import LoginPage        from './pages/LoginPage';
import OnboardingPage   from './pages/OnboardingPage';
import HomePage         from './pages/HomePage';
import GymPage          from './pages/GymPage';
import RunningPage      from './pages/RunningPage';
import AnalyticsPage    from './pages/AnalyticsPage';
import CabinetPage      from './pages/CabinetPage';
import CreateWorkoutPage from './pages/CreateWorkoutPage';
import BottomNav        from './components/BottomNav';

const PAGE_SPRING = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 };

// Pages that show the bottom nav
const NAV_PAGES = ['home', 'gym', 'running', 'analytics', 'cabinet'];

function AppContent({ page, setPage }) {
  const { loaded, hasConfigRow, updateConfig } = useUserConfig();
  const { hasActive }                          = useActiveSession();
  const [onboardingDone, setOnboardingDone]    = useState(false);
  const [forceOnboarding, setForceOnboarding]  = useState(
    () => sessionStorage.getItem('ha_force_onboarding') === '1'
  );

  const onboardingPreviouslyCompleted =
    () => localStorage.getItem('ha_onboarding_done') === '1';

  const showOnboarding =
    (forceOnboarding || (loaded && !hasConfigRow && !onboardingPreviouslyCompleted())) && !onboardingDone;

  useEffect(() => {
    if (hasConfigRow) {
      localStorage.setItem('ha_onboarding_done', '1');
    }
  }, [hasConfigRow]);

  const handleOnboardingComplete = (mode, data) => {
    if (mode === 'ai' && data?.plan) {
      // Convert AI plan → user config
      const aiPlan = data.plan;
      const gymDays = (aiPlan.gymDays || []).map((d, i) => ({
        id: i + 1,
        num: `Day ${i + 1}`,
        name: d.name || `Day ${i + 1}`,
        sub: d.focus || '',
        schedule: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i] || `Day ${i+1}`,
        exercises: (d.exercises || []).map((ex, j) => ({
          id: `ai-ex-${i}-${j}`,
          name: ex.name,
          sets: ex.sets || 3,
          reps: ex.reps || '8-10',
          weight: '',
        })),
      }));

      const patch = {
        gym_days:      gymDays.length > 0 ? gymDays : undefined,
        gym_day_count: gymDays.length || 3,
        completed:     Array(gymDays.length || 3).fill(false),
      };
      Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);
      updateConfig(patch, { immediate: true });
    } else if (mode === 'scratch') {
      // Clear out everything for a pure empty state
      updateConfig({
        gym_days: [],
        gym_day_count: 0,
        completed: [],
        gym_goals: '',
        gym_rules: [],
        lifts: [],
        run_weeks: [],
        run_week: 0,
        run_completed: {},
        run_types: [],
        run_goals: [],
        run_warmup_exercises: [],
        ten_k_time: '',
        ten_k_target: ''
      }, { immediate: true });
    } else if (mode === 'community' && data?.plan) {
      // TODO: apply community plan data here
      updateConfig({}, { immediate: true });
    } else {
      // Fallback — always ensure a config row exists
      updateConfig({}, { immediate: true });
    }
    sessionStorage.removeItem('ha_force_onboarding');
    localStorage.setItem('ha_onboarding_done', '1');
    setForceOnboarding(false);
    setOnboardingDone(true);
    setPage('home');
  };

  if (showOnboarding) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  const showNav = NAV_PAGES.includes(page) && !hasActive;

  return (
    <div className="min-h-dvh bg-background">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 18, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
          transition={PAGE_SPRING}
        >
          {page === 'home'      && <HomePage     setPage={setPage} />}
          {page === 'gym'       && <GymPage      setPage={setPage} />}
          {page === 'running'   && <RunningPage  setPage={setPage} />}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'cabinet'   && <CabinetPage  setPage={setPage} />}
          {page === 'create'    && <CreateWorkoutPage setPage={setPage} />}
        </motion.div>
      </AnimatePresence>

      {showNav && <BottomNav page={page} setPage={setPage} />}
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage]   = useLocalStorage('kinetic_page', 'home');

  // Reset to home if on a non-nav page after reload
  useEffect(() => {
    if (!NAV_PAGES.includes(page)) setPage('home');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          <p className="font-headline text-[10px] tracking-[4px] text-on-surface-variant uppercase">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <UserConfigProvider>
      <ActiveSessionProvider>
        <AppContent page={page} setPage={setPage} />
      </ActiveSessionProvider>
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
