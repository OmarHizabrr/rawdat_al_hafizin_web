import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './toastContext.js'

const ICON = {
  success: '✓',
  warning: '!',
  danger: '✕',
  info: 'i',
}

function ToastItem({ id, variant, title, message, onDismiss }) {
  const icon = ICON[variant] ?? ICON.info
  return (
    <div className={['ui-toast', variant ? `ui-toast--${variant}` : ''].filter(Boolean).join(' ')} role="status">
      <span className="ui-toast__icon" aria-hidden>
        {icon}
      </span>
      <div className="ui-toast__body">
        {title && <div className="ui-toast__title">{title}</div>}
        {message && <div className="ui-toast__message">{message}</div>}
      </div>
      <button type="button" className="ui-toast__close" onClick={() => onDismiss(id)} aria-label="إغلاق">
        ×
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
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
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
