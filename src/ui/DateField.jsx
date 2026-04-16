import { Calendar } from 'lucide-react'
import { forwardRef, useId } from 'react'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

export const DateField = forwardRef(function DateField(
  {
    label,
    hint,
    error,
    required,
    id: idProp,
    className = '',
    min,
    max,
    disabled,
    value,
    onChange,
    ...rest
  },
  ref,
) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div className={['ui-field', 'ui-date-field', error ? 'ui-field--error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="ui-date-field__wrap">
        <input
          ref={ref}
          id={id}
          type="date"
          className="ui-date-field__input"
          min={min}
          max={max}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          required={required}
          {...rest}
        />
        <span className="ui-date-field__icon" aria-hidden>
          <RhIcon as={Calendar} size={20} strokeWidth={RH_ICON_STROKE} />
        </span>
      </div>
      {hint && !error && (
        <p className="ui-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ui-field__error" id={errId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
