import { useState, useRef, useEffect } from 'react'
import { logFood } from '../utils/api'
import { MACRO_COLORS } from '../utils/macroColors'

// --- Generic collapsible card (Food is the only card left, but kept
// generic in case anything is ever added back) --------------------------
// `alwaysVisible` renders below the header whether the card is open or
// closed (used for the macro summary row); `children` only renders when open.
export function EntryCard({ catClass, title, alwaysVisible, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="entry-card">
      <button className="entry-card-header" onClick={() => setOpen((o) => !o)}>
        <span className="label-group">
          <span className={`cat-dot ${catClass}`} />
          <span className="title">{title}</span>
        </span>
        <span className="chevron">{open ? '\u2212' : '+'}</span>
      </button>
      {alwaysVisible}
      {open && <div className="entry-card-body">{children}</div>}
    </div>
  )
}

// Whole numbers only for on-screen display — stored values keep one
// decimal place internally (for accurate report totals), this is just
// how they're shown, and keeps chip width predictable.
function fmt0(n) {
  return Math.round(n || 0)
}

// --- Shared macro chips: single accent colour, fixed width, whole numbers -
// Same pattern for every chip: short label, then value, with the unit
// tucked directly against the number (no unit at all for calories, since
// "Cal" already says what it is — matches common food-tracker convention).
export function MacroChips({ totals, size = 'normal' }) {
  return (
    <div className={`macro-chips ${size}`}>
      <span className="macro-chip" style={{ color: MACRO_COLORS.calories }}>Cal {fmt0(totals.calories)}</span>
      <span className="macro-chip" style={{ color: MACRO_COLORS.fat }}>Fat {fmt0(totals.fat)}g</span>
      <span className="macro-chip" style={{ color: MACRO_COLORS.carbs }}>Carb {fmt0(totals.carbs)}g</span>
      <span className="macro-chip" style={{ color: MACRO_COLORS.protein }}>Pro {fmt0(totals.protein)}g</span>
    </div>
  )
}

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' }
]

export const emptyEntries = () => ({ breakfast: [], lunch: [], dinner: [], snacks: [] })

// A day only "counts" if it actually has at least one logged food entry —
// not just because a (possibly stale) `food` object exists on the record.
export function hasFoodLogged(day) {
  const entries = day?.food?.entries
  if (!entries) return false
  return Object.values(entries).some((meal) => Array.isArray(meal) && meal.length > 0)
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10
}

// Sum every logged entry across all meals into one totals object.
export function computeTotals(entries) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, saturatedFat: 0, fiber: 0 }
  for (const meal of Object.values(entries)) {
    for (const item of meal) {
      totals.calories += item.calories || 0
      totals.protein += item.protein || 0
      totals.carbs += item.carbs || 0
      totals.fat += item.fat || 0
      totals.sugar += item.sugar || 0
      totals.saturatedFat += item.saturatedFat || 0
      totals.fiber += item.fiber || 0
    }
  }
  for (const k in totals) totals[k] = round(totals[k])
  return totals
}

// Resize a data-URL image down to a small JPEG thumbnail, so the original
// photo can be kept for quick reference per entry without bloating storage
// or exports — a ~160px JPEG is a few KB, not the multi-hundred-KB original.
function makeThumbnail(dataUrl, maxSize = 160, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

// --- Macro summary row: colour-coded chips + expandable full breakdown ---
function MacroSummaryBar({ totals }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="macro-summary">
      <button className="macro-summary-row" onClick={() => setExpanded((e) => !e)}>
        <MacroChips totals={totals} />
        <span className="chevron">{expanded ? '\u2212' : '\u25be'}</span>
      </button>
      {expanded && (
        <div className="macro-breakdown">
          <div className="macro-breakdown-row"><span>Calories</span><span style={{ color: MACRO_COLORS.calories }}>{fmt0(totals.calories)} kcal</span></div>
          <div className="macro-breakdown-row"><span>Protein</span><span style={{ color: MACRO_COLORS.protein }}>{fmt0(totals.protein)} g</span></div>
          <div className="macro-breakdown-row"><span>Carbohydrates</span><span style={{ color: MACRO_COLORS.carbs }}>{fmt0(totals.carbs)} g</span></div>
          <div className="macro-breakdown-row indent"><span>of which sugars</span><span>{fmt0(totals.sugar)} g</span></div>
          <div className="macro-breakdown-row"><span>Fat</span><span style={{ color: MACRO_COLORS.fat }}>{fmt0(totals.fat)} g</span></div>
          <div className="macro-breakdown-row indent"><span>of which saturates</span><span>{fmt0(totals.saturatedFat)} g</span></div>
          <div className="macro-breakdown-row"><span>Fibre</span><span>{fmt0(totals.fiber)} g</span></div>
        </div>
      )}
    </div>
  )
}

