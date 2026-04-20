import { Check, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { startTransition, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useOnClickOutside } from './hooks/useOnClickOutside.js'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'
import { SearchField } from './SearchField.jsx'

/**
 * قائمة منسدلة قابلة للبحث مع اختيار متعدد.
 * @param {string[]} value - المفاتيح المختارة
 * @param {(next: string[]) => void} onChange
 * @param {{ value: string, label: string, secondary?: string }[]} options
 * @param {(option) => import('react').ReactNode} [itemAddon] - محتوى إضافي لكل صف عند التحديد (مثل حقل رقم)
 * @param {(count: number) => import('react').ReactNode} [summaryLabel] - ملخص بعدد العناصر، أو (selectedValues, options) => node إن وُجدت معاملين
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
  const portalLayerRef = useRef(null)
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  /** غير null = عرض القائمة عبر portal على document.body (داخل .ui-modal) */
  const [portalSpec, setPortalSpec] = useState(null)

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
    open && !portalSpec,
  )

  useLayoutEffect(() => {
    if (!open) {
      startTransition(() => setPortalSpec(null))
      return
    }
    const root = rootRef.current
    if (!root?.closest('.ui-modal')) {
      startTransition(() => setPortalSpec(null))
      return
    }
    const update = () => {
      const r = root.getBoundingClientRect()
      const mobile = window.matchMedia('(max-width: 899px)').matches
      if (mobile) setPortalSpec({ mobile: true })
      else
        setPortalSpec({
          mobile: false,
          top: r.bottom + 8,
          left: r.left,
          width: r.width,
        })
    }
    update()
    window.addEventListener('resize', update)
    document.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open || !portalSpec) return
    const close = () => {
      setOpen(false)
      setQuery('')
    }
    const onPointer = (e) => {
      const t = e.target
      if (rootRef.current?.contains(t)) return
      if (portalLayerRef.current?.contains(t)) return
      close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open, portalSpec])

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

  const summary = useMemo(() => {
    if (typeof summaryLabel === 'function') {
      if (summaryLabel.length >= 2) return summaryLabel(value, options)
      return summaryLabel(value.length)
    }
    if (value.length === 0) return placeholder
    if (value.length === 1) return 'عنصر واحد مختار'
    return `${value.length} عناصر مختارة`
  }, [summaryLabel, value, options, placeholder])

  const portalPanelStyle = useMemo(() => {
    if (!portalSpec || portalSpec.mobile) return undefined
    const top = portalSpec.top
    const maxH = Math.max(120, typeof window !== 'undefined' ? window.innerHeight - top - 16 : 320)
    return {
      position: 'fixed',
      top,
      left: portalSpec.left,
      width: portalSpec.width,
      maxHeight: `min(22rem, ${maxH}px)`,
    }
  }, [portalSpec])

  const renderDropdown = (portal) => (
    <>
      <button
        type="button"
        className={['ui-multi__backdrop', portal ? 'ui-multi__backdrop--portal' : ''].filter(Boolean).join(' ')}
        aria-label="إغلاق القائمة"
        tabIndex={-1}
        onClick={() => {
          setOpen(false)
          setQuery('')
        }}
      />
      <div
        className={['ui-multi__panel', portal ? 'ui-multi__panel--portal' : ''].filter(Boolean).join(' ')}
        style={portal ? portalPanelStyle : undefined}
        role="presentation"
      >
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
  )

  const showPortalLayer = open && portalSpec
  const showInlineLayer = open && !portalSpec

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
            value.length > 1 ? 'ui-multi__trigger-text--wrap' : '',
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

      {showInlineLayer && renderDropdown(false)}
      {showPortalLayer && createPortal(
        <div ref={portalLayerRef} className="ui-multi__portal-layer">
          {renderDropdown(true)}
        </div>,
        document.body,
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
