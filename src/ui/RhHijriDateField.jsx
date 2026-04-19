import '../styles/rh-hijri-date.css'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  CalendarDate,
  fromDateToLocal,
  getLocalTimeZone,
  startOfMonth,
  startOfWeek,
  toCalendar,
  toCalendarDate,
} from '@internationalized/date'
import {
  HIJRI,
  formatHijriYmd,
  hijriYmdToLocalNoonDate,
  localHijriYmd,
  parseHijriYmdString,
} from '../utils/hijriDates.js'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

/** @param {Date | undefined | null} d */
function dateToHijriCalendarDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return null
  const z = fromDateToLocal(d)
  const gd = toCalendarDate(z)
  return toCalendar(gd, HIJRI)
}

function monthTitleAr(view) {
  const inst = view.toDate(getLocalTimeZone())
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      month: 'long',
      year: 'numeric',
    }).format(inst)
  } catch {
    return `${view.month}/${view.year} هـ`
  }
}

/**
 * حقل تاريخ هجري (أم القرى). القيمة: نص YYYY-MM-DD هجري.
 * @param {object} props
 * @param {string} [props.value]
 * @param {(v: string) => void} [props.onChange]
 * @param {Date} [props.minDate]
 * @param {Date} [props.maxDate]
 */
export function RhHijriDateField({
  label,
  hint,
  error,
  required,
  id: idProp,
  className = '',
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  placeholderText,
}) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)

  const selectedCd = useMemo(() => parseHijriYmdString(value || ''), [value])
  const [viewMonth, setViewMonth] = useState(
    () => parseHijriYmdString(localHijriYmd()) || new CalendarDate(HIJRI, 1445, 9, 1),
  )

  const syncViewToSelection = useCallback(() => {
    const m = selectedCd ? startOfMonth(selectedCd) : startOfMonth(parseHijriYmdString(localHijriYmd()))
    if (m) setViewMonth(m)
  }, [selectedCd])

  const minCd = useMemo(() => dateToHijriCalendarDate(minDate), [minDate])
  const maxCd = useMemo(() => dateToHijriCalendarDate(maxDate), [maxDate])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      const el = wrapRef.current
      if (el && !el.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const { grid, weekdayLabels } = useMemo(() => {
    const first = startOfMonth(viewMonth)
    const gridStart = startOfWeek(first, 'ar-SA')
    const labels = Array.from({ length: 7 }, (_, i) => {
      const x = gridStart.add({ days: i })
      try {
        return new Intl.DateTimeFormat('ar-SA', { weekday: 'short' }).format(x.toDate(getLocalTimeZone()))
      } catch {
        return ''
      }
    })
    let d = gridStart
    const cells = []
    for (let i = 0; i < 42; i += 1) {
      cells.push(d)
      d = d.add({ days: 1 })
    }
    const rows = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return { grid: rows, weekdayLabels: labels }
  }, [viewMonth])

  const pickDay = useCallback(
    (cd) => {
      if (!cd) return
      onChange?.(formatHijriYmd(cd))
      setOpen(false)
    },
    [onChange],
  )

  const isDisabled = useCallback(
    (cd) => {
      if (!cd) return true
      if (cd.month !== viewMonth.month || cd.year !== viewMonth.year) return true
      if (minCd && cd.compare(minCd) < 0) return true
      if (maxCd && cd.compare(maxCd) > 0) return true
      return false
    },
    [minCd, maxCd, viewMonth.month, viewMonth.year],
  )

  const displayLabel = useMemo(() => {
    if (!value || !selectedCd) return ''
    const d = hijriYmdToLocalNoonDate(value)
    if (!d) return value
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d)
    } catch {
      return value
    }
  }, [value, selectedCd])

  const goPrevMonth = () => setViewMonth((v) => startOfMonth(v.subtract({ months: 1 })))
  const goNextMonth = () => setViewMonth((v) => startOfMonth(v.add({ months: 1 })))

  return (
    <div
      ref={wrapRef}
      className={['ui-field', 'ui-date-field', 'rh-hijri-date', error ? 'ui-field--error' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && (
            <span className="ui-field__required" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      <div className="ui-date-field__wrap">
        <button
          type="button"
          id={id}
          className={['ui-date-field__input', 'rh-hijri-date__trigger', 'rh-picker-input'].filter(Boolean).join(' ')}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          onClick={() => {
            if (disabled) return
            setOpen((o) => {
              const next = !o
              if (next) syncViewToSelection()
              return next
            })
          }}
        >
          <span className={displayLabel ? 'rh-hijri-date__value' : 'rh-hijri-date__placeholder'}>
            {displayLabel || placeholderText || 'اختر التاريخ الهجري…'}
          </span>
        </button>
        <span className="ui-date-field__icon" aria-hidden>
          <RhIcon as={CalendarIcon} size={20} strokeWidth={RH_ICON_STROKE} />
        </span>

        {open && !disabled && (
          <div className="rh-hijri-date__popover" role="dialog" aria-label="تقويم هجري">
            <div className="rh-hijri-date__head">
              <button type="button" className="rh-hijri-date__nav" onClick={goPrevMonth} aria-label="الشهر السابق">
                <RhIcon as={ChevronRight} size={22} strokeWidth={RH_ICON_STROKE} />
              </button>
              <div className="rh-hijri-date__month-title">{monthTitleAr(viewMonth)}</div>
              <button type="button" className="rh-hijri-date__nav" onClick={goNextMonth} aria-label="الشهر التالي">
                <RhIcon as={ChevronLeft} size={22} strokeWidth={RH_ICON_STROKE} />
              </button>
            </div>
            <div className="rh-hijri-date__weekdays" aria-hidden>
              {weekdayLabels.map((w, wi) => (
                <span key={`${wi}-${w}`} className="rh-hijri-date__wd">
                  {w}
                </span>
              ))}
            </div>
            <div className="rh-hijri-date__grid">
              {grid.map((row) => (
                <div key={row.map((c) => (c ? formatHijriYmd(c) : '—')).join('|')} className="rh-hijri-date__row">
                  {row.map((cell) => {
                    const outOfMonth = cell.month !== viewMonth.month || cell.year !== viewMonth.year
                    const dis = isDisabled(cell)
                    const sel = selectedCd && cell.compare(selectedCd) === 0
                    return (
                      <button
                        key={formatHijriYmd(cell)}
                        type="button"
                        disabled={dis}
                        className={[
                          'rh-hijri-date__cell',
                          sel ? 'rh-hijri-date__cell--selected' : '',
                          dis ? 'rh-hijri-date__cell--disabled' : '',
                          outOfMonth ? 'rh-hijri-date__cell--muted' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => !dis && pickDay(cell)}
                      >
                        {cell.day}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="rh-hijri-date__foot">تقويم أم القرى الرسمي</p>
          </div>
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
}
