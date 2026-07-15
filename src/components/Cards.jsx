import { useState, useEffect, useRef } from 'react'

export function EntryCard({ catClass, title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="entry-card">
      <button className="entry-card-header" onClick={() => setOpen((o) => !o)}>
        <span className="label-group">
          <span className={`cat-dot ${catClass}`} />
          <span className="title">{title}</span>
        </span>
        <span className="label-group">
          <span className="summary">{summary}</span>
          <span className="chevron">{open ? '\u2212' : '+'}</span>
        </span>
      </button>
      {open && <div className="entry-card-body">{children}</div>}
    </div>
  )
}

// --- Weight -----------------------------------------------------------
export function WeightCard({ data, onSave }) {
  const [kg, setKg] = useState(data?.kg ?? '')
  useEffect(() => setKg(data?.kg ?? ''), [data])

  const summary = data?.kg ? `${data.kg} kg` : 'Not logged'

  return (
    <EntryCard catClass="weight" title="Weight" summary={summary}>
      <div className="field-row">
        <label>Weight (kg)</label>
        <input
          type="number"
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          onBlur={() => kg !== '' && onSave({ kg: parseFloat(kg) })}
        />
      </div>
      <div className="save-hint">Saves automatically when you tap away.</div>
    </EntryCard>
  )
}

// --- Medication (Mounjaro / GLP-1) ------------------------------------
export function MedsCard({ data, onSave }) {
  const [form, setForm] = useState({
    doseMg: data?.doseMg ?? '',
    site: data?.site ?? '',
    sideEffects: data?.sideEffects ?? '',
    appetite: data?.appetite ?? 5
  })
  useEffect(() => {
    setForm({
      doseMg: data?.doseMg ?? '',
      site: data?.site ?? '',
      sideEffects: data?.sideEffects ?? '',
      appetite: data?.appetite ?? 5
    })
  }, [data])

  const summary = data?.doseMg ? `${data.doseMg} mg \u00b7 ${data.site || ''}` : 'Not logged'

  return (
    <EntryCard catClass="meds" title="Mounjaro" summary={summary}>
      <div className="field-row">
        <label>Dose (mg)</label>
        <input
          type="number" step="0.5"
          value={form.doseMg}
          onChange={(e) => setForm({ ...form, doseMg: e.target.value })}
          onBlur={() => onSave({ ...form, doseMg: parseFloat(form.doseMg) || form.doseMg })}
        />
      </div>
      <div className="field-row">
        <label>Injection site</label>
        <select
          value={form.site}
          onChange={(e) => { const v = e.target.value; setForm({ ...form, site: v }); onSave({ ...form, site: v }) }}
        >
          <option value="">Select</option>
          <option value="Abdomen L">Abdomen – left</option>
          <option value="Abdomen R">Abdomen – right</option>
          <option value="Thigh L">Thigh – left</option>
          <option value="Thigh R">Thigh – right</option>
          <option value="Upper arm">Upper arm</option>
        </select>
      </div>
      <div className="field-row">
        <label>Appetite (1–10)</label>
        <input
          type="number" min="1" max="10"
          value={form.appetite}
          onChange={(e) => setForm({ ...form, appetite: e.target.value })}
          onBlur={() => onSave({ ...form, appetite: parseInt(form.appetite) })}
        />
      </div>
      <div className="field-row">
        <label>Side effects</label>
        <AutoTextarea
          value={form.sideEffects}
          onChange={(e) => setForm({ ...form, sideEffects: e.target.value })}
          onBlur={() => onSave({ ...form, sideEffects: form.sideEffects })}
        />
      </div>
    </EntryCard>
  )
}

