import { useState } from 'react'
import { EntryCard } from './Cards'
import {
  WEIGHT_UNITS, LENGTH_UNITS, weightToTexts, textsToWeightKg, lengthToText, textToLengthCm,
  formatWeight, formatLength, parseNum
} from '../utils/units'

export function hasJournal(day) {
  return !!day?.journal?.text?.trim()
}

export function hasMeasurements(day) {
  const m = day?.measurements
  return !!m && ['weightKg', 'chestCm', 'waistCm', 'bpSys', 'bpDia'].some((k) => m[k] != null)
}

// ---------------------------------------------------------------- Journal
export function JournalCard({ text, onChange }) {
  const preview = text.trim()
  return (
    <EntryCard
      catClass="journal"
      title="Journal"
      alwaysVisible={preview ? <div className="card-summary clamp">{preview}</div> : null}
    >
      <textarea
        className="journal-text"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="How was today? Food thoughts, mood, training, anything you want to remember."
        rows={8}
      />
      <div className="journal-hint">Saved automatically. The full text is included in the day PDF.</div>
    </EntryCard>
  )
}

// ----------------------------------------------------------- Measurements
export function UnitToggle({ units, value, onChange }) {
  return (
    <div className="unit-toggle" role="group">
      {units.map((u) => (
        <button
          key={u.key}
          type="button"
          className={`unit-chip${value === u.key ? ' active' : ''}`}
          onClick={() => onChange(u.key)}
        >
          {u.label}
        </button>
      ))}
    </div>
  )
}

function WeightField({ kg, unit, onUnit, onChange }) {
  const [texts, setTexts] = useState(() => weightToTexts(kg, unit))

  const switchUnit = (u) => {
    setTexts(weightToTexts(kg, u)) // convert from the stored kg: no rounding drift
    onUnit(u)
  }
  const edit = (patch) => {
    const next = { ...texts, ...patch }
    setTexts(next)
    onChange(textsToWeightKg(next, unit))
  }

  return (
    <div className="measure-field">
      <div className="measure-head">
        <span className="measure-label">Weight</span>
        <UnitToggle units={WEIGHT_UNITS} value={unit} onChange={switchUnit} />
      </div>
      <div className="measure-inputs">
        {unit === 'stlb' ? (
          <>
            <input inputMode="decimal" value={texts.a} onChange={(e) => edit({ a: e.target.value })} placeholder="0" aria-label="Stones" />
            <span className="measure-unit">st</span>
            <input inputMode="decimal" value={texts.b} onChange={(e) => edit({ b: e.target.value })} placeholder="0" aria-label="Pounds" />
            <span className="measure-unit">lb</span>
          </>
        ) : (
          <>
            <input inputMode="decimal" value={texts.a} onChange={(e) => edit({ a: e.target.value })} placeholder="0.0" aria-label="Weight" />
            <span className="measure-unit">{unit}</span>
          </>
        )}
      </div>
      {kg != null && <div className="measure-equiv">{['kg', 'lb', 'stlb'].filter((k) => k !== unit).map((k) => formatWeight(kg, k)).join('  ·  ')}</div>}
    </div>
  )
}

function LengthField({ label, cm, unit, onUnit, onChange }) {
  const [text, setText] = useState(() => lengthToText(cm, unit))
  const switchUnit = (u) => {
    setText(lengthToText(cm, u))
    onUnit(u)
  }
  const edit = (t) => {
    setText(t)
    onChange(textToLengthCm(t, unit))
  }
  return (
    <div className="measure-field">
      <div className="measure-head">
        <span className="measure-label">{label}</span>
        <UnitToggle units={LENGTH_UNITS} value={unit} onChange={switchUnit} />
      </div>
      <div className="measure-inputs">
        <input inputMode="decimal" value={text} onChange={(e) => edit(e.target.value)} placeholder="0.0" aria-label={label} />
        <span className="measure-unit">{unit}</span>
      </div>
      {cm != null && <div className="measure-equiv">{formatLength(cm, unit === 'cm' ? 'in' : 'cm')}</div>}
    </div>
  )
}

function BPField({ sys, dia, onChange }) {
  const [s, setS] = useState(sys != null ? String(sys) : '')
  const [d, setD] = useState(dia != null ? String(dia) : '')
  const toInt = (t) => {
    const n = parseNum(t)
    return n == null ? null : Math.round(n)
  }
  return (
    <div className="measure-field">
      <div className="measure-head"><span className="measure-label">Blood pressure</span></div>
      <div className="measure-inputs">
        <input inputMode="numeric" value={s} onChange={(e) => { setS(e.target.value); onChange({ bpSys: toInt(e.target.value), bpDia: toInt(d) }) }} placeholder="120" aria-label="Systolic" />
        <span className="measure-unit">/</span>
        <input inputMode="numeric" value={d} onChange={(e) => { setD(e.target.value); onChange({ bpSys: toInt(s), bpDia: toInt(e.target.value) }) }} placeholder="80" aria-label="Diastolic" />
        <span className="measure-unit">mmHg</span>
      </div>
    </div>
  )
}

export function MeasurementsCard({ values, onChange, units, onUnits }) {
  const set = (patch) => onChange({ ...values, ...patch })
  const bits = []
  if (values.weightKg != null) bits.push(formatWeight(values.weightKg, units.weight))
  if (values.chestCm != null) bits.push(`Chest ${formatLength(values.chestCm, units.chest)}`)
  if (values.waistCm != null) bits.push(`Waist ${formatLength(values.waistCm, units.waist)}`)
  if (values.bpSys != null && values.bpDia != null) bits.push(`BP ${values.bpSys}/${values.bpDia}`)

  return (
    <EntryCard
      catClass="measurements"
      title="Measurements"
      alwaysVisible={bits.length ? <div className="card-summary">{bits.join('  ·  ')}</div> : null}
    >
      <WeightField kg={values.weightKg} unit={units.weight} onUnit={(u) => onUnits({ ...units, weight: u })} onChange={(v) => set({ weightKg: v })} />
      <LengthField label="Chest" cm={values.chestCm} unit={units.chest} onUnit={(u) => onUnits({ ...units, chest: u })} onChange={(v) => set({ chestCm: v })} />
      <LengthField label="Waist" cm={values.waistCm} unit={units.waist} onUnit={(u) => onUnits({ ...units, waist: u })} onChange={(v) => set({ waistCm: v })} />
      <BPField sys={values.bpSys} dia={values.bpDia} onChange={(v) => set(v)} />
      <div className="journal-hint">Saved automatically. Values are stored in kg and cm and converted for display.</div>
    </EntryCard>
  )
}
