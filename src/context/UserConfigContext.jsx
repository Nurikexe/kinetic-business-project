import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_GYM_DAYS, DEFAULT_LIFTS, DEFAULT_GYM_GOALS, DEFAULT_GYM_RULES, RUN_WEEKS } from '../data/defaults';

const DEFAULTS = {
  gym_days:      DEFAULT_GYM_DAYS,
  gym_day_count: 5,
  completed:     Array(5).fill(false),
  lifts:         DEFAULT_LIFTS,
  gym_goals:     DEFAULT_GYM_GOALS,
  gym_rules:     DEFAULT_GYM_RULES,
  run_week:      0,
  run_completed: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, [false, false, false]])),
  run_weeks:     RUN_WEEKS,
  ten_k_time:    '',
  ten_k_target:  '60:00',
};

const UserConfigContext = createContext(null);

export function UserConfigProvider({ children }) {
  const { user } = useAuth();
  const [config, setConfig]   = useState(DEFAULTS);
  const [loaded, setLoaded]   = useState(false);
  const timerRef              = useRef(null);
  const pendingRef            = useRef(null);

  // Load on auth
  useEffect(() => {
    if (!user) {
      setConfig(DEFAULTS);
      setLoaded(false);
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
        if (data) {
          // Merge with defaults so new fields always exist
          setConfig({ ...DEFAULTS, ...data });
        }
        setLoaded(true);
      });
  }, [user?.id]);

  // Debounced upsert — 800ms after the last change
  const scheduleSave = useCallback((next) => {
    if (!user || !loaded) return;
    pendingRef.current = next;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { error } = await supabase.from('user_config').upsert(
        { ...pendingRef.current, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) console.error('Config save failed:', error.message);
    }, 800);
  }, [user, loaded]);

  const updateConfig = useCallback((updates) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  return (
    <UserConfigContext.Provider value={{ config, updateConfig, loaded }}>
      {children}
    </UserConfigContext.Provider>
  );
}

export function useUserConfig() {
  return useContext(UserConfigContext);
}
