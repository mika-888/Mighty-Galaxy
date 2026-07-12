export const ROLES = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst']

export const SCREENS = [
  { key: 'fleet', label: 'Fleet' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'trips', label: 'Trips' },
  { key: 'fuel-expenses', label: 'Fuel/Exp.' },
  { key: 'analytics', label: 'Analytics' },
]

export const PERMISSIONS = {
  'Fleet Manager': { fleet: 'full', drivers: 'full', trips: 'none', 'fuel-expenses': 'none', analytics: 'full' },
  Dispatcher: { fleet: 'view', drivers: 'none', trips: 'full', 'fuel-expenses': 'none', analytics: 'none' },
  'Safety Officer': { fleet: 'none', drivers: 'full', trips: 'view', 'fuel-expenses': 'none', analytics: 'none' },
  'Financial Analyst': { fleet: 'view', drivers: 'none', trips: 'none', 'fuel-expenses': 'full', analytics: 'full' },
}

export function getAccess(role, screenKey) {
  return PERMISSIONS[role]?.[screenKey] ?? 'none'
}
