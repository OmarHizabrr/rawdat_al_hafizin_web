import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { subscribeAuth } from '../services/authService.js'
import { ensureUserProfile } from '../services/userService.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeAuth((u) => {
      if (!u) {
        setUser(null)
        setLoading(false)
        return
      }

      ensureUserProfile(u)
        .then((profile) => {
          setUser(profile ? { ...u, ...profile } : u)
        })
        .finally(() => {
          setLoading(false)
        })
    })
    return () => unsub()
  }, [])

  const value = useMemo(() => ({ user, loading }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
