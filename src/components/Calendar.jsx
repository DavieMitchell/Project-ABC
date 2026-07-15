import { getMonthMatrix, UK_WEEKDAYS, MONTH_NAMES, toDateKey, todayKey } from '../utils/date'

const SECTION_ORDER = ['weight', 'meds', 'food', 'activity', 'checkIn']

export default function Calendar({ year, month, onChangeMonth, dayIndex, onSelectDay }) {
  const weeks = getMonthMatrix(year, month)
  const today = todayKey()

  return (
    <div>
      <div className="calendar-header">
        <button onClick={() => onChangeMonth(-1)} aria-label="Previous month">&#8249;</button>
        <span className="month-label">{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => onChangeMonth(1)} aria-label="Next month">&#8250;</button>
      </div>

      <div className="weekday-row">
        {UK_WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="calendar-grid">
        {weeks.flat().map((date, i) => {
          if (!date) return <div key={i} className="day-cell empty" />
          const key = toDateKey(date)
          const logged = dayIndex[key] || []
          const isToday = key === today
          return (
            <button
              key={key}
              className={`day-cell${isToday ? ' is-today' : ''}`}
              onClick={() => onSelectDay(key)}
            >
              <span className="day-num">{date.getDate()}</span>
              <span className="dots">
                {SECTION_ORDER.filter((s) => logged.includes(s)).map((s) => (
                  <span key={s} className={`dot ${s}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
