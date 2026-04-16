import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useOnClickOutside } from './hooks/useOnClickOutside.js'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

export function SearchableSelect({
  label,
  hint,
  error,
  required,
  options = [],
  value,
  onChange,
  placeholder = 'اختر…',
  searchPlaceholder = 'ابحث…',
  emptyText = 'لا توجد نتائج',
  disabled = false,
  id: idProp,
  className = '',
}) {
  const uid = useId()
  const id = idProp ?? uid
  const listId = `${id}-list`
  const errId = `${id}-error`
  const hintId = `${id}-hint`

  const rootRef = useRef(null)
  const searchInputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const maxIdx = Math.max(0, filtered.length - 1)
  const effectiveHighlight = Math.min(Math.max(highlight, 0), maxIdx)

  useOnClickOutside(
    rootRef,
    () => {
      setOpen(false)
      setQuery('')
    },
    open,
  )

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const toggleOpen = useCallback(() => {
    if (disabled) return
    setOpen((wasOpen) => {
      if (wasOpen) return false
      setHighlight(0)
      setQuery('')
      return true
    })
  }, [disabled])

  const commit = useCallback(
    (opt) => {
      onChange?.(opt.value)
      setOpen(false)
      setQuery('')
    },
    [onChange],
  )

  const onKeyDown = useCallback(
    (e) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        setQuery('')
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => {
          const c = Math.min(Math.max(h, 0), maxIdx)
          return Math.min(c + 1, maxIdx)
        })
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => {
          const c = Math.min(Math.max(h, 0), maxIdx)
          return Math.max(c - 1, 0)
        })
      }
      if (e.key === 'Enter' && filtered[effectiveHighlight]) {
        e.preventDefault()
        commit(filtered[effectiveHighlight])
      }
    },
    [open, filtered, effectiveHighlight, maxIdx, commit],
  )

  return (
    <div
      ref={rootRef}
      className={[
        'ui-field',
        'ui-select',
        open ? 'ui-select--open' : '',
        error ? 'ui-field--error' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onKeyDown={onKeyDown}
    >
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <button
        type="button"
        id={id}
        className="ui-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
        disabled={disabled}
        onClick={toggleOpen}
      >
        <span
          className={[
            'ui-select__trigger-text',
            !selected ? 'ui-select__trigger-text--placeholder' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span className="ui-select__chevron" aria-hidden>
          <RhIcon as={ChevronDown} size={20} strokeWidth={RH_ICON_STROKE} />
        </span>
      </button>

      {open && (
        <div className="ui-select__panel" role="presentation">
          <div className="ui-select__search">
            <input
              ref={searchInputRef}
              type="search"
              autoComplete="off"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(0)
              }}
              aria-label={searchPlaceholder}
            />
          </div>
          <ul id={listId} className="ui-select__list" role="listbox" aria-label={label ?? placeholder}>
            {filtered.length === 0 ? (
              <li className="ui-select__empty" role="presentation">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt, i) => (
                <li key={String(opt.value)} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    className={[
                      'ui-select__option',
                      i === effectiveHighlight ? 'ui-select__option--highlight' : '',
                      opt.value === value ? 'ui-select__option--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => commit(opt)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

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
}
