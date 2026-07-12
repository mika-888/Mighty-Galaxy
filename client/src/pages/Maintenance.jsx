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
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Maintenance</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Service Log</h1>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            + Log Service Record
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Service Type</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-medium">{log.vehicles?.name || log.vehicles?.reg_no || '-'}</td>
                    <td className="px-4 py-3">{log.service_type || '-'}</td>
                    <td className="px-4 py-3">{currency(log.cost)}</td>
                    <td className="px-4 py-3">{log.service_date || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.status === 'Active' && (
                        <button
                          type="button"
                          onClick={() => handleCloseRecord(log)}
                          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Close/Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="6">
                      No maintenance records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Log Service Record</h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle</label>
                  <select
                    required
                    value={form.vehicle_id}
                    onChange={(e) => updateField('vehicle_id', e.target.value)}
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Service Type</label>
                  <input
                    type="text"
                    required
                    value={form.service_type}
                    onChange={(e) => updateField('service_type', e.target.value)}
                    placeholder="e.g. Oil Change"
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
                    value={form.cost}
                    onChange={(e) => updateField('cost', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    value={form.service_date}
                    onChange={(e) => updateField('service_date', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {formError && <p className="text-sm text-rose-600 dark:text-rose-400">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Log Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
