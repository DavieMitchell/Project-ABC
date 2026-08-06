import { getAllDays, replaceAllDays, mergeDays } from './db'
import { toDateKey, formatUKShort } from './date'

const FILE_VERSION = 1

export async function exportData() {
  const days = await getAllDays()
  const payload = {
    app: 'project-abc',
    fileVersion: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    days
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = toDateKey(new Date())
  a.href = url
  a.download = `project-abc-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value) {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// One row per logged food entry - flat and easy to pivot/sum in Excel.
export async function exportCSV() {
  const days = await getAllDays()
  const header = [
    'Date', 'Meal', 'Food', 'Calories', 'Protein (g)', 'Carbs (g)',
    'Fat (g)', 'Sugar (g)', 'Saturated fat (g)', 'Fibre (g)'
  ]
  const rows = [header]

  const sortedDays = [...days].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  for (const day of sortedDays) {
    const entries = day.food?.entries
    if (!entries) continue
    for (const [meal, items] of Object.entries(entries)) {
      for (const item of items) {
        rows.push([
          formatUKShort(day.dateKey),
          meal,
          item.name,
          item.calories, item.protein, item.carbs,
          item.fat, item.sugar, item.saturatedFat, item.fiber
        ])
      }
    }
  }

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = toDateKey(new Date())
  a.href = url
  a.download = `project-abc-food-log-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// mode: 'replace' wipes existing data first, 'merge' overlays on top
// (imported day sections win on conflict, matching last-write-wins).
export async function importData(file, mode = 'merge') {
  const text = await file.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('That file isn\u2019t valid JSON.')
  }

  if (payload.app !== 'project-abc' || !Array.isArray(payload.days)) {
    throw new Error('That doesn\u2019t look like a Project ABC export file.')
  }

  if (mode === 'replace') {
    await replaceAllDays(payload.days)
  } else {
    await mergeDays(payload.days)
  }

  return { count: payload.days.length, exportedAt: payload.exportedAt }
}
