import { useEffect } from 'react'

/**
 * @param {React.RefObject<Element | null>} ref
 * @param {(e: MouseEvent | TouchEvent) => void} handler
 * @param {boolean} [enabled]
 * @param {React.RefObject<Element | null>} [extraRef] — عنصر خارج الشجرة نفسها (مثل لوحة منسوخة إلى document.body)
 */
export function useOnClickOutside(ref, handler, enabled = true, extraRef = null) {
  useEffect(() => {
    if (!enabled) return

    const listener = (event) => {
      const t = event.target
      const el = ref.current
      if (el?.contains(t)) return
      if (extraRef?.current?.contains(t)) return
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler, enabled, extraRef])
}
