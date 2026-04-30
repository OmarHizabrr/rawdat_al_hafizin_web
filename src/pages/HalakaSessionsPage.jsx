import { ArrowRight, Clock3, Plus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { VOLUMES, VOLUME_BY_ID } from '../data/volumes.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, RhDateTimePickerField, TextAreaField, TextField, useToast } from '../ui/index.js'
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

export default function HalakaSessionsPage() {
  const { halakaId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { canAccessPage } = usePermissions()
  const { str } = useSiteContent()
  const toast = useToast()

  const [halaka, setHalaka] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(() => searchParams.get('session') || '')
  const [attendanceRows, setAttendanceRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [closingId, setClosingId] = useState('')

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
        const firstId = searchParams.get('session') || sessionRows[0]?.id || ''
        setActiveSessionId(firstId)
      })
      .finally(() => setLoading(false))
  }, [user?.uid, halakaId])

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
    return stats
  }, [attendanceRows])

  const crossItems = [
    { to: '/app', label: str('layout.nav_home') },
    { to: '/app/halakat', label: str('layout.nav_halakat') },
    ...(canAccessPage('halakat_explore') ? [{ to: '/app/halakat/explore', label: str('layout.nav_halakat_explore') }] : []),
  ]

  if (loading) return <p className="rh-plans__empty">جاري التحميل…</p>
  if (!halaka) return <p className="rh-plans__empty">تعذر العثور على الحلقة.</p>

  return (
    <div className="rh-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">جلسات الحلقة: {halaka.name}</h1>
            <p className="rh-plans__desc">صفحة الجلسات: فتح جلسة، نوعها، حضور الطلاب، مقدار الحفظ، وتقرير مختصر.</p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <Link to="/app/halakat" className="ui-btn ui-btn--secondary">
            <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
            العودة للحلقات
          </Link>
        </div>
      </header>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">فتح جلسة جديدة</h2>
        </div>
        <div className="rh-plans__dates-grid">
          <TextField label="عنوان الجلسة (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="ui-field">
            <span className="ui-field__label">نوع الجلسة</span>
            <select className="ui-input" value={sessionType} onChange={(e) => setSessionType(e.target.value)} disabled={!canWrite}>
              <option value={HALAKA_SESSION_TYPES.MEMORIZATION}>حفظ</option>
              <option value={HALAKA_SESSION_TYPES.REVIEW}>مراجعة</option>
              <option value={HALAKA_SESSION_TYPES.CONSOLIDATION}>تثبيت</option>
              <option value={HALAKA_SESSION_TYPES.READING}>قراءة</option>
              <option value={HALAKA_SESSION_TYPES.OTHER}>أخرى</option>
            </select>
          </label>
        </div>
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
                toast.success('تم فتح الجلسة.', 'تم')
              } catch {
                toast.warning('تعذّر فتح الجلسة.', '')
              } finally {
                setSaving(false)
              }
            }}
          >
            <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />
            فتح جلسة
          </Button>
        </div>
      </section>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">الجلسات</h2>
        </div>
        <ul className="rh-members-chat-list">
          {sessions.map((s) => (
            <li key={s.id} className="rh-members-chat__item">
              <div className="rh-members-chat__main">
                <strong>{s.title || 'جلسة حلقة'}</strong>
                <span className="rh-plans__saved-badge">{sessionTypeLabel(s.sessionType, s.sessionTypeOtherLabel)}</span>
                <span className="rh-plans__saved-badge">{s.status === 'closed' ? 'مغلقة' : 'مفتوحة'}</span>
                <span className="rh-plans__saved-meta">
                  {new Date(s.startedAt).toLocaleString('ar-SA')} — {new Date(s.endedAt).toLocaleString('ar-SA')}
                </span>
              </div>
              <div className="rh-members-chat__actions">
                <Button type="button" size="sm" variant={activeSessionId === s.id ? 'secondary' : 'ghost'} onClick={() => {
                  setActiveSessionId(s.id); setSearchParams({ session: s.id })
                }}>
                  <RhIcon as={Users} size={14} strokeWidth={RH_ICON_STROKE} />
                  التفاصيل
                </Button>
                {s.status !== 'closed' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
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
      </section>

      {activeSession && (
        <section className="rh-settings-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">تقرير الجلسة</h2>
          </div>
          <p className="rh-plans__saved-meta">
            النوع: <strong>{sessionTypeLabel(activeSession.sessionType, activeSession.sessionTypeOtherLabel)}</strong>
          </p>
          <p className="rh-plans__saved-meta">إجمالي: {summary.total} — حاضر: {summary.present} — غائب: {summary.absent}</p>
          <ul className="rh-members-chat-list">
            {attendanceRows.map((row) => (
              <li key={row.userId} className="rh-members-chat__item">
                <div className="rh-members-chat__main">
                  <strong>{row.displayName}</strong>
                </div>
                <div style={{ display: 'grid', gap: '0.35rem', width: '100%' }}>
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
                  <div className="rh-plans__dates-grid">
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
                    <TextField
                      label="القدر (صفحات)"
                      type="number"
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
                  <p className="ui-field__hint">
                    {row.memorizationVolumeId ? `${VOLUME_BY_ID[row.memorizationVolumeId]?.label || row.memorizationVolumeId}` : '—'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
