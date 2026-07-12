import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getAccess } from '../lib/permissions'
import { supabase } from '../lib/supabase'

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
  const navigate = useNavigate()
  const displayName = profile?.name || user?.email || 'Operator'
  const role = profile?.role || 'Team Member'

  const visibleNavItems = navItems.filter((item) => {
    const screenKey = NAV_SCREEN_KEYS[item]
    if (!screenKey) return true
    return getAccess(profile?.role, screenKey) !== 'none'
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState({ vehicles: [], drivers: [], trips: [] })
  const [searchOpen, setSearchOpen] = useState(false)
  const searchBoxRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const term = searchTerm.trim()
    if (term.length < 2) {
      setSearchResults({ vehicles: [], drivers: [], trips: [] })
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      const [vehiclesResult, driversResult, tripsResult] = await Promise.all([
        supabase.from('vehicles').select('id, reg_no, name').or(`reg_no.ilike.%${term}%,name.ilike.%${term}%`).limit(5),
        supabase.from('drivers').select('id, name, license_no').ilike('name', `%${term}%`).limit(5),
        supabase.from('trips').select('id, source, destination').or(`source.ilike.%${term}%,destination.ilike.%${term}%`).limit(5),
      ])

      if (cancelled) return

      const firstError = vehiclesResult.error || driversResult.error || tripsResult.error
      if (firstError) {
        console.error('Search failed:', firstError)
      }

      setSearchResults({
        vehicles: vehiclesResult.data ?? [],
        drivers: driversResult.data ?? [],
        trips: tripsResult.data ?? [],
      })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [searchTerm])

  const hasResults =
    searchResults.vehicles.length > 0 || searchResults.drivers.length > 0 || searchResults.trips.length > 0

  function goTo(path) {
    setSearchOpen(false)
    setSearchTerm('')
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block print:hidden">
          <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
              TO
            </div>
            <span className="ml-3 text-lg font-semibold">TransitOps</span>
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
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 print:hidden">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
                  TO
                </div>
                <span className="text-lg font-semibold">TransitOps</span>
              </div>
              <div ref={searchBoxRef} className="relative w-full lg:max-w-md">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setSearchOpen(true)
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search vehicles, drivers, trips..."
                  className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:bg-slate-950"
                />
                {searchOpen && searchTerm.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {!hasResults && (
                      <p className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">No matches found</p>
                    )}
                    {searchResults.vehicles.length > 0 && (
                      <div className="border-b border-slate-100 dark:border-slate-800">
                        <p className="px-3 pt-2 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Vehicles</p>
                        {searchResults.vehicles.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => goTo('/fleet')}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {v.name || v.reg_no} <span className="text-slate-400">({v.reg_no})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.drivers.length > 0 && (
                      <div className="border-b border-slate-100 dark:border-slate-800">
                        <p className="px-3 pt-2 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Drivers</p>
                        {searchResults.drivers.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => goTo('/drivers')}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {d.name} <span className="text-slate-400">({d.license_no})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.trips.length > 0 && (
                      <div>
                        <p className="px-3 pt-2 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Trips</p>
                        {searchResults.trips.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => goTo('/trips')}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {t.source} → {t.destination}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{role}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {initials(profile?.name, user?.email)}
                </div>
                <button
                  onClick={signOut}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
