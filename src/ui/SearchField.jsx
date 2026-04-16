import { Search, X } from 'lucide-react'
import { forwardRef, useId } from 'react'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

export const SearchField = forwardRef(function SearchField(
  {
    label,
    hint,
    error,
    required,
    id: idProp,
    className = '',
    showClear = true,
    onClear,
    value,
    ...inputProps
  },
  ref,
) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const hasValue = value != null && String(value).length > 0

  const handleClear = (e) => {
    e.preventDefault()
    onClear?.()
  }

  return (
    <div className={['ui-field', 'ui-search-wrap', error ? 'ui-field--error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="ui-search">
        <span className="ui-search__leading" aria-hidden>
          <RhIcon as={Search} size={20} strokeWidth={RH_ICON_STROKE} />
        </span>
        <input
          ref={ref}
          id={id}
          type="search"
          className="ui-search__input"
          autoComplete="off"
          enterKeyHint="search"
          value={value ?? ''}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          required={required}
          {...inputProps}
        />
        {showClear && hasValue && (
          <button type="button" className="ui-search__clear" onClick={handleClear} aria-label="مسح البحث" tabIndex={-1}>
            <RhIcon as={X} size={18} strokeWidth={RH_ICON_STROKE} />
          </button>
        )}
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
