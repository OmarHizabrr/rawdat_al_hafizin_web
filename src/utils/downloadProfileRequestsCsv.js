import { PROFILE_REQUEST_STATUS } from '../services/profileRequestService.js'
import { formatFieldDisplayValue, mergeFormValuesFromRow } from './applicationFormFields.js'

function statusAr(status) {
  if (status === PROFILE_REQUEST_STATUS.APPROVED) return 'مقبول'
  if (status === PROFILE_REQUEST_STATUS.REJECTED) return 'مرفوض'
  if (status === PROFILE_REQUEST_STATUS.PENDING) return 'قيد المراجعة'
  return String(status || '')
}

function escapeSemicolonField(value) {
  const s = String(value ?? '')
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<{ id: string, label: string, type: string, options?: Array<{ value: string, label: string }> }>} [fields]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function downloadProfileRequestsCsv(rows, fields = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: 'empty' }
  }

  const metaHeaders = ['رقم المستخدم', 'البريد', 'الحالة', 'ملاحظة المراجعة', 'تاريخ التقديم', 'تاريخ المراجعة']
  const fieldHeaders = fields.map((f) => f.label)
  const headers = [...metaHeaders.slice(0, 1), ...fieldHeaders, ...metaHeaders.slice(1)]

  const lines = [headers.map(escapeSemicolonField).join(';')]

  for (const r of rows) {
    const values = mergeFormValuesFromRow(r, fields)
    const fieldCells = fields.map((f) => formatFieldDisplayValue(f, values[f.id]))
    const cells = [
      r.userId,
      ...fieldCells,
      r.email,
      statusAr(r.status),
      r.statusMessage,
      r.submittedAt || '',
      r.reviewedAt || '',
    ]
    lines.push(cells.map(escapeSemicolonField).join(';'))
  }

  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
  a.download = `talabat-iltihaq-${stamp}.csv`
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}
