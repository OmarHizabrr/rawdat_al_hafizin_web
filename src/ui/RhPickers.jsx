import { Calendar, Clock } from 'lucide-react'
import { useId } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { ar } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import '../styles/rh-datepicker.css'
import { dateToHHmm, formatYmd, hhmmToTodayDate, parseYmdToLocalNoon } from './rhPickerUtils.js'
import { RhIcon, RH_ICON_STROKE } from './RhIcon.jsx'

registerLocale('ar', ar)

function pickerInputClass() {
  return ['ui-date-field__input', 'rh-picker-input'].filter(Boolean).join(' ')
}

export function RhDatePickerField({
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
  const selected = parseYmdToLocalNoon(value)

  return (
    <div className={['ui-field', 'ui-date-field', error ? 'ui-field--error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="ui-date-field__wrap">
        <DatePicker
          id={id}
          selected={selected}
          onChange={(d) => onChange?.(d ? formatYmd(d) : '')}
          locale="ar"
          dateFormat="P"
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          placeholderText={placeholderText || 'اختر التاريخ…'}
          calendarClassName="rh-datepicker"
          popperClassName="rh-datepicker-popper-wrap"
          showPopperArrow={false}
          className={pickerInputClass()}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          portalId="root"
        />
        <span className="ui-date-field__icon" aria-hidden>
          <RhIcon as={Calendar} size={20} strokeWidth={RH_ICON_STROKE} />
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
          timeIntervals={15}
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
}) {
  const uid = useId()
  const id = idProp ?? uid
  const errId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div className={['ui-field', 'ui-date-field', error ? 'ui-field--error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && <span className="ui-field__required" aria-hidden>*</span>}
        </label>
      )}
      <div className="ui-date-field__wrap">
        <DatePicker
          id={id}
          selected={selected}
          onChange={(d) => onChange?.(d)}
          locale="ar"
          showTimeSelect
          timeIntervals={15}
          timeCaption="الوقت"
          dateFormat="Pp"
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          placeholderText={placeholderText || 'اختر التاريخ والوقت…'}
          calendarClassName="rh-datepicker"
          popperClassName="rh-datepicker-popper-wrap"
          showPopperArrow={false}
          className={pickerInputClass()}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && !error ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined}
          portalId="root"
        />
        <span className="ui-date-field__icon" aria-hidden>
          <RhIcon as={Calendar} size={20} strokeWidth={RH_ICON_STROKE} />
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
