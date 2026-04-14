export const NAV_TABS = [
  { id: 'home',      label: 'Home',      icon: 'home' },
  { id: 'gym',       label: 'Gym',       icon: 'fitness_center' },
  { id: 'running',   label: 'Run',       icon: 'directions_run' },
  { id: 'analytics', label: 'Analytics', icon: 'monitoring' },
  { id: 'cabinet',   label: 'Profile',   icon: 'person' },
];

export default function BottomNav({ page, setPage }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl flex justify-around items-center px-4 pt-3 pb-8 bg-surface-container-low/90 backdrop-blur-xl z-50 rounded-t-[2.5rem] shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
      {NAV_TABS.map(tab => {
        const active = page === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setPage(tab.id)}
            className={`flex flex-col items-center justify-center px-4 py-2 transition-all duration-200 active:scale-90 ${
              active
                ? 'bg-primary-container text-on-primary-fixed rounded-full px-6'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined mb-1"
              style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
