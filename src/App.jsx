import { useEffect, useState, useCallback } from 'react'
import Calendar from './components/Calendar'
import DayView from './components/DayView'
import Settings from './components/Settings'
import { getAllDays, getDay, saveDaySection } from './utils/db'
import { todayKey } from './utils/date'

const SECTIONS = ['weight', 'meds', 'food', 'binge', 'activity', 'checkIn']

export default function App() {
  const today = new Date()
  const [view, setView] = useState('calendar') // 'calendar' | 'day' | 'settings'
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayIndex, setDayIndex] = useState({}) // dateKey -> [logged sections]

  const refreshIndex = useCallback(async () => {
    const days = await getAllDays()
    const index = {}
    for (const d of days) {
      index[d.dateKey] = SECTIONS.filter((s) => d[s] != null)
    }
    setDayIndex(index)
  }, [])

  useEffect(() => { refreshIndex() }, [refreshIndex])

  const openDay = async (dateKey) => {
    const day = await getDay(dateKey)
    setSelectedKey(dateKey)
    setSelectedDay(day)
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

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>Project ABC</h1>
        <div className="tools">
          {view !== 'settings' && (
            <button className="icon-btn" onClick={() => setView('settings')}>Data</button>
          )}
          {view !== 'calendar' && (
            <button className="icon-btn" onClick={() => openDay(todayKey())}>Today</button>
          )}
        </div>
      </div>

      {view === 'calendar' && (
        <Calendar
          year={year}
          month={month}
          onChangeMonth={changeMonth}
          dayIndex={dayIndex}
          onSelectDay={openDay}
        />
      )}

      {view === 'day' && selectedDay && (
        <DayView
          dateKey={selectedKey}
          day={selectedDay}
          onBack={() => setView('calendar')}
          onSaveSection={saveSection}
        />
      )}

      {view === 'settings' && (
        <Settings onBack={() => setView('calendar')} onDataChanged={refreshIndex} />
      )}
    </div>
  )
}
