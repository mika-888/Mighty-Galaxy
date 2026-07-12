import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
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
  const { isDark, toggleTheme } = useTheme()
  const displayName = profile?.name || user?.email || 'Operator'
  const role = profile?.role || 'Team Member'

  const visibleNavItems = navItems.filter((item) => {
    const screenKey = NAV_SCREEN_KEYS[item]
    if (!screenKey) return true
    return getAccess(profile?.role, screenKey) !== 'none'
  })

  return (
    <div className="app-shell">
      <div className="flex min-h-screen">
        <aside className="app-sidebar">
          <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
            <div className="brand-mark h-9 w-9">
              TO
            </div>
            <div className="ml-3">
              <span className="block text-lg font-black tracking-tight">TransitOps</span>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Smart Transport Ops</span>
            </div>
          </div>
          <nav className="space-y-1 p-4">
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
                className={`nav-link ${
                  item === active
                    ? 'nav-link-active'
                    : 'nav-link-idle'
                }`}
              >
                {item}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="app-topbar">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="brand-mark h-9 w-9">
                  TO
                </div>
                <div>
                  <span className="block text-lg font-black tracking-tight">TransitOps</span>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Smart Transport Ops</span>
                </div>
              </div>
              <input
                type="search"
                placeholder="Search vehicles, drivers, trips..."
                className="ui-input h-10 w-full bg-slate-50/80 dark:bg-slate-950 lg:max-w-md"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="secondary-button h-10 gap-2 px-3"
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
                  <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
                </button>
                <div className="text-right">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{role}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900">
                  {initials(profile?.name, user?.email)}
                </div>
                <button
                  onClick={signOut}
                  className="secondary-button px-3 py-2"
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
