import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

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
  const { user, profile } = useAuth()
  const displayName = profile?.name || user?.email || 'Operator'
  const role = profile?.role || 'Team Member'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
              TO
            </div>
            <span className="ml-3 text-lg font-semibold">TransitOps</span>
          </div>
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item}
                to={item === 'Dashboard' ? '/' : `/${item.toLowerCase().replaceAll(' ', '-').replace('&', 'and')}`}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  item === active
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {item}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
                  TO
                </div>
                <span className="text-lg font-semibold">TransitOps</span>
              </div>
              <input
                type="search"
                placeholder="Search vehicles, drivers, trips..."
                className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-500 lg:max-w-md"
              />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{role}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {initials(profile?.name, user?.email)}
                </div>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  )
}
