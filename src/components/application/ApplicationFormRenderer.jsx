import { COUNTRY_DIAL_OPTIONS_AR } from '../../data/countriesAr.js'
import { getQuranMemorizedJuzOptions } from '../../data/quranJuzOptionsAr.js'
import { getFieldSelectOptions } from '../../utils/applicationFormFields.js'
import {
  DateField,
  NumberStepField,
  SearchableMultiSelect,
  SearchableSelect,
  TextAreaField,
  TextField,
  TimeField,
} from '../../ui/index.js'

function RadioGroup({ label, required, hint, options, value, onChange, name }) {
  return (
    <div className="ui-field rh-app-form__radio-group">
      {label ? (
        <span className="ui-field__label">
          {label}
          {required ? <span className="ui-field__required" aria-hidden>*</span> : null}
        </span>
      ) : null}
      <div className="rh-app-form__radio-list" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const checked = value === opt.value
          return (
            <label
              key={opt.value}
              className={['rh-app-form__radio-item', checked ? 'rh-app-form__radio-item--checked' : ''].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
              />
              <span className="rh-app-form__choice-dot" aria-hidden />
              <span className="rh-app-form__choice-text">{opt.label}</span>
            </label>
          )
        })}
      </div>
      {hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  )
}

function CheckboxGroup({ label, required, hint, options, value = [], onChange }) {
  const set = new Set(Array.isArray(value) ? value : [])
  return (
    <div className="ui-field rh-app-form__checkbox-group">
      {label ? (
        <span className="ui-field__label">
          {label}
          {required ? <span className="ui-field__required" aria-hidden>*</span> : null}
        </span>
      ) : null}
      <div className="rh-app-form__checkbox-list">
        {options.map((opt) => {
          const checked = set.has(opt.value)
          return (
            <label
              key={opt.value}
              className={['rh-app-form__checkbox-item', checked ? 'rh-app-form__checkbox-item--checked' : ''].filter(Boolean).join(' ')}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const next = new Set(set)
                  if (e.target.checked) next.add(opt.value)
                  else next.delete(opt.value)
                  onChange([...next])
                }}
              />
              <span className="rh-app-form__choice-box" aria-hidden />
              <span className="rh-app-form__choice-text">{opt.label}</span>
            </label>
          )
        })}
      </div>
      {hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  )
}

