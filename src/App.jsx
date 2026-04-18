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
      const aiPlan  = data.plan;
      const answers = data.answers || {};
      const patch   = {};

      // ── Gym days ──────────────────────────────────────────
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
      if (gymDays.length > 0) {
        patch.gym_days      = gymDays;
        patch.gym_day_count = gymDays.length;
        patch.completed     = Array(gymDays.length).fill(false);
      }

      // ── Gym extras: specific goals + methodology ─────────
      if (answers.plan_type === 'gym' || answers.plan_type === 'hybrid') {
        patch.gym_goals = answers.gym_stats?.trim() || '';
        
        // Handle AI-generated performance targets (lifts)
        if (Array.isArray(aiPlan.performanceTargets) && aiPlan.performanceTargets.length > 0) {
          patch.lifts = aiPlan.performanceTargets.map((t, i) => ({
            key: `ai-lift-${i}-${Date.now()}`,
            name: t.name || 'Target',
            current: Number(t.current) || 0,
            target: Number(t.target) || 0,
            unit: t.unit || 'kg',
          }));
        } else {
          // If using AI and no targets provided, clear existing defaults
          patch.lifts = [];
        }

        if (answers.include_methodology === 'yes' || answers.plan_type === 'hybrid') {
          patch.gym_rules = Array.isArray(aiPlan.methodology) && aiPlan.methodology.length > 0
            ? aiPlan.methodology
            : [];
        } else {
          patch.gym_rules = [];
        }
      }

      // ── Running days + weeks (Running & Hybrid) ──────────
      const isRunning = answers.plan_type === 'running' || answers.plan_type === 'hybrid';
      const aiRunningDays = Array.isArray(aiPlan.runningDays) ? aiPlan.runningDays : [];

      if (aiRunningDays.length > 0) {
        const RT_COLORS = ['#ffb020', '#00ccff', '#ff3b5c', '#00e3fd', '#7c3aed', '#10b981'];
        const runTypes = aiRunningDays.map((r, i) => ({
          id: `ai-rt-${i}`,
          day: r.day || '',
          name: r.name || r.type || `Run ${i + 1}`,
          desc: r.description || r.type || '',
          color: RT_COLORS[i % RT_COLORS.length],
          icon: 'directions_run',
          iconKey: 'heart',
          presetKey: null,
        }));
        patch.run_types = runTypes;

        const defaultSessionFor = (r) => {
          const parts = [];
          if (r.distance) parts.push(r.distance);
          if (r.pace)     parts.push(`@ ${r.pace}`);
          return parts.join(' ') || (r.description || '30 min run');
        };

        const weeksCount = Math.max(1, Number(answers.weeks_count) || 8);
        const aiWeeks    = Array.isArray(aiPlan.weeks) ? aiPlan.weeks : [];

        const runWeeks = Array.from({ length: weeksCount }, (_, wi) => {
          const aiWeek = aiWeeks[wi];
          const sessions = {};
          runTypes.forEach((rt, i) => {
            const srcDay = aiRunningDays[i];
            const aiSession = aiWeek?.sessions?.[srcDay?.name] || aiWeek?.sessions?.[rt.name];
            sessions[rt.id] = aiSession || defaultSessionFor(srcDay || {});
          });
          return { week: wi + 1, sessions };
        });

        patch.run_weeks     = runWeeks;
        patch.run_week      = 0;
        patch.run_completed = {};
      } else if (isRunning) {
        // Running/hybrid chosen but AI returned nothing — clear defaults so user isn't stuck on a generic template.
        patch.run_types     = [];
        patch.run_weeks     = [];
        patch.run_week      = 0;
        patch.run_completed = {};
      }

      // ── Running extras: goals + warmup ───────────────────
      if (isRunning) {
        const goalText = answers.run_stats?.trim();
        patch.run_goals = goalText
          ? [{ id: `goal-${Date.now()}`, text: goalText }]
          : [];

        if (answers.include_warmup === 'yes') {
          patch.run_warmup_exercises = [
            { id: 'wu-def-1',  name: 'Easy Walk / Light Jog — 2 min' },
            { id: 'wu-def-2',  name: 'Ankle Circles — 10 each direction per foot' },
            { id: 'wu-def-3',  name: 'Leg Swings Front/Back — 10 each leg' },
            { id: 'wu-def-4',  name: 'Leg Swings Side-to-Side — 10 each leg' },
            { id: 'wu-def-5',  name: 'Walking Lunges — 8 each side' },
            { id: 'wu-def-6',  name: 'Glute Bridges — 15 reps' },
            { id: 'wu-def-7',  name: 'Bodyweight Squats — 15 reps' },
            { id: 'wu-def-8',  name: 'High Knees — 20 sec' },
            { id: 'wu-def-9',  name: 'Butt Kicks — 20 sec' },
            { id: 'wu-def-10', name: 'Strides — 3 × 40-60m relaxed accelerations' },
          ];
        } else {
          patch.run_warmup_exercises = [];
        }
      }

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
      const plan = data.plan;
      const pd = plan.plan_data || {};
      const isGym = plan.plan_type === 'gym';
      const isRun = plan.plan_type === 'running';
      const isHybrid = plan.plan_type === 'hybrid';
      const patch = {};

      if ((isGym || isHybrid) && pd.days) {
        const gymDays = pd.days.map((d, i) => {
          const exercises = (d.exercises || []).map((ex, j) => ({
            id: `ex-${i}-${j}-${Date.now()}`, // unique ID
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: '',
          }));
          return {
            id: i + 1,
            num: `Day ${i + 1}`,
            name: d.name,
            sub: d.focus || '',
            schedule: d.schedule || '',
            exercises
          };
        });
        patch.gym_days = gymDays;
        patch.gym_day_count = gymDays.length;
        patch.completed = Array(gymDays.length).fill(false);
        if (pd.goals) patch.gym_goals = pd.goals;
        if (pd.rules) patch.gym_rules = pd.rules;
      }

      if ((isRun || isHybrid) && pd.weeks) {
        patch.run_weeks = pd.weeks;
        patch.run_types = (pd.run_types || []).map((rt, i) => ({
          id: `rt-${i}-${Date.now()}`,
          day: rt.day || '',
          name: rt.name,
          desc: rt.desc || rt.name || '',
          iconKey: rt.iconKey || 'bolt',
          color: rt.color || '#ffb020',
        }));
        patch.run_week = 0;
        patch.run_completed = Object.fromEntries(
          Array.from({ length: pd.weeks.length }, (_, i) => [i, [false, false, false]])
        );
        if (pd.goal) {
          patch.run_goals = [{ id: `goal-${Date.now()}`, text: pd.goal }];
        }
      }

      // Hybrid specific fallback/overview
      if (isHybrid && pd.overview) {
        // We already handled gym and run components if they exist in the JSON.
        // If there's extra hybrid metadata, we could store it, but current schema 
        // focus is on gym_days and run_weeks.
      }

      updateConfig(patch, { immediate: true });
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

  const handleOnboardingCancel = () => {
    sessionStorage.removeItem('ha_force_onboarding');
    setForceOnboarding(false);
    setPage('cabinet');
  };

  if (showOnboarding) {
    return (
      <OnboardingPage
        onComplete={handleOnboardingComplete}
        onCancel={forceOnboarding ? handleOnboardingCancel : undefined}
      />
    );
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
          {page === 'cabinet'   && (
            <CabinetPage
              setPage={setPage}
              triggerOnboarding={() => {
                setOnboardingDone(false);
                setForceOnboarding(true);
              }}
            />
          )}
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
