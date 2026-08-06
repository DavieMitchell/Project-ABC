import { useState } from 'react'
import { formatUKWeekdayLong } from '../utils/date'
import { FoodCard, MEALS, computeTotals, emptyEntries } from './Cards'
import { MACRO_COLORS } from '../utils/macroColors'
import { exportElementAsPDF } from '../utils/pdfExport'

const DAY_MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: MACRO_COLORS.calories },
  { key: 'fat', label: 'Fat', unit: 'g', color: MACRO_COLORS.fat },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: MACRO_COLORS.carbs },
  { key: 'protein', label: 'Protein', unit: 'g', color: MACRO_COLORS.protein }
]

export default function DayView({ dateKey, day, onBack, onSaveSection, onClearDay, onPrevDay, onNextDay }) {
  const [exporting, setExporting] = useState(false)
  const entries = day.food?.entries ?? emptyEntries()
  const totals = computeTotals(entries)

  const handleExportDay = async () => {
    setExporting(true)
    try {
      await exportElementAsPDF('day-print-sheet', `project-abc-day-${dateKey}.pdf`)
    } catch (err) {
      alert(err.message || 'Could not export this day.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="day-view-header">
        <button className="back" onClick={onBack}>&#8592; Home</button>
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
        <FoodCard data={day.food} onSave={(d) => onSaveSection('food', d)} onClearDay={onClearDay} />
      </div>

      {/* Hidden, wide print-formatted copy of this day's log — used only
          when Export Day is tapped, so the PDF looks like a real document
          rather than a stretched phone screenshot. */}
      <div
        id="day-print-sheet"
        className="report-sheet print-sheet"
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '760px' }}
      >
        <div className="report-sheet-title">Project ABC — Day Log</div>
        <div className="report-sheet-range">{formatUKWeekdayLong(dateKey)}</div>

        <div className="report-averages">
          {DAY_MACROS.map((m) => (
            <div key={m.key} className="report-average-cell">
              <div className="report-average-value" style={{ color: m.color }}>{Math.round(totals[m.key])}</div>
              <div className="report-average-label">{m.label}<br />({m.unit})</div>
            </div>
          ))}
        </div>

        {MEALS.map((meal) => {
          const items = entries[meal.key] || []
          if (items.length === 0) return null
          return (
            <div key={meal.key} className="day-print-meal">
              <div className="day-print-meal-title">{meal.label}</div>
              {items.map((item) => (
                <div key={item.id} className="day-print-entry">
                  <div className="day-print-entry-name">{item.name}</div>
                  <div className="day-print-entry-macros">
                    {Math.round(item.calories)} kcal &middot; Fat {Math.round(item.fat)}g &middot; Carbs {Math.round(item.carbs)}g &middot; Protein {Math.round(item.protein)}g
                  </div>
                  {item.sourceText && <div className="day-print-entry-note">“{item.sourceText}”</div>}
                </div>
              ))}
            </div>
          )
        })}

        {Object.values(entries).every((meal) => meal.length === 0) && (
          <div className="day-print-empty">Nothing logged for this day.</div>
        )}
      </div>
    </div>
  )
}