function ToggleField({ label, required, hint, value, onChange, variant = 'checkbox' }) {
  const checked = Boolean(value)
  return (
    <div className={['ui-field', 'rh-app-form__toggle', variant === 'toggle' ? 'rh-app-form__toggle--switch' : ''].filter(Boolean).join(' ')}>
      <label className={['rh-app-form__toggle-row', checked ? 'rh-app-form__toggle-row--on' : ''].filter(Boolean).join(' ')}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {variant === 'toggle' ? <span className="rh-app-form__switch" aria-hidden /> : null}
        <span className="ui-field__label rh-app-form__toggle-label">
          {label}
          {required ? <span className="ui-field__required" aria-hidden>*</span> : null}
        </span>
        {variant === 'toggle' ? (
          <span className="rh-app-form__toggle-state">{checked ? 'نعم' : 'لا'}</span>
        ) : null}
      </label>
      {hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  )
}

/**
 * عرض/تحرير حقول استمارة طلب الالتحاق ديناميكياً.
 */
export function ApplicationFormRenderer({ fields, values, onChange, user = null, quranIncludeZero = false, className = '' }) {
  const quranOptions = getQuranMemorizedJuzOptions({ includeZero: quranIncludeZero })
  const set = (fieldId, val) => onChange(fieldId, val)

  const renderField = (field) => {
    const val = values[field.id]
    const common = {
      label: field.label,
      required: field.required,
      hint: field.hint || undefined,
    }

    if (field.type === 'textarea') {
      return (
        <TextAreaField
          {...common}
          value={String(val ?? '')}
          onChange={(e) => set(field.id, e.target.value)}
          placeholder={field.placeholder || undefined}
          rows={4}
        />
      )
    }

    if (field.type === 'email') {
      return (
        <TextField
          {...common}
          type="email"
          value={field.bindUserEmail ? user?.email || String(val ?? '') : String(val ?? '')}
          disabled={field.bindUserEmail}
          onChange={(e) => set(field.id, e.target.value)}
        />
      )
    }

    if (field.type === 'number') {
      return (
        <NumberStepField
          {...common}
          value={Number(val) || field.min || 0}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          onChange={(v) => set(field.id, v)}
        />
      )
    }

    if (field.type === 'quran_juz') {
      return (
        <SearchableSelect
          className="rh-quran-juz-select"
          {...common}
          options={quranOptions}
          value={Number.isFinite(Number(val)) ? Number(val) : 30}
          onChange={(v) => set(field.id, v)}
          placeholder={field.placeholder || 'اختر عدد الأجزاء'}
          searchPlaceholder="ابحث برقم الجزء أو السورة…"
        />
      )
    }

    if (field.type === 'phone') {
      const phoneVal = val && typeof val === 'object' ? val : { phone: '', phoneCountry: 'SA', phoneDialCode: '+966' }
      return (
        <div className="rh-app-form__phone-block">
          <SearchableSelect
            label="مفتاح الدولة"
            required={field.required}
            options={COUNTRY_DIAL_OPTIONS_AR}
            value={phoneVal.phoneCountry}
            onChange={(v) => {
              const selected = COUNTRY_DIAL_OPTIONS_AR.find((o) => o.value === v)
              set(field.id, {
                ...phoneVal,
                phoneCountry: v,
                phoneDialCode: selected?.dialCode || '',
              })
            }}
            placeholder="اختر الدولة ومفتاحها"
            searchPlaceholder="ابحث عن الدولة..."
          />
          <TextField
            label={field.label}
            required={field.required}
            hint={
              field.hint ||
              (phoneVal.phoneDialCode ? `سيتم الحفظ: ${phoneVal.phoneDialCode} ثم رقمك` : undefined)
            }
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            dir="ltr"
            value={phoneVal.phone || ''}
            onChange={(e) =>
              set(field.id, { ...phoneVal, phone: e.target.value.replace(/\D/g, '').slice(0, 15) })
            }
          />
        </div>
      )
    }

    if (field.type === 'select' || field.type === 'country' || field.type === 'country_dial' || field.type === 'gender') {
      return (
        <SearchableSelect
          {...common}
          options={getFieldSelectOptions(field)}
          value={val ?? ''}
          onChange={(v) => set(field.id, v)}
          placeholder={field.placeholder || 'اختر…'}
          searchPlaceholder="ابحث..."
        />
      )
    }

    if (field.type === 'multi_select') {
      return (
        <SearchableMultiSelect
          {...common}
          options={getFieldSelectOptions(field)}
          value={Array.isArray(val) ? val : []}
          onChange={(v) => set(field.id, v)}
          placeholder={field.placeholder || 'اختر عناصر…'}
        />
      )
    }

    if (field.type === 'radio') {
      return (
        <RadioGroup
          {...common}
          name={`app-field-${field.id}`}
          options={getFieldSelectOptions(field)}
          value={val ?? ''}
          onChange={(v) => set(field.id, v)}
        />
      )
    }

    if (field.type === 'checkbox') {
      return <ToggleField {...common} value={Boolean(val)} onChange={(v) => set(field.id, v)} variant="checkbox" />
    }

    if (field.type === 'toggle') {
      return <ToggleField {...common} value={Boolean(val)} onChange={(v) => set(field.id, v)} variant="toggle" />
    }

    if (field.type === 'checkbox_group') {
      return (
        <CheckboxGroup
          {...common}
          options={getFieldSelectOptions(field)}
          value={Array.isArray(val) ? val : []}
          onChange={(v) => set(field.id, v)}
        />
      )
    }

    if (field.type === 'date') {
      return <DateField {...common} value={String(val ?? '')} onChange={(v) => set(field.id, v)} />
    }

    if (field.type === 'time') {
      return <TimeField {...common} value={String(val ?? '')} onChange={(v) => set(field.id, v)} />
    }

    if (field.type === 'url') {
      return (
        <TextField
          {...common}
          type="url"
          dir="ltr"
          value={String(val ?? '')}
          placeholder={field.placeholder || 'https://'}
          onChange={(e) => set(field.id, e.target.value)}
        />
      )
    }

    return (
      <TextField
        {...common}
        value={String(val ?? '')}
        placeholder={field.placeholder || undefined}
        onChange={(e) => set(field.id, e.target.value)}
      />
    )
  }

  return (
    <div className={['rh-app-form', className].filter(Boolean).join(' ')}>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rh-app-form__field"
          style={{ '--rh-app-field-i': index }}
        >
          {renderField(field)}
        </div>
      ))}
    </div>
  )
}
