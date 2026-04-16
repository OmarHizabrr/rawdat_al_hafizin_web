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
  ...rest
}) {
  const v = VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary
  const s = SIZE_CLASS[size] ?? ''
  return (
    <button type={type} className={['ui-btn', v, s, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  )
}
