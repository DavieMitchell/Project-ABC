import { useState, useMemo } from 'react'
import { formatUKWeekdayLong } from '../utils/date'
import { FoodCard, MEALS, computeTotals, emptyEntries } from './Cards'
import { MACRO_COLORS } from '../utils/macroColors'
import { exportBlocksAsPDF } from '../utils/pdfExport'
import { JournalCard, MeasurementsCard } from './DayCards'
import { useAutosave } from '../utils/useAutosave'
import { loadUnits, saveUnits, formatWeight, formatLength } from '../utils/units'

const DAY_MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: MACRO_COLORS.calories },
  { key: 'fat', label: 'Fat', unit: 'g', color: MACRO_COLORS.fat },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: MACRO_COLORS.carbs },
  { key: 'protein', label: 'Protein', unit: 'g', color: MACRO_COLORS.protein }
]

// Split journal text into paragraph-sized chunks so the multi-page PDF can
// break between them instead of slicing through a line of text.
function journalChunks(text) {
  const out = []
  for (const para of text.replace(/\r/g, '').split(/\n{2,}/)) {
    let rest = para.replace(/\s+$/, '')
    if (!rest.trim()) continue
    while (rest.length > 700) {
      let cut = Math.max(rest.lastIndexOf('\n', 700), rest.lastIndexOf(' ', 700))
      if (cut < 300) cut = 700
      out.push(rest.slice(0, cut))
      rest = rest.slice(cut).replace(/^\s+/, '')
    }
    out.push(rest)
  }
  return out
}

const cleanMeasurements = (m) => {
  const out = {}
  for (const k of ['weightKg', 'chestCm', 'waistCm', 'bpSys', 'bpDia']) if (m[k] != null) out[k] = m[k]
  return Object.keys(out).length ? out : null
}

export default function DayView({ dateKey, day, onBack, onSaveSection, onClearDay, onPrevDay, onNextDay, onToday }) {
  const [exporting, setExporting] = useState(false)
  const entries = day.food?.entries ?? emptyEntries()
  const totals = computeTotals(entries)

  const [journalText, setJournalText] = useState(day.journal?.text ?? '')
  const [meas, setMeas] = useState(day.measurements ?? {})
  const [units, setUnits] = useState(loadUnits)
  const changeUnits = (u) => { setUnits(u); saveUnits(u) }

  useAutosave(journalText, (t) => onSaveSection('journal', t.trim() ? { text: t } : null, dateKey))
  useAutosave(meas, (m) => onSaveSection('measurements', cleanMeasurements(m), dateKey))

  const chunks = useMemo(() => journalChunks(journalText), [journalText])
  const cleanMeas = cleanMeasurements(meas)
  const foodCount = Object.values(entries).reduce((n, m) => n + m.length, 0)

  const handleExportDay = async () => {
    setExporting(true)
    try {
      await exportBlocksAsPDF('day-print-sheet', `project-abc-day-${dateKey}.pdf`)
    } catch (err) {
      alert(err.message || 'Could not export this day.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="day-view-header">
        <div className="day-header-top">
          <button className="back" onClick={onBack}>&#8592; Home</button>
          <button className="back" onClick={onToday}>Today</button>
        </div>
        <div className="date-nav">
          <button className="date-nav-arrow" onClick={onPrevDay} aria-label="Previous day">&#8249;</button>
          <div className="date-display">{formatUKWeekdayLong(dateKey)}</div>
          <button className="date-nav-arrow" onClick={onNextDay} aria-label="Next day">&#8250;</button>
        </div>
        <button className="btn-secondary export-day-btn" onClick={handleExportDay} disabled={exporting}>
          {exporting ? 'Preparing PDF\u2026' : '\u2191 Export Day'}
        </button>
      </div>
      <div className="card-stack">
        <FoodCard data={day.food} onSave={(d) => onSaveSection('food', d, dateKey)} onClearDay={onClearDay} />
        <JournalCard text={journalText} onChange={setJournalText} />
        <MeasurementsCard values={meas} onChange={setMeas} units={units} onUnits={changeUnits} />
      </div>

      {/* Hidden, wide print-formatted copy of this day's log, used only when
          Export Day is tapped. Each direct child (.pdf-block) is laid out
          on A4 pages by exportBlocksAsPDF, so long journals run onto
          further pages instead of shrinking. */}
      <div
        id="day-print-sheet"
        className="pdf-sheet"
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '760px' }}
      >
        <div className="pdf-block">
          <div className="report-sheet-title">Project ABC — Day Log</div>
          <div className="report-sheet-range">{formatUKWeekdayLong(dateKey)}</div>
        </div>

        <div className="pdf-block">
          <div className="report-averages">
            {DAY_MACROS.map((m) => (
              <div key={m.key} className="report-average-cell">
                <div className="report-average-value" style={{ color: m.color }}>{Math.round(totals[m.key])}</div>
                <div className="report-average-label">{m.label}<br />({m.unit})</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pdf-block" data-keep-next="1"><div className="pdf-section-title">Food</div></div>
        {foodCount === 0 && <div className="pdf-block"><div className="day-print-empty">Nothing logged for this day.</div></div>}
        {MEALS.map((meal) => {
          const items = entries[meal.key] || []
          if (items.length === 0) return null
          return [
            <div key={meal.key} className="pdf-block" data-keep-next="1">
              <div className="day-print-meal-title">{meal.label}</div>
            </div>,
            ...items.map((item) => (
              <div key={item.id} className="pdf-block day-print-entry">
                <div className="day-print-entry-name">{item.name}</div>
                <div className="day-print-entry-macros">
                  {Math.round(item.calories)} kcal &middot; Fat {Math.round(item.fat)}g &middot; Carbs {Math.round(item.carbs)}g &middot; Protein {Math.round(item.protein)}g
                </div>
                {item.sourceText && <div className="day-print-entry-note">“{item.sourceText}”</div>}
              </div>
            ))
          ]
        })}

        {chunks.length > 0 && <div className="pdf-block" data-keep-next="1"><div className="pdf-section-title">Journal</div></div>}
        {chunks.map((c, i) => (
          <div key={i} className="pdf-block journal-print">{c}</div>
        ))}

        {cleanMeas && <div className="pdf-block" data-keep-next="1"><div className="pdf-section-title">Measurements</div></div>}
        {cleanMeas && (
          <div className="pdf-block">
            <div className="measure-print-grid">
              {cleanMeas.weightKg != null && (
                <div className="report-average-cell">
                  <div className="measure-print-value">{formatWeight(cleanMeas.weightKg, units.weight)}</div>
                  <div className="report-average-label">Weight</div>
                </div>
              )}
              {cleanMeas.chestCm != null && (
                <div className="report-average-cell">
                  <div className="measure-print-value">{formatLength(cleanMeas.chestCm, units.chest)}</div>
                  <div className="report-average-label">Chest</div>
                </div>
              )}
              {cleanMeas.waistCm != null && (
                <div className="report-average-cell">
                  <div className="measure-print-value">{formatLength(cleanMeas.waistCm, units.waist)}</div>
                  <div className="report-average-label">Waist</div>
                </div>
              )}
              {(cleanMeas.bpSys != null || cleanMeas.bpDia != null) && (
                <div className="report-average-cell">
                  <div className="measure-print-value">{cleanMeas.bpSys ?? '\u2014'}/{cleanMeas.bpDia ?? '\u2014'}</div>
                  <div className="report-average-label">Blood pressure (mmHg)</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
