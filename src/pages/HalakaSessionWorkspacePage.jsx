import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { VOLUMES, VOLUME_BY_ID } from '../data/volumes.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, TextAreaField, TextField, useToast } from '../ui/index.js'
import { loadAwrad } from '../utils/awradStorage.js'
import { aggregateVolumeProgress, lastWirdOverlappingVolume } from '../utils/halakaVolumeProgress.js'
import {
  HALAKA_ATTENDANCE_STATUSES,
  HALAKA_MEMBER_ROLES,
  HALAKA_SESSION_TYPES,
  loadHalakat,
  loadHalakatMembersWithProfiles,
  loadHalakaSessions,
  loadSessionAttendance,
  upsertSessionAttendance,
} from '../utils/halakatStorage.js'
import { loadPlans } from '../utils/plansStorage.js'

function roleCanWrite(role) {
  return role === HALAKA_MEMBER_ROLES.OWNER || role === HALAKA_MEMBER_ROLES.SUPERVISOR || role === HALAKA_MEMBER_ROLES.TEACHER
}
function attendanceStatusLabel(status) {
  if (status === HALAKA_ATTENDANCE_STATUSES.PRESENT) return 'حاضر'
  if (status === HALAKA_ATTENDANCE_STATUSES.ABSENT) return 'غائب'
  if (status === HALAKA_ATTENDANCE_STATUSES.EXCUSED) return 'غياب بعذر'
  if (status === HALAKA_ATTENDANCE_STATUSES.PERMITTED) return 'مستأذن'
  if (status === HALAKA_ATTENDANCE_STATUSES.LATE) return 'متأخر'
  return 'أخرى'
}
function sessionTypeLabel(t, other) {
  if (t === HALAKA_SESSION_TYPES.MEMORIZATION) return 'حفظ'
  if (t === HALAKA_SESSION_TYPES.REVIEW) return 'مراجعة'
  if (t === HALAKA_SESSION_TYPES.CONSOLIDATION) return 'تثبيت'
  if (t === HALAKA_SESSION_TYPES.READING) return 'قراءة'
  return other?.trim() ? `أخرى: ${other}` : 'أخرى'
}
function memberRoleLabel(role) {
  if (role === HALAKA_MEMBER_ROLES.STUDENT) return 'طالب'
  if (role === HALAKA_MEMBER_ROLES.TEACHER) return 'معلم'
  if (role === HALAKA_MEMBER_ROLES.SUPERVISOR) return 'مشرف'
  if (role === HALAKA_MEMBER_ROLES.OWNER) return 'مالك'
  return ''
}
function formatRecordedAt(iso) {
  const t = Date.parse(String(iso || ''))
  return Number.isFinite(t) ? new Date(t).toLocaleString('ar-SA') : ''
}

