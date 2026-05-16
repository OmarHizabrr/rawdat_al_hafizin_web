import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePermissions } from '../context/usePermissions.js'

/**
 * يفتح نافذة الاستكشاف عند وجود ?explore=1 في الرابط (للتوافق مع الروابط القديمة).
 * @param {string} explorePageId — معرّف صفحة الاستكشاف في سجل الصلاحيات
 * @param {(open: boolean) => void} setOpen
 */
export function useExploreUrlAutoOpen(explorePageId, setOpen) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { ready: permReady, canAccessPage } = usePermissions()
  const pendingRef = useRef(searchParams.get('explore') === '1')
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current || !pendingRef.current || !permReady) return
    handledRef.current = true
    pendingRef.current = false

    if (canAccessPage(explorePageId)) {
      setOpen(true)
    }

    setSearchParams(
      (prev) => {
        if (prev.get('explore') !== '1') return prev
        const next = new URLSearchParams(prev)
        next.delete('explore')
        return next
      },
      { replace: true },
    )
  }, [permReady, explorePageId, canAccessPage, setSearchParams, setOpen])
}
