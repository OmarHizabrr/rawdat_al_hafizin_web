import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { COUNTRY_DIAL_OPTIONS_AR, COUNTRY_OPTIONS_AR } from '../data/countriesAr.js'
import { APPLICATION_FORM_FIELD_TYPE_VALUES } from '../data/applicationFormFieldTypes.js'
import { DEFAULT_APPLICATION_FORM_FIELDS } from '../data/defaultApplicationFormFields.js'

const LEGACY_KEYS = new Set([
  'fullName',
  'phone',
  'phoneCountry',
  'phoneDialCode',
  'nationality',
  'permanentResidence',
  'city',
  'age',
  'email',
  'gender',
  'educationLevel',
  'occupation',
  'quranMemorizedJuz',
])

function dialCodeForRegion(regionCode) {
  return COUNTRY_DIAL_OPTIONS_AR.find((o) => o.value === regionCode)?.dialCode || ''
}

export function parseFieldOptionsText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.match(/^([^|]+)\|(.+)$/)
      if (pipe) return { value: pipe[1].trim(), label: pipe[2].trim() }
      const colon = line.match(/^([^:]+):(.+)$/)
      if (colon) return { value: colon[1].trim(), label: colon[2].trim() }
      return { value: line, label: line }
    })
}

export function fieldOptionsToText(options = []) {
  if (!Array.isArray(options) || !options.length) return ''
  return options.map((o) => `${String(o.value ?? '').trim()}|${String(o.label ?? o.value ?? '').trim()}`).join('\n')
}

export function normalizeApplicationFormField(raw = {}, index = 0) {
  const id = String(raw.id || raw.fieldId || `field_${index}`).trim() || `field_${index}`
  const type = APPLICATION_FORM_FIELD_TYPE_VALUES.has(String(raw.type || '').trim())
    ? String(raw.type).trim()
    : 'text'
  let options = Array.isArray(raw.options)
    ? raw.options
        .map((o) => ({
          value: String(o?.value ?? '').trim(),
          label: String(o?.label ?? o?.value ?? '').trim(),
        }))
        .filter((o) => o.value)
    : parseFieldOptionsText(raw.optionsText)
  if (type === 'gender' && !options.length) {
    options = [
      { value: 'male', label: 'ذكر' },
      { value: 'female', label: 'أنثى' },
    ]
  }
  return {
    id,
    label: String(raw.label || '').trim() || id,
    type,
    required: Boolean(raw.required),
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index,
    enabled: raw.enabled !== false,
    legacyKey: String(raw.legacyKey || '').trim(),
    hint: String(raw.hint || '').trim(),
    placeholder: String(raw.placeholder || '').trim(),
    options,
    min: Number.isFinite(Number(raw.min)) ? Number(raw.min) : null,
    max: Number.isFinite(Number(raw.max)) ? Number(raw.max) : null,
    bindUserEmail: Boolean(raw.bindUserEmail),
    minQuranJuz: Number.isFinite(Number(raw.minQuranJuz)) ? Number(raw.minQuranJuz) : null,
  }
}

export function sortApplicationFormFields(fields) {
  return [...fields].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'ar'))
}

export function resolveApplicationFormFields(rawFields) {
  if (Array.isArray(rawFields) && rawFields.length > 0) {
    return sortApplicationFormFields(
      rawFields.map((f, i) => normalizeApplicationFormField(f, i)).filter((f) => f.enabled),
    )
  }
  return sortApplicationFormFields(DEFAULT_APPLICATION_FORM_FIELDS.map((f, i) => normalizeApplicationFormField(f, i)))
}

export function buildDefaultFormValues(fields, user = null) {
  const values = {}
  for (const field of fields) {
    if (field.type === 'phone') {
      values[field.id] = { phone: '', phoneCountry: 'SA', phoneDialCode: '+966' }
    } else if (field.type === 'email' && field.bindUserEmail) {
      values[field.id] = String(user?.email || '').trim()
    } else if (field.type === 'number' || field.type === 'quran_juz') {
      values[field.id] = field.type === 'quran_juz' ? 30 : field.min ?? 0
    } else if (field.type === 'checkbox' || field.type === 'toggle') {
      values[field.id] = false
    } else if (field.type === 'multi_select' || field.type === 'checkbox_group') {
      values[field.id] = []
    } else {
      values[field.id] = ''
    }
  }
  return values
}

function phoneDisplayFromLegacy(row) {
  const raw = String(row?.phone || '').trim()
  const regionFromRow =
    row?.phoneCountry && COUNTRY_DIAL_OPTIONS_AR.some((o) => o.value === row.phoneCountry)
      ? row.phoneCountry
      : 'SA'
  if (!raw) {
    return { phone: '', phoneCountry: regionFromRow, phoneDialCode: dialCodeForRegion(regionFromRow) || '+966' }
  }
  const intl = parsePhoneNumberFromString(raw)
  if (intl) {
    return {
      phone: String(intl.nationalNumber).replace(/\D/g, '').slice(0, 15),
      phoneCountry: intl.country || regionFromRow,
      phoneDialCode: `+${intl.countryCallingCode}`,
    }
  }
  const local = parsePhoneNumberFromString(raw, regionFromRow)
  if (local) {
    return {
      phone: String(local.nationalNumber).replace(/\D/g, '').slice(0, 15),
      phoneCountry: local.country || regionFromRow,
      phoneDialCode: `+${local.countryCallingCode}`,
    }
  }
  return {
    phone: raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15),
    phoneCountry: regionFromRow,
    phoneDialCode: row?.phoneDialCode || dialCodeForRegion(regionFromRow) || '+966',
  }
}

