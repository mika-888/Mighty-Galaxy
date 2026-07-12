const STORAGE_KEY = 'transitops-settings'

const SYMBOLS = {
  'INR (Rs)': '₹',
  'USD ($)': '$',
  'EUR (€)': '€',
}

export function getCurrencySymbol() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return SYMBOLS[stored.currency] || '$'
  } catch {
    return '$'
  }
}

export function currency(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return `${getCurrencySymbol()}${num.toLocaleString()}`
}
