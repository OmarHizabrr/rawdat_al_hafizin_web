import { useEffect, useMemo, useState } from 'react'

import { fetchStudentProgressSummaries } from '../services/studentProgressService.js'

/**
 * يحمّل ملخص إنجاز لعدة طلاب (لقوائم الأعضاء في النوافذ).
 */
export function useMemberProgressSummaries(memberUids, enabled = true) {
  const [byUid, setByUid] = useState({})
  const [loading, setLoading] = useState(false)

  const uidKey = useMemo(() => {
    const list = [...new Set((memberUids || []).map((id) => String(id || '').trim()).filter(Boolean))]
    list.sort()
    return list.join('|')
  }, [memberUids])

  useEffect(() => {
    if (!enabled || !uidKey) {
      setByUid({})
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    fetchStudentProgressSummaries(uidKey.split('|'))
      .then((map) => {
        if (!cancelled) setByUid(map)
      })
      .catch(() => {
        if (!cancelled) setByUid({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, uidKey])

  return { byUid, loading }
}
