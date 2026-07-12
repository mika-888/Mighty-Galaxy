import { useState } from 'react'
import AppLayout from '../components/AppLayout'

const STORAGE_KEY = 'transitops-settings'

const DEFAULT_SETTINGS = {
  depotName: 'Gandhinagar Depot GJ4',
  currency: 'INR (Rs)',
  distanceUnit: 'Kilometers',
}

const rbacRows = [
  {
    role: 'Fleet Manager',
    Fleet: '✓',
    Drivers: '✓',
    Trips: '–',
    'Fuel/Exp.': '–',
    Analytics: '✓',
  },
  {
    role: 'Dispatcher',
    Fleet: 'view',
    Drivers: '–',
    Trips: '✓',
    'Fuel/Exp.': '–',
    Analytics: '–',
  },
  {
    role: 'Safety Officer',
    Fleet: '–',
    Drivers: '✓',
    Trips: 'view',
    'Fuel/Exp.': '–',
    Analytics: '–',
  },
  {
    role: 'Financial Analyst',
    Fleet: 'view',
    Drivers: '–',
    Trips: '–',
    'Fuel/Exp.': '✓',
    Analytics: '✓',
  },
]

const accessColumns = ['Fleet', 'Drivers', 'Trips', 'Fuel/Exp.', 'Analytics']

function accessClass(value) {
  if (value === '✓') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'
  }
  if (value === 'view') {
    return 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900'
  }
  return 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
}

export default function Settings() {
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_SETTINGS

    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const [saved, setSaved] = useState(false)

  function updateField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setSaved(true)
  }

  return (
    <AppLayout active="Settings">
      <section className="space-y-6 p-4 sm:p-6">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Settings &amp; RBAC</h1>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <h2 className="font-semibold">General</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Local workspace defaults for this prototype.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Depot Name
                <input
                  type="text"
                  value={settings.depotName}
                  onChange={(e) => updateField('depotName', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Currency
                <select
                  value={settings.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option>INR (Rs)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Distance Unit
                <select
                  value={settings.distanceUnit}
                  onChange={(e) => updateField('distanceUnit', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option>Kilometers</option>
                  <option>Miles</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Save changes
              </button>
              {saved && (
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Saved locally.
                </span>
              )}
            </div>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="font-semibold">Role-Based Access</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Static access matrix for the demo roles.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    {accessColumns.map((column) => (
                      <th key={column} className="px-4 py-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {rbacRows.map((row) => (
                    <tr key={row.role}>
                      <td className="px-4 py-3 font-semibold">{row.role}</td>
                      {accessColumns.map((column) => (
                        <td key={column} className="px-4 py-3">
                          <span className={`inline-flex min-w-12 justify-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ${accessClass(row[column])}`}>
                            {row[column]}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}
