import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useOnClickOutside } from './hooks/useOnClickOutside.js'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'
import { SearchField } from './SearchField.jsx'

/**
 * قائمة منسدلة قابلة للبحث مع اختيار متعدد.
 * @param {string[]} value - المفاتيح المختارة
 * @param {(next: string[]) => void} onChange
 * @param {{ value: string, label: string, secondary?: string }[]} options
 * @param {(option) => import('react').ReactNode} [itemAddon] - محتوى إضافي لكل صف عند التحديد (مثل حقل رقم)
 */
export function SearchableMultiSelect({
  label,
  hint,
  error,
  required,
  options = [],
  value = [],
  onChange,
  placeholder = 'اختر عناصر…',
  searchPlaceholder = 'ابحث بالاسم…',
  emptyText = 'لا توجد نتائج',
  summaryLabel,
  disabled = false,
  id: idProp,
  className = '',
  itemAddon,
}) {
  const uid = useId()
  const id = idProp ?? uid
  const listId = `${id}-list`
  const errId = `${id}-error`
  const hintId = `${id}-hint`

  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const selectedSet = useMemo(() => new Set(value), [value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.secondary && o.secondary.toLowerCase().includes(q)),
    )
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
    queueMicrotask(() => setHighlight(0))
  }, [open, query])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  const toggleOpen = useCallback(() => {
    if (disabled) return
    setOpen((o) => !o)
  }, [disabled])

  const toggleValue = useCallback(
    (key) => {
      const next = new Set(selectedSet)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      onChange?.([...next])
    },
    [selectedSet, onChange],
  )

  const selectAllFiltered = useCallback(() => {
    const next = new Set(selectedSet)
    for (const o of filtered) next.add(o.value)
    onChange?.([...next])
  }, [filtered, selectedSet, onChange])

  const clearAllFiltered = useCallback(() => {
    const remove = new Set(filtered.map((o) => o.value))
    onChange?.(value.filter((v) => !remove.has(v)))
  }, [filtered, value, onChange])

  const onKeyDown = useCallback(
    (e) => {
      if (!open) return
      const inSearch = e.target?.closest?.('.ui-multi__search')
      if (inSearch) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setOpen(false)
          setQuery('')
        }
        return
      }
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
        toggleValue(filtered[effectiveHighlight].value)
      }
    },
    [open, filtered, effectiveHighlight, maxIdx, toggleValue],
  )

  const summary =
    summaryLabel?.(value.length) ??
    (value.length === 0 ? placeholder : value.length === 1 ? 'عنصر واحد مختار' : `${value.length} عناصر مختارة`)

  return (
    <div
      ref={rootRef}
      className={[
        'ui-field',
        'ui-multi',
        open ? 'ui-multi--open' : '',
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
        className="ui-multi__trigger"
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
            'ui-multi__trigger-text',
            value.length === 0 ? 'ui-multi__trigger-text--placeholder' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {summary}
        </span>
        <span className="ui-multi__chevron" aria-hidden>
          <RhIcon as={ChevronDown} size={20} strokeWidth={RH_ICON_STROKE} />
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="ui-multi__backdrop"
            aria-label="إغلاق القائمة"
            tabIndex={-1}
            onClick={() => {
              setOpen(false)
              setQuery('')
            }}
          />
          <div className="ui-multi__panel" role="presentation">
          <div className="ui-multi__search">
            <SearchField
              ref={searchRef}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(0)
              }}
              onClear={() => setQuery('')}
              className="ui-multi__search-field"
            />
          </div>
          <div className="ui-multi__toolbar">
            <button type="button" className="ui-multi__toolbar-btn" onClick={selectAllFiltered}>
              تحديد الظاهر
            </button>
            <button type="button" className="ui-multi__toolbar-btn" onClick={clearAllFiltered}>
              إلغاء الظاهر
            </button>
          </div>
          <ul id={listId} className="ui-multi__list" role="listbox" aria-label={label ?? placeholder} aria-multiselectable="true">
            {filtered.length === 0 ? (
              <li className="ui-multi__empty" role="presentation">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const sel = selectedSet.has(opt.value)
                return (
                  <li key={String(opt.value)} role="presentation" className="ui-multi__row-wrap">
                    <button
                      type="button"
                      role="option"
                      aria-selected={sel}
                      className={[
                        'ui-multi__row',
                        i === effectiveHighlight ? 'ui-multi__row--highlight' : '',
                        sel ? 'ui-multi__row--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => toggleValue(opt.value)}
                    >
                      <span className={['ui-multi__check', sel ? 'ui-multi__check--on' : ''].filter(Boolean).join(' ')} aria-hidden>
                        {sel && <RhIcon as={Check} size={14} strokeWidth={2.5} />}
                      </span>
                      <span className="ui-multi__row-body">
                        <span className="ui-multi__row-label">{opt.label}</span>
                        {opt.secondary && <span className="ui-multi__row-secondary">{opt.secondary}</span>}
                      </span>
                    </button>
                    {sel && itemAddon?.(opt)}
                  </li>
                )
              })
            )}
          </ul>
        </div>
        </>
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
