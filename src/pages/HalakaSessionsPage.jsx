import { ArrowRight, Clock3, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PeekButton } from '../components/PeekButton.jsx'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { VOLUMES, VOLUME_BY_ID } from '../data/volumes.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, Modal, RhDateTimePickerField, TextAreaField, TextField, useToast } from '../ui/index.js'
import { halakaSessionDurationAr } from '../utils/datePeriodAr.js'
import { loadAwrad } from '../utils/awradStorage.js'
import { aggregateVolumeProgress, lastWirdOverlappingVolume } from '../utils/halakaVolumeProgress.js'
import {
  HALAKA_ATTENDANCE_STATUSES,
  HALAKA_MEMBER_ROLES,
  HALAKA_SESSION_TYPES,
  closeHalakaSession,
  loadHalakat,
  loadHalakatMembersWithProfiles,
  loadHalakaSessions,
  loadSessionAttendance,
  saveHalakaSession,
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
  if (!iso) return ''
  const t = Date.parse(String(iso))
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleString('ar-SA')
}

export default function HalakaSessionsPage() {
  const { halakaId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionQuery = searchParams.get('session') || ''
  const { user } = useAuth()
  const { canAccessPage } = usePermissions()
  const { str } = useSiteContent()
  const toast = useToast()

  const [halaka, setHalaka] = useState(null)
  const [sessions, setSessions] = useState([])
  const [workspaceSessionId, setWorkspaceSessionId] = useState('')
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [attendanceRows, setAttendanceRows] = useState([])
  const [dirtyRowIds, setDirtyRowIds] = useState(() => new Set())
  const [savingRowId, setSavingRowId] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const [studentContexts, setStudentContexts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [closingId, setClosingId] = useState('')
  const [sessionModalOpen, setSessionModalOpen] = useState(false)

  const [title, setTitle] = useState('')
  const [sessionType, setSessionType] = useState(HALAKA_SESSION_TYPES.MEMORIZATION)
  const [sessionTypeOther, setSessionTypeOther] = useState('')
  const [notes, setNotes] = useState('')
  const [start, setStart] = useState(() => new Date())
  const [end, setEnd] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    return d
  })

  useEffect(() => {
    if (sessionQuery) {
      setWorkspaceSessionId(sessionQuery)
      setWorkspaceOpen(true)
    } else {
      setWorkspaceSessionId('')
      setWorkspaceOpen(false)
    }
  }, [sessionQuery])

  useEffect(() => {
    if (!user?.uid || !halakaId) return
    setLoading(true)
    Promise.all([loadHalakat(user.uid), loadHalakaSessions(halakaId)])
      .then(([halakat, sessionRows]) => {
        const h = halakat.find((x) => x.id === halakaId) || null
        setHalaka(h)
        setSessions(sessionRows)
      })
      .finally(() => setLoading(false))
  }, [user?.uid, halakaId])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === workspaceSessionId) || null,
    [sessions, workspaceSessionId],
  )

  useEffect(() => {
    if (!workspaceSessionId || !halakaId || !workspaceOpen) {
      setAttendanceRows([])
      return
    }
    Promise.all([loadSessionAttendance(halakaId, workspaceSessionId), loadHalakatMembersWithProfiles(halakaId)]).then(
      ([att, members]) => {
        const map = new Map(att.map((r) => [r.userId, r]))
        setAttendanceRows(
          members.map((m) => {
            const row = map.get(m.userId) || {}
            const legacyAmt = Math.max(0, Number(row.memorizedAmount ?? row.pagesCount) || 0)
            const fp = row.fromPage != null ? Number(row.fromPage) : null
            const tp = row.toPage != null ? Number(row.toPage) : null
            const vid = String(row.memorizationVolumeId || '').trim()
            let fromPage = Number.isFinite(fp) && fp >= 1 ? fp : ''
            let toPage = Number.isFinite(tp) && tp >= 1 ? tp : ''
            if ((fromPage === '' || toPage === '') && legacyAmt > 0 && vid) {
              fromPage = 1
              toPage = legacyAmt
            }
            return {
              userId: m.userId,
              displayName: m.displayName || m.userId,
              role: m.role,
              attendanceStatus: row.attendanceStatus || HALAKA_ATTENDANCE_STATUSES.PRESENT,
              memorizationVolumeId: vid,
              fromPage,
              toPage,
              notes: row.notes || '',
            }
          }),
        )
        setDirtyRowIds(new Set())
      },
    )
  }, [workspaceSessionId, halakaId, workspaceOpen])

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
    if (!workspaceOpen || !workspaceSessionId) {
      setStudentContexts({})
      return
    }
    if (!studentFetchKey) {
      setStudentContexts({})
      return
    }
    const uids = studentFetchKey.split(',').filter(Boolean)
    let cancelled = false
    Promise.all(
      uids.map(async (uid) => {
        const [plans, awrad] = await Promise.all([loadPlans(uid), loadAwrad(uid)])
        return [uid, { plans, awrad }]
      }),
    ).then((entries) => {
      if (!cancelled) setStudentContexts(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [workspaceOpen, workspaceSessionId, studentFetchKey])

  const canWrite = roleCanWrite(halaka?.halakaRole)

  const summary = useMemo(() => {
    const stats = { total: attendanceRows.length, present: 0, absent: 0, excused: 0, permitted: 0, late: 0, other: 0 }
    for (const r of attendanceRows) {
      const s = r.attendanceStatus
      if (s in stats) stats[s] += 1
      else stats.other += 1
    }
    const otherStatuses = stats.excused + stats.permitted + stats.late + stats.other
    return { ...stats, otherStatuses }
  }, [attendanceRows])

  const draftPagesTotal = useMemo(
    () =>
      attendanceRows.reduce((sum, row) => {
        if (row.role !== HALAKA_MEMBER_ROLES.STUDENT) return sum
        const fp = row.fromPage === '' ? NaN : Number(row.fromPage)
        const tp = row.toPage === '' ? NaN : Number(row.toPage)
        if (!Number.isFinite(fp) || !Number.isFinite(tp) || tp < fp) return sum
        return sum + (tp - fp + 1)
      }, 0),
    [attendanceRows],
  )

  const crossItems = [
    { to: '/app', label: str('layout.nav_home') },
    { to: '/app/halakat', label: str('layout.nav_halakat') },
    ...(canAccessPage('halakat_explore') ? [{ to: '/app/halakat/explore', label: str('layout.nav_halakat_explore') }] : []),
  ]

  const openSessionWorkspace = useCallback(
    (sessionId) => {
      setWorkspaceSessionId(sessionId)
      setWorkspaceOpen(true)
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev)
        n.set('session', sessionId)
        return n
      })
    },
    [setSearchParams],
  )

  const closeWorkspace = useCallback(() => {
    setWorkspaceOpen(false)
    setWorkspaceSessionId('')
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev)
      n.delete('session')
      return n
    })
  }, [setSearchParams])

  const rowPayload = (row) => {
    const fp = row.fromPage === '' ? null : Number(row.fromPage)
    const tp = row.toPage === '' ? null : Number(row.toPage)
    return {
      attendanceStatus: row.attendanceStatus,
      memorizationVolumeId: row.memorizationVolumeId,
      fromPage: Number.isFinite(fp) && fp >= 1 ? fp : null,
      toPage: Number.isFinite(tp) && tp >= 1 ? tp : null,
      notes: row.notes,
    }
  }

  const markDirty = useCallback((userId) => {
    setDirtyRowIds((prev) => {
      const next = new Set(prev)
      next.add(userId)
      return next
    })
  }, [])

  const updateRowDraft = useCallback(
    (userId, patch) => {
      setAttendanceRows((prev) => prev.map((x) => (x.userId === userId ? { ...x, ...patch } : x)))
      markDirty(userId)
    },
    [markDirty],
  )

  const saveRow = useCallback(
    async (row) => {
      if (!user?.uid || !halakaId || !activeSession?.id || !row?.userId) return
      setSavingRowId(row.userId)
      try {
        await upsertSessionAttendance(user, halakaId, activeSession.id, row.userId, rowPayload(row))
        setDirtyRowIds((prev) => {
          const next = new Set(prev)
          next.delete(row.userId)
          return next
        })
      } finally {
        setSavingRowId('')
      }
    },
    [activeSession?.id, halakaId, user],
  )

  const saveAllDirtyRows = useCallback(async () => {
    if (!user?.uid || !halakaId || !activeSession?.id || dirtyRowIds.size === 0) return
    setSavingAll(true)
    try {
      const rows = attendanceRows.filter((x) => dirtyRowIds.has(x.userId))
      for (const row of rows) {
        await upsertSessionAttendance(user, halakaId, activeSession.id, row.userId, rowPayload(row))
      }
      setDirtyRowIds(new Set())
      toast.success('تم حفظ كل التعديلات في الجلسة.', 'تم')
    } catch {
      toast.warning('تعذر حفظ بعض التعديلات. حاول مرة أخرى.', 'تنبيه')
    } finally {
      setSavingAll(false)
    }
  }, [activeSession?.id, attendanceRows, dirtyRowIds, halakaId, toast, user])

  const setAllPresent = useCallback(() => {
    const ids = attendanceRows.map((x) => x.userId)
    setAttendanceRows((prev) =>
      prev.map((x) => ({
        ...x,
        attendanceStatus: HALAKA_ATTENDANCE_STATUSES.PRESENT,
      })),
    )
    setDirtyRowIds(new Set(ids))
  }, [attendanceRows])

  if (loading) {
    return (
      <div className="rh-plans rh-halaka-sessions">
        <p className="rh-halaka-sessions__state">جاري التحميل…</p>
      </div>
    )
  }
  if (!halaka) {
    return (
      <div className="rh-plans rh-halaka-sessions">
        <p className="rh-halaka-sessions__state">تعذر العثور على الحلقة.</p>
      </div>
    )
  }

  const workspaceTitle = activeSession
    ? `مساحة الجلسة — ${activeSession.title || 'جلسة حلقة'}`
    : 'مساحة الجلسة'

  return (
    <div className="rh-plans rh-halaka-sessions">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">جلسات الحلقة: {halaka.name}</h1>
            <p className="rh-plans__desc rh-halaka-sessions__lead">
              أنشئ جلسة ثم انقر أيقونة العين لفتح مساحة التحضير في نافذة منفصلة: الحضور، والتسجيل بـ «من صفحة — إلى صفحة» كما في الأوراد اليومية، مع عرض
              تقدّم الطالب في المجلد من خططه المسجّلة.
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <Link to="/app/halakat" className="rh-halaka-sessions__hero-back ui-btn ui-btn--secondary">
            <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
            العودة للحلقات
          </Link>
        </div>
      </header>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">إدارة فتح الجلسات</h2>
        </div>
        <p className="rh-settings-card__subtitle">
          فتح جلسة من النافذة المنبثقة؛ قائمة الجلسات أدناه. مساحة الحضور والتسجيل تفتح فقط عند النقر على العين.
        </p>
        <div className="rh-plans__actions">
          <Button type="button" variant="primary" disabled={!canWrite} onClick={() => setSessionModalOpen(true)}>
            <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />
            إضافة جلسة
          </Button>
        </div>
      </section>

      <Modal
        open={sessionModalOpen}
        title="إضافة جلسة جديدة"
        onClose={() => !saving && setSessionModalOpen(false)}
        size="lg"
        closeOnBackdrop={!saving}
        closeOnEsc={!saving}
        showClose={!saving}
      >
        <TextField label="عنوان الجلسة (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="ui-field">
          <span className="ui-field__label">نوع الجلسة</span>
          <select className="ui-input" value={sessionType} onChange={(e) => setSessionType(e.target.value)} disabled={!canWrite || saving}>
            <option value={HALAKA_SESSION_TYPES.MEMORIZATION}>حفظ</option>
            <option value={HALAKA_SESSION_TYPES.REVIEW}>مراجعة</option>
            <option value={HALAKA_SESSION_TYPES.CONSOLIDATION}>تثبيت</option>
            <option value={HALAKA_SESSION_TYPES.READING}>قراءة</option>
            <option value={HALAKA_SESSION_TYPES.OTHER}>أخرى</option>
          </select>
        </label>
        {sessionType === HALAKA_SESSION_TYPES.OTHER && (
          <TextField label="وصف النوع الآخر" value={sessionTypeOther} onChange={(e) => setSessionTypeOther(e.target.value)} />
        )}
        <TextAreaField label="ملاحظات" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="rh-plans__dates-grid">
          <RhDateTimePickerField label="البداية" selected={start} onChange={(d) => d && setStart(d)} maxDate={end} timeIntervals={5} />
          <RhDateTimePickerField label="النهاية" selected={end} onChange={(d) => d && setEnd(d)} minDate={start} timeIntervals={5} />
        </div>
        <p className="ui-field__hint">المدة: {halakaSessionDurationAr(start, end)}</p>
        <div className="rh-plans__actions">
          <Button
            type="button"
            variant="primary"
            loading={saving}
            disabled={!canWrite}
            onClick={async () => {
              if (!user?.uid || !halakaId || end <= start) return
              setSaving(true)
              try {
                const s = await saveHalakaSession(user, halakaId, {
                  title,
                  sessionType,
                  sessionTypeOtherLabel: sessionTypeOther,
                  notes,
                  startedAt: start.toISOString(),
                  endedAt: end.toISOString(),
                })
                const rows = await loadHalakaSessions(halakaId)
                setSessions(rows)
                toast.success('تم فتح الجلسة. افتح مساحة الجلسة من أيقونة العين.', 'تم')
                setSessionModalOpen(false)
                openSessionWorkspace(s.id)
              } catch {
                toast.warning('تعذّر فتح الجلسة.', '')
              } finally {
                setSaving(false)
              }
            }}
          >
            حفظ وفتح الجلسة
          </Button>
          <Button type="button" variant="ghost" disabled={saving} onClick={() => setSessionModalOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Modal
        open={workspaceOpen && Boolean(workspaceSessionId)}
        title={workspaceTitle}
        onClose={closeWorkspace}
        size="lg"
        contentClassName="ui-modal__content--halaka-workspace"
        ariaLabel={workspaceTitle}
      >
        <div className="rh-halaka-workspace-modal__body">
          {!activeSession ? (
            <p className="rh-halaka-sessions__state">جاري تحميل الجلسة…</p>
          ) : (
            <>
              <div className="rh-settings-card__head rh-halaka-sessions__workspace-head">
                <p className="rh-settings-card__subtitle">
                  النوع: <strong>{sessionTypeLabel(activeSession.sessionType, activeSession.sessionTypeOtherLabel)}</strong>
                  {' — '}
                  <span className="rh-plans__saved-meta">
                    {new Date(activeSession.startedAt).toLocaleString('ar-SA')} — {new Date(activeSession.endedAt).toLocaleString('ar-SA')}
                  </span>
                </p>
              </div>
              <div className="rh-halaka-sessions__stats" aria-label="ملخص الحضور">
                <div className="rh-halaka-sessions__stat">
                  <span className="rh-halaka-sessions__stat-value">{summary.total}</span>
                  <span className="rh-halaka-sessions__stat-label">المسجّلون</span>
                </div>
                <div className="rh-halaka-sessions__stat">
                  <span className="rh-halaka-sessions__stat-value">{summary.present}</span>
                  <span className="rh-halaka-sessions__stat-label">حاضر</span>
                </div>
                <div className="rh-halaka-sessions__stat">
                  <span className="rh-halaka-sessions__stat-value">{summary.absent}</span>
                  <span className="rh-halaka-sessions__stat-label">غائب</span>
                </div>
                <div className="rh-halaka-sessions__stat">
                  <span className="rh-halaka-sessions__stat-value">{summary.otherStatuses}</span>
                  <span className="rh-halaka-sessions__stat-label">حالات أخرى</span>
                </div>
                <div className="rh-halaka-sessions__stat">
                  <span className="rh-halaka-sessions__stat-value">{draftPagesTotal}</span>
                  <span className="rh-halaka-sessions__stat-label">صفحات الجلسة الآن</span>
                </div>
              </div>
              <div className="rh-halaka-sessions__toolbar">
                <Button type="button" variant="secondary" disabled={!canWrite || savingAll} onClick={setAllPresent}>
                  الكل حاضر
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={savingAll}
                  disabled={!canWrite || dirtyRowIds.size === 0}
                  onClick={saveAllDirtyRows}
                >
                  حفظ الكل ({dirtyRowIds.size})
                </Button>
              </div>
              <p className="rh-halaka-sessions__callout">
                عدّل البيانات أولاً ثم اضغط «حفظ» لكل طالب أو «حفظ الكل». للطلاب: اختر المجلد ثم سجّل من صفحة إلى صفحة داخل ذلك المجلد (نفس أسلوب تسجيل
                الورد اليومي في الخطط). يُعرض إجمالي صفحات الكتاب، والصفحات المنجزة من خطط الطالب في هذا المجلد، وآخر ورد مسجّل يتقاطع مع المجلد.
              </p>
              <ul className="rh-halaka-sessions__attendee-list">
                {attendanceRows.map((row) => {
                  const isStudent = row.role === HALAKA_MEMBER_ROLES.STUDENT
                  const ctx = studentContexts[row.userId]
                  const volId = row.memorizationVolumeId
                  const volBook = volId ? VOLUME_BY_ID[volId] : null
                  const agg = volId && ctx ? aggregateVolumeProgress(volId, ctx.plans, ctx.awrad) : null
                  const lastW = volId && ctx ? lastWirdOverlappingVolume(volId, ctx.plans, ctx.awrad) : null
                  const cap = volBook?.pages || 0
                  const fpNum = row.fromPage === '' ? NaN : Number(row.fromPage)
                  const tpNum = row.toPage === '' ? NaN : Number(row.toPage)
                  const span =
                    Number.isFinite(fpNum) && Number.isFinite(tpNum) && tpNum >= fpNum ? tpNum - fpNum + 1 : null

                  return (
                    <li
                      key={row.userId}
                      className={['rh-halaka-sessions__attendee', isStudent ? 'rh-halaka-sessions__attendee--student' : ''].filter(Boolean).join(' ')}
                    >
                      <div className="rh-halaka-sessions__attendee-head">
                        <span className="rh-halaka-sessions__attendee-name">{row.displayName}</span>
                        {memberRoleLabel(row.role) ? <span className="rh-plans__saved-badge">{memberRoleLabel(row.role)}</span> : null}
                        {dirtyRowIds.has(row.userId) ? <span className="rh-plans__saved-badge">غير محفوظ</span> : null}
                      </div>
                      <div className="rh-halaka-sessions__attendee-form">
                        <label className="ui-field">
                          <span className="ui-field__label">الحضور</span>
                          <select
                            className="ui-input"
                            value={row.attendanceStatus}
                            disabled={!canWrite}
                            onChange={(e) => {
                              const next = e.target.value
                              updateRowDraft(row.userId, { attendanceStatus: next })
                            }}
                          >
                            {Object.values(HALAKA_ATTENDANCE_STATUSES).map((s) => (
                              <option key={s} value={s}>
                                {attendanceStatusLabel(s)}
                              </option>
                            ))}
                          </select>
                        </label>
                        {isStudent ? (
                          <>
                            <label className="ui-field">
                              <span className="ui-field__label">المجلد</span>
                              <select
                                className="ui-input"
                                value={row.memorizationVolumeId}
                                disabled={!canWrite}
                                onChange={(e) => {
                                  const next = e.target.value
                                  const c = studentContexts[row.userId]
                                  const suggestion = next && c ? aggregateVolumeProgress(next, c.plans, c.awrad) : null
                                  let nf = ''
                                  let nt = ''
                                  if (next && suggestion && canWrite) {
                                    nf = suggestion.suggestedFromPage
                                    nt = suggestion.suggestedFromPage
                                  }
                                  updateRowDraft(row.userId, { memorizationVolumeId: next, fromPage: nf, toPage: nt })
                                }}
                              >
                                <option value="">اختر المجلد</option>
                                {VOLUMES.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {volBook && (
                              <div className="rh-halaka-sessions__volume-context">
                                <p className="rh-halaka-sessions__volume-context-line">
                                  <strong>الكتاب:</strong> {volBook.pages} صفحة
                                  {agg ? (
                                    <>
                                      {' — '}
                                      <strong>من الخطط:</strong> نحو {agg.totalPagesSum} صفحة مُسجّلة في هذا المجلد
                                      {agg.suggestedFromPage ? ` — بداية مقترحة للتسجيل: صفحة ${agg.suggestedFromPage}` : null}
                                    </>
                                  ) : (
                                    ' — جاري تحميل خطط الطالب…'
                                  )}
                                </p>
                                {lastW ? (
                                  <p className="rh-halaka-sessions__volume-context-last">
                                    <strong>آخر ورد في المنصة (يتقاطع مع المجلد):</strong> من {lastW.localFrom} إلى {lastW.localTo} (
                                    {lastW.pagesCount} ص) — {lastW.planName} — {formatRecordedAt(lastW.recordedAt)}
                                  </p>
                                ) : volId && ctx ? (
                                  <p className="rh-halaka-sessions__volume-context-last rh-halaka-sessions__volume-context-last--muted">
                                    لا يوجد ورد مسجّل في المنصة لهذا المجلد ضمن خطط الطالب.
                                  </p>
                                ) : null}
                              </div>
                            )}
                            <div className="rh-halaka-sessions__field-row">
                              <TextField
                                label="من صفحة"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={cap || undefined}
                                value={row.fromPage === '' ? '' : String(row.fromPage)}
                                disabled={!canWrite || !volId}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const n = raw === '' ? '' : Math.max(1, Math.floor(Number(raw) || 0))
                                  const capped = cap && n !== '' ? Math.min(n, cap) : n
                                  let nextTo = row.toPage
                                  if (nextTo !== '' && capped !== '' && Number(nextTo) < capped) nextTo = capped
                                  if (nextTo !== '' && cap) nextTo = Math.min(Number(nextTo), cap)
                                  updateRowDraft(row.userId, { fromPage: capped, toPage: nextTo })
                                }}
                              />
                              <TextField
                                label="إلى صفحة"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={cap || undefined}
                                value={row.toPage === '' ? '' : String(row.toPage)}
                                disabled={!canWrite || !volId}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const n = raw === '' ? '' : Math.max(1, Math.floor(Number(raw) || 0))
                                  let v = n
                                  if (v !== '' && cap) v = Math.min(v, cap)
                                  if (v !== '' && row.fromPage !== '' && v < Number(row.fromPage)) v = Number(row.fromPage)
                                  updateRowDraft(row.userId, { toPage: v })
                                }}
                              />
                            </div>
                            {span != null ? (
                              <p className="ui-field__hint">
                                عدد الصفحات في هذا التسجيل: <strong>{span}</strong>
                              </p>
                            ) : null}
                            <TextAreaField
                              label="ملاحظات الطالب (تحضير / تثبيت / مراجعة…)"
                              rows={2}
                              value={row.notes}
                              disabled={!canWrite}
                              onChange={(e) => {
                                const next = e.target.value
                                updateRowDraft(row.userId, { notes: next })
                              }}
                            />
                            <div className="rh-halaka-sessions__row-actions">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                loading={savingRowId === row.userId}
                                disabled={!canWrite || !dirtyRowIds.has(row.userId)}
                                onClick={() => saveRow(row)}
                              >
                                حفظ
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="rh-halaka-sessions__non-student-hint">تسجيل الحفظ والمجلدات يقتصر على الطلاب.</p>
                        )}
                        {!isStudent ? (
                          <div className="rh-halaka-sessions__row-actions">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              loading={savingRowId === row.userId}
                              disabled={!canWrite || !dirtyRowIds.has(row.userId)}
                              onClick={() => saveRow(row)}
                            >
                              حفظ
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </Modal>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">الجلسات</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="rh-halaka-sessions__empty">لا توجد جلسات بعد. اضغط «إضافة جلسة» للبدء.</p>
        ) : (
          <ul className="rh-halaka-sessions__session-list">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={[
                  'rh-halaka-sessions__session',
                  workspaceOpen && workspaceSessionId === s.id ? 'rh-halaka-sessions__session--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="rh-halaka-sessions__session-main">
                  <span className="rh-halaka-sessions__session-title">{s.title || 'جلسة حلقة'}</span>
                  <div className="rh-halaka-sessions__session-badges">
                    <span className="rh-plans__saved-badge">{sessionTypeLabel(s.sessionType, s.sessionTypeOtherLabel)}</span>
                    <span className="rh-plans__saved-badge">{s.status === 'closed' ? 'مغلقة' : 'مفتوحة'}</span>
                  </div>
                  <span className="rh-halaka-sessions__session-dates">
                    {new Date(s.startedAt).toLocaleString('ar-SA')} — {new Date(s.endedAt).toLocaleString('ar-SA')}
                  </span>
                </div>
                <div className="rh-halaka-sessions__session-actions">
                  <PeekButton
                    className={workspaceOpen && workspaceSessionId === s.id ? 'rh-peek-btn--active' : ''}
                    title={
                      workspaceOpen && workspaceSessionId === s.id
                        ? 'مساحة الجلسة مفتوحة'
                        : 'فتح مساحة الجلسة — الحضور والتسجيل من صفحة إلى صفحة'
                    }
                    onClick={() => openSessionWorkspace(s.id)}
                  />
                  {s.status !== 'closed' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rh-halaka-sessions__action-btn"
                      loading={closingId === s.id}
                      disabled={!canWrite}
                      onClick={async () => {
                        if (!user?.uid) return
                        setClosingId(s.id)
                        try {
                          await closeHalakaSession(user, halakaId, s.id, user)
                          setSessions(await loadHalakaSessions(halakaId))
                          if (workspaceSessionId === s.id) closeWorkspace()
                        } finally {
                          setClosingId('')
                        }
                      }}
                    >
                      <RhIcon as={Clock3} size={14} strokeWidth={RH_ICON_STROKE} />
                      إغلاق
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
