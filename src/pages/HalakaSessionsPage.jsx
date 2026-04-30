import { ArrowRight, Clock3, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PeekButton } from '../components/PeekButton.jsx'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { VOLUMES } from '../data/volumes.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, Modal, RhDateTimePickerField, TextAreaField, TextField, useToast } from '../ui/index.js'
import { halakaSessionDurationAr } from '../utils/datePeriodAr.js'
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
  const [activeSessionId, setActiveSessionId] = useState(() => sessionQuery)
  const [attendanceRows, setAttendanceRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [closingId, setClosingId] = useState('')
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const sessionReportRef = useRef(null)

  const scrollToSessionWorkspace = useCallback(() => {
    window.setTimeout(() => {
      sessionReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)
  }, [])

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
    if (!user?.uid || !halakaId) return
    setLoading(true)
    Promise.all([loadHalakat(user.uid), loadHalakaSessions(halakaId)])
      .then(([halakat, sessionRows]) => {
        const h = halakat.find((x) => x.id === halakaId) || null
        setHalaka(h)
        setSessions(sessionRows)
        const firstId = sessionQuery || sessionRows[0]?.id || ''
        setActiveSessionId(firstId)
      })
      .finally(() => setLoading(false))
  }, [user?.uid, halakaId, sessionQuery])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId],
  )

  useEffect(() => {
    if (!activeSessionId || !halakaId) {
      setAttendanceRows([])
      return
    }
    Promise.all([loadSessionAttendance(halakaId, activeSessionId), loadHalakatMembersWithProfiles(halakaId)]).then(
      ([att, members]) => {
        const map = new Map(att.map((r) => [r.userId, r]))
        setAttendanceRows(
          members.map((m) => {
            const row = map.get(m.userId) || {}
            return {
              userId: m.userId,
              displayName: m.displayName || m.userId,
              role: m.role,
              attendanceStatus: row.attendanceStatus || HALAKA_ATTENDANCE_STATUSES.PRESENT,
              memorizationVolumeId: row.memorizationVolumeId || '',
              memorizedAmount: Number(row.memorizedAmount || 0),
              notes: row.notes || '',
            }
          }),
        )
      },
    )
  }, [activeSessionId, halakaId])

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

  const crossItems = [
    { to: '/app', label: str('layout.nav_home') },
    { to: '/app/halakat', label: str('layout.nav_halakat') },
    ...(canAccessPage('halakat_explore') ? [{ to: '/app/halakat/explore', label: str('layout.nav_halakat_explore') }] : []),
  ]

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

  return (
    <div className="rh-plans rh-halaka-sessions">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">جلسات الحلقة: {halaka.name}</h1>
            <p className="rh-plans__desc rh-halaka-sessions__lead">
              بعد فتح جلسة، انقر أيقونة العين بجانبها لدخول مساحة الجلسة: التحضير، الحضور، وتسجيل الحفظ أو المراجعة أو التثبيت
              أو القراءة لكل طالب.
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
          فتح جلسة جديدة من النافذة المنبثقة؛ ثم استخدم أيقونة العين في قائمة الجلسات للانتقال إلى التحضير والتسجيل لكل طالب.
        </p>
        <div className="rh-plans__actions">
          <Button
            type="button"
            variant="primary"
            disabled={!canWrite}
            onClick={() => setSessionModalOpen(true)}
          >
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
                setActiveSessionId(s.id)
                setSearchParams({ session: s.id })
                toast.success('تم فتح الجلسة. انتقل بأيقونة العين لإكمال التحضير.', 'تم')
                setSessionModalOpen(false)
                scrollToSessionWorkspace()
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
                className={['rh-halaka-sessions__session', activeSessionId === s.id ? 'rh-halaka-sessions__session--active' : ''].filter(Boolean).join(' ')}
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
                    className={activeSessionId === s.id ? 'rh-peek-btn--active' : ''}
                    title={
                      activeSessionId === s.id
                        ? 'مساحة الجلسة مفتوحة — التمرير للتقرير'
                        : 'دخول الجلسة — التحضير وتسجيل الحضور والحفظ أو المراجعة لكل طالب'
                    }
                    onClick={() => {
                      setActiveSessionId(s.id)
                      setSearchParams({ session: s.id })
                      scrollToSessionWorkspace()
                    }}
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

      {activeSession && (
        <section ref={sessionReportRef} className="rh-settings-card rh-halaka-sessions__workspace">
          <div className="rh-settings-card__head rh-halaka-sessions__workspace-head">
            <h2 className="rh-settings-card__title">مساحة الجلسة — التحضير والتسجيل</h2>
            <p className="rh-settings-card__subtitle">
              النوع: <strong>{sessionTypeLabel(activeSession.sessionType, activeSession.sessionTypeOtherLabel)}</strong>
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
          </div>
          <p className="rh-halaka-sessions__callout">
            سجّل الحضور لجميع الأعضاء؛ حقول المجلد والمقدار والملاحظات التفصيلية للطلاب فقط. على الشاشات الصغيرة تُرتب الحقول عموديًا
            لتسهيل اللمس.
          </p>
          <ul className="rh-halaka-sessions__attendee-list">
            {attendanceRows.map((row) => {
              const isStudent = row.role === HALAKA_MEMBER_ROLES.STUDENT
              return (
                <li
                  key={row.userId}
                  className={['rh-halaka-sessions__attendee', isStudent ? 'rh-halaka-sessions__attendee--student' : ''].filter(Boolean).join(' ')}
                >
                  <div className="rh-halaka-sessions__attendee-head">
                    <span className="rh-halaka-sessions__attendee-name">{row.displayName}</span>
                    {memberRoleLabel(row.role) ? (
                      <span className="rh-plans__saved-badge">{memberRoleLabel(row.role)}</span>
                    ) : null}
                  </div>
                  <div className="rh-halaka-sessions__attendee-form">
                    <label className="ui-field">
                      <span className="ui-field__label">الحضور</span>
                      <select
                        className="ui-input"
                        value={row.attendanceStatus}
                        disabled={!canWrite}
                        onChange={async (e) => {
                          const next = e.target.value
                          const updated = attendanceRows.map((x) => (x.userId === row.userId ? { ...x, attendanceStatus: next } : x))
                          setAttendanceRows(updated)
                          await upsertSessionAttendance(user, halakaId, activeSession.id, row.userId, {
                            attendanceStatus: next,
                            memorizationVolumeId: row.memorizationVolumeId,
                            memorizedAmount: row.memorizedAmount,
                            notes: row.notes,
                          })
                        }}
                      >
                        {Object.values(HALAKA_ATTENDANCE_STATUSES).map((s) => (
                          <option key={s} value={s}>{attendanceStatusLabel(s)}</option>
                        ))}
                      </select>
                    </label>
                    {isStudent ? (
                      <>
                        <div className="rh-halaka-sessions__field-row">
                          <label className="ui-field">
                            <span className="ui-field__label">المجلد</span>
                            <select
                              className="ui-input"
                              value={row.memorizationVolumeId}
                              disabled={!canWrite}
                              onChange={async (e) => {
                                const next = e.target.value
                                const updated = attendanceRows.map((x) => (x.userId === row.userId ? { ...x, memorizationVolumeId: next } : x))
                                setAttendanceRows(updated)
                                await upsertSessionAttendance(user, halakaId, activeSession.id, row.userId, {
                                  attendanceStatus: row.attendanceStatus,
                                  memorizationVolumeId: next,
                                  memorizedAmount: row.memorizedAmount,
                                  notes: row.notes,
                                })
                              }}
                            >
                              <option value="">اختر المجلد</option>
                              {VOLUMES.map((v) => (
                                <option key={v.id} value={v.id}>{v.label}</option>
                              ))}
                            </select>
                          </label>
                          <TextField
                            label="المقدار (صفحات)"
                            type="number"
                            inputMode="decimal"
                            value={String(row.memorizedAmount || 0)}
                            disabled={!canWrite}
                            onChange={async (e) => {
                              const next = Number(e.target.value || 0)
                              const updated = attendanceRows.map((x) => (x.userId === row.userId ? { ...x, memorizedAmount: next } : x))
                              setAttendanceRows(updated)
                              await upsertSessionAttendance(user, halakaId, activeSession.id, row.userId, {
                                attendanceStatus: row.attendanceStatus,
                                memorizationVolumeId: row.memorizationVolumeId,
                                memorizedAmount: next,
                                notes: row.notes,
                              })
                            }}
                          />
                        </div>
                        <TextAreaField
                          label="ملاحظات الطالب (تحضير / تثبيت / مراجعة…)"
                          rows={2}
                          value={row.notes}
                          disabled={!canWrite}
                          onChange={async (e) => {
                            const next = e.target.value
                            const updated = attendanceRows.map((x) => (x.userId === row.userId ? { ...x, notes: next } : x))
                            setAttendanceRows(updated)
                            await upsertSessionAttendance(user, halakaId, activeSession.id, row.userId, {
                              attendanceStatus: row.attendanceStatus,
                              memorizationVolumeId: row.memorizationVolumeId,
                              memorizedAmount: row.memorizedAmount,
                              notes: next,
                            })
                          }}
                        />
                      </>
                    ) : (
                      <p className="rh-halaka-sessions__non-student-hint">تسجيل الحفظ والمجلدات يقتصر على الطلاب.</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
