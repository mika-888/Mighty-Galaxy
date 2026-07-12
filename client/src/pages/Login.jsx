import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const ROLES = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst']

export default function Login() {
  const { user, profile, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dark, setDark] = useState(false)

  if (user && profile) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, name, role)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = dark
    ? 'w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-orange-500'
    : 'w-full rounded-lg border border-transparent bg-[#e9eefb] px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-orange-400'

  const labelClass = dark ? 'mb-1 block text-sm font-medium text-slate-300' : 'mb-1 block text-sm font-semibold text-slate-800'

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 py-10 ${dark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl shadow-xl">
        <div className="hidden w-1/2 flex-col justify-between bg-[#0a0e1a] p-10 lg:flex">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-slate-950">
                TO
              </div>
              <button
                type="button"
                onClick={() => setDark((prev) => !prev)}
                className="rounded-full border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                {dark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>

            <h1 className="mt-8 text-3xl font-extrabold text-white">TransitOps</h1>
            <p className="mt-2 max-w-xs text-sm text-slate-400">
              Smart transport operations for dispatch, safety, fuel, and fleet decisions.
            </p>

            <div className="mt-12">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">One login, four roles</p>
              <ul className="mt-4 space-y-3">
                {ROLES.map((r) => (
                  <li key={r} className="flex items-center gap-2 font-medium text-white">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-slate-500">TransitOps prototype · RBAC enabled</p>
        </div>

        <div className={`flex w-full flex-col justify-center p-10 lg:w-1/2 lg:p-16 ${dark ? 'bg-[#0e1017]' : 'bg-white'}`}>
          <p className={`text-sm font-semibold ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Authentication</p>
          <h2 className={`mt-1 text-3xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Sign in to your account
          </h2>
          <p className={`mt-2 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Enter your credentials to continue into the operations workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {mode === 'signup' && (
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                placeholder="rajdeep.x70@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className={labelClass}>Role (RBAC)</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  dark ? 'border border-rose-800 bg-rose-950/30 text-rose-300' : 'border border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-orange-500 py-3 font-bold text-slate-950 transition hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <p className={`mt-6 text-center text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setError('')
                setMode(mode === 'signin' ? 'signup' : 'signin')
              }}
              className={`font-semibold hover:underline ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
