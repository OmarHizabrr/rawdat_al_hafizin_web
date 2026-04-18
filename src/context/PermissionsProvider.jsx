import { useEffect, useMemo, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { buildPermissionApi } from '../utils/permissionsResolve.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { useAuth } from './useAuth.js'
import { PermissionsContext } from './permissionsContext.js'

/**
 * حالة المستند المرتبط بنوع الصلاحيات؛ عند عدم الحاجة للاشتراك تُعتبر البيانات «محلولة» بدون مستند.
 */
function usePermissionProfileSnapshot(userUid, permissionProfileId) {
  const pid = typeof permissionProfileId === 'string' ? permissionProfileId.trim() : ''
  const needsRemote = Boolean(userUid && pid)

  const [remote, setRemote] = useState(() => ({
    /** معرّف النوع الذي تعود إليه آخر نتيجة (لتجاهل بيانات قديمة عند تغيير النوع) */
    forPid: '',
    resolved: false,
    data: null,
  }))

  useEffect(() => {
    if (!needsRemote) return undefined

    const ref = firestoreApi.getPermissionProfileDoc(pid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setRemote({
          forPid: pid,
          resolved: true,
          data: snap.exists() ? snap.data() : null,
        })
      },
      () => {
        setRemote({ forPid: pid, resolved: true, data: null })
      },
    )
    return () => unsub()
  }, [needsRemote, pid])

  return useMemo(() => {
    if (!needsRemote) return { resolved: true, data: null }
    if (!remote.resolved || remote.forPid !== pid) return { resolved: false, data: null }
    return { resolved: true, data: remote.data }
  }, [needsRemote, pid, remote])
}

export function PermissionsProvider({ children }) {
  const { user } = useAuth()
  const profileState = usePermissionProfileSnapshot(user?.uid, user?.permissionProfileId)
  const value = useMemo(() => buildPermissionApi(user, profileState), [user, profileState])

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}
