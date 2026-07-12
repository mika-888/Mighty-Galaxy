import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../components/AppLayout'
import { currency } from '../lib/currency'
import { supabase } from '../lib/supabase'

function monthKey(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function downloadCsv(filename, rows) {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const escape = (value) => {
    const str = String(value ?? '')
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Analytics() {
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [maintenanceLogs, setMaintenanceLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      const [vehiclesResult, tripsResult, fuelResult, maintenanceResult] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('trips').select('*'),
        supabase.from('fuel_logs').select('*'),
        supabase.from('maintenance_logs').select('*'),
      ])

      const firstError =
        vehiclesResult.error || tripsResult.error || fuelResult.error || maintenanceResult.error

      if (firstError) {
        setError(firstError.message)
      } else {
        setVehicles(vehiclesResult.data ?? [])
        setTrips(tripsResult.data ?? [])
        setFuelLogs(fuelResult.data ?? [])
        setMaintenanceLogs(maintenanceResult.data ?? [])
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const fuelEfficiency = useMemo(() => {
    const completedTrips = trips.filter((trip) => trip.status === 'Completed')
    const totalDistance = completedTrips.reduce((sum, trip) => sum + Number(trip.planned_distance || 0), 0)
    const totalLiters = fuelLogs.reduce((sum, log) => sum + Number(log.liters || 0), 0)
    if (!totalLiters) return 0
    return totalDistance / totalLiters
  }, [trips, fuelLogs])

  const fleetUtilization = useMemo(() => {
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== 'Retired')
    if (!activeVehicles.length) return 0
    const onTrip = activeVehicles.filter((vehicle) => vehicle.status === 'On Trip').length
    return (onTrip / activeVehicles.length) * 100
  }, [vehicles])

  const totalFuelCost = useMemo(() => fuelLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0), [fuelLogs])
  const totalMaintenanceCost = useMemo(
    () => maintenanceLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0),
    [maintenanceLogs]
  )
  const operationalCost = totalFuelCost + totalMaintenanceCost

  const fuelCostByVehicle = useMemo(() => {
    const totals = new Map()
    for (const log of fuelLogs) {
      totals.set(log.vehicle_id, (totals.get(log.vehicle_id) ?? 0) + Number(log.cost || 0))
    }
    return totals
  }, [fuelLogs])

  const maintenanceCostByVehicle = useMemo(() => {
    const totals = new Map()
    for (const log of maintenanceLogs) {
      totals.set(log.vehicle_id, (totals.get(log.vehicle_id) ?? 0) + Number(log.cost || 0))
    }
    return totals
  }, [maintenanceLogs])

  const revenueByVehicle = useMemo(() => {
    const totals = new Map()
    for (const trip of trips) {
      totals.set(trip.vehicle_id, (totals.get(trip.vehicle_id) ?? 0) + Number(trip.revenue || 0))
    }
    return totals
  }, [trips])

  const vehicleCostRanking = useMemo(() => {
    return vehicles
      .map((vehicle) => {
        const fuelCost = fuelCostByVehicle.get(vehicle.id) ?? 0
        const maintenanceCost = maintenanceCostByVehicle.get(vehicle.id) ?? 0
        const revenue = revenueByVehicle.get(vehicle.id) ?? 0
        const totalCost = fuelCost + maintenanceCost
        const acquisitionCost = Number(vehicle.acquisition_cost || 0)
        const roi = acquisitionCost ? (revenue - totalCost) / acquisitionCost : 0

        return {
          id: vehicle.id,
          name: vehicle.name || vehicle.reg_no,
          reg_no: vehicle.reg_no,
          fuelCost,
          maintenanceCost,
          totalCost,
          revenue,
          roi,
        }
      })
      .sort((a, b) => b.totalCost - a.totalCost)
  }, [vehicles, fuelCostByVehicle, maintenanceCostByVehicle, revenueByVehicle])

  const topCostliestVehicles = vehicleCostRanking.slice(0, 5)
  const maxCost = Math.max(...topCostliestVehicles.map((v) => v.totalCost), 1)

  const monthlyRevenue = useMemo(() => {
    const totals = new Map()
    for (const trip of trips) {
      const key = monthKey(trip.created_at)
      if (!key) continue
      totals.set(key, (totals.get(key) ?? 0) + Number(trip.revenue || 0))
    }
    return Array.from(totals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, revenue]) => ({ month: monthLabel(key), revenue }))
  }, [trips])

  function handleExportCsv() {
    downloadCsv(
      'top-costliest-vehicles.csv',
      vehicleCostRanking.map((v) => ({
        Vehicle: v.name,
        'Reg No': v.reg_no,
        'Fuel Cost': v.fuelCost,
        'Maintenance Cost': v.maintenanceCost,
        'Total Cost': v.totalCost,
        Revenue: v.revenue,
        ROI: v.roi.toFixed(2),
      }))
    )
  }

  return (
    <AppLayout active="Analytics">
      <section className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Analytics</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Reports &amp; Analytics</h1>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Export PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-800 border-l-4 border-l-sky-500 bg-[#0e1017] p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Fuel Efficiency</p>
            <p className="mt-3 text-3xl font-semibold">{loading ? '--' : `${fuelEfficiency.toFixed(2)} km/l`}</p>
          </div>
          <div className="rounded-lg border border-slate-800 border-l-4 border-l-emerald-500 bg-[#0e1017] p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Fleet Utilization</p>
            <p className="mt-3 text-3xl font-semibold">{loading ? '--' : `${fleetUtilization.toFixed(0)}%`}</p>
          </div>
          <div className="rounded-lg border border-slate-800 border-l-4 border-l-orange-500 bg-[#0e1017] p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Operational Cost</p>
            <p className="mt-3 text-3xl font-semibold">{loading ? '--' : currency(operationalCost)}</p>
          </div>
          <div className="rounded-lg border border-slate-800 border-l-4 border-l-violet-500 bg-[#0e1017] p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Vehicle ROI</p>
            <p className="mt-2 text-xs text-slate-400">
              ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Revenue is 0 until entered per trip — see per-vehicle table below.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-[#0e1017] shadow-sm">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="font-semibold">Monthly Revenue</h2>
            </div>
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#334155" />
                  <Tooltip
                    formatter={(value) => currency(value)}
                    contentStyle={{ background: '#0e1017', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9' }}
                  />
                  <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0e1017] p-4 shadow-sm">
            <h2 className="font-semibold">Top Costliest Vehicles</h2>
            <div className="mt-4 space-y-4">
              {topCostliestVehicles.map((vehicle) => (
                <div key={vehicle.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{vehicle.name}</span>
                    <span className="text-slate-400">{currency(vehicle.totalCost)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${(vehicle.totalCost / maxCost) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {!loading && topCostliestVehicles.length === 0 && (
                <p className="text-sm text-slate-400">No vehicle cost data yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0e1017] shadow-sm">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="font-semibold">Vehicle Cost Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Fuel Cost</th>
                  <th className="px-4 py-3">Maintenance Cost</th>
                  <th className="px-4 py-3">Total Cost</th>
                  <th className="px-4 py-3">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {topCostliestVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="px-4 py-3 font-medium">{vehicle.name}</td>
                    <td className="px-4 py-3">{currency(vehicle.fuelCost)}</td>
                    <td className="px-4 py-3">{currency(vehicle.maintenanceCost)}</td>
                    <td className="px-4 py-3 font-semibold">{currency(vehicle.totalCost)}</td>
                    <td className="px-4 py-3">{vehicle.roi.toFixed(2)}</td>
                  </tr>
                ))}
                {!loading && topCostliestVehicles.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400" colSpan="5">
                      No vehicle cost data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
