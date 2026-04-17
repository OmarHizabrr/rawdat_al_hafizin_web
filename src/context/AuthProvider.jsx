import { useEffect, useMemo, useRef, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { AuthContext } from './authContext.js'
import { subscribeAuth } from '../services/authService.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { ensureUserProfile } from '../services/userService.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileSnapUnsubRef = useRef(() => {})

  useEffect(() => {
    const unsubAuth = subscribeAuth((u) => {
      profileSnapUnsubRef.current()
      profileSnapUnsubRef.current = () => {}

      if (!u) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)
      ensureUserProfile(u)
        .then((profile) => {
          setUser(profile ? { ...u, ...profile } : u)
          profileSnapUnsubRef.current = onSnapshot(firestoreApi.getUserDoc(u.uid), (snap) => {
            if (!snap.exists()) return
            const d = snap.data()
            setUser((prev) => (prev && prev.uid === u.uid ? { ...prev, ...d } : prev))
          })
        })
        .finally(() => {
          setLoading(false)
        })
    })
    return () => {
      unsubAuth()
      profileSnapUnsubRef.current()
      profileSnapUnsubRef.current = () => {}
    }
  }, [])

  const value = useMemo(() => ({ user, loading }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
