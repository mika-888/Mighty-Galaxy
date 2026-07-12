import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { currency } from '../lib/currency'
import { supabase } from '../lib/supabase'
import { statusClass } from '../lib/statusStyles'

const EMPTY_FORM = {
  vehicle_id: '',
  service_type: '',
  cost: '',
  service_date: new Date().toISOString().slice(0, 10),
  status: 'Active',
}

export default function Maintenance() {
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    setLoading(true)
    setError('')

    const [logsResult, vehiclesResult] = await Promise.all([
      supabase
        .from('maintenance_logs')
        .select('*, vehicles(reg_no, name, status)')
        .order('service_date', { ascending: false }),
      supabase.from('vehicles').select('id, reg_no, name, status').order('reg_no', { ascending: true }),
    ])

    const firstError = logsResult.error || vehiclesResult.error
    if (firstError) {
      setError(firstError.message)
    } else {
      setLogs(logsResult.data ?? [])
      setVehicles(vehiclesResult.data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    async function initialLoad() {
      await loadData()
    }
    initialLoad()
  }, [])

  const eligibleVehicles = vehicles.filter((vehicle) => vehicle.status !== 'Retired')

  function openAddModal() {
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!form.vehicle_id) {
      setFormError('Select a vehicle.')
      return
    }

    setSubmitting(true)

    const { error: insertError } = await supabase.from('maintenance_logs').insert({
      vehicle_id: form.vehicle_id,
      service_type: form.service_type.trim(),
      cost: Number(form.cost),
      service_date: form.service_date,
      status: form.status,
    })

    if (insertError) {
      setFormError(insertError.message)
      setSubmitting(false)
      return
    }

    if (form.status === 'Active') {
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'In Shop' })
        .eq('id', form.vehicle_id)

      if (vehicleError) {
        setFormError(vehicleError.message)
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    setModalOpen(false)
    await loadData()
  }

  async function handleCloseRecord(log) {
    setError('')

    const { error: logError } = await supabase
      .from('maintenance_logs')
      .update({ status: 'Completed' })
      .eq('id', log.id)

    if (logError) {
      setError(logError.message)
      return
    }

    if (log.vehicles?.status !== 'Retired') {
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'Available' })
        .eq('id', log.vehicle_id)

      if (vehicleError) {
        setError(vehicleError.message)
        return
      }
    }

    await loadData()
  }

  return (
    <AppLayout active="Maintenance">
      <section className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Maintenance</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Service Log</h1>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            + Log Service Record
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-slate-800 bg-[#0e1017] p-5 shadow-sm">
            <h2 className="font-semibold">Log Service Record</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                Vehicle
                <select
                  required
                  value={form.vehicle_id}
                  onChange={(e) => updateField('vehicle_id', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-orange-500"
                >
                  <option value="">Select vehicle</option>
                  {eligibleVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name || vehicle.reg_no} ({vehicle.reg_no})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Service Type
                <input
                  type="text"
                  required
                  value={form.service_type}
                  onChange={(e) => updateField('service_type', e.target.value)}
                  placeholder="e.g. Oil Change"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Cost
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.cost}
                  onChange={(e) => updateField('cost', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-orange-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Date
                <input
                  type="date"
                  required
                  value={form.service_date}
                  onChange={(e) => updateField('service_date', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-orange-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Status
                <select
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-orange-500"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>

              {formError && <p className="text-sm text-rose-400">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0e1017] shadow-sm">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="font-semibold">Service Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-medium">{log.vehicles?.name || log.vehicles?.reg_no || '-'}</td>
                      <td className="px-4 py-3">{log.service_type || '-'}</td>
                      <td className="px-4 py-3">{currency(log.cost)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => handleCloseRecord(log)}
                            className="text-sm font-medium text-orange-400 hover:underline"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && logs.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan="5">
                        No maintenance records yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-[#0e1017] p-4 text-xs">
          <span className="text-slate-400">Lifecycle:</span>
          <span className={`rounded-full px-2 py-1 font-semibold ${statusClass('Available')}`}>Available</span>
          <span className="text-slate-500">→</span>
          <span className={`rounded-full px-2 py-1 font-semibold ${statusClass('In Shop')}`}>In Shop</span>
          <span className="text-slate-500">→ (on close) →</span>
          <span className={`rounded-full px-2 py-1 font-semibold ${statusClass('Available')}`}>Available</span>
        </div>
        <p className="text-xs text-rose-400">Rule: In Shop vehicles are removed from the dispatch pool</p>
      </section>
    </AppLayout>
  )
}