export default function HalakaSessionWorkspacePage() {
  const { halakaId, sessionId } = useParams()
  const { user } = useAuth()
  const { canAccessPage } = usePermissions()
  const { str } = useSiteContent()
  const toast = useToast()

  const [halaka, setHalaka] = useState(null)
  const [session, setSession] = useState(null)
  const [attendanceRows, setAttendanceRows] = useState([])
  const [studentContexts, setStudentContexts] = useState({})
  const [dirtyRowIds, setDirtyRowIds] = useState(() => new Set())
  const [savingRowId, setSavingRowId] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid || !halakaId || !sessionId) return
    setLoading(true)
    Promise.all([
      loadHalakat(user.uid),
      loadHalakaSessions(halakaId),
      loadSessionAttendance(halakaId, sessionId),
      loadHalakatMembersWithProfiles(halakaId),
    ])
      .then(([halakat, sessions, attendance, members]) => {
        setHalaka(halakat.find((x) => x.id === halakaId) || null)
        setSession(sessions.find((x) => x.id === sessionId) || null)
        const map = new Map(attendance.map((r) => [r.userId, r]))
        setAttendanceRows(
          members.map((m) => {
            const row = map.get(m.userId) || {}
            return {
              userId: m.userId,
              displayName: m.displayName || m.userId,
              role: m.role,
              attendanceStatus: row.attendanceStatus || HALAKA_ATTENDANCE_STATUSES.PRESENT,
              memorizationVolumeId: String(row.memorizationVolumeId || '').trim(),
              fromPage: row.fromPage ?? '',
              toPage: row.toPage ?? '',
              notes: row.notes || '',
              excludedFromSession: Boolean(row.excludedFromSession),
            }
          }),
        )
        setDirtyRowIds(new Set())
      })
      .finally(() => setLoading(false))
  }, [user?.uid, halakaId, sessionId])

  const studentFetchKey = useMemo(
    () =>
      attendanceRows
        .filter((r) => r.role === HALAKA_MEMBER_ROLES.STUDENT)
        .map((r) => r.userId)
        .sort()
        .join(','),
    [attendanceRows],
  )
  useEffect(() => {
    if (!studentFetchKey) return
    const ids = studentFetchKey.split(',').filter(Boolean)
    let cancelled = false
    Promise.all(ids.map(async (uid) => [uid, { plans: await loadPlans(uid), awrad: await loadAwrad(uid) }])).then((rows) => {
      if (!cancelled) setStudentContexts(Object.fromEntries(rows))
    })
    return () => {
      cancelled = true
    }
  }, [studentFetchKey])

  const canWrite = roleCanWrite(halaka?.halakaRole)
  const crossItems = [
    { to: '/app', label: str('layout.nav_home') },
    { to: '/app/halakat', label: str('layout.nav_halakat') },
    { to: `/app/halakat/${halakaId}/sessions`, label: 'جلسات الحلقة' },
    ...(canAccessPage('halakat_explore') ? [{ to: '/app/halakat/explore', label: str('layout.nav_halakat_explore') }] : []),
  ]

  const summary = useMemo(() => {
    const stats = { active: 0, excluded: 0, present: 0, absent: 0 }
    for (const r of attendanceRows) {
      if (r.excludedFromSession) {
        stats.excluded += 1
        continue
      }
      stats.active += 1
      if (r.attendanceStatus === HALAKA_ATTENDANCE_STATUSES.PRESENT) stats.present += 1
      if (r.attendanceStatus === HALAKA_ATTENDANCE_STATUSES.ABSENT) stats.absent += 1
    }
    return stats
  }, [attendanceRows])

  const rowPayload = (row) => {
    const fp = row.fromPage === '' ? null : Number(row.fromPage)
    const tp = row.toPage === '' ? null : Number(row.toPage)
    return {
      attendanceStatus: row.attendanceStatus,
      memorizationVolumeId: row.memorizationVolumeId,
      fromPage: Number.isFinite(fp) && fp >= 1 ? fp : null,
      toPage: Number.isFinite(tp) && tp >= 1 ? tp : null,
      notes: row.notes,
      excludedFromSession: Boolean(row.excludedFromSession),
    }
  }
  const updateRowDraft = useCallback((uid, patch) => {
    setAttendanceRows((prev) => prev.map((x) => (x.userId === uid ? { ...x, ...patch } : x)))
    setDirtyRowIds((prev) => new Set(prev).add(uid))
  }, [])
  const saveRow = useCallback(
    async (row) => {
      if (!canWrite || !user?.uid) return
      setSavingRowId(row.userId)
      try {
        await upsertSessionAttendance(user, halakaId, sessionId, row.userId, rowPayload(row))
        setDirtyRowIds((prev) => {
          const n = new Set(prev)
          n.delete(row.userId)
          return n
        })
      } finally {
        setSavingRowId('')
      }
    },
    [canWrite, halakaId, sessionId, user],
  )
  const saveAll = useCallback(async () => {
    if (!canWrite || dirtyRowIds.size === 0 || !user?.uid) return
    setSavingAll(true)
    try {
      for (const row of attendanceRows.filter((x) => dirtyRowIds.has(x.userId))) {
        await upsertSessionAttendance(user, halakaId, sessionId, row.userId, rowPayload(row))
      }
      setDirtyRowIds(new Set())
      toast.success('تم حفظ تعديلات الجلسة.', 'تم')
    } finally {
      setSavingAll(false)
    }
  }, [attendanceRows, canWrite, dirtyRowIds, halakaId, sessionId, toast, user])

  if (loading) return <p className="rh-halaka-sessions__state">جاري التحميل…</p>
  if (!halaka || !session) return <p className="rh-halaka-sessions__state">تعذر العثور على الجلسة.</p>

  return (
    <div className="rh-plans rh-halaka-sessions">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">صفحة الجلسة: {session.title || 'جلسة حلقة'}</h1>
            <p className="rh-plans__desc rh-halaka-sessions__lead">صفحة مستقلة للتحضير والتغييب مع إمكانية استثناء أي عضو من عملية الجلسة.</p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <Link to={`/app/halakat/${halakaId}/sessions`} className="rh-halaka-sessions__hero-back ui-btn ui-btn--secondary">
            <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
            العودة للجلسات
          </Link>
        </div>
      </header>

      <section className="rh-settings-card">
        <p className="rh-settings-card__subtitle">
          النوع: <strong>{sessionTypeLabel(session.sessionType, session.sessionTypeOtherLabel)}</strong> — {new Date(session.startedAt).toLocaleString('ar-SA')}
        </p>
        <div className="rh-halaka-sessions__stats">
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.active}</span><span className="rh-halaka-sessions__stat-label">داخل العملية</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.excluded}</span><span className="rh-halaka-sessions__stat-label">مستثنى</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.present}</span><span className="rh-halaka-sessions__stat-label">حاضر</span></div>
          <div className="rh-halaka-sessions__stat"><span className="rh-halaka-sessions__stat-value">{summary.absent}</span><span className="rh-halaka-sessions__stat-label">غائب</span></div>
        </div>
        <div className="rh-halaka-sessions__toolbar">
          <Button type="button" variant="primary" loading={savingAll} disabled={!canWrite || dirtyRowIds.size === 0} onClick={saveAll}>
            حفظ الكل ({dirtyRowIds.size})
          </Button>
        </div>
        <ul className="rh-halaka-sessions__attendee-list">
          {attendanceRows.map((row) => {
            const isStudent = row.role === HALAKA_MEMBER_ROLES.STUDENT
            const volId = row.memorizationVolumeId
            const ctx = studentContexts[row.userId]
            const agg = volId && ctx ? aggregateVolumeProgress(volId, ctx.plans, ctx.awrad) : null
            const lastW = volId && ctx ? lastWirdOverlappingVolume(volId, ctx.plans, ctx.awrad) : null
            const cap = volId ? VOLUME_BY_ID[volId]?.pages || 0 : 0
            return (
              <li key={row.userId} className={['rh-halaka-sessions__attendee', row.excludedFromSession ? 'rh-halaka-sessions__attendee--excluded' : ''].filter(Boolean).join(' ')}>
                <div className="rh-halaka-sessions__attendee-head">
                  <span className="rh-halaka-sessions__attendee-name">{row.displayName}</span>
                  <span className="rh-plans__saved-badge">{memberRoleLabel(row.role)}</span>
                  {row.excludedFromSession ? <span className="rh-plans__saved-badge">مستثنى</span> : null}
                  {dirtyRowIds.has(row.userId) ? <span className="rh-plans__saved-badge">غير محفوظ</span> : null}
                </div>
                <div className="rh-halaka-sessions__attendee-form">
                  <label className="ui-field"><span className="ui-field__label">استثناء من العملية</span><select className="ui-input" value={row.excludedFromSession ? 'yes' : 'no'} disabled={!canWrite} onChange={(e) => updateRowDraft(row.userId, { excludedFromSession: e.target.value === 'yes' })}><option value="no">مشارك</option><option value="yes">مستثنى</option></select></label>
                  <label className="ui-field"><span className="ui-field__label">الحضور</span><select className="ui-input" value={row.attendanceStatus} disabled={!canWrite || row.excludedFromSession} onChange={(e) => updateRowDraft(row.userId, { attendanceStatus: e.target.value })}>{Object.values(HALAKA_ATTENDANCE_STATUSES).map((s) => <option key={s} value={s}>{attendanceStatusLabel(s)}</option>)}</select></label>
                  {isStudent && !row.excludedFromSession ? (
                    <>
                      <label className="ui-field"><span className="ui-field__label">المجلد</span><select className="ui-input" value={volId} disabled={!canWrite} onChange={(e) => updateRowDraft(row.userId, { memorizationVolumeId: e.target.value })}><option value="">اختر المجلد</option>{VOLUMES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
                      {volId ? <p className="ui-field__hint">صفحات الكتاب: {VOLUME_BY_ID[volId]?.pages || 0}{agg ? ` — من الخطط: ${agg.totalPagesSum}` : ''}</p> : null}
                      <div className="rh-halaka-sessions__field-row">
                        <TextField label="من صفحة" type="number" min={1} max={cap || undefined} value={row.fromPage === '' ? '' : String(row.fromPage)} onChange={(e) => updateRowDraft(row.userId, { fromPage: e.target.value === '' ? '' : Math.min(Math.max(1, Number(e.target.value)), cap || 999999) })} />
                        <TextField label="إلى صفحة" type="number" min={1} max={cap || undefined} value={row.toPage === '' ? '' : String(row.toPage)} onChange={(e) => updateRowDraft(row.userId, { toPage: e.target.value === '' ? '' : Math.min(Math.max(1, Number(e.target.value)), cap || 999999) })} />
                      </div>
                      {lastW ? <p className="ui-field__hint">آخر ورد: من {lastW.localFrom} إلى {lastW.localTo} — {lastW.planName} — {formatRecordedAt(lastW.recordedAt)}</p> : null}
                    </>
                  ) : null}
                  <TextAreaField label="ملاحظات" rows={2} value={row.notes} disabled={!canWrite} onChange={(e) => updateRowDraft(row.userId, { notes: e.target.value })} />
                  <div className="rh-halaka-sessions__row-actions">
                    <Button type="button" size="sm" variant="secondary" loading={savingRowId === row.userId} disabled={!canWrite || !dirtyRowIds.has(row.userId)} onClick={() => saveRow(row)}>حفظ</Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
