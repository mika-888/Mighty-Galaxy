import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'
import { statusClass } from '../lib/statusStyles'

const STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended']
const EXPIRY_WARNING_DAYS = 30

const EMPTY_FORM = {
  name: '',
  license_no: '',
  license_category: '',
  license_expiry: '',
  contact: '',
  safety_score: '',
  status: 'Available',
}

function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false
  const today = new Date(new Date().toDateString())
  const expiry = new Date(dateStr)
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  return diffDays <= EXPIRY_WARNING_DAYS
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadDrivers() {
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('drivers')
      .select('*')
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setDrivers(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    async function initialLoad() {
      await loadDrivers()
    }
    initialLoad()
  }, [])

  const expiringDrivers = useMemo(
    () => drivers.filter((driver) => isExpiringSoon(driver.license_expiry)),
    [drivers]
  )

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
    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      license_no: form.license_no.trim(),
      license_category: form.license_category.trim(),
      license_expiry: form.license_expiry,
      contact: form.contact.trim(),
      safety_score: Number(form.safety_score),
      status: form.status,
    }

    const { error: submitError } = await supabase.from('drivers').insert(payload)

    if (submitError) {
      if (submitError.code === '23505') {
        setFormError(`A driver with license no "${payload.license_no}" already exists.`)
      } else {
        setFormError(submitError.message)
      }
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setModalOpen(false)
    await loadDrivers()
  }

  async function handleStatusChange(driverId, status) {
    const previous = drivers
    setDrivers((prev) => prev.map((driver) => (driver.id === driverId ? { ...driver, status } : driver)))

    const { error: statusError } = await supabase
      .from('drivers')
      .update({ status })
      .eq('id', driverId)

    if (statusError) {
      setDrivers(previous)
      setError(statusError.message)
    }
  }

  return (
    <AppLayout active="Drivers">
      <section className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Drivers</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Drivers &amp; Safety Profiles</h1>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            + Add Driver
          </button>
        </div>

        {!bannerDismissed && expiringDrivers.length > 0 && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <div>
              <p className="font-semibold">
                {expiringDrivers.length} driver{expiringDrivers.length > 1 ? 's' : ''} with a license expiring within {EXPIRY_WARNING_DAYS} days
              </p>
              <p className="mt-1">
                {expiringDrivers
                  .map((driver) => `${driver.name} (${isExpired(driver.license_expiry) ? 'expired' : 'expires'} ${driver.license_expiry})`)
                  .join(', ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
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

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">License No.</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Safety Score</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {drivers.map((driver) => {
                  const expired = isExpired(driver.license_expiry)
                  return (
                    <tr key={driver.id}>
                      <td className="px-4 py-3 font-medium">{driver.name}</td>
                      <td className="px-4 py-3">{driver.license_no || '-'}</td>
                      <td className="px-4 py-3">{driver.license_category || '-'}</td>
                      <td className={`px-4 py-3 ${expired ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>
                        {driver.license_expiry || '-'}
                        {expired && (
                          <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{driver.contact || '-'}</td>
                      <td className="px-4 py-3">{driver.safety_score ?? '-'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={driver.status}
                          onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                          className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ring-1 outline-none ${statusClass(driver.status)}`}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {!loading && drivers.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="7">
                      No drivers found
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
              <h2 className="text-lg font-semibold">Add Driver</h2>
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">License No.</label>
                  <input
                    type="text"
                    required
                    value={form.license_no}
                    onChange={(e) => updateField('license_no', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">License Category</label>
                  <input
                    type="text"
                    required
                    value={form.license_category}
                    onChange={(e) => updateField('license_category', e.target.value)}
                    placeholder="e.g. LMV, HMV"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">License Expiry</label>
                  <input
                    type="date"
                    required
                    value={form.license_expiry}
                    onChange={(e) => updateField('license_expiry', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contact</label>
                  <input
                    type="text"
                    required
                    value={form.contact}
                    onChange={(e) => updateField('contact', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Safety Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.safety_score}
                    onChange={(e) => updateField('safety_score', e.target.value)}
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
                  {submitting ? 'Saving…' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
