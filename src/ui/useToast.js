import { useContext } from 'react'
import { ToastContext } from './toastContext.js'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast يجب أن يُستعمل داخل ToastProvider')
  }
  return ctx
}
