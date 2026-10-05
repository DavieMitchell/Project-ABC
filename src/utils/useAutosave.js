import { useEffect, useRef } from 'react'

// Debounced autosave. `value` is serialised to detect changes; the first
// render is treated as the already-saved baseline. Pending changes are
// flushed on unmount and when the page is hidden (iOS app switch/close).
export function useAutosave(value, save, delay = 700) {
  const saveRef = useRef(save)
  saveRef.current = save
  const valueRef = useRef(value)
  valueRef.current = value
  const lastSaved = useRef(JSON.stringify(value))
  const timer = useRef(null)

  const flush = () => {
    clearTimeout(timer.current)
    timer.current = null
    const s = JSON.stringify(valueRef.current)
    if (s !== lastSaved.current) {
      lastSaved.current = s
      saveRef.current(valueRef.current)
    }
  }

  useEffect(() => {
    if (JSON.stringify(value) === lastSaved.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, delay)
    return () => clearTimeout(timer.current)
  }, [value, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return flush
}
