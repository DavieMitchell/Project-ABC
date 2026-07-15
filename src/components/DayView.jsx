import { formatUKLong } from '../utils/date'
import { WeightCard, MedsCard, FoodCard, BingeCard, ActivityCard, CheckInCard } from './Cards'

export default function DayView({ dateKey, day, onBack, onSaveSection }) {
  return (
    <div>
      <div className="day-view-header">
        <button className="back" onClick={onBack}>&#8592; Calendar</button>
        <div className="date-display">{formatUKLong(dateKey)}</div>
      </div>
      <div className="card-stack">
        <WeightCard data={day.weight} onSave={(d) => onSaveSection('weight', d)} />
        <MedsCard data={day.meds} onSave={(d) => onSaveSection('meds', d)} />
        <FoodCard data={day.food} onSave={(d) => onSaveSection('food', d)} />
        <BingeCard data={day.binge} onSave={(d) => onSaveSection('binge', d)} />
        <ActivityCard data={day.activity} onSave={(d) => onSaveSection('activity', d)} />
        <CheckInCard data={day.checkIn} onSave={(d) => onSaveSection('checkIn', d)} />
      </div>
    </div>
  )
}
