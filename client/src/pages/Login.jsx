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

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 lg:grid-cols-[420px_1fr]">
        <aside className="flex flex-col justify-between bg-slate-950 p-8 text-white sm:p-10">
          <div>
            <div className="brand-mark h-10 w-10">TO</div>
            <h1 className="mt-6 text-3xl font-black tracking-tight">TransitOps</h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
              Smart transport operations for dispatch, safety, fuel, and fleet decisions.
            </p>

            <div className="mt-16 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">One login, four roles</p>
              {ROLES.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">TransitOps prototype · RBAC enabled</p>
        </aside>

        <main className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Authentication</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter your credentials to continue into the operations workspace.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="ui-input h-11 w-full"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ui-input h-11 w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input h-11 w-full"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="ui-input h-11 w-full"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                  {error}
                </p>
              )}

              <button type="submit" disabled={submitting} className="gold-button h-11 w-full">
                {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMode(mode === 'signin' ? 'signup' : 'signin')
                }}
                className="font-bold text-teal-700 hover:underline dark:text-teal-300"
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
