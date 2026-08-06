import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { getAllDays } from '../utils/db'
import { addDays, todayKey, enumerateDateRange, formatUKShort } from '../utils/date'
import { computeTotals, emptyEntries } from './Cards'
import { linearTrend } from '../utils/stats'
import { exportElementAsPDF } from '../utils/pdfExport'
import { MACRO_COLORS } from '../utils/macroColors'

function round(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10
}

function shortDayLabel(dateKey) {
  const [, m, d] = dateKey.split('-')
  return `${d}/${m}`
}

const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: MACRO_COLORS.calories },
  { key: 'fat', label: 'Fat', unit: 'g', color: MACRO_COLORS.fat },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: MACRO_COLORS.carbs },
  { key: 'protein', label: 'Protein', unit: 'g', color: MACRO_COLORS.protein }
]

function MacroChart({ title, color, rows, dataKey, chartHeight }) {
  const values = rows.map((r) => r[dataKey])
  const trend = linearTrend(values)
  const chartData = rows.map((r, i) => ({ label: shortDayLabel(r.dateKey), value: r[dataKey], trend: trend[i] }))

  return (
    <div className="report-chart-block">
      <div className="report-chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis dataKey="label" tick={{ fill: '#5A5A5A', fontSize: 10 }} axisLine={{ stroke: '#CCCCCC' }} />
          <YAxis tick={{ fill: '#5A5A5A', fontSize: 10 }} axisLine={{ stroke: '#CCCCCC' }} />
          <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #D8D8D8', fontSize: 12, color: '#1A1A1A' }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="trend" stroke="#1A1A1A" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Shared content, rendered twice: once at mobile width for on-screen viewing,
// once inside a hidden, wider container sized for an actual A4 page — used
// only when generating the PDF, so the export doesn't look like a stretched
// phone screenshot.
function ReportContent({ fromKey, toKey, rows, averages, chartHeight }) {
  const loggedCount = rows.filter((r) => r.logged).length
  return (
    <>
      <div className="report-sheet-title">Project ABC — Food Report</div>
      <div className="report-sheet-range">{formatUKShort(fromKey)} – {formatUKShort(toKey)}</div>

      <div className="report-logged-note">
        Averages based on {loggedCount} of {rows.length} day{rows.length === 1 ? '' : 's'} in range that had food logged.
      </div>

      <div className="report-averages">
        {MACROS.map((m) => (
          <div key={m.key} className="report-average-cell">
            <div className="report-average-value" style={{ color: m.color }}>{Math.round(averages[m.key])}</div>
            <div className="report-average-label">Avg {m.label}<br />({m.unit})</div>
          </div>
        ))}
      </div>

      {MACROS.map((m) => (
        <MacroChart key={m.key} title={`${m.label} (${m.unit})`} color={m.color} rows={rows} dataKey={m.key} chartHeight={chartHeight} />
      ))}
    </>
  )
}

export default function Report({ onBack }) {
  const [fromKey, setFromKey] = useState(addDays(todayKey(), -6))
  const [toKey, setToKey] = useState(todayKey())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const runReport = async () => {
    setLoading(true)
    const keys = enumerateDateRange(fromKey, toKey)
    const allDays = await getAllDays()
    const byKey = Object.fromEntries(allDays.map((d) => [d.dateKey, d]))
    const data = keys.map((k) => {
      const day = byKey[k]
      const entries = day?.food?.entries ?? emptyEntries()
      const logged = Object.values(entries).some((meal) => Array.isArray(meal) && meal.length > 0)
      const totals = computeTotals(entries)
      return { dateKey: k, logged, ...totals }
    })
    setRows(data)
    setLoading(false)
  }

  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const averages = useMemo(() => {
    const loggedRows = rows.filter((r) => r.logged)
    if (!loggedRows.length) return { calories: 0, fat: 0, carbs: 0, protein: 0 }
    const sum = loggedRows.reduce(
      (acc, r) => ({
        calories: acc.calories + r.calories,
        fat: acc.fat + r.fat,
        carbs: acc.carbs + r.carbs,
        protein: acc.protein + r.protein
      }),
      { calories: 0, fat: 0, carbs: 0, protein: 0 }
    )
    return {
      calories: round(sum.calories / loggedRows.length),
      fat: round(sum.fat / loggedRows.length),
      carbs: round(sum.carbs / loggedRows.length),
      protein: round(sum.protein / loggedRows.length)
    }
  }, [rows])

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportElementAsPDF('print-sheet', `project-abc-report-${fromKey}_to_${toKey}.pdf`)
    } catch (err) {
      alert(err.message || 'Could not export the report.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="panel">
      <button className="back" onClick={onBack}>&#8592; Home</button>
      <h2>Report</h2>

      <div className="report-controls">
        <label className="report-date-field">
          From
          <input type="date" value={fromKey} onChange={(e) => setFromKey(e.target.value)} />
        </label>
        <label className="report-date-field">
          To
          <input type="date" value={toKey} onChange={(e) => setToKey(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={runReport} disabled={loading}>
          {loading ? 'Loading\u2026' : 'Generate Report'}
        </button>
      </div>

      <button className="btn-secondary report-share-btn" onClick={handleExport} disabled={exporting || !rows.length}>
        {exporting ? 'Preparing PDF\u2026' : '\u2191 Share as PDF'}
      </button>

      <div id="report-sheet" className="report-sheet">
        <ReportContent fromKey={fromKey} toKey={toKey} rows={rows} averages={averages} chartHeight={140} />
      </div>

      {/* Hidden, A4-proportioned copy used only for PDF export — off-screen,
          not display:none, so html2canvas can still render it. */}
      <div id="print-sheet" className="report-sheet print-sheet" style={{ position: 'absolute', left: '-9999px', top: 0, width: '760px' }}>
        <ReportContent fromKey={fromKey} toKey={toKey} rows={rows} averages={averages} chartHeight={170} />
      </div>
    </div>
  )
}
