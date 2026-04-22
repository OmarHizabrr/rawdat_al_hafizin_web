import { useEffect, useMemo, useRef, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { AuthContext } from './authContext.js'
import { subscribeAuth } from '../services/authService.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { normalizeRole } from '../config/roles.js'
import { ensureUserProfile } from '../services/userService.js'
import { subscribeMyProfileRequest } from '../services/profileRequestService.js'

function mergeAuthAndProfile(authUser, profileDoc) {
  if (!profileDoc) return authUser
  const m = { ...authUser, ...profileDoc }
  m.role = normalizeRole(m.role)
  if (m.isActive === undefined) m.isActive = true
  return m
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileSnapUnsubRef = useRef(() => {})
  const profileRequestUnsubRef = useRef(() => {})

  useEffect(() => {
    const unsubAuth = subscribeAuth((u) => {
      profileSnapUnsubRef.current()
      profileSnapUnsubRef.current = () => {}
      profileRequestUnsubRef.current()
      profileRequestUnsubRef.current = () => {}

      if (!u) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)
      ensureUserProfile(u)
        .then((profile) => {
          setUser(profile ? mergeAuthAndProfile(u, profile) : u)
          profileSnapUnsubRef.current = onSnapshot(firestoreApi.getUserDoc(u.uid), (snap) => {
            if (!snap.exists()) return
            const d = snap.data()
            setUser((prev) =>
              prev && prev.uid === u.uid ? mergeAuthAndProfile(prev, d) : prev,
            )
          })
          profileRequestUnsubRef.current = subscribeMyProfileRequest(
            u.uid,
            (row) => {
              setUser((prev) => {
                if (!prev || prev.uid !== u.uid) return prev
                return {
                  ...prev,
                  profileRequestStatus: row?.status || 'none',
                  profileRequestReviewedAt: row?.reviewedAt || null,
                }
              })
            },
            () => {
              setUser((prev) => {
                if (!prev || prev.uid !== u.uid) return prev
                return { ...prev, profileRequestStatus: 'none', profileRequestReviewedAt: null }
              })
            },
          )
        })
        .finally(() => {
          setLoading(false)
        })
    })
    return () => {
      unsubAuth()
      profileSnapUnsubRef.current()
      profileSnapUnsubRef.current = () => {}
      profileRequestUnsubRef.current()
      profileRequestUnsubRef.current = () => {}
    }
  }, [])

  const value = useMemo(() => ({ user, loading }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
