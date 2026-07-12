import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import { getAccess } from './lib/permissions'
import Analytics from './pages/Analytics'
import Dashboard from './pages/Dashboard'
import Drivers from './pages/Drivers'
import FuelExpenses from './pages/FuelExpenses'
import Login from './pages/Login'
import Maintenance from './pages/Maintenance'
import Settings from './pages/Settings'
import TripDispatcher from './pages/TripDispatcher'
import VehicleRegistry from './pages/VehicleRegistry'

function ProtectedRoute({ children, screenKey }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Loading TransitOps...
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (screenKey && getAccess(profile?.role, screenKey) === 'none') {
    return <Navigate to="/" replace state={{ accessDenied: true }} />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fleet"
        element={
          <ProtectedRoute screenKey="fleet">
            <VehicleRegistry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers"
        element={
          <ProtectedRoute screenKey="drivers">
            <Drivers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips"
        element={
          <ProtectedRoute screenKey="trips">
            <TripDispatcher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <Maintenance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fuel-expenses"
        element={
          <ProtectedRoute screenKey="fuel-expenses">
            <FuelExpenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute screenKey="analytics">
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