// --- Add-food panel: one text box, plus an "Add Photo" button that can be
// tapped more than once to attach several photos. Text and photo(s) are
// sent to Claude together as a single entry — if a photo's attached, the
// text is treated as a description of it, not a separate item; with no
// photo, the text alone is the entry. Everything you're about to send is
// visible right here before you tap Send — that's the whole point of the
// layout, so there's no separate "review" step. -------------------------
function AddFoodPanel({ onAdd }) {
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState([]) // [{ base64, mediaType, previewUrl }]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result // data:image/jpeg;base64,....
      const base64 = result.split(',')[1]
      setPhotos((p) => [...p, { base64, mediaType: file.type, previewUrl: result }])
    }
    reader.readAsDataURL(file)
    e.target.value = '' // allow adding the same photo again if needed
  }

  const removePhoto = (index) => {
    setPhotos((p) => p.filter((_, i) => i !== index))
  }

  const send = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await logFood({
        text: text.trim(),
        images: photos.map((p) => ({ data: p.base64, mediaType: p.mediaType }))
      })
      const thumbnails = photos.length
        ? (await Promise.all(photos.map((p) => makeThumbnail(p.previewUrl).catch(() => null)))).filter(Boolean)
        : []
      onAdd(result, { sourceText: text.trim(), sourceThumbnails: thumbnails })
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.')
    } finally {
      setLoading(false)
    }
  }

  const canSend = text.trim().length > 0 || photos.length > 0

  return (
    <div className="add-food-panel">
      <div className="add-food-preview-label">What you're about to send:</div>

      <textarea
        className="add-food-text"
        placeholder={photos.length ? 'Describe the photo (optional) \u2014 e.g. brand, portion size' : 'Describe the food \u2014 e.g. two slices of wholemeal toast with peanut butter'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {photos.length > 0 && (
        <div className="add-food-photo-row">
          {photos.map((p, i) => (
            <div key={i} className="add-food-photo-thumb">
              <img src={p.previewUrl} alt={`Photo ${i + 1}`} />
              <button type="button" className="add-food-photo-remove" onClick={() => removePhoto(i)} aria-label="Remove photo">&times;</button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <div className="add-food-send-row">
        <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
          + Add Photo
        </button>
        <button className="btn-primary" onClick={send} disabled={loading || !canSend}>
          {loading ? 'Analysing\u2026' : 'Send \u2192'}
        </button>
      </div>

      {error && <div className="add-food-error">{error}</div>}
    </div>
  )
}

// --- A single logged food entry, with its original text/photo tucked
// behind a tap for quick reference. --------------------------------------
function FoodEntryRow({ item, onRemove }) {
  const [showSource, setShowSource] = useState(false)
  const thumbnails = item.sourceThumbnails || []
  const hasSource = item.sourceText || thumbnails.length > 0

  return (
    <div className="food-entry-row">
      <div className="food-entry-info">
        <button
          type="button"
          className="food-entry-name"
          onClick={() => hasSource && setShowSource((s) => !s)}
        >
          {item.name}
        </button>
        <MacroChips totals={item} size="small" />
        {showSource && (
          <div className="food-entry-source">
            {thumbnails.length > 0 && (
              <div className="food-entry-source-photos">
                {thumbnails.map((t, i) => <img key={i} src={t} alt={`Original photo ${i + 1}`} />)}
              </div>
            )}
            {item.sourceText && <span className="food-entry-source-text">“{item.sourceText}”</span>}
          </div>
        )}
      </div>
      <button className="food-entry-remove" onClick={onRemove} aria-label="Remove">&times;</button>
    </div>
  )
}

// --- One meal section: collapsible, tap the title to open/close. Tapping
// it closed also cancels any in-progress "Add food" entry. ----------------
function MealSection({ meal, items, open, onToggle, onAddEntry, onRemoveEntry }) {
  const [adding, setAdding] = useState(false)

  // If this section gets closed (by its own header, or by "Collapse all"
  // upstream), cancel any in-progress "Add food" entry too.
  useEffect(() => {
    if (!open) setAdding(false)
  }, [open])

  const handleAdd = (result, source) => {
    onAddEntry(meal.key, result, source)
    setAdding(false)
  }

  const mealTotal = fmt0(items.reduce((sum, i) => sum + (i.calories || 0), 0))

  return (
    <div className="meal-section">
      <button className="meal-section-header" onClick={onToggle}>
        <span className="meal-section-title">{meal.label}</span>
        <span className="meal-section-right">
          {items.length > 0 && <span className="meal-section-total">{mealTotal} kcal</span>}
          <span className="chevron">{open ? '\u2212' : '+'}</span>
        </span>
      </button>

      {open && (
        <div className="meal-section-body">
          {items.map((item) => (
            <FoodEntryRow key={item.id} item={item} onRemove={() => onRemoveEntry(meal.key, item.id)} />
          ))}

          {!adding && (
            <button className="add-food-link" onClick={() => setAdding(true)}>+ Add food</button>
          )}
          {adding && <AddFoodPanel onAdd={handleAdd} />}
        </div>
      )}
    </div>
  )
}

// --- Food -----------------------------------------------------------------
export function FoodCard({ data, onSave, onClearDay }) {
  const entries = data?.entries ?? emptyEntries()
  const totals = computeTotals(entries)
  const hasAnyData = data != null

  const [openMeals, setOpenMeals] = useState(() => Object.fromEntries(MEALS.map((m) => [m.key, false])))
  const anyOpen = Object.values(openMeals).some(Boolean)

  const toggleMeal = (key) => setOpenMeals((prev) => ({ ...prev, [key]: !prev[key] }))
  const collapseAll = () => setOpenMeals(Object.fromEntries(MEALS.map((m) => [m.key, false])))

  const addEntry = (mealKey, result, source = {}) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: result.name || 'Food',
      calories: round(result.calories || 0),
      protein: round(result.protein || 0),
      carbs: round(result.carbs || 0),
      fat: round(result.fat || 0),
      sugar: round(result.sugar || 0),
      saturatedFat: round(result.saturatedFat || 0),
      fiber: round(result.fiber || 0),
      note: result.note || '',
      sourceText: source.sourceText || '',
      sourceThumbnails: source.sourceThumbnails || []
    }
    const next = { ...entries, [mealKey]: [...entries[mealKey], entry] }
    onSave({ entries: next })
  }

  const removeEntry = (mealKey, id) => {
    const next = { ...entries, [mealKey]: entries[mealKey].filter((e) => e.id !== id) }
    onSave({ entries: next })
  }

  const handleClearDay = () => {
    if (window.confirm('Clear all food logged for this day? This can\u2019t be undone.')) {
      onClearDay()
    }
  }

  return (
    <EntryCard catClass="food" title="Food" alwaysVisible={<MacroSummaryBar totals={totals} />}>
      {anyOpen && (
        <button className="collapse-all-btn" onClick={collapseAll}>
          <span className="chevron">⌃</span> Collapse all
        </button>
      )}
      {MEALS.map((meal) => (
        <MealSection
          key={meal.key}
          meal={meal}
          items={entries[meal.key]}
          open={openMeals[meal.key]}
          onToggle={() => toggleMeal(meal.key)}
          onAddEntry={addEntry}
          onRemoveEntry={removeEntry}
        />
      ))}
      {hasAnyData && (
        <button className="clear-day-btn" onClick={handleClearDay}>Clear all food for this day</button>
      )}
    </EntryCard>
  )
}
