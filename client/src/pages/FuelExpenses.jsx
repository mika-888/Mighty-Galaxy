import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'

const EMPTY_FUEL_FORM = {
  vehicle_id: '',
  trip_id: '',
  liters: '',
  cost: '',
  log_date: new Date().toISOString().slice(0, 10),
}

const EMPTY_EXPENSE_FORM = {
  trip_id: '',
  vehicle_id: '',
  toll: '0',
  other: '0',
}

function currency(value) {
  const num = Number(value)
  return Number.isFinite(num) ? `$${num.toLocaleString()}` : '-'
}

function shortId(id) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : '-'
}

function tripLabel(trip) {
  if (!trip) return 'None'
  return `${shortId(trip.id)} ${trip.source || 'Unknown'} → ${trip.destination || 'Unknown'}`
}

export default function FuelExpenses() {
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [maintenanceLogs, setMaintenanceLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isFuelModalOpen, setFuelModalOpen] = useState(false)
  const [fuelForm, setFuelForm] = useState(EMPTY_FUEL_FORM)
  const [fuelFormError, setFuelFormError] = useState('')
  const [fuelSubmitting, setFuelSubmitting] = useState(false)

  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM)
  const [expenseFormError, setExpenseFormError] = useState('')
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)

  async function loadData() {
    setLoading(true)
    setError('')

    const [vehiclesResult, tripsResult, fuelResult, expensesResult, maintenanceResult] = await Promise.all([
      supabase.from('vehicles').select('id, reg_no, name, status').order('name', { ascending: true }),
      supabase.from('trips').select('id, source, destination').order('created_at', { ascending: false }),
      supabase
        .from('fuel_logs')
        .select('*, vehicles(name, reg_no)')
        .order('log_date', { ascending: false }),
      supabase
        .from('expenses')
        .select('*, vehicles(name, reg_no), trips(source, destination)')
        .order('created_at', { ascending: false }),
      supabase.from('maintenance_logs').select('vehicle_id, cost'),
    ])

    const firstError =
      vehiclesResult.error || tripsResult.error || fuelResult.error || expensesResult.error || maintenanceResult.error

    if (firstError) {
      setError(firstError.message)
    } else {
      setVehicles(vehiclesResult.data ?? [])
      setTrips(tripsResult.data ?? [])
      setFuelLogs(fuelResult.data ?? [])
      setExpenses(expensesResult.data ?? [])
      setMaintenanceLogs(maintenanceResult.data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    async function initialLoad() {
      await loadData()
    }
    initialLoad()
  }, [])

  const eligibleVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.status !== 'Retired'), [vehicles])

  const maintenanceByVehicle = useMemo(() => {
    const totals = new Map()
    for (const log of maintenanceLogs) {
      totals.set(log.vehicle_id, (totals.get(log.vehicle_id) ?? 0) + Number(log.cost || 0))
    }
    return totals
  }, [maintenanceLogs])

  const totalFuelCost = useMemo(
    () => fuelLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0),
    [fuelLogs]
  )

  const totalMaintenanceCost = useMemo(
    () => maintenanceLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0),
    [maintenanceLogs]
  )

  const totalOperationalCost = totalFuelCost + totalMaintenanceCost

  function openFuelModal() {
    setFuelForm(EMPTY_FUEL_FORM)
    setFuelFormError('')
    setFuelModalOpen(true)
  }

  function closeFuelModal() {
    setFuelModalOpen(false)
  }

  function updateFuelField(field, value) {
    setFuelForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFuelSubmit(e) {
    e.preventDefault()
    setFuelFormError('')

    if (!fuelForm.vehicle_id) {
      setFuelFormError('Select a vehicle.')
      return
    }

    setFuelSubmitting(true)

    const { error: insertError } = await supabase.from('fuel_logs').insert({
      vehicle_id: fuelForm.vehicle_id,
      trip_id: fuelForm.trip_id || null,
      liters: Number(fuelForm.liters),
      cost: Number(fuelForm.cost),
      log_date: fuelForm.log_date,
    })

    if (insertError) {
      setFuelFormError(insertError.message)
      setFuelSubmitting(false)
      return
    }

    setFuelSubmitting(false)
    setFuelModalOpen(false)
    await loadData()
  }

  function openExpenseModal() {
    setExpenseForm(EMPTY_EXPENSE_FORM)
    setExpenseFormError('')
    setExpenseModalOpen(true)
  }

  function closeExpenseModal() {
    setExpenseModalOpen(false)
  }

  function updateExpenseField(field, value) {
    setExpenseForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleExpenseSubmit(e) {
    e.preventDefault()
    setExpenseFormError('')

    if (!expenseForm.vehicle_id) {
      setExpenseFormError('Select a vehicle.')
      return
    }

    setExpenseSubmitting(true)

    const { error: insertError } = await supabase.from('expenses').insert({
      trip_id: expenseForm.trip_id || null,
      vehicle_id: expenseForm.vehicle_id,
      toll: Number(expenseForm.toll) || 0,
      other: Number(expenseForm.other) || 0,
    })

    if (insertError) {
      setExpenseFormError(insertError.message)
      setExpenseSubmitting(false)
      return
    }

    setExpenseSubmitting(false)
    setExpenseModalOpen(false)
    await loadData()
  }

  return (
    <AppLayout active="Fuel & Expenses">
      <section className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fuel &amp; Expenses</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Fuel &amp; Expense Management</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFuelModal}
              className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              + Log Fuel
            </button>
            <button
              type="button"
              onClick={openExpenseModal}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              + Add Expense
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 border-l-4 border-l-teal-500 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Operational Cost (Auto) = Fuel + Maintenance</p>
          <p className="mt-2 text-3xl font-semibold">{loading ? '--' : currency(totalOperationalCost)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Fuel: {loading ? '--' : currency(totalFuelCost)} · Maintenance: {loading ? '--' : currency(totalMaintenanceCost)}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="font-semibold">Fuel Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Liters</th>
                  <th className="px-4 py-3">Fuel Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {fuelLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-medium">{log.vehicles?.name || log.vehicles?.reg_no || '-'}</td>
                    <td className="px-4 py-3">{log.log_date || '-'}</td>
                    <td className="px-4 py-3">{log.liters ?? '-'}</td>
                    <td className="px-4 py-3">{currency(log.cost)}</td>
                  </tr>
                ))}
                {!loading && fuelLogs.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="4">
                      No fuel logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="font-semibold">Other Expenses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Toll</th>
                  <th className="px-4 py-3">Other</th>
                  <th className="px-4 py-3">Maintenance</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {expenses.map((expense) => {
                  const maintenanceTotal = maintenanceByVehicle.get(expense.vehicle_id) ?? 0
                  const total = Number(expense.toll || 0) + Number(expense.other || 0) + maintenanceTotal
                  return (
                    <tr key={expense.id}>
                      <td className="px-4 py-3">
                        {expense.trips ? `${expense.trips.source || 'Unknown'} → ${expense.trips.destination || 'Unknown'}` : 'None'}
                      </td>
                      <td className="px-4 py-3 font-medium">{expense.vehicles?.name || expense.vehicles?.reg_no || '-'}</td>
                      <td className="px-4 py-3">{currency(expense.toll)}</td>
                      <td className="px-4 py-3">{currency(expense.other)}</td>
                      <td className="px-4 py-3">{currency(maintenanceTotal)}</td>
                      <td className="px-4 py-3 font-semibold">{currency(total)}</td>
                    </tr>
                  )
                })}
                {!loading && expenses.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="6">
                      No expenses yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {isFuelModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Log Fuel</h2>
              <button
                type="button"
                onClick={closeFuelModal}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle</label>
                  <select
                    required
                    value={fuelForm.vehicle_id}
                    onChange={(e) => updateFuelField('vehicle_id', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select vehicle</option>
                    {eligibleVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name || vehicle.reg_no} ({vehicle.reg_no})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Trip (optional)</label>
                  <select
                    value={fuelForm.trip_id}
                    onChange={(e) => updateFuelField('trip_id', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">None</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {tripLabel(trip)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Liters</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={fuelForm.liters}
                    onChange={(e) => updateFuelField('liters', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={fuelForm.cost}
                    onChange={(e) => updateFuelField('cost', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    value={fuelForm.log_date}
                    onChange={(e) => updateFuelField('log_date', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {fuelFormError && <p className="text-sm text-rose-600 dark:text-rose-400">{fuelFormError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeFuelModal}
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fuelSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {fuelSubmitting ? 'Saving…' : 'Log Fuel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Expense</h2>
              <button
                type="button"
                onClick={closeExpenseModal}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Trip (optional)</label>
                  <select
                    value={expenseForm.trip_id}
                    onChange={(e) => updateExpenseField('trip_id', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">None</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {tripLabel(trip)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle</label>
                  <select
                    required
                    value={expenseForm.vehicle_id}
                    onChange={(e) => updateExpenseField('vehicle_id', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select vehicle</option>
                    {eligibleVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name || vehicle.reg_no} ({vehicle.reg_no})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Toll</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseForm.toll}
                    onChange={(e) => updateExpenseField('toll', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Other</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseForm.other}
                    onChange={(e) => updateExpenseField('other', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {expenseFormError && <p className="text-sm text-rose-600 dark:text-rose-400">{expenseFormError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeExpenseModal}
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {expenseSubmitting ? 'Saving…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
