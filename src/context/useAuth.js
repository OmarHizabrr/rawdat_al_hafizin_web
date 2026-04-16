import { useContext } from 'react'
import { AuthContext } from './authContext.js'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth يجب أن يُستعمل داخل AuthProvider')
  }
  return ctx
}
