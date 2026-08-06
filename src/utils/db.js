import { openDB } from 'idb'

const DB_NAME = 'project-abc'
const DB_VERSION = 1
const STORE = 'days'

// Each record: { dateKey: "2026-07-13", weight: {...}, meds: {...},
//                food: {...}, activity: {...}, checkIn: {...} }
// Sub-objects are only present once the user has actually logged that
// section for that day — an empty day has no keys beyond dateKey.

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'dateKey' })
        }
      }
    })
  }
  return dbPromise
}

export async function getDay(dateKey) {
  const db = await getDB()
  return (await db.get(STORE, dateKey)) || { dateKey }
}

export async function saveDaySection(dateKey, section, data) {
  const db = await getDB()
  const existing = (await db.get(STORE, dateKey)) || { dateKey }
  const updated = { ...existing, [section]: data }
  await db.put(STORE, updated)
  return updated
}

export async function deleteDaySection(dateKey, section) {
  const db = await getDB()
  const existing = (await db.get(STORE, dateKey)) || { dateKey }
  const { [section]: _drop, ...rest } = existing
  await db.put(STORE, rest)
  return rest
}

export async function getAllDays() {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function replaceAllDays(days) {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  await tx.store.clear()
  for (const day of days) await tx.store.put(day)
  await tx.done
}

export async function mergeDays(days) {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  for (const day of days) {
    const existing = await tx.store.get(day.dateKey)
    await tx.store.put(existing ? { ...existing, ...day } : day)
  }
  await tx.done
}
