import { ArrowRight, Clock3, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PeekButton } from '../components/PeekButton.jsx'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { Button, Modal, RhDateTimePickerField, TextAreaField, TextField, useToast } from '../ui/index.js'
import { halakaSessionDurationAr } from '../utils/datePeriodAr.js'
import {
  HALAKA_MEMBER_ROLES,
  HALAKA_SESSION_TYPES,
  closeHalakaSession,
  loadHalakat,
  loadHalakaSessions,
  saveHalakaSession,
} from '../utils/halakatStorage.js'

function roleCanWrite(role) {
  return role === HALAKA_MEMBER_ROLES.OWNER || role === HALAKA_MEMBER_ROLES.SUPERVISOR || role === HALAKA_MEMBER_ROLES.TEACHER
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
  const { user } = useAuth()
  const { canAccessPage } = usePermissions()
  const { str } = useSiteContent()
  const toast = useToast()

  const [halaka, setHalaka] = useState(null)
  const [sessions, setSessions] = useState([])
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

  const canWrite = roleCanWrite(halaka?.halakaRole)

  const crossItems = [
    { to: '/app', label: str('layout.nav_home') },
    { to: '/app/halakat', label: str('layout.nav_halakat') },
    ...(canAccessPage('halakat_explore') ? [{ to: '/app/halakat/explore', label: str('layout.nav_halakat_explore') }] : []),
    ...(canAccessPage('remote_tasmee') ? [{ to: '/app/remote-tasmee', label: str('layout.nav_remote_tasmee') }] : []),
    ...(canAccessPage('remote_tasmee_explore')
      ? [{ to: '/app/remote-tasmee/explore', label: str('layout.nav_remote_tasmee_explore') }]
      : []),
    ...(canAccessPage('exams') ? [{ to: '/app/exams', label: str('layout.nav_exams') }] : []),
    ...(canAccessPage('exams_explore')
      ? [{ to: '/app/exams/explore', label: str('layout.nav_exams_explore') }]
      : []),
    ...(canAccessPage('activities') ? [{ to: '/app/activities', label: str('layout.nav_activities') }] : []),
    ...(canAccessPage('activities_explore')
      ? [{ to: '/app/activities/explore', label: str('layout.nav_activities_explore') }]
      : []),
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
            <p className="rh-plans__desc rh-halaka-sessions__lead">أنشئ جلسة ثم انقر أيقونة العين للدخول إلى صفحة الجلسة المستقلة.</p>
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
        <p className="rh-settings-card__subtitle">فتح جلسة من النافذة المنبثقة، ثم إدارة التحضير والتغييب من صفحة مستقلة لكل جلسة.</p>
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
                await saveHalakaSession(user, halakaId, {
                  title,
                  sessionType,
                  sessionTypeOtherLabel: sessionTypeOther,
                  notes,
                  startedAt: start.toISOString(),
                  endedAt: end.toISOString(),
                })
                const rows = await loadHalakaSessions(halakaId)
                setSessions(rows)
                toast.success('تم فتح الجلسة. يمكنك الدخول لها الآن من أيقونة العين.', 'تم')
                setSessionModalOpen(false)
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
                className={[
                  'rh-halaka-sessions__session',
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
                    to={`/app/halakat/${halakaId}/sessions/${s.id}`}
                    title="فتح صفحة الجلسة المستقلة"
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
    </div>
  )
}
