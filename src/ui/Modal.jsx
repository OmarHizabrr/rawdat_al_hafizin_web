import { X } from 'lucide-react'
import { useEffect } from 'react'
import { RH_ICON_STROKE, RhIcon } from './RhIcon.jsx'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  showClose = true,
  className = '',
  contentClassName = '',
  ariaLabel,
}) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEsc) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, closeOnEsc, onClose])

  if (!open) return null

  return (
    <div
      className={['ui-modal', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title ?? 'حوار'}
    >
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label="إغلاق النافذة"
        onClick={() => {
          if (closeOnBackdrop) onClose?.()
        }}
      />
      <section
        className={['ui-modal__content', `ui-modal__content--${size}`, contentClassName].filter(Boolean).join(' ')}
      >
        {(title || showClose) && (
          <div className="ui-modal__head">
            {title ? <h2 className="ui-modal__title">{title}</h2> : <span />}
            {showClose && (
              <button type="button" className="ui-modal__close" aria-label="إغلاق" onClick={() => onClose?.()}>
                <RhIcon as={X} size={18} strokeWidth={RH_ICON_STROKE} />
              </button>
            )}
          </div>
        )}
        {children}
      </section>
    </div>
  )
}
