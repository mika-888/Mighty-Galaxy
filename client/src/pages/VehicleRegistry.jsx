import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'
import { statusClass } from '../lib/statusStyles'

const STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired']

const EMPTY_FORM = {
  reg_no: '',
  name: '',
  type: '',
  max_capacity: '',
  odometer: '',
  acquisition_cost: '',
  status: 'Available',
}

function currency(value) {
  const num = Number(value)
  return Number.isFinite(num) ? `$${num.toLocaleString()}` : '-'
}

export default function VehicleRegistry() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')

  const [isModalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadVehicles() {
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .order('reg_no', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setVehicles(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    async function initialLoad() {
      await loadVehicles()
    }
    initialLoad()
  }, [])

  const types = useMemo(() => {
    const unique = new Set(vehicles.map((vehicle) => vehicle.type).filter(Boolean))
    return Array.from(unique).sort()
  }, [vehicles])

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (typeFilter !== 'All' && vehicle.type !== typeFilter) return false
      if (statusFilter !== 'All' && vehicle.status !== statusFilter) return false
      if (search && !vehicle.reg_no?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [vehicles, typeFilter, statusFilter, search])

  function openAddModal() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(vehicle) {
    setEditingId(vehicle.id)
    setForm({
      reg_no: vehicle.reg_no ?? '',
      name: vehicle.name ?? '',
      type: vehicle.type ?? '',
      max_capacity: vehicle.max_capacity ?? '',
      odometer: vehicle.odometer ?? '',
      acquisition_cost: vehicle.acquisition_cost ?? '',
      status: vehicle.status ?? 'Available',
    })
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
    setSubmitting(true)

    const payload = {
      reg_no: form.reg_no.trim(),
      name: form.name.trim(),
      type: form.type.trim(),
      max_capacity: Number(form.max_capacity),
      odometer: Number(form.odometer),
      acquisition_cost: Number(form.acquisition_cost),
      status: form.status,
    }

    const query = editingId
      ? supabase.from('vehicles').update(payload).eq('id', editingId)
      : supabase.from('vehicles').insert(payload)

    const { error: submitError } = await query

    if (submitError) {
      if (submitError.code === '23505') {
        setFormError(`A vehicle with reg no "${payload.reg_no}" already exists.`)
      } else {
        setFormError(submitError.message)
      }
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setModalOpen(false)
    await loadVehicles()
  }

  async function handleStatusChange(vehicleId, status) {
    const previous = vehicles
    setVehicles((prev) => prev.map((vehicle) => (vehicle.id === vehicleId ? { ...vehicle, status } : vehicle)))

    const { error: statusError } = await supabase
      .from('vehicles')
      .update({ status })
      .eq('id', vehicleId)

    if (statusError) {
      setVehicles(previous)
      setError(statusError.message)
    }
  }

  return (
    <AppLayout active="Fleet">
      <section className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fleet</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Vehicle Registry</h1>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            + Add Vehicle
          </button>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
          <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Type
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium normal-case text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option>All</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium normal-case text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option>All</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Search Reg No
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. KA-01-AB-1234"
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium normal-case text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Name / Model</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Odometer</th>
                  <th className="px-4 py-3">Acquisition Cost</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="px-4 py-3 font-medium">{vehicle.reg_no}</td>
                    <td className="px-4 py-3">{vehicle.name || '-'}</td>
                    <td className="px-4 py-3">{vehicle.type || '-'}</td>
                    <td className="px-4 py-3">{vehicle.max_capacity ?? '-'}</td>
                    <td className="px-4 py-3">{vehicle.odometer != null ? Number(vehicle.odometer).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">{currency(vehicle.acquisition_cost)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={vehicle.status}
                        onChange={(e) => handleStatusChange(vehicle.id, e.target.value)}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ring-1 outline-none ${statusClass(vehicle.status)}`}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(vehicle)}
                        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredVehicles.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="8">
                      No vehicles found
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
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Reg No</label>
                  <input
                    type="text"
                    required
                    value={form.reg_no}
                    onChange={(e) => updateField('reg_no', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name / Model</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                  <input
                    type="text"
                    required
                    value={form.type}
                    onChange={(e) => updateField('type', e.target.value)}
                    placeholder="e.g. Truck, Van, Bus"
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
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Max Capacity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.max_capacity}
                    onChange={(e) => updateField('max_capacity', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Odometer</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.odometer}
                    onChange={(e) => updateField('odometer', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Acquisition Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.acquisition_cost}
                    onChange={(e) => updateField('acquisition_cost', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
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
                  {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
