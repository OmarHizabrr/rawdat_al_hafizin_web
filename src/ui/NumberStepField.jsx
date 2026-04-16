import { Minus, Plus } from 'lucide-react'
import { forwardRef, useCallback, useId } from 'react'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

function clampNum(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export const NumberStepField = forwardRef(function NumberStepField(
  {
    label,
    hint,
    error,
    required,
    id: idProp,
    className = '',
    value,
    onChange,
    min = 0,
    max = 999_999,
    step = 1,
    size = 'default',
    disabled = false,
    ...rest
  },
  ref,
) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`

  const parsed =
    typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : min
  const n = clampNum(parsed, min, max)
  const decDisabled = disabled || n <= min
  const incDisabled = disabled || n >= max

  const commit = useCallback(
    (next) => {
      const raw = typeof next === 'number' ? next : Number.parseInt(String(next), 10)
      if (!Number.isFinite(raw)) return
      onChange?.(clampNum(Math.trunc(raw), min, max))
    },
    [min, max, onChange],
  )

  const increment = () => {
    if (incDisabled) return
    onChange?.(clampNum(n + step, min, max))
  }

  const decrement = () => {
    if (decDisabled) return
    onChange?.(clampNum(n - step, min, max))
  }

  const handleInputChange = (e) => {
    const v = e.target.value
    if (v === '' || v === '-') return
    commit(v)
  }

  const handleBlur = (e) => {
    const v = e.target.value
    if (v === '' || v === '-') {
      onChange?.(clampNum(min, min, max))
      return
    }
    commit(v)
  }

  return (
    <div
      className={[
        'ui-field',
        'ui-number-step',
        size === 'sm' ? 'ui-number-step--sm' : '',
        error ? 'ui-field--error' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="ui-number-step__cluster">
        <button
          type="button"
          className="ui-number-step__btn"
          onClick={decrement}
          disabled={decDisabled}
          aria-label="إنقاص"
          tabIndex={-1}
        >
          <RhIcon as={Minus} size={size === 'sm' ? 16 : 18} strokeWidth={RH_ICON_STROKE} />
        </button>
        <input
          ref={ref}
          id={id}
          type="number"
          className="ui-number-step__input"
          inputMode="numeric"
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={n}
          onChange={handleInputChange}
          onBlur={handleBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          required={required}
          {...rest}
        />
        <button
          type="button"
          className="ui-number-step__btn"
          onClick={increment}
          disabled={incDisabled}
          aria-label="زيادة"
          tabIndex={-1}
        >
          <RhIcon as={Plus} size={size === 'sm' ? 16 : 18} strokeWidth={RH_ICON_STROKE} />
        </button>
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
