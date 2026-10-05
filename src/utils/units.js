// Canonical storage: weight in kg, chest/waist in cm. Everything else is a
// display conversion, so toggling units never rewrites (or drifts) the data.
export const KG_PER_LB = 0.45359237
export const CM_PER_IN = 2.54
export const LB_PER_ST = 14

export const kgToLb = (kg) => kg / KG_PER_LB
export const lbToKg = (lb) => lb * KG_PER_LB
export const cmToIn = (cm) => cm / CM_PER_IN
export const inToCm = (i) => i * CM_PER_IN

export function kgToStLb(kg) {
  const totalLb = kgToLb(kg)
  let st = Math.floor(totalLb / LB_PER_ST)
  let lb = Math.round((totalLb - st * LB_PER_ST) * 10) / 10
  if (lb >= LB_PER_ST) { st += 1; lb = 0 }
  return { st, lb }
}
export const stLbToKg = (st, lb) => lbToKg((st || 0) * LB_PER_ST + (lb || 0))

export const WEIGHT_UNITS = [
  { key: 'kg', label: 'kg' },
  { key: 'lb', label: 'lb' },
  { key: 'stlb', label: 'st + lb' }
]
export const LENGTH_UNITS = [
  { key: 'cm', label: 'cm' },
  { key: 'in', label: 'in' }
]

const r1 = (n) => Math.round(n * 10) / 10
const trim = (n) => String(r1(n))

// Parse user text (accepts comma decimals). Returns a number or null.
export function parseNum(s) {
  if (s === '' || s == null) return null
  const n = Number(String(s).replace(',', '.').trim())
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Canonical value -> editable text fields for a unit.
export function weightToTexts(kg, unit) {
  if (kg == null) return { a: '', b: '' }
  if (unit === 'kg') return { a: trim(kg), b: '' }
  if (unit === 'lb') return { a: trim(kgToLb(kg)), b: '' }
  const { st, lb } = kgToStLb(kg)
  return { a: String(st), b: trim(lb) }
}
export function textsToWeightKg(texts, unit) {
  const a = parseNum(texts.a)
  const b = parseNum(texts.b)
  if (unit === 'kg') return a
  if (unit === 'lb') return a == null ? null : lbToKg(a)
  if (a == null && b == null) return null
  return stLbToKg(a, b)
}
export function lengthToText(cm, unit) {
  if (cm == null) return ''
  return unit === 'in' ? trim(cmToIn(cm)) : trim(cm)
}
export function textToLengthCm(text, unit) {
  const n = parseNum(text)
  if (n == null) return null
  return unit === 'in' ? inToCm(n) : n
}

// Formatting for tables / PDFs.
export function formatWeight(kg, unit) {
  if (kg == null) return '—'
  if (unit === 'kg') return `${r1(kg).toFixed(1)} kg`
  if (unit === 'lb') return `${r1(kgToLb(kg)).toFixed(1)} lb`
  const { st, lb } = kgToStLb(kg)
  return `${st} st ${lb.toFixed(1)} lb`
}
export function formatLength(cm, unit) {
  if (cm == null) return '—'
  return unit === 'in' ? `${r1(cmToIn(cm)).toFixed(1)} in` : `${r1(cm).toFixed(1)} cm`
}

// Numeric value for charting in a given unit. Stones + lb charts in plain
// pounds, which gives clean axis ticks (the table still shows st + lb).
export function weightChartValue(kg, unit) {
  return unit === 'kg' ? r1(kg) : r1(kgToLb(kg))
}
export const weightChartUnit = (unit) => (unit === 'stlb' ? 'lb' : unit)
export const lengthChartValue = (cm, unit) => r1(unit === 'in' ? cmToIn(cm) : cm)

// Simple persisted per-device unit preferences.
const KEY = 'abc-units'
const DEFAULTS = { weight: 'stlb', chest: 'in', waist: 'in' }
export function loadUnits() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEFAULTS } }
}
export function saveUnits(u) {
  try { localStorage.setItem(KEY, JSON.stringify(u)) } catch { /* ignore */ }
}
