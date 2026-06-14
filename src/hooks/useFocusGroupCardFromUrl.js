import { useEffect } from 'react'

/** تمرير وتمييز بطاقة مجموعة عند فتح الرابط بمعرّف (?exam= / ?activity= / ?dawra=) */
export function useFocusGroupCardFromUrl(focusId, cardIdPrefix, ready = true) {
  useEffect(() => {
    const id = String(focusId || '').trim()
    if (!id || !ready) return undefined
    const el = document.getElementById(`${cardIdPrefix}-${id}`)
    if (!el) return undefined
    const run = () => {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      el.setAttribute('data-rh-focused', '1')
    }
    const frame = window.requestAnimationFrame(run)
    const timer = window.setTimeout(() => el.removeAttribute('data-rh-focused'), 2600)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      el.removeAttribute('data-rh-focused')
    }
  }, [focusId, cardIdPrefix, ready])
}
