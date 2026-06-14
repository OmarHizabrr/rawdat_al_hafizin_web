import { HALAKA_ATTENDANCE_STATUSES } from './halakatStorage.js'
import { localYmd } from './planDailyQuota.js'

const ATTENDED_STATUSES = new Set([
  HALAKA_ATTENDANCE_STATUSES.PRESENT,
  HALAKA_ATTENDANCE_STATUSES.LATE,
])

function sessionLocalYmd(session) {
  const raw = session?.startedAt || session?.createdAt || session?.updatedAt
  if (!raw) return ''
  const ms = Date.parse(String(raw))
  if (!Number.isFinite(ms)) return ''
  return localYmd(new Date(ms))
}

function daysBetweenYmd(a, b) {
  if (!a || !b || !/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return 999
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((db - da) / 86400000)
}

/** أحدث جلسة ذات صلة (اليوم أو مفتوحة أو خلال ١٤ يوماً) */
export const HALAKA_TASKS_LIMIT = 10

export function pickRelevantHalakaSession(sessions = [], todayYmd = localYmd()) {
  const rows = (sessions || []).filter((s) => s?.id)
  if (!rows.length) return null

  const scored = rows.map((session) => {
    const ymd = sessionLocalYmd(session)
    const isToday = ymd === todayYmd
    const isOpen = session.status === 'open'
    const ageDays = ymd ? daysBetweenYmd(ymd, todayYmd) : 999
    const recent = ageDays >= 0 && ageDays <= 14
    let score = ageDays
    if (recent) score -= 50
    if (isOpen) score -= 200
    if (isToday) score -= 500
    return { session, score, ymd, isToday, isOpen, recent }
  })

  const relevant = scored.filter((x) => x.isToday || x.isOpen || x.recent)
  const pool = relevant.length ? relevant : scored.slice(0, 1)
  pool.sort((a, b) => a.score - b.score || Date.parse(b.session.startedAt || 0) - Date.parse(a.session.startedAt || 0))
  return pool[0]?.session || null
}

export function halakaAttendanceToTaskStep(session, attendance) {
  if (!session) return 'pending'
  if (!attendance) {
    if (session.status === 'open' || sessionLocalYmd(session) === localYmd()) return 'pending'
    return 'in_progress'
  }

  const status = String(attendance.attendanceStatus || '').trim()
  const pages = Math.max(0, Number(attendance.pagesCount ?? attendance.memorizedAmount) || 0)

  if (ATTENDED_STATUSES.has(status)) {
    return pages > 0 ? 'done' : 'in_progress'
  }
  if (status === HALAKA_ATTENDANCE_STATUSES.ABSENT) return 'in_progress'
  if (status === HALAKA_ATTENDANCE_STATUSES.EXCUSED || status === HALAKA_ATTENDANCE_STATUSES.PERMITTED) {
    return 'done'
  }
  return 'pending'
}

export function halakaAttendanceDueLabel(session, attendance) {
  if (!session) return 'مستمر'
  const ymd = sessionLocalYmd(session)
  const today = localYmd()
  if (ymd === today) return 'اليوم'
  if (session.status === 'open') return 'جلسة مفتوحة'
  if (!attendance) return 'آخر جلسة'
  const status = String(attendance.attendanceStatus || '').trim()
  if (ATTENDED_STATUSES.has(status)) return 'حضور مسجّل'
  if (status === HALAKA_ATTENDANCE_STATUSES.ABSENT) return 'غياب'
  return 'متابعة'
}

export function describeHalakaAttendance(session, attendance) {
  if (!session) return ''
  const title = String(session.title || '').trim() || 'جلسة'
  if (!attendance) {
    return session.status === 'open'
      ? `جلسة «${title}» مفتوحة — لم يُسجَّل حضورك بعد.`
      : `آخر جلسة: «${title}» — لم يُسجَّل حضورك.`
  }
  const status = String(attendance.attendanceStatus || '').trim()
  const pages = Math.max(0, Number(attendance.pagesCount ?? attendance.memorizedAmount) || 0)
  if (ATTENDED_STATUSES.has(status) && pages > 0) {
    return `جلسة «${title}» — ${pages} صفحة مسجّلة.`
  }
  if (status === HALAKA_ATTENDANCE_STATUSES.ABSENT) return `جلسة «${title}» — غياب مسجّل.`
  if (status === HALAKA_ATTENDANCE_STATUSES.EXCUSED) return `جلسة «${title}» — غياب بعذر.`
  if (status === HALAKA_ATTENDANCE_STATUSES.PERMITTED) return `جلسة «${title}» — مستأذن.`
  return `جلسة «${title}» — متابعة الحضور والتسميع.`
}
