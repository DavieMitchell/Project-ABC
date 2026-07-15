// All date handling for Project ABC assumes UK locale (en-GB):
// short form 25/04/2026, long form "25 April 2026".
// Internally, days are keyed by ISO "YYYY-MM-DD" (sortable, unambiguous)
// — only the display layer uses UK format.

export function toDateKey(date) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function fromDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey() {
  return toDateKey(new Date())
}

// 25/04/2026
export function formatUKShort(dateOrKey) {
  const d = typeof dateOrKey === 'string' ? fromDateKey(dateOrKey) : dateOrKey
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

// 25 April 2026
export function formatUKLong(dateOrKey) {
  const d = typeof dateOrKey === 'string' ? fromDateKey(dateOrKey) : dateOrKey
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d)
}

// HH:mm, 24-hour, as used throughout the UK
export function formatUKTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date))
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b)
}

// Returns a matrix of weeks (each with 7 cells) for the given month,
// with leading/trailing nulls for days outside the month, and weeks
// starting Monday (UK convention).
export function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // Mon=0..Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export const UK_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
