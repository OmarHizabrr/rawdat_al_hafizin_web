import { forwardRef, useId } from 'react'

export const TextAreaField = forwardRef(function TextAreaField(
  { label, hint, error, required, id: idProp, className = '', rows = 4, ...textareaProps },
  ref,
) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div className={['ui-field', error ? 'ui-field--error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className="ui-textarea"
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
        required={required}
        {...textareaProps}
      />
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
