import { useAuth } from '../context/AuthContext'

const NAV = [
  { id: 'requests', label: 'Requests',  icon: 'inbox' },
  { id: 'chat',     label: 'Messages',  icon: 'chat_bubble' },
]

export default function Sidebar({ page, setPage, coach }) {
  const { logout } = useAuth()

  return (
    <aside className="w-64 bg-surface-container-low border-r border-outline/10 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-outline/10">
        <p className="font-headline text-xs tracking-[4px] text-primary-container uppercase font-bold">Kinetic</p>
        <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mt-0.5">Coach Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-label text-sm font-medium text-left ${
                active
                  ? 'bg-primary-container text-on-primary-fixed'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Coach profile */}
      <div className="px-4 py-4 border-t border-outline/10">
        <div className="flex items-center gap-3">
          {coach.avatar_url ? (
            <img src={coach.avatar_url} alt={coach.display_name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-headline text-sm font-bold text-on-surface truncate">{coach.display_name}</p>
            <p className="font-label text-[10px] text-on-surface-variant">
              ${Number(coach.price_per_month).toFixed(0)}/mo
            </p>
          </div>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
            title="Sign out"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
