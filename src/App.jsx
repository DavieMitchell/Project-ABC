import { useEffect, useState, useCallback } from 'react'
import Calendar from './components/Calendar'
import DayView from './components/DayView'
import Settings from './components/Settings'
import Report from './components/Report'
import HomeStats from './components/HomeStats'
import { hasFoodLogged } from './components/Cards'
import { getAllDays, getDay, saveDaySection, deleteDaySection } from './utils/db'
import { todayKey, addDays, fromDateKey } from './utils/date'

export default function App() {
  const today = new Date()
  const [view, setView] = useState('calendar') // 'calendar' | 'day' | 'settings' | 'report'
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayIndex, setDayIndex] = useState({}) // dateKey -> [logged sections]
  const [menuOpen, setMenuOpen] = useState(false)

  const refreshIndex = useCallback(async () => {
    const days = await getAllDays()
    const index = {}
    for (const d of days) {
      index[d.dateKey] = hasFoodLogged(d) ? ['food'] : []
    }
    setDayIndex(index)
  }, [])

  useEffect(() => { refreshIndex() }, [refreshIndex])

  const openDay = async (dateKey) => {
    const day = await getDay(dateKey)
    setSelectedKey(dateKey)
    setSelectedDay(day)
    const d = fromDateKey(dateKey)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setView('day')
  }

  const changeMonth = (delta) => {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setMonth(m)
    setYear(y)
  }

  const saveSection = async (section, data) => {
    const updated = await saveDaySection(selectedKey, section, data)
    setSelectedDay(updated)
    refreshIndex()
  }

  const clearDay = async () => {
    const updated = await deleteDaySection(selectedKey, 'food')
    setSelectedDay(updated)
    refreshIndex()
  }

  const goToDay = (delta) => openDay(addDays(selectedKey, delta))

  const goTo = (nextView) => {
    setView(nextView)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-title">
          <h1>Project ABC</h1>
          <div className="top-bar-subtitle">The place to track your health</div>
        </div>
        <div className="tools">
          {view === 'day' && (
            <button className="icon-btn" onClick={() => openDay(todayKey())}>Today</button>
          )}
          <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">&times;</button>
            <button className="menu-item" onClick={() => goTo('settings')}>Data</button>
            <button className="menu-item" onClick={() => goTo('report')}>Report</button>
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <>
          <Calendar
            year={year}
            month={month}
            onChangeMonth={changeMonth}
            dayIndex={dayIndex}
            onSelectDay={openDay}
          />
          <HomeStats refreshTrigger={dayIndex} />
        </>
      )}

      {view === 'day' && selectedDay && (
        <DayView
          dateKey={selectedKey}
          day={selectedDay}
          onBack={() => setView('calendar')}
          onSaveSection={saveSection}
          onClearDay={clearDay}
          onPrevDay={() => goToDay(-1)}
          onNextDay={() => goToDay(1)}
        />
      )}

      {view === 'settings' && (
        <Settings onBack={() => setView('calendar')} onDataChanged={refreshIndex} />
      )}

      {view === 'report' && (
        <Report onBack={() => setView('calendar')} />
      )}
    </div>
  )
}