// --- Auto-growing textarea -------------------------------------------------
// Expands to fit whatever's typed, instead of scrolling internally.
function AutoTextarea({ value, onChange, onBlur, placeholder }) {
  const ref = useRef(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(resize, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onInput={resize}
      placeholder={placeholder}
    />
  )
}

// --- Toggle switch (binary yes/no) ---------------------------------------
function ToggleSwitch({ value, onChange, onLabel = 'Yes', offLabel = 'No' }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`toggle-switch${value ? ' on' : ''}`}
      type="button"
    >
      <span className="toggle-knob" />
      <span className="toggle-text">{value ? onLabel : offLabel}</span>
    </button>
  )
}

// --- Chip group (None / Light / Normal / Big) -----------------------------
export const SIZE_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'Light', value: 1 },
  { label: 'Normal', value: 2 },
  { label: 'Big', value: 3 }
]

// Fasting gets its own scale — duration, not portion size.
export const FASTING_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '12h', value: 12 },
  { label: '18h', value: 18 },
  { label: '24h', value: 24 }
]

function ChipGroup({ value, onChange, options = SIZE_OPTIONS }) {
  return (
    <div className="chip-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`chip${value === opt.value ? ' selected' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function matchIndicator(plan, actual) {
  if (plan == null || actual == null) return null
  if (plan === actual) return <span className="match-indicator match">✓</span>
  if (actual > plan) return <span className="match-indicator over">↑</span>
  return <span className="match-indicator under">↓</span>
}

const SLOTS = [
  { key: 'fasting', label: 'Fasting' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'other', label: 'Other food' }
]

const emptySlot = () => ({ plan: null, actual: null })

// --- Food -------------------------------------------------------------
// Two layers: quick plan/actual size chips per slot (for an at-a-glance
// "how on-plan was I" read), plus day-level sugar (plan + actual, each
// with an optional comment) and a once-a-day macro total.
export function FoodCard({ data, onSave }) {
  const [slots, setSlots] = useState(data?.slots ?? Object.fromEntries(SLOTS.map((s) => [s.key, emptySlot()])))
  const [sugarPlan, setSugarPlan] = useState(data?.sugarPlan ?? { yes: false, comment: '' })
  const [sugarActual, setSugarActual] = useState(data?.sugarActual ?? { yes: false, comment: '' })
  const [totals, setTotals] = useState({
    calories: data?.totals?.calories ?? '',
    protein: data?.totals?.protein ?? '',
    carbs: data?.totals?.carbs ?? '',
    fat: data?.totals?.fat ?? ''
  })

  useEffect(() => {
    setSlots(data?.slots ?? Object.fromEntries(SLOTS.map((s) => [s.key, emptySlot()])))
    setSugarPlan(data?.sugarPlan ?? { yes: false, comment: '' })
    setSugarActual(data?.sugarActual ?? { yes: false, comment: '' })
    setTotals({
      calories: data?.totals?.calories ?? '',
      protein: data?.totals?.protein ?? '',
      carbs: data?.totals?.carbs ?? '',
      fat: data?.totals?.fat ?? ''
    })
  }, [data])

  const persist = (patch) => {
    const next = {
      slots: patch.slots ?? slots,
      sugarPlan: patch.sugarPlan ?? sugarPlan,
      sugarActual: patch.sugarActual ?? sugarActual,
      totals: patch.totals ?? totals
    }
    onSave(next)
  }

  const setSlotValue = (key, layer, value) => {
    const next = { ...slots, [key]: { ...slots[key], [layer]: value } }
    setSlots(next)
    persist({ slots: next })
  }

  const commitTotals = (next) => {
    const parsed = {
      calories: parseFloat(next.calories) || 0,
      protein: parseFloat(next.protein) || 0,
      carbs: parseFloat(next.carbs) || 0,
      fat: parseFloat(next.fat) || 0
    }
    persist({ totals: parsed })
  }

  const summary = data?.totals?.calories ? `${data.totals.calories} kcal \u00b7 ${data.totals.protein ?? 0}g protein` : 'Not logged'

  return (
    <EntryCard catClass="food" title="Food" summary={summary}>
      {SLOTS.map((slot) => (
        <div key={slot.key} className="food-slot">
          <div className="food-slot-label">{slot.label}</div>
          <div className="food-slot-row">
            <span className="food-slot-tag">Plan</span>
            <ChipGroup
              value={slots[slot.key]?.plan}
              onChange={(v) => setSlotValue(slot.key, 'plan', v)}
              options={slot.key === 'fasting' ? FASTING_OPTIONS : SIZE_OPTIONS}
            />
          </div>
          <div className="food-slot-row">
            <span className="food-slot-tag">Actual</span>
            <ChipGroup
              value={slots[slot.key]?.actual}
              onChange={(v) => setSlotValue(slot.key, 'actual', v)}
              options={slot.key === 'fasting' ? FASTING_OPTIONS : SIZE_OPTIONS}
            />
            {matchIndicator(slots[slot.key]?.plan, slots[slot.key]?.actual)}
          </div>
        </div>
      ))}

      <div className="food-slot">
        <div className="food-slot-label">Sugar</div>
        <div className="field-row">
          <label>Plan – sugar?</label>
          <ToggleSwitch value={sugarPlan.yes} onChange={(v) => { const next = { ...sugarPlan, yes: v }; setSugarPlan(next); persist({ sugarPlan: next }) }} />
        </div>
        <div className="field-row">
          <AutoTextarea
            placeholder="e.g. booked exception — Suz's 50th"
            value={sugarPlan.comment}
            onChange={(e) => setSugarPlan({ ...sugarPlan, comment: e.target.value })}
            onBlur={() => persist({ sugarPlan })}
          />
        </div>
        <div className="field-row">
          <label>Actual – sugar?</label>
          <ToggleSwitch value={sugarActual.yes} onChange={(v) => { const next = { ...sugarActual, yes: v }; setSugarActual(next); persist({ sugarActual: next }) }} />
        </div>
        <div className="field-row">
          <AutoTextarea
            placeholder="What actually happened, if different from plan"
            value={sugarActual.comment}
            onChange={(e) => setSugarActual({ ...sugarActual, comment: e.target.value })}
            onBlur={() => persist({ sugarActual })}
          />
        </div>
      </div>

      <div className="food-slot">
        <div className="food-slot-label">Daily totals</div>
        <div className="field-row">
          <label>Calories</label>
          <input type="number" value={totals.calories}
            onChange={(e) => setTotals({ ...totals, calories: e.target.value })}
            onBlur={() => commitTotals(totals)} />
        </div>
        <div className="field-row">
          <label>Protein (g)</label>
          <input type="number" value={totals.protein}
            onChange={(e) => setTotals({ ...totals, protein: e.target.value })}
            onBlur={() => commitTotals(totals)} />
        </div>
        <div className="field-row">
          <label>Carbs (g)</label>
          <input type="number" value={totals.carbs}
            onChange={(e) => setTotals({ ...totals, carbs: e.target.value })}
            onBlur={() => commitTotals(totals)} />
        </div>
        <div className="field-row">
          <label>Fat (g)</label>
          <input type="number" value={totals.fat}
            onChange={(e) => setTotals({ ...totals, fat: e.target.value })}
            onBlur={() => commitTotals(totals)} />
        </div>
      </div>
      <div className="save-hint">Photo-based macro estimate arrives in a later iteration.</div>
    </EntryCard>
  )
}

// --- Binge -----------------------------------------------------------------
export function BingeCard({ data, onSave }) {
  const [form, setForm] = useState({ binge: data?.binge ?? false, comment: data?.comment ?? '' })
  useEffect(() => setForm({ binge: data?.binge ?? false, comment: data?.comment ?? '' }), [data])

  const summary = data?.binge ? 'Binge' : (data ? 'No binge' : 'Not logged')

  return (
    <EntryCard catClass="binge" title="Binge" summary={summary}>
      <div className="field-row">
        <label>Binge today?</label>
        <ToggleSwitch
          value={form.binge}
          onChange={(v) => { const next = { ...form, binge: v }; setForm(next); onSave(next) }}
        />
      </div>
      <div className="field-row">
        <label>Journal</label>
        <AutoTextarea
          placeholder="What happened — no judgement, just the facts."
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          onBlur={() => onSave({ ...form, comment: form.comment })}
        />
      </div>
    </EntryCard>
  )
}

// --- Activity ------------------------------------------------------------
export function ActivityCard({ data, onSave }) {
  const [form, setForm] = useState({
    type: data?.type ?? 'strength',
    steps: data?.steps ?? '',
    details: data?.details ?? ''
  })
  useEffect(() => {
    setForm({
      type: data?.type ?? 'strength',
      steps: data?.steps ?? '',
      details: data?.details ?? ''
    })
  }, [data])

  const summary = data?.details || data?.steps ? `${data.steps ? data.steps + ' steps' : ''} ${data.details ? '\u00b7 ' + data.details : ''}`.trim() : 'Not logged'

  return (
    <EntryCard catClass="activity" title="Activity" summary={summary}>
      <div className="field-row">
        <label>Steps</label>
        <input type="number" value={form.steps}
          onChange={(e) => setForm({ ...form, steps: e.target.value })}
          onBlur={() => onSave({ ...form, steps: parseInt(form.steps) || 0 })} />
      </div>
      <div className="field-row">
        <label>Type</label>
        <select value={form.type}
          onChange={(e) => { const v = e.target.value; setForm({ ...form, type: v }); onSave({ ...form, type: v }) }}>
          <option value="strength">Strength</option>
          <option value="cardio">Cardio</option>
          <option value="both">Both</option>
          <option value="rest">Rest day</option>
        </select>
      </div>
      <div className="field-row">
        <label>Details</label>
        <AutoTextarea value={form.details}
          onChange={(e) => setForm({ ...form, details: e.target.value })}
          onBlur={() => onSave({ ...form, details: form.details })} />
      </div>
    </EntryCard>
  )
}

// --- Check-in -------------------------------------------------------------
// Mood, plus the reflective food-thoughts and journal fields that used to
// live on the old Sugar card — this is now the one reflective space per day.
export function CheckInCard({ data, onSave }) {
  const [mood, setMood] = useState(data?.mood ?? 5)
  const [note, setNote] = useState(data?.note ?? '')
  const [foodThoughts, setFoodThoughts] = useState(data?.foodThoughts ?? '')
  const [journal, setJournal] = useState(data?.journal ?? '')

  useEffect(() => {
    setMood(data?.mood ?? 5)
    setNote(data?.note ?? '')
    setFoodThoughts(data?.foodThoughts ?? '')
    setJournal(data?.journal ?? '')
  }, [data])

  const commit = (patch) => onSave({ mood: parseInt(mood), note, foodThoughts, journal, ...patch })

  const summary = data?.mood ? `Mood ${data.mood}/10` : 'Not logged'

  return (
    <EntryCard catClass="checkin" title="Check-in" summary={summary}>
      <div className="field-row">
        <label>Mood (1–10)</label>
        <input type="number" min="1" max="10" value={mood}
          onChange={(e) => setMood(e.target.value)}
          onBlur={() => commit({ mood: parseInt(mood) })} />
      </div>
      <div className="field-row">
        <label>Note</label>
        <AutoTextarea value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => commit({ note })} />
      </div>
      <div className="field-row">
        <label>Food thoughts</label>
        <AutoTextarea
          placeholder="Fighting temptation? Chimp chatter? What was actually going on."
          value={foodThoughts}
          onChange={(e) => setFoodThoughts(e.target.value)}
          onBlur={() => commit({ foodThoughts })}
        />
      </div>
      <div className="field-row">
        <label>Journal</label>
        <AutoTextarea
          placeholder="Plan tomorrow, reflect on today, emotion removed."
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          onBlur={() => commit({ journal })}
        />
      </div>
      <div className="save-hint">AI chat check-in arrives once the Worker is connected end to end.</div>
    </EntryCard>
  )
}
