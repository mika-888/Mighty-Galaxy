import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
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

const vehicleStatuses = ['Available', 'On Trip', 'In Shop', 'Retired']

function initials(name, email) {
  const source = name || email || 'User'
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function shortId(id) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : '-'
}

function statusClass(status) {
  const classes = {
    Available: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    'On Trip': 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
    'In Shop': 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    Retired: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    Draft: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    Dispatched: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
    Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    Cancelled: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
  }

  return classes[status] || classes.Draft
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      const [vehiclesResult, driversResult, tripsResult] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('drivers').select('*'),
        supabase
          .from('trips')
          .select('id, status, eta, created_at, vehicles(name, reg_no), drivers(name)')
          .order('created_at', { ascending: false }),
      ])

      const firstError = vehiclesResult.error || driversResult.error || tripsResult.error
      if (firstError) {
        setError(firstError.message)
      } else {
        setVehicles(vehiclesResult.data ?? [])
        setDrivers(driversResult.data ?? [])
        setTrips(tripsResult.data ?? [])
      }

      setLoading(false)
    }

    loadDashboard()
  }, [])

  const metrics = useMemo(() => {
    const totalActiveVehicles = vehicles.filter((vehicle) => vehicle.status !== 'Retired').length
    const onTripVehicles = vehicles.filter((vehicle) => vehicle.status === 'On Trip').length
    const utilization = totalActiveVehicles
      ? Math.round((onTripVehicles / totalActiveVehicles) * 100)
      : 0

    return [
      { label: 'Active Vehicles', value: totalActiveVehicles, tone: 'border-l-sky-500' },
      { label: 'Available Vehicles', value: vehicles.filter((vehicle) => vehicle.status === 'Available').length, tone: 'border-l-emerald-500' },
      { label: 'Vehicles In Maintenance', value: vehicles.filter((vehicle) => vehicle.status === 'In Shop').length, tone: 'border-l-amber-500' },
      { label: 'Active Trips', value: trips.filter((trip) => trip.status === 'Dispatched').length, tone: 'border-l-blue-500' },
      { label: 'Pending Trips', value: trips.filter((trip) => trip.status === 'Draft').length, tone: 'border-l-slate-500' },
      { label: 'Drivers On Duty', value: drivers.filter((driver) => ['On Trip', 'Available'].includes(driver.status)).length, tone: 'border-l-teal-500' },
      { label: 'Fleet Utilization', value: `${utilization}%`, tone: 'border-l-violet-500' },
    ]
  }, [drivers, trips, vehicles])

  const statusCounts = useMemo(() => {
    return vehicleStatuses.map((status) => ({
      status,
      count: vehicles.filter((vehicle) => vehicle.status === status).length,
    }))
  }, [vehicles])

  const maxStatusCount = Math.max(...statusCounts.map((item) => item.count), 1)
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
                  item === 'Dashboard'
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

          <section className="space-y-6 p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Operations Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">Fleet command overview</h1>
            </div>

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
              {['Vehicle Type', 'Status', 'Region'].map((label) => (
                <label key={label} className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {label}
                  <select className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium normal-case text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    <option>All</option>
                  </select>
                </label>
              ))}
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-lg border border-slate-200 border-l-4 ${metric.tone} bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900`}
                >
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold">{loading ? '--' : metric.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h2 className="font-semibold">Recent Trips</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Trip ID</th>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Driver</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">ETA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {trips.slice(0, 6).map((trip) => (
                        <tr key={trip.id}>
                          <td className="px-4 py-3 font-medium">{shortId(trip.id)}</td>
                          <td className="px-4 py-3">{trip.vehicles?.name || trip.vehicles?.reg_no || '-'}</td>
                          <td className="px-4 py-3">{trip.drivers?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusClass(trip.status)}`}>
                              {trip.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{trip.eta || '-'}</td>
                        </tr>
                      ))}
                      {!loading && trips.length === 0 && (
                        <tr>
                          <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="5">
                            No trips yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-semibold">Vehicle Status</h2>
                <div className="mt-4 space-y-4">
                  {statusCounts.map((item) => (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{item.status}</span>
                        <span className="text-slate-500 dark:text-slate-400">{loading ? '--' : item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{ width: `${(item.count / maxStatusCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
