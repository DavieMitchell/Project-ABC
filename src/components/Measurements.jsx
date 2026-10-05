import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { getAllDays } from '../utils/db'
import { addDays, todayKey, enumerateDateRange, formatUKShort } from '../utils/date'
import { timeTrend } from '../utils/stats'
import { exportBlocksAsPDF } from '../utils/pdfExport'
import { MACRO_COLORS } from '../utils/macroColors'
import { UnitToggle } from './DayCards'
import {
  WEIGHT_UNITS, LENGTH_UNITS, loadUnits, saveUnits, formatWeight, formatLength,
  weightChartValue, weightChartUnit, lengthChartValue, kgToLb, cmToIn
} from '../utils/units'

const BLUE = MACRO_COLORS.calories
const GREY = '#8A8A8A'
const TABLE_ROWS_PER_BLOCK = 14

const shortDay = (key) => {
  const [, m, d] = key.split('-')
  return `${d}/${m}`
}
const r1 = (n) => Math.round(n * 10) / 10
const signed = (n, suffix) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}${suffix}`

// One definition per measurement: which stored fields it reads, how to
// chart and format them in the currently selected unit.
function buildDefs(units) {
  const wUnit = units.weight
  const wDeltaUnit = wUnit === 'kg' ? 'kg' : 'lb'
  const lenDef = (id, title, key, unit) => ({
    id,
    title: `${title} (${unit})`,
    fields: [{ key, name: title, color: BLUE }],
    chart: (_, v) => lengthChartValue(v, unit),
    fmt: (v) => formatLength(v[key], unit),
    delta: (a, b) => signed(r1(unit === 'in' ? cmToIn(b - a) : b - a), ` ${unit}`),
    avg: (n) => formatLength(n, unit)
  })
  return [
    {
      id: 'weight',
      title: `Weight (${weightChartUnit(wUnit)})`,
      fields: [{ key: 'weightKg', name: 'Weight', color: BLUE }],
      chart: (_, v) => weightChartValue(v, wUnit),
      fmt: (v) => formatWeight(v.weightKg, wUnit),
      delta: (a, b) => signed(r1(wDeltaUnit === 'kg' ? b - a : kgToLb(b - a)), ` ${wDeltaUnit}`),
      avg: (n) => formatWeight(n, wUnit)
    },
    lenDef('chest', 'Chest', 'chestCm', units.chest),
    lenDef('waist', 'Waist', 'waistCm', units.waist),
    {
      id: 'bp',
      title: 'Blood pressure (mmHg)',
      fields: [
        { key: 'bpSys', name: 'Systolic', color: BLUE },
        { key: 'bpDia', name: 'Diastolic', color: GREY }
      ],
      chart: (_, v) => v,
      fmt: (v) => `${v.bpSys ?? '—'}/${v.bpDia ?? '—'}`,
      delta: (a, b) => signed(b - a, ''),
      avg: (n) => String(Math.round(n))
    }
  ]
}

// Points for one measurement: only days that actually have a value.
function collect(def, byKey, keys) {
  const out = []
  keys.forEach((k, x) => {
    const m = byKey[k]?.measurements
    if (!m) return
    const vals = {}
    let any = false
    for (const f of def.fields) {
      if (m[f.key] != null) { vals[f.key] = m[f.key]; any = true }
    }
    if (any) out.push({ dateKey: k, x, vals })
  })
  return out
}

function MeasureChart({ def, points, spanDays, fromKey, height }) {
  const data = points.map((p) => {
    const row = { x: p.x }
    for (const f of def.fields) if (p.vals[f.key] != null) row[f.key] = def.chart(f, p.vals[f.key])
    return row
  })
  // Time-based trend per series, so gaps between readings are weighted properly.
  for (const f of def.fields) {
    const withVal = data.filter((r) => r[f.key] != null)
    if (withVal.length >= 2) {
      const t = timeTrend(withVal.map((r) => ({ x: r.x, y: r[f.key] })))
      withVal.forEach((r, i) => { r[`${f.key}Trend`] = t[i] })
    }
  }
  const multi = def.fields.length > 1

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, Math.max(1, spanDays - 1)]}
          allowDecimals={false}
          tickFormatter={(x) => shortDay(addDays(fromKey, Math.round(x)))}
          tick={{ fill: '#5A5A5A', fontSize: 10 }}
          axisLine={{ stroke: '#CCCCCC' }}
        />
        <YAxis domain={['auto', 'auto']} tick={{ fill: '#5A5A5A', fontSize: 10 }} axisLine={{ stroke: '#CCCCCC' }} width={38} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #D8D8D8', fontSize: 12, color: '#1A1A1A' }}
          labelFormatter={(x) => formatUKShort(addDays(fromKey, Math.round(x)))}
        />
        {multi && <Legend wrapperStyle={{ fontSize: 11 }} payload={def.fields.map((f) => ({ value: f.name, type: 'line', color: f.color, id: f.key }))} />}
        {def.fields.map((f) => (
          <Line key={f.key} name={f.name} type="linear" dataKey={f.key} stroke={f.color} strokeWidth={2}
            dot={{ r: 3, fill: f.color }} connectNulls isAnimationActive={false} />
        ))}
        {def.fields.map((f) => (
          <Line key={`${f.key}Trend`} name={`${f.name} trend`} type="linear" dataKey={`${f.key}Trend`} stroke="#1A1A1A"
            strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls legendType="none" isAnimationActive={false} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function Summary({ def, points }) {
  if (!points.length) return null
  const f = def.fields[0]
  const withF = points.filter((p) => p.vals[f.key] != null)
  const last = points[points.length - 1]
  const first = withF[0]
  const lastF = withF[withF.length - 1]
  const avgOf = (key) => {
    const v = points.map((p) => p.vals[key]).filter((n) => n != null)
    return v.reduce((a, b) => a + b, 0) / v.length
  }
  const avg = def.fields.length > 1
    ? `${def.avg(avgOf('bpSys'))}/${def.avg(avgOf('bpDia'))}`
    : def.avg(avgOf(f.key))
  const change = withF.length < 2
    ? '—'
    : def.fields.length > 1
      ? (() => {
          const dia = points.filter((p) => p.vals.bpDia != null)
          const d2 = dia.length > 1 ? signed(dia[dia.length - 1].vals.bpDia - dia[0].vals.bpDia, '') : '—'
          return `${def.delta(first.vals[f.key], lastF.vals[f.key])}/${d2}`
        })()
      : def.delta(first.vals[f.key], lastF.vals[f.key])
  return (
    <div className="measure-summary">
      <div className="report-average-cell"><div className="measure-print-value">{def.fmt(last.vals)}</div><div className="report-average-label">Latest</div></div>
      <div className="report-average-cell"><div className="measure-print-value">{change}</div><div className="report-average-label">Change</div></div>
      <div className="report-average-cell"><div className="measure-print-value">{avg}</div><div className="report-average-label">Average</div></div>
      <div className="report-average-cell"><div className="measure-print-value">{points.length}</div><div className="report-average-label">Readings</div></div>
    </div>
  )
}

function MeasureTable({ def, points, prev: firstPrev = null }) {
  const f = def.fields[0]
  return (
    <table className="measure-table">
      <thead><tr><th>Date</th><th>{def.fields.length > 1 ? 'Reading' : 'Value'}</th><th>Change</th></tr></thead>
      <tbody>
        {points.map((p, i) => {
          const prev = i > 0 ? points[i - 1] : firstPrev
          const canDelta = prev && p.vals[f.key] != null && prev.vals[f.key] != null
          return (
            <tr key={p.dateKey}>
              <td>{formatUKShort(p.dateKey)}</td>
              <td>{def.fmt(p.vals)}</td>
              <td>{canDelta ? def.delta(prev.vals[f.key], p.vals[f.key]) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function Measurements({ onBack }) {
  const [fromKey, setFromKey] = useState(addDays(todayKey(), -29))
  const [toKey, setToKey] = useState(todayKey())
  const [byKey, setByKey] = useState({})
  const [units, setUnits] = useState(loadUnits)
  const [include, setInclude] = useState({ weight: true, chest: true, waist: true, bp: true })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let alive = true
    getAllDays().then((days) => {
      if (alive) setByKey(Object.fromEntries(days.map((d) => [d.dateKey, d])))
    })
    return () => { alive = false }
  }, [])

  const changeUnits = (patch) => {
    const next = { ...units, ...patch }
    setUnits(next)
    saveUnits(next)
  }

  const rangeValid = fromKey && toKey && fromKey <= toKey
  const keys = useMemo(() => (rangeValid ? enumerateDateRange(fromKey, toKey) : []), [fromKey, toKey, rangeValid])
  const defs = useMemo(() => buildDefs(units), [units])
  const series = useMemo(() => defs.map((d) => ({ def: d, points: collect(d, byKey, keys) })), [defs, byKey, keys])

  const exportable = series.filter((s) => include[s.def.id] && s.points.length > 0)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportBlocksAsPDF('measure-print-sheet', `project-abc-measurements-${fromKey}_to_${toKey}.pdf`)
    } catch (err) {
      alert(err.message || 'Could not export measurements.')
    } finally {
      setExporting(false)
    }
  }

  const unitToggleFor = (id) => {
    if (id === 'weight') return <UnitToggle units={WEIGHT_UNITS} value={units.weight} onChange={(u) => changeUnits({ weight: u })} />
    if (id === 'chest') return <UnitToggle units={LENGTH_UNITS} value={units.chest} onChange={(u) => changeUnits({ chest: u })} />
    if (id === 'waist') return <UnitToggle units={LENGTH_UNITS} value={units.waist} onChange={(u) => changeUnits({ waist: u })} />
    return null
  }

  return (
    <div className="panel">
      <button className="back" onClick={onBack}>&#8592; Home</button>
      <h2>Measurements</h2>

      <div className="report-controls">
        <label className="report-date-field">
          From
          <input type="date" value={fromKey} onChange={(e) => setFromKey(e.target.value)} />
        </label>
        <label className="report-date-field">
          To
          <input type="date" value={toKey} onChange={(e) => setToKey(e.target.value)} />
        </label>
      </div>
      {!rangeValid && <div className="add-food-error">Choose a start date that is on or before the end date.</div>}

      <button
        className="btn-secondary report-share-btn"
        onClick={handleExport}
        disabled={exporting || !exportable.length}
      >
        {exporting ? 'Preparing PDF…' : '↑ Export PDF'}
      </button>
      {rangeValid && !exportable.length && (
        <div className="journal-hint" style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
          Nothing to export: switch on at least one measurement that has readings in this range.
        </div>
      )}

      <div className="report-sheet">
        <div className="report-sheet-title">Project ABC {'—'} Measurements</div>
        <div className="report-sheet-range">{rangeValid ? `${formatUKShort(fromKey)} – ${formatUKShort(toKey)}` : ''}</div>

        {series.map(({ def, points }) => (
          <div key={def.id} className={`measure-section${include[def.id] ? '' : ' excluded'}`}>
            <div className="measure-section-head">
              <div className="report-chart-title">{def.title}</div>
              <label className="include-toggle">
                <input
                  type="checkbox"
                  checked={include[def.id]}
                  onChange={(e) => setInclude({ ...include, [def.id]: e.target.checked })}
                />
                <span className="include-switch" />
                <span className="include-label">In PDF</span>
              </label>
            </div>
            <div className="measure-unit-row">{unitToggleFor(def.id)}</div>
            {points.length === 0 ? (
              <div className="measure-empty">No readings in this date range.</div>
            ) : (
              <>
                <div className="report-chart-block">
                  <MeasureChart def={def} points={points} spanDays={keys.length} fromKey={fromKey} height={170} />
                </div>
                <Summary def={def} points={points} />
                <MeasureTable def={def} points={points} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Hidden print copy, laid out into A4 pages block by block. Only the
          measurements switched on above (and having readings) are included. */}
      <div id="measure-print-sheet" className="pdf-sheet" style={{ position: 'absolute', left: '-9999px', top: 0, width: '760px' }}>
        <div className="pdf-block">
          <div className="report-sheet-title">Project ABC {'—'} Measurements</div>
          <div className="report-sheet-range">{rangeValid ? `${formatUKShort(fromKey)} – ${formatUKShort(toKey)}` : ''}</div>
        </div>
        {exportable.map(({ def, points }) => {
          const chunks = []
          for (let i = 0; i < points.length; i += TABLE_ROWS_PER_BLOCK) chunks.push(points.slice(i, i + TABLE_ROWS_PER_BLOCK))
          return [
            <div key={`${def.id}-h`} className="pdf-block" data-keep-next="1"><div className="pdf-section-title">{def.title}</div></div>,
            <div key={`${def.id}-c`} className="pdf-block"><MeasureChart def={def} points={points} spanDays={keys.length} fromKey={fromKey} height={220} /></div>,
            <div key={`${def.id}-s`} className="pdf-block"><Summary def={def} points={points} /></div>,
            ...chunks.map((c, i) => (
              <div key={`${def.id}-t${i}`} className="pdf-block">
                <MeasureTable def={def} points={c} prev={i > 0 ? points[i * TABLE_ROWS_PER_BLOCK - 1] : null} />
              </div>
            ))
          ]
        })}
      </div>
    </div>
  )
}
