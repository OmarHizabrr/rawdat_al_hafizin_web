import { Clock } from 'lucide-react'
import { forwardRef, useId } from 'react'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

export const TimeField = forwardRef(function TimeField(
  {
    label,
    hint,
    error,
    required,
    id: idProp,
    className = '',
    min,
    max,
    step,
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
    <div className={['ui-field', 'ui-time-field', error ? 'ui-field--error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="ui-time-field__wrap">
        <input
          ref={ref}
          id={id}
          type="time"
          className="ui-time-field__input"
          min={min}
          max={max}
          step={step ?? 60}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          required={required}
          {...rest}
        />
        <span className="ui-time-field__icon" aria-hidden>
          <RhIcon as={Clock} size={20} strokeWidth={RH_ICON_STROKE} />
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
