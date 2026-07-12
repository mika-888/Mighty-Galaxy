import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import { PERMISSIONS, ROLES, SCREENS } from '../lib/permissions'

const STORAGE_KEY = 'transitops-settings'

const DEFAULT_SETTINGS = {
  depotName: 'Gandhinagar Depot GJ4',
  currency: 'INR (Rs)',
  distanceUnit: 'Kilometers',
}

const ACCESS_SYMBOL = { full: '✓', view: 'view', none: '–' }

const rbacRows = ROLES.map((role) => {
  const row = { role }
  for (const screen of SCREENS) {
    row[screen.label] = ACCESS_SYMBOL[PERMISSIONS[role][screen.key]]
  }
  return row
})

const accessColumns = SCREENS.map((screen) => screen.label)

function accessClass(value) {
  if (value === '✓') {
    return 'bg-emerald-500 text-white'
  }
  if (value === 'view') {
    return 'bg-sky-500 text-white'
  }
  return 'bg-slate-700 text-slate-300'
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
          <p className="text-sm font-medium text-slate-400">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Settings &amp; RBAC</h1>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-800 bg-[#0e1017] p-5 shadow-sm"
          >
            <div>
              <h2 className="font-semibold">General</h2>
              <p className="mt-1 text-sm text-slate-400">
                Local workspace defaults for this prototype.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                Depot Name
                <input
                  type="text"
                  value={settings.depotName}
                  onChange={(e) => updateField('depotName', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-orange-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-300">
                Currency
                <select
                  value={settings.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-orange-500"
                >
                  <option>INR (Rs)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-300">
                Distance Unit
                <select
                  value={settings.distanceUnit}
                  onChange={(e) => updateField('distanceUnit', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-orange-500"
                >
                  <option>Kilometers</option>
                  <option>Miles</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Save changes
              </button>
              {saved && (
                <span className="text-sm font-medium text-emerald-400">
                  Saved locally.
                </span>
              )}
            </div>
          </form>

          <div className="rounded-lg border border-slate-800 bg-[#0e1017] shadow-sm">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="font-semibold">Role-Based Access (RBAC)</h2>
              <p className="mt-1 text-sm text-slate-400">
                Static access matrix for the demo roles.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    {accessColumns.map((column) => (
                      <th key={column} className="px-4 py-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rbacRows.map((row) => (
                    <tr key={row.role}>
                      <td className="px-4 py-3 font-semibold">{row.role}</td>
                      {accessColumns.map((column) => (
                        <td key={column} className="px-4 py-3">
                          <span className={`inline-flex min-w-12 justify-center rounded-full px-2 py-1 text-xs font-semibold ${accessClass(row[column])}`}>
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