function legacyValueForField(field, row) {
  const lk = field.legacyKey
  if (!lk || !row) return undefined
  if (field.type === 'phone') return phoneDisplayFromLegacy(row)
  if (lk === 'age') {
    const minAge = field.min ?? 7
    const maxAge = field.max ?? 150
    const defaultAge = field.min ?? 18
    return Math.max(minAge, Math.min(maxAge, Number(row.age) || defaultAge))
  }
  if (lk === 'quranMemorizedJuz') return Math.max(0, Math.min(30, Number(row.quranMemorizedJuz) || 0))
  if (lk === 'gender') return row.gender === 'female' ? 'female' : row.gender === 'male' ? 'male' : ''
  return row[lk]
}

export function mergeFormValuesFromRow(row, fields, user = null) {
  const base = buildDefaultFormValues(fields, user)
  const stored = row?.formValues && typeof row.formValues === 'object' ? row.formValues : {}
  for (const field of fields) {
    if (stored[field.id] !== undefined && stored[field.id] !== null) {
      base[field.id] = stored[field.id]
      continue
    }
    const legacy = legacyValueForField(field, row)
    if (legacy !== undefined && legacy !== null && legacy !== '') {
      base[field.id] = legacy
    }
  }
  if (user?.email) {
    for (const field of fields) {
      if (field.type === 'email' && field.bindUserEmail) base[field.id] = user.email
    }
  }
  return base
}

function isEmptyValue(field, value) {
  if (field.type === 'checkbox' || field.type === 'toggle') return value !== true
  if (field.type === 'multi_select' || field.type === 'checkbox_group') {
    return !Array.isArray(value) || value.length === 0
  }
  if (field.type === 'phone') return !String(value?.phone || '').trim()
  if (field.type === 'number' || field.type === 'quran_juz') {
    return value === '' || value === null || value === undefined || Number.isNaN(Number(value))
  }
  return !String(value ?? '').trim()
}

export function getFormCompletionStats(fields, values, user = null) {
  let filled = 0
  let requiredTotal = 0
  let requiredFilled = 0
  for (const field of fields) {
    if (!field.enabled) continue
    let val = values[field.id]
    if (field.type === 'email' && field.bindUserEmail) val = user?.email || val
    const empty = isEmptyValue(field, val)
    if (!empty) filled += 1
    if (field.required) {
      requiredTotal += 1
      if (!empty) requiredFilled += 1
    }
  }
  const total = fields.filter((f) => f.enabled).length
  const pct = total ? Math.round((filled / total) * 100) : 0
  return { filled, total, requiredTotal, requiredFilled, pct }
}

export function validateApplicationForm(fields, values, user = null) {
  for (const field of fields) {
    if (!field.enabled) continue
    let val = values[field.id]
    if (field.type === 'email' && field.bindUserEmail) val = user?.email || val

    if (field.required && isEmptyValue(field, val)) {
      return { ok: false, fieldId: field.id, message: `«${field.label}» حقل إجباري.` }
    }

    if (field.type === 'phone' && !isEmptyValue(field, val)) {
      const selected = COUNTRY_DIAL_OPTIONS_AR.find((o) => o.value === val.phoneCountry)
      const rawPhone = String(val.phone || '').replace(/\D/g, '').trim()
      if (!selected) return { ok: false, fieldId: field.id, message: 'يرجى اختيار مفتاح الدولة للهاتف.' }
      if (rawPhone.length < 6) return { ok: false, fieldId: field.id, message: 'رقم الهاتف قصير جداً.' }
      const normalized = `${selected.dialCode}${rawPhone.replace(/^0+/, '')}`
      if (!isValidPhoneNumber(normalized)) {
        return { ok: false, fieldId: field.id, message: 'رقم الهاتف غير صالح.' }
      }
    }

    if ((field.type === 'number' || field.type === 'quran_juz') && !isEmptyValue(field, val)) {
      const n = Number(val)
      if (field.min != null && n < field.min) {
        return { ok: false, fieldId: field.id, message: `«${field.label}» يجب أن يكون ${field.min} على الأقل.` }
      }
      if (field.max != null && n > field.max) {
        return { ok: false, fieldId: field.id, message: `«${field.label}» يجب ألا يتجاوز ${field.max}.` }
      }
    }

    if (field.type === 'quran_juz' && field.minQuranJuz != null && !isEmptyValue(field, val)) {
      if (Number(val) < field.minQuranJuz) {
        return {
          ok: false,
          fieldId: field.id,
          code: 'QURAN_MEMORIZATION_REQUIREMENT_NOT_MET',
          message: `نعتذر، الشرط الحالي للقبول هو إتمام حفظ ${field.minQuranJuz} جزءاً.`,
        }
      }
    }

    if (field.type === 'gender' && field.required && val !== 'male' && val !== 'female') {
      return { ok: false, fieldId: field.id, code: 'GENDER_REQUIRED', message: 'يجب تحديد الجنس قبل إرسال الطلب.' }
    }

    if (field.type === 'url' && !isEmptyValue(field, val)) {
      try {
        const u = new URL(String(val).trim())
        if (!/^https?:$/i.test(u.protocol)) throw new Error('bad')
      } catch {
        return { ok: false, fieldId: field.id, message: `«${field.label}» — الرابط غير صالح.` }
      }
    }
  }
  return { ok: true }
}

