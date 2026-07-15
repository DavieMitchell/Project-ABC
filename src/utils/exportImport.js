import { getAllDays, replaceAllDays, mergeDays } from './db'
import { toDateKey } from './date'

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
  a.download = `project-abc-export-${stamp}.json`
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
