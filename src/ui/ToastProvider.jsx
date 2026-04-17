import { AlertTriangle, Check, Info, X, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { firestoreApi } from '../services/firestoreApi.js'
import { ToastContext } from './toastContext.js'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

const TOAST_ICON = {
  success: Check,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
}

function ToastItem({ id, variant, title, message, onDismiss }) {
  const Icon = TOAST_ICON[variant] ?? Info
  return (
    <div className={['ui-toast', variant ? `ui-toast--${variant}` : ''].filter(Boolean).join(' ')} role="status">
      <span className="ui-toast__icon" aria-hidden>
        <RhIcon as={Icon} size={20} strokeWidth={RH_ICON_STROKE} />
      </span>
      <div className="ui-toast__body">
        {title && <div className="ui-toast__title">{title}</div>}
        {message && <div className="ui-toast__message">{message}</div>}
      </div>
      <button type="button" className="ui-toast__close" onClick={() => onDismiss(id)} aria-label="إغلاق">
        <RhIcon as={X} size={18} strokeWidth={RH_ICON_STROKE} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (opts) => {
      const id = firestoreApi.getNewId('toasts')
      const duration = opts.duration ?? 4500
      const entry = { id, variant: 'info', title: '', message: '', ...opts }
      setToasts((t) => [...t, entry])
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      show: push,
      success: (message, title = '') => push({ variant: 'success', message, title }),
      warning: (message, title = '') => push({ variant: 'warning', message, title }),
      danger: (message, title = '') => push({ variant: 'danger', message, title }),
      info: (message, title = '') => push({ variant: 'info', message, title }),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toast-region" aria-live="polite" aria-relevant="additions text">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
