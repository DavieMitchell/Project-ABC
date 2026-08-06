import { useState, useEffect } from 'react'
import { getAllDays } from '../utils/db'
import { todayKey, addDays } from '../utils/date'
import { computeTotals, hasFoodLogged, emptyEntries } from './Cards'

function round(n) {
  return Math.round(n || 0)
}

function average(days, key) {
  if (!days.length) return 0
  const sum = days.reduce((acc, d) => acc + computeTotals(d.food?.entries ?? emptyEntries())[key], 0)
  return round(sum / days.length)
}

// refreshTrigger just needs to change identity whenever data changes
// elsewhere in the app (e.g. App.jsx's dayIndex) so this re-fetches.
export default function HomeStats({ refreshTrigger }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    getAllDays().then(setRows)
  }, [refreshTrigger])

  const today = todayKey()
  // Never include today — it's still being logged, so including it would
  // understate the average for a day that isn't finished yet.
  const eligible = rows.filter((d) => d.dateKey !== today && hasFoodLogged(d))

  const sevenDaysAgo = addDays(today, -7)
  const last7 = eligible.filter((d) => d.dateKey >= sevenDaysAgo && d.dateKey < today)

  if (!eligible.length) return null

  const stats = [
    { title: 'All', days: eligible },
    { title: '7 days', days: last7 }
  ]

  return (
    <div className="home-stats">
      <div className="home-stats-title">Averages</div>
      <div className="home-stats-grid">
        {stats.map((s) => (
          <div key={s.title} className="home-stats-card">
            <div className="home-stats-card-title">{s.title}</div>
            {s.days.length === 0 ? (
              <div className="home-stats-empty">Nothing logged yet</div>
            ) : (
              <>
                <div className="home-stats-row">
                  <span>Cals</span>
                  <span>{average(s.days, 'calories')}</span>
                </div>
                <div className="home-stats-row">
                  <span>Prot</span>
                  <span>{average(s.days, 'protein')}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
