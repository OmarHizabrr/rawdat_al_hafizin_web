import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { getImpersonateUid } from '../utils/impersonation.js'

/** يطابق إعداد «إيقاف عرض الخطة» للمستخدم الحالي أو للمستخدم المستهدف عند العمل بنيابة المشرف. */
export function useHidePlanNavigation() {
  const { user } = useAuth()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const actingAsUser = Boolean(user?.uid && impersonateUid && impersonateUid !== user.uid)
  const [subjectHideHomePlanUi, setSubjectHideHomePlanUi] = useState(false)

  useEffect(() => {
    if (!actingAsUser || !impersonateUid) return undefined
    let cancelled = false
    firestoreApi.getData(firestoreApi.getUserDoc(impersonateUid)).then((d) => {
      if (!cancelled) setSubjectHideHomePlanUi(Boolean(d?.hideHomePlanUi))
    })
    return () => {
      cancelled = true
    }
  }, [actingAsUser, impersonateUid])

  return actingAsUser ? subjectHideHomePlanUi : Boolean(user?.hideHomePlanUi)
}
