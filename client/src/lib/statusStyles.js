export function statusClass(status) {
  const classes = {
    Available: 'bg-emerald-500 text-white',
    'On Trip': 'bg-sky-500 text-white',
    'In Shop': 'bg-orange-500 text-white',
    Retired: 'bg-rose-600 text-white',
    Draft: 'bg-slate-600 text-white',
    Active: 'bg-orange-500 text-white',
    Dispatched: 'bg-sky-500 text-white',
    Completed: 'bg-emerald-500 text-white',
    Cancelled: 'bg-pink-500 text-white',
    'Off Duty': 'bg-slate-600 text-white',
    Suspended: 'bg-orange-500 text-white',
  }

  return classes[status] || classes.Draft
}
