import { PROFILE_REQUEST_STATUS } from '../services/profileRequestService.js'

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
 * @returns {{ ok: boolean, reason?: string }}
 */
export function downloadProfileRequestsCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: 'empty' }
  }

  const headers = [
    'معرّف المستخدم',
    'الاسم',
    'البريد',
    'رقم الجوال',
    'مفتاح الدولة',
    'الجنسية',
    'الإقامة الدائمة',
    'المدينة',
    'العمر',
    'الجنس',
    'المستوى التعليمي',
    'الوظيفة',
    'الحفظ (أجزاء)',
    'الحالة',
    'ملاحظة المراجعة',
    'تاريخ التقديم',
    'تاريخ المراجعة',
  ]

  const lines = [headers.map(escapeSemicolonField).join(';')]

  for (const r of rows) {
    const cells = [
      r.userId,
      r.fullName,
      r.email,
      r.phone,
      r.phoneDialCode || r.phoneCountry || '',
      r.nationality,
      r.permanentResidence,
      r.city,
      r.age,
      r.gender === 'female' ? 'أنثى' : 'ذكر',
      r.educationLevel,
      r.occupation,
      r.quranMemorizedJuz,
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
