import { ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useOnClickOutside } from './hooks/useOnClickOutside.js'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

const SELECT_PANEL_Z = 14050

function computePanelPosition(triggerEl) {
  if (!triggerEl || typeof window === 'undefined') return null
  const rect = triggerEl.getBoundingClientRect()
  const gap = 8
  const edge = 10
  const innerH = window.innerHeight
  const innerW = window.innerWidth
  const maxPreferred = Math.min(22 * 16, innerH * 0.85)
  const spaceBelow = innerH - rect.bottom - gap
  const spaceAbove = rect.top - gap
  const openUp = spaceBelow < 140 && spaceAbove > spaceBelow

  let left = rect.left
  let width = rect.width
  if (left + width > innerW - edge) {
    width = Math.max(200, innerW - edge - Math.max(edge, left))
  }
  if (left < edge) {
    left = edge
    width = Math.min(width, innerW - edge * 2)
  }

  if (openUp) {
    const maxH = Math.min(maxPreferred, Math.max(120, spaceAbove - edge))
    return {
      placement: 'above',
      style: {
        position: 'fixed',
        left,
        width,
        bottom: innerH - rect.top + gap,
        maxHeight: maxH,
        zIndex: SELECT_PANEL_Z,
      },
    }
  }

  const maxH = Math.min(maxPreferred, Math.max(120, spaceBelow - edge))
  return {
    placement: 'below',
    style: {
      position: 'fixed',
      left,
      width,
      top: rect.bottom + gap,
      maxHeight: maxH,
      zIndex: SELECT_PANEL_Z,
    },
  }
}

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
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchInputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [panelPlacement, setPanelPlacement] = useState('below')
  const [panelStyle, setPanelStyle] = useState(null)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  const displayTriggerText = selected ? selected.triggerLabel || selected.label : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const hay = [o.label, o.detail, o.searchText, o.triggerLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
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
    panelRef,
  )

  const refreshPanelPosition = useCallback(() => {
    const pos = computePanelPosition(triggerRef.current)
    if (!pos) return
    setPanelPlacement(pos.placement)
    setPanelStyle(pos.style)
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined
    refreshPanelPosition()
    const onWin = () => refreshPanelPosition()
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [open, refreshPanelPosition, filtered.length])

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
        open && panelPlacement === 'above' ? 'ui-select--panel-above' : '',
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
        ref={triggerRef}
        type="button"
        id={id}
        className="ui-select__trigger"
        title={selected?.label || undefined}
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
          {selected ? displayTriggerText : placeholder}
        </span>
        <span className="ui-select__chevron" aria-hidden>
          <RhIcon as={ChevronDown} size={20} strokeWidth={RH_ICON_STROKE} />
        </span>
      </button>

      {open &&
        panelStyle &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            className={[
              'ui-select__panel',
              'ui-select__panel--portal',
              panelPlacement === 'above' ? 'ui-select__panel--above' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={panelStyle}
            role="presentation"
          >
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
                        opt.detail ? 'ui-select__option--stacked' : '',
                        i === effectiveHighlight ? 'ui-select__option--highlight' : '',
                        opt.value === value ? 'ui-select__option--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => commit(opt)}
                    >
                      <span className="ui-select__option-label">{opt.label}</span>
                      {opt.detail ? (
                        <span className="ui-select__option-detail" dir="rtl">
                          {opt.detail}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
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
