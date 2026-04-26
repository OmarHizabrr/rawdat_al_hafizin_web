import { Clock } from 'lucide-react'
import { useCallback, useId, useMemo } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { ar } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import '../styles/rh-datepicker.css'
import { combineHijriYmdAndHHmm, localHijriYmd } from '../utils/hijriDates.js'
import { dateToHHmm, formatYmd, hhmmToTodayDate } from './rhPickerUtils.js'
import { RhHijriDateField } from './RhHijriDateField.jsx'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

registerLocale('ar', ar)

function pickerInputClass() {
  return ['ui-date-field__input', 'rh-picker-input'].filter(Boolean).join(' ')
}

/** حقل تاريخ هجري (أم القرى). القيمة والتخزين: YYYY-MM-DD هجري. */
export function RhDatePickerField(props) {
  return <RhHijriDateField {...props} />
}

export function RhTimePickerField({
  label,
  hint,
  error,
  required,
  id: idProp,
  className = '',
  value,
  onChange,
  disabled,
  placeholderText,
  timeIntervals = 15,
}) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const selected = hhmmToTodayDate(value)

  return (
    <div className={['ui-field', 'ui-time-field', error ? 'ui-field--error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="ui-time-field__wrap">
        <DatePicker
          id={id}
          selected={selected}
          onChange={(d) => onChange?.(d ? dateToHHmm(d) : '')}
          locale="ar"
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={timeIntervals}
          timeCaption="الوقت"
          dateFormat="HH:mm"
          disabled={disabled}
          placeholderText={placeholderText || 'اختر الوقت…'}
          calendarClassName="rh-datepicker"
          popperClassName="rh-datepicker-popper-wrap"
          showPopperArrow={false}
          className={pickerInputClass()}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          portalId="root"
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
}

/** تاريخ هجري + وقت (للجلسات وغيرها). selected/onChange يبقيان Date محلياً. */
export function RhDateTimePickerField({
  label,
  hint,
  error,
  required,
  id: idProp,
  className = '',
  selected,
  onChange,
  minDate,
  maxDate,
  disabled,
  placeholderText,
  timeIntervals = 15,
}) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`

  const hijriYmd = useMemo(() => {
    if (!selected || !(selected instanceof Date) || Number.isNaN(selected.getTime())) return ''
    return formatYmd(selected)
  }, [selected])

  const hh = useMemo(() => {
    if (!selected || !(selected instanceof Date) || Number.isNaN(selected.getTime())) return ''
    return dateToHHmm(selected)
  }, [selected])

  const onDate = useCallback(
    (ymd) => {
      onChange?.(combineHijriYmdAndHHmm(ymd || hijriYmd || localHijriYmd(), hh || '12:00'))
    },
    [onChange, hijriYmd, hh],
  )

  const onTime = useCallback(
    (t) => {
      onChange?.(combineHijriYmdAndHHmm(hijriYmd || localHijriYmd(), t || '12:00'))
    },
    [onChange, hijriYmd],
  )

  return (
    <div className={['ui-field', 'ui-date-field', 'rh-datetime-field', error ? 'ui-field--error' : '', className]
      .filter(Boolean)
      .join(' ')}>
      {label && (
        <label className="ui-field__label" id={`${id}-group-label`}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="rh-datetime-field__pair" role="group" aria-labelledby={label ? `${id}-group-label` : undefined}>
        <RhHijriDateField
          label="التاريخ"
          value={hijriYmd}
          onChange={onDate}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          placeholderText={placeholderText || 'اختر التاريخ الهجري…'}
        />
        <RhTimePickerField
          label="الوقت"
          value={hh}
          onChange={onTime}
          disabled={disabled}
          timeIntervals={timeIntervals}
        />
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