export function normalizePhoneFieldValue(rawPhoneValue) {
  const val = rawPhoneValue || {}
  const selected = COUNTRY_DIAL_OPTIONS_AR.find((o) => o.value === val.phoneCountry) || COUNTRY_DIAL_OPTIONS_AR[0]
  const rawPhone = String(val.phone || '').replace(/\D/g, '').trim().replace(/^0+/, '')
  const normalizedPhone = `${selected?.dialCode || '+966'}${rawPhone}`
  return {
    phone: normalizedPhone,
    phoneCountry: selected?.value || 'SA',
    phoneDialCode: selected?.dialCode || '+966',
    display: val,
  }
}

export function buildSubmissionPayload(fields, values, user = null) {
  const formValues = { ...values }
  const data = { formValues }

  for (const field of fields) {
    const val = values[field.id]
    const lk = field.legacyKey
    if (!lk || !LEGACY_KEYS.has(lk)) continue

    if (field.type === 'phone') {
      const p = normalizePhoneFieldValue(val)
      data.phone = p.phone
      data.phoneCountry = p.phoneCountry
      data.phoneDialCode = p.phoneDialCode
      formValues[field.id] = p.display
      continue
    }
    if (lk === 'age') {
      data.age = Math.max(field.min ?? 7, Math.min(field.max ?? 150, Number(val) || 7))
      continue
    }
    if (lk === 'quranMemorizedJuz') {
      data.quranMemorizedJuz = Math.max(0, Math.min(30, Number(val) || 0))
      continue
    }
    if (lk === 'gender') {
      data.gender = val === 'female' ? 'female' : val === 'male' ? 'male' : ''
      continue
    }
    if (lk === 'email') {
      data.email = String(user?.email || val || '').trim()
      continue
    }
    data[lk] = String(val ?? '').trim()
  }

  return data
}

export function getGenderFromValues(fields, values) {
  const genderField = fields.find((f) => f.type === 'gender' || f.legacyKey === 'gender')
  if (!genderField) return ''
  const v = values[genderField.id]
  return v === 'female' ? 'female' : v === 'male' ? 'male' : ''
}

export function formatFieldDisplayValue(field, value, { countryLabel = true } = {}) {
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'phone' && typeof value === 'object') {
    const p = normalizePhoneFieldValue(value)
    return p.phone || '—'
  }
  if (field.type === 'checkbox' || field.type === 'toggle') return value ? 'نعم' : 'لا'
  if (field.type === 'multi_select' || field.type === 'checkbox_group') {
    if (!Array.isArray(value) || !value.length) return '—'
    return value.map((v) => field.options?.find((o) => o.value === v)?.label || v).join('، ')
  }
  if (field.type === 'select' || field.type === 'radio' || field.type === 'gender') {
    return field.options?.find((o) => o.value === value)?.label || value
  }
  if (field.type === 'country' && countryLabel) {
    return COUNTRY_OPTIONS_AR.find((o) => o.value === value)?.label || value
  }
  if (field.type === 'country_dial') {
    return COUNTRY_DIAL_OPTIONS_AR.find((o) => o.value === value)?.label || value
  }
  if (field.type === 'quran_juz') return `${value} / 30 جزء`
  return String(value)
}

export function rowSearchHaystack(row, fields) {
  const parts = [row?.fullName, row?.email, row?.phone, row?.nationality, row?.city, row?.occupation, row?.userId]
  if (row?.formValues && typeof row.formValues === 'object') {
    for (const field of fields) {
      parts.push(formatFieldDisplayValue(field, row.formValues[field.id], { countryLabel: false }))
    }
  }
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function getFieldSelectOptions(field) {
  if (field.type === 'country') return COUNTRY_OPTIONS_AR
  if (field.type === 'country_dial') return COUNTRY_DIAL_OPTIONS_AR
  if (field.type === 'gender') {
    return field.options?.length
      ? field.options
      : [
          { value: 'male', label: 'ذكر' },
          { value: 'female', label: 'أنثى' },
        ]
  }
  return field.options || []
}
