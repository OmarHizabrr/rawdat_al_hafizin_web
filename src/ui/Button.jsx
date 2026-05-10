import { Loader2 } from 'lucide-react'
import { useCallback } from 'react'
import { rhHapticLight } from '../utils/haptics.js'
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

const ICON_SIZE = {
  sm: 16,
  md: 18,
  lg: 20,
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  loading = false,
  disabled,
  /** مكوّن أيقونة Lucide (يُعرض قبل النص عند عدم التحميل) */
  icon: IconComponent = null,
  haptic = true,
  onPointerDown: onPointerDownProp,
  ...rest
}) {
  const v = VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary
  const s = SIZE_CLASS[size] ?? ''
  const isDisabled = Boolean(disabled) || Boolean(loading)
  const stroke = size === 'sm' ? 2.15 : 2.25
  const iconPx = ICON_SIZE[size] ?? ICON_SIZE.md

  const onPointerDown = useCallback(
    (e) => {
      if (!haptic || isDisabled) return
      if (e.pointerType !== 'touch' && !window.matchMedia('(pointer: coarse)').matches) return
      rhHapticLight()
    },
    [haptic, isDisabled],
  )

  return (
    <button
      type={type}
      className={['ui-btn', v, s, loading ? 'ui-btn--loading' : '', className].filter(Boolean).join(' ')}
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onPointerDown={(e) => {
        onPointerDown(e)
        onPointerDownProp?.(e)
      }}
    >
      {loading ? (
        <RhIcon as={Loader2} size={iconPx} strokeWidth={2.25} className="ui-btn__spinner" aria-hidden />
      ) : IconComponent ? (
        <RhIcon as={IconComponent} size={iconPx} strokeWidth={stroke} className="ui-btn__icon" aria-hidden />
      ) : null}
      {children}
    </button>
  )
}
