/** فرق أيام بين تاريخين YYYY-MM-DD (شامل البداية والنهاية تقريباً كمدة تقويمية) */
export function daysInclusiveYmd(startYmd, endYmd) {
  if (!startYmd || !endYmd || typeof startYmd !== 'string' || typeof endYmd !== 'string') return null
  const a = new Date(`${startYmd}T12:00:00`)
  const b = new Date(`${endYmd}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  const diff = Math.round((b - a) / 86400000)
  return diff < 0 ? null : diff + 1
}

/** مدة جلسة من وقتي HH:mm في نفس اليوم */
export function sessionDurationLabelAr(startHHmm, endHHmm) {
  if (!startHHmm || !endHHmm || typeof startHHmm !== 'string' || typeof endHHmm !== 'string') {
    return '—'
  }
  const m1 = /^(\d{1,2}):(\d{2})$/.exec(startHHmm.trim())
  const m2 = /^(\d{1,2}):(\d{2})$/.exec(endHHmm.trim())
  if (!m1 || !m2) return '—'
  const t1 = Number(m1[1]) * 60 + Number(m1[2])
  const t2 = Number(m2[1]) * 60 + Number(m2[2])
  let diff = t2 - t1
  if (diff <= 0) return 'تأكد أن وقت النهاية بعد البداية'
  const h = Math.floor(diff / 60)
  const mm = diff % 60
  if (h && mm) return `${h} ساعة و${mm} دقيقة`
  if (h) return `${h} ساعة`
  return `${mm} دقيقة`
}
