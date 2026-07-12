import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'
import { statusClass } from '../lib/statusStyles'

const EMPTY_FORM = {
  source: '',
  destination: '',
  vehicle_id: '',
  driver_id: '',
  cargo_weight: '',
  planned_distance: '',
}

const EMPTY_COMPLETE_FORM = {
  odometer_end: '',
  fuel_consumed: '',
}

const STATUS_ORDER = ['Draft', 'Dispatched', 'Completed', 'Cancelled']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function shortId(id) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : '-'
}

function capacityBlockMessage(trip) {
  const cargo = Number(trip.cargo_weight)
  const capacity = Number(trip.vehicles?.max_capacity)
  if (!Number.isFinite(cargo) || !Number.isFinite(capacity) || cargo <= capacity) return ''
  return `❌ Capacity exceeded by ${cargo - capacity} kg — dispatch blocked`
}

export default function TripDispatcher() {
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [completingTrip, setCompletingTrip] = useState(null)
  const [completeForm, setCompleteForm] = useState(EMPTY_COMPLETE_FORM)
  const [completeError, setCompleteError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')

  async function loadBoard() {
    setLoading(true)
    setError('')

    const [tripsResult, vehiclesResult, driversResult] = await Promise.all([
      supabase
        .from('trips')
        .select('*, vehicles(id, name, reg_no, max_capacity), drivers(id, name)')
        .order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').order('name', { ascending: true }),
      supabase.from('drivers').select('*').order('name', { ascending: true }),
    ])

    const firstError = tripsResult.error || vehiclesResult.error || driversResult.error
    if (firstError) {
      setError(firstError.message)
    } else {
      setTrips(tripsResult.data ?? [])
      setVehicles(vehiclesResult.data ?? [])
      setDrivers(driversResult.data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    async function initialLoad() {
      await loadBoard()
    }
    initialLoad()
  }, [])

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === 'Available'),
    [vehicles]
  )

  const availableDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === 'Available' && driver.license_expiry >= todayIso()),
    [drivers]
  )

  const groupedTrips = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      trips: trips.filter((trip) => trip.status === status),
    }))
  }, [trips])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreateTrip(e) {
    e.preventDefault()
    setFormError('')
    setActionMessage('')
    setSubmitting(true)

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicle_id)
    const cargoWeight = Number(form.cargo_weight)
    const maxCapacity = Number(selectedVehicle?.max_capacity)

    if (selectedVehicle && cargoWeight > maxCapacity) {
      setFormError(`❌ Capacity exceeded by ${cargoWeight - maxCapacity} kg — dispatch blocked`)
      setSubmitting(false)
      return
    }

    const payload = {
      source: form.source.trim(),
      destination: form.destination.trim(),
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      cargo_weight: cargoWeight,
      planned_distance: Number(form.planned_distance),
      status: 'Draft',
    }

    const { error: createError } = await supabase.from('trips').insert(payload)

    if (createError) {
      setFormError(createError.message)
      setSubmitting(false)
      return
    }

    setForm(EMPTY_FORM)
    setSubmitting(false)
    setActionMessage('Trip created as Draft.')
    await loadBoard()
  }

  async function updateSequence(label, trip, updates) {
    setActionLoadingId(`${label}-${trip.id}`)
    setError('')
    setActionMessage('')

    for (const update of updates) {
      const { error: updateError } = await update()
      if (updateError) {
        setError(updateError.message)
        setActionLoadingId('')
        await loadBoard()
        return false
      }
    }

    setActionLoadingId('')
    await loadBoard()
    return true
  }

  async function dispatchTrip(trip) {
    const blockMessage = capacityBlockMessage(trip)
    if (blockMessage) {
      setActionMessage(blockMessage)
      return
    }

    const ok = await updateSequence('dispatch', trip, [
      () => supabase.from('trips').update({ status: 'Dispatched' }).eq('id', trip.id),
      () => supabase.from('vehicles').update({ status: 'On Trip' }).eq('id', trip.vehicle_id),
      () => supabase.from('drivers').update({ status: 'On Trip' }).eq('id', trip.driver_id),
    ])

    if (ok) setActionMessage(`${shortId(trip.id)} dispatched.`)
  }

  async function cancelTrip(trip) {
    const ok = await updateSequence('cancel', trip, [
      () => supabase.from('trips').update({ status: 'Cancelled' }).eq('id', trip.id),
      () => supabase.from('vehicles').update({ status: 'Available' }).eq('id', trip.vehicle_id),
      () => supabase.from('drivers').update({ status: 'Available' }).eq('id', trip.driver_id),
    ])

    if (ok) setActionMessage(`${shortId(trip.id)} cancelled.`)
  }

  function openCompleteModal(trip) {
    setCompletingTrip(trip)
    setCompleteForm(EMPTY_COMPLETE_FORM)
    setCompleteError('')
  }

  function closeCompleteModal() {
    setCompletingTrip(null)
  }

  async function handleCompleteTrip(e) {
    e.preventDefault()
    setCompleteError('')

    const odometerEnd = Number(completeForm.odometer_end)
    const fuelConsumed = Number(completeForm.fuel_consumed)

    if (!Number.isFinite(odometerEnd) || !Number.isFinite(fuelConsumed)) {
      setCompleteError('Enter valid odometer and fuel values.')
      return
    }

    const trip = completingTrip
    const ok = await updateSequence('complete', trip, [
      () =>
        supabase.from('fuel_logs').insert({
          vehicle_id: trip.vehicle_id,
          trip_id: trip.id,
          liters: fuelConsumed,
          cost: 0,
          log_date: todayIso(),
        }),
      () =>
        supabase
          .from('trips')
          .update({ status: 'Completed', odometer_end: odometerEnd, fuel_consumed: fuelConsumed })
          .eq('id', trip.id),
      () => supabase.from('vehicles').update({ status: 'Available', odometer: odometerEnd }).eq('id', trip.vehicle_id),
      () => supabase.from('drivers').update({ status: 'Available' }).eq('id', trip.driver_id),
    ])

    if (ok) {
      setActionMessage(`${shortId(trip.id)} completed.`)
      closeCompleteModal()
    }
  }

  return (
    <AppLayout active="Trips">
      <section className="space-y-6 p-4 sm:p-6">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Trips</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Trip Dispatcher</h1>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
            {actionMessage}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Live Board</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Drafts, active dispatches, and recent outcomes.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {loading ? '--' : `${trips.length} trips`}
                </span>
              </div>
            </div>

            {groupedTrips.map((group) => (
              <div key={group.status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusClass(group.status)}`}>
                    {group.status}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{group.trips.length}</span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {group.trips.map((trip) => {
                    const blockMessage = capacityBlockMessage(trip)
                    const dispatchDisabled = Boolean(blockMessage)
                    const actionBusy = actionLoadingId.endsWith(trip.id)

                    return (
                      <article
                        key={trip.id}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{shortId(trip.id)}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {trip.source || 'Unknown'} → {trip.destination || 'Unknown'}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusClass(trip.status)}`}>
                            {trip.status}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Vehicle</p>
                            <p className="mt-1 font-medium">{trip.vehicles?.name || trip.vehicles?.reg_no || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Driver</p>
                            <p className="mt-1 font-medium">{trip.drivers?.name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Cargo</p>
                            <p className="mt-1 font-medium">{trip.cargo_weight ?? '-'} kg</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">ETA</p>
                            <p className="mt-1 font-medium">{trip.eta || '-'}</p>
                          </div>
                        </div>

                        {blockMessage && (
                          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                            {blockMessage}
                          </p>
                        )}

                        {(trip.status === 'Draft' || trip.status === 'Dispatched') && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {trip.status === 'Draft' && (
                              <button
                                type="button"
                                onClick={() => dispatchTrip(trip)}
                                disabled={dispatchDisabled || actionBusy}
                                title={blockMessage || 'Dispatch trip'}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Dispatch
                              </button>
                            )}
                            {trip.status === 'Dispatched' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openCompleteModal(trip)}
                                  disabled={actionBusy}
                                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Complete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelTrip(trip)}
                                  disabled={actionBusy}
                                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-24 xl:self-start">
            <h2 className="font-semibold">Create Trip</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Only available vehicles and non-expired available drivers are shown.
            </p>

            <form onSubmit={handleCreateTrip} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Source
                  <input
                    type="text"
                    required
                    value={form.source}
                    onChange={(e) => updateField('source', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Destination
                  <input
                    type="text"
                    required
                    value={form.destination}
                    onChange={(e) => updateField('destination', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Vehicle
                  <select
                    required
                    value={form.vehicle_id}
                    onChange={(e) => updateField('vehicle_id', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select vehicle</option>
                    {availableVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name || vehicle.reg_no} · {vehicle.max_capacity ?? '-'} kg
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Driver
                  <select
                    required
                    value={form.driver_id}
                    onChange={(e) => updateField('driver_id', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select driver</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} · exp {driver.license_expiry}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cargo Weight
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.cargo_weight}
                    onChange={(e) => updateField('cargo_weight', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Planned Distance
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.planned_distance}
                    onChange={(e) => updateField('planned_distance', e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              </div>

              {formError && <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {submitting ? 'Creating...' : 'Create Draft Trip'}
              </button>
            </form>
          </aside>
        </div>
      </section>

      {completingTrip && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Complete Trip</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{shortId(completingTrip.id)}</p>
              </div>
              <button
                type="button"
                onClick={closeCompleteModal}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                x
              </button>
            </div>

            <form onSubmit={handleCompleteTrip} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Odometer reading
                <input
                  type="number"
                  min="0"
                  required
                  value={completeForm.odometer_end}
                  onChange={(e) => setCompleteForm((prev) => ({ ...prev, odometer_end: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Fuel consumed (liters)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={completeForm.fuel_consumed}
                  onChange={(e) => setCompleteForm((prev) => ({ ...prev, fuel_consumed: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              {completeError && <p className="text-sm text-rose-600 dark:text-rose-400">{completeError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCompleteModal}
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === `complete-${completingTrip.id}`}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Complete Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
