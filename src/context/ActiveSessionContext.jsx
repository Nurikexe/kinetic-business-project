import { createContext, useContext } from 'react';
import { useUserConfig } from './UserConfigContext';

const ActiveSessionContext = createContext(null);

export function ActiveSessionProvider({ children }) {
  const { config, updateConfig } = useUserConfig();

  const gymSession = config.active_gym_session;
  const setGymSession = (val) => {
    const next = typeof val === 'function' ? val(gymSession) : val;
    updateConfig({ active_gym_session: next });
  };

  const runSession = config.active_run_session;
  const setRunSession = (val) => {
    const next = typeof val === 'function' ? val(runSession) : val;
    updateConfig({ active_run_session: next });
  };

  const hasActive = Boolean(gymSession || runSession);

  return (
    <ActiveSessionContext.Provider value={{
      gymSession, setGymSession,
      runSession, setRunSession,
      hasActive,
    }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext);
}
