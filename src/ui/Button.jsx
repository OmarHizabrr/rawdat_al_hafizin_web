import { Loader2 } from 'lucide-react'
import { RhIcon } from './RhIcon.jsx'

const VARIANT_CLASS = {
  primary: 'ui-btn--primary',
  secondary: 'ui-btn--secondary',
  ghost: 'ui-btn--ghost',
  danger: 'ui-btn--danger',
}

const SIZE_CLASS = {
  md: '',
  sm: 'ui-btn--sm',
  lg: 'ui-btn--lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  loading = false,
  disabled,
  ...rest
}) {
  const v = VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary
  const s = SIZE_CLASS[size] ?? ''
  const isDisabled = Boolean(disabled) || Boolean(loading)
  return (
    <button
      type={type}
      className={['ui-btn', v, s, loading ? 'ui-btn--loading' : '', className].filter(Boolean).join(' ')}
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <RhIcon as={Loader2} size={18} strokeWidth={2.25} className="ui-btn__spinner" aria-hidden />
      ) : null}
      {children}
    </button>
  )
}
