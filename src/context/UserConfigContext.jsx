import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  DEFAULT_GYM_DAYS, DEFAULT_LIFTS,
  RUN_WEEKS, DEFAULT_RUN_TYPES,
} from '../data/defaults';

const DEFAULTS = {
  gym_days:      DEFAULT_GYM_DAYS,
  gym_day_count: 5,
  completed:     Array(5).fill(false),
  lifts:         DEFAULT_LIFTS,
  gym_goals:     '',
  gym_rules:     [],
  run_week:      0,
  run_completed: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, [false, false, false]])),
  run_weeks:     RUN_WEEKS,
  run_types:     DEFAULT_RUN_TYPES,
  active_gym_session: null,
  active_run_session: null,
  ten_k_time:    '',
  ten_k_target:  '10K|6:00',
  show_performance: true,
  show_methodology: true,
  liked_plans:   [],
  sex:           'not_specified',
  avatar_url:    null,
};

const DEFAULT_GYM_CONFIG = {
  gym_days: DEFAULTS.gym_days,
  gym_day_count: DEFAULTS.gym_day_count,
  completed: DEFAULTS.completed,
  lifts: DEFAULTS.lifts,
  gym_goals: '',
  gym_rules: [],
};

const DEFAULT_RUNNING_CONFIG = {
  run_week: DEFAULTS.run_week,
  run_completed: DEFAULTS.run_completed,
  run_weeks: DEFAULTS.run_weeks,
  run_types: DEFAULTS.run_types,
  ten_k_time: DEFAULTS.ten_k_time,
  ten_k_target: JSON.stringify([{ id: 'goal-1', distance: '10K', pace: '6:00', selected: true }]),
};

const UserConfigContext = createContext(null);

const normalizeConfig = (data = {}) => ({
  ...DEFAULTS,
  ...data,
  gym_days:    Array.isArray(data.gym_days)    ? data.gym_days    : DEFAULTS.gym_days,
  completed:   Array.isArray(data.completed)   ? data.completed   : DEFAULTS.completed,
  lifts:       Array.isArray(data.lifts)       ? data.lifts       : DEFAULTS.lifts,
  gym_rules:   Array.isArray(data.gym_rules)   ? data.gym_rules   : DEFAULTS.gym_rules,
  run_weeks:   Array.isArray(data.run_weeks)   ? data.run_weeks   : DEFAULTS.run_weeks,
  run_types:   Array.isArray(data.run_types)   ? data.run_types   : DEFAULTS.run_types,
  liked_plans: Array.isArray(data.liked_plans) ? data.liked_plans : DEFAULTS.liked_plans,
});

export function UserConfigProvider({ children }) {
  const { user } = useAuth();
  const [config, setConfig]   = useState(DEFAULTS);
  const [loaded, setLoaded]   = useState(false);
  const [hasConfigRow, setHasConfigRow] = useState(false);
  const timerRef              = useRef(null);
  const pendingRef            = useRef(null);
  const savingRef             = useRef(false);

  // Load on auth
  useEffect(() => {
    if (!user) {
      clearTimeout(timerRef.current);
      pendingRef.current = null;
      setConfig(DEFAULTS);
      setLoaded(false);
      setHasConfigRow(false);
      return;
    }

    setLoaded(false);
    supabase
      .from('user_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Failed to load config:', error.message);
        setHasConfigRow(Boolean(data));
        if (data) setConfig(normalizeConfig(data));
        setLoaded(true);
      });
  }, [user?.id]);

  const flushSave = useCallback(async () => {
    if (!user || !loaded || !pendingRef.current || savingRef.current) return;
    savingRef.current = true;
    const payload = pendingRef.current;
    pendingRef.current = null;

    // Strip client-only fields that have no column in user_config
    const { sex, avatar_url, ...dbPayload } = payload;

    const { error } = await supabase.from('user_config').upsert(
      { ...dbPayload, user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

    if (error) {
      pendingRef.current = payload;
      console.error('Config save failed:', error.message);
    } else {
      setHasConfigRow(true);
    }

    savingRef.current = false;
  }, [user, loaded]);

  // Debounced upsert — 800ms after the last change
  const scheduleSave = useCallback((next) => {
    if (!user) return;
    pendingRef.current = next;
    clearTimeout(timerRef.current);
    if (!loaded) return;
    timerRef.current = setTimeout(() => {
      flushSave();
    }, 800);
  }, [flushSave, user, loaded]);

  useEffect(() => {
    if (!loaded || !pendingRef.current) return;
    scheduleSave(pendingRef.current);
  }, [loaded, scheduleSave]);

  useEffect(() => {
    const flushNow = () => {
      clearTimeout(timerRef.current);
      flushSave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };

    window.addEventListener('pagehide', flushNow);
    window.addEventListener('beforeunload', flushNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushNow);
      window.removeEventListener('beforeunload', flushNow);
    };
  }, [flushSave]);

  const updateConfig = useCallback((updates, options = {}) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      if (options.immediate) {
        pendingRef.current = next;
        clearTimeout(timerRef.current);
        if (user && loaded && !savingRef.current) {
          void flushSave();
        }
      } else {
        scheduleSave(next);
      }
      return next;
    });
  }, [flushSave, loaded, scheduleSave, user]);

  const resetConfigSlice = useCallback((sliceDefaults) => {
    setConfig(prev => {
      const next = normalizeConfig({ ...prev, ...sliceDefaults });
      pendingRef.current = next;
      clearTimeout(timerRef.current);
      if (user && loaded) {
        void flushSave();
      }
      return next;
    });
  }, [flushSave, loaded, user]);

  const resetGymConfig = useCallback(() => {
    resetConfigSlice(DEFAULT_GYM_CONFIG);
  }, [resetConfigSlice]);

  const resetRunningConfig = useCallback(() => {
    resetConfigSlice(DEFAULT_RUNNING_CONFIG);
  }, [resetConfigSlice]);

  return (
    <UserConfigContext.Provider value={{ config, updateConfig, loaded, hasConfigRow, resetGymConfig, resetRunningConfig }}>
      {children}
    </UserConfigContext.Provider>
  );
}

export function useUserConfig() {
  return useContext(UserConfigContext);
}
