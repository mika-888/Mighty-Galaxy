import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getAccess } from '../lib/permissions'

const navItems = [
  'Dashboard',
  'Fleet',
  'Drivers',
  'Trips',
  'Maintenance',
  'Fuel & Expenses',
  'Analytics',
  'Settings',
]

const NAV_SCREEN_KEYS = {
  Fleet: 'fleet',
  Drivers: 'drivers',
  Trips: 'trips',
  'Fuel & Expenses': 'fuel-expenses',
  Analytics: 'analytics',
}

function initials(name, email) {
  const source = name || email || 'User'
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function AppLayout({ active, children }) {
  const { user, profile, signOut } = useAuth()
  const displayName = profile?.name || user?.email || 'Operator'
  const role = profile?.role || 'Team Member'

  const visibleNavItems = navItems.filter((item) => {
    const screenKey = NAV_SCREEN_KEYS[item]
    if (!screenKey) return true
    return getAccess(profile?.role, screenKey) !== 'none'
  })

  return (
    <div className="min-h-screen bg-[#05060a] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-slate-800/80 bg-[#0a0c12] lg:block">
          <div className="flex h-16 items-center border-b border-slate-800/80 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500 text-sm font-bold text-white">
              TO
            </div>
            <span className="ml-3 text-base font-semibold tracking-tight">TransitOps</span>
          </div>
          <nav className="space-y-1 p-3">
            {visibleNavItems.map((item) => (
              <Link
                key={item}
                to={
                  item === 'Dashboard'
                    ? '/'
                    : item === 'Fuel & Expenses'
                      ? '/fuel-expenses'
                      : `/${item.toLowerCase().replaceAll(' ', '-').replace('&', 'and')}`
                }
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  item === active
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                }`}
              >
                {item}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-[#0a0c12]/95 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500 text-sm font-bold text-white">
                  TO
                </div>
                <span className="text-base font-semibold tracking-tight">TransitOps</span>
              </div>
              <input
                type="search"
                placeholder="Search..."
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-500 lg:max-w-md"
              />
              <div className="flex items-center gap-3">
                <span className="hidden text-sm font-medium text-slate-300 sm:inline">{displayName}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                  {role}
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5">{initials(profile?.name, user?.email)}</span>
                </span>
                <button
                  onClick={signOut}
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  )
}
