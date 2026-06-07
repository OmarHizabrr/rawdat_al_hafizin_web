import { resolveApplicationFormFieldTypeIcon } from '../../data/applicationFormFieldTypes.js'
import { formatFieldDisplayValue, mergeFormValuesFromRow } from '../../utils/applicationFormFields.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

function isEmptyDisplay(field, value) {
  const text = formatFieldDisplayValue(field, value)
  return !text || text === '—' || text === 'لا'
}

/** عرض حقول الطلب للقراءة فقط (بطاقات الأدمن) */
export function ApplicationFormDisplay({ row, fields, compact = false }) {
  if (!fields?.length) return null
  const values = mergeFormValuesFromRow(row, fields)

  return (
    <div className={['rh-app-form-display', compact ? 'rh-app-form-display--compact' : ''].filter(Boolean).join(' ')}>
      {fields.map((field) => {
        const value = values[field.id]
        const display = formatFieldDisplayValue(field, value)
        const empty = isEmptyDisplay(field, value)
        const TypeIcon = resolveApplicationFormFieldTypeIcon(field.type)

        return (
          <div
            key={field.id}
            className={[
              'rh-app-form-display__item',
              empty ? 'rh-app-form-display__item--empty' : '',
              field.required ? 'rh-app-form-display__item--required' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="rh-app-form-display__icon" aria-hidden>
              <RhIcon as={TypeIcon} size={15} strokeWidth={RH_ICON_STROKE} />
            </span>
            <div className="rh-app-form-display__body">
              <span className="rh-app-form-display__label">
                {field.label}
                {field.required ? <span className="rh-app-form-display__req" aria-label="إلزامي">*</span> : null}
              </span>
              <span className="rh-app-form-display__value">{display}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
