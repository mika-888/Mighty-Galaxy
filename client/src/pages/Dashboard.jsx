import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'
import { statusClass } from '../lib/statusStyles'

const vehicleStatuses = ['Available', 'On Trip', 'In Shop', 'Retired']

function shortId(id) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : '-'
}

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accessDeniedNotice, setAccessDeniedNotice] = useState(Boolean(location.state?.accessDenied))

  useEffect(() => {
    if (location.state?.accessDenied) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

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

  return (
    <AppLayout active="Dashboard">
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

        {accessDeniedNotice && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <p>You don&apos;t have access to that section.</p>
            <button
              type="button"
              onClick={() => setAccessDeniedNotice(false)}
              className="shrink-0 text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

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
    </AppLayout>
  )
}
