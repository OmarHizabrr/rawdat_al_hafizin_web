import { CircleHelp, MessageCircleQuestion, Pencil, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { ServicePageImpersonationBanner } from '../components/ServicePageImpersonationBanner.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { useHidePlanNavigation } from '../hooks/useHidePlanNavigation.js'
import {
  createInquiry,
  replyToInquiry,
  subscribeAllInquiries,
  subscribeMyInquiries,
  updateOwnInquiry,
} from '../services/inquiriesService.js'
import { Button, TextAreaField, useToast } from '../ui/index.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { rhHapticChromeTap } from '../utils/haptics.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const INQ = PERMISSION_PAGE_IDS.inquiries

function formatRelativeTime(ts) {
  if (!ts) return ''
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : Date.parse(String(ts))
  if (!Number.isFinite(ms)) return ''
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} د`
  const h = Math.floor(m / 60)
  if (h < 48) return `منذ ${h} س`
  const d = Math.floor(h / 24)
  return `منذ ${d} ي`
}

function studentHeadline(row, canSeeStudent) {
  if (!row.showStudentPublic) return { title: 'طالب', subtitle: 'مجهول الهوية', avatar: '', anonymous: true }
  if (!canSeeStudent) return { title: 'طالب', subtitle: 'الهوية مخفية عن صلاحياتك', avatar: '', anonymous: true }
  const name = row.studentDisplayName?.trim() || 'طالب'
  return { title: name, subtitle: '', avatar: row.studentPhotoURL || '', anonymous: false }
}

function replyHeadlineForOwner(row) {
  if (!row.hasAnswer) return null
  if (!row.showResponderPublic) {
    return { title: 'إدارة المنصة', subtitle: 'رد رسمي', avatar: '', generic: true }
  }
  const name = row.answeredByName?.trim() || 'إدارة المنصة'
  return { title: name, subtitle: 'مُجيب', avatar: row.answeredByPhotoURL || '', generic: false }
}

export default function InquiriesPage() {
  const { user } = useAuth()
  const { search } = useLocation()
  const toast = useToast()
  const { str, branding } = useSiteContent()
  const { can, canAccessPage } = usePermissions()
  const hidePlanNavigation = useHidePlanNavigation()

  const impersonateUid = getImpersonateUid(user, search)
  const appLink = useCallback((path) => withImpersonationQuery(path, impersonateUid), [impersonateUid])

  const contextUid = useMemo(() => {
    if (!user?.uid) return ''
    if (impersonateUid && isAdmin(user)) return impersonateUid
    return user.uid
  }, [impersonateUid, user])

  const actingAsUser = Boolean(impersonateUid && user?.uid && impersonateUid !== user.uid && isAdmin(user))

  const canSubmit = isAdmin(user) || can(INQ, 'inquiries_submit')
  const canEditOwn = isAdmin(user) || can(INQ, 'inquiries_edit_own')
  const canViewAll = isAdmin(user) || can(INQ, 'inquiries_view_all')
  const canReply = isAdmin(user) || can(INQ, 'inquiries_reply')
  const canSeeStudent = isAdmin(user) || can(INQ, 'inquiries_see_student_identity')

  const [draft, setDraft] = useState('')
  const [showStudentPublic, setShowStudentPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState([])
  const [allRows, setAllRows] = useState([])
  const [adminPickId, setAdminPickId] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyShowName, setReplyShowName] = useState(true)
  const [editId, setEditId] = useState('')
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    document.title = actingAsUser
      ? `الاستفسارات (نيابة) — ${branding.siteTitle}`
      : `الاستفسارات — ${branding.siteTitle}`
  }, [actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!contextUid) return undefined
    return subscribeMyInquiries(
      contextUid,
      setMine,
      () => toast.warning('تعذّر تحميل استفساراتك. تحقق من الاتصال أو قواعد Firestore للفهرس المركّب.', 'تنبيه'),
    )
  }, [contextUid, toast])

  useEffect(() => {
    if (!canViewAll) {
      setAllRows([])
      return undefined
    }
    return subscribeAllInquiries(
      setAllRows,
      () => toast.warning('تعذّر تحميل كل الاستفسارات.', 'تنبيه'),
    )
  }, [canViewAll, toast])

  const pickedAdminRow = useMemo(
    () => allRows.find((r) => r.id === adminPickId) || null,
    [adminPickId, allRows],
  )

  useEffect(() => {
    if (!pickedAdminRow) {
      setReplyText('')
      setReplyShowName(true)
      return
    }
    if (pickedAdminRow.hasAnswer) {
      setReplyText(pickedAdminRow.answer || '')
      setReplyShowName(pickedAdminRow.showResponderPublic !== false)
    } else {
      setReplyText('')
      setReplyShowName(true)
    }
  }, [pickedAdminRow])

  const crossItems = useMemo(() => {
    const base = [{ to: appLink('/app'), label: str('layout.nav_home') }]
    if (!hidePlanNavigation) base.push({ to: appLink('/app/plans'), label: str('layout.nav_plans') })
    if (canAccessPage('welcome')) base.push({ to: appLink('/app/welcome'), label: str('layout.nav_welcome') })
    if (canAccessPage('feelings')) base.push({ to: appLink('/app/feelings'), label: str('layout.nav_feelings') })
    if (canAccessPage('leave_request')) base.push({ to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') })
    if (canAccessPage('settings')) base.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
    }
    return base
  }, [appLink, canAccessPage, hidePlanNavigation, str, user])

  const submitNew = async () => {
    if (!contextUid || !canSubmit) return
    const t = draft.trim()
    if (!t) {
      toast.warning('اكتب نص الاستفسار أولاً.', 'تنبيه')
      return
    }
    setBusy(true)
    try {
      await createInquiry({
        studentUid: contextUid,
        question: t,
        showStudentPublic,
        userData: { uid: user?.uid, displayName: user?.displayName, photoURL: user?.photoURL },
      })
      setDraft('')
      setShowStudentPublic(true)
      rhHapticChromeTap()
      toast.success('تم إرسال الاستفسار بنجاح.', 'تم')
    } catch {
      toast.warning('تعذّر الإرسال. حاول مرة أخرى.', 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async () => {
    if (!editId || !contextUid || !canEditOwn) return
    const t = editDraft.trim()
    if (!t) return
    setBusy(true)
    try {
      await updateOwnInquiry({
        inquiryId: editId,
        studentUid: contextUid,
        question: t,
        userData: { uid: user?.uid, displayName: user?.displayName, photoURL: user?.photoURL },
      })
      setEditId('')
      setEditDraft('')
      rhHapticChromeTap()
      toast.success('تم حفظ التعديل.', 'تم')
    } catch (e) {
      const code = e?.message
      if (code === 'INQUIRY_ALREADY_ANSWERED') toast.warning('لا يمكن التعديل بعد الرد.', 'تنبيه')
      else toast.warning('تعذّر حفظ التعديل.', 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  const sendReply = async () => {
    if (!pickedAdminRow || !canReply) return
    if (pickedAdminRow.hasAnswer) {
      toast.warning('هذا الاستفسار مُجاب مسبقاً.', 'تنبيه')
      return
    }
    const t = replyText.trim()
    if (!t) {
      toast.warning('اكتب نص الرد.', 'تنبيه')
      return
    }
    setBusy(true)
    try {
      await replyToInquiry({
        inquiryId: pickedAdminRow.id,
        answer: t,
        showResponderPublic: replyShowName,
        userData: { uid: user?.uid, displayName: user?.displayName, photoURL: user?.photoURL },
      })
      rhHapticChromeTap()
      toast.success('تم إرسال الرد.', 'تم')
    } catch {
      toast.warning('تعذّر إرسال الرد.', 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  const renderMineCard = (row) => {
    const mineStudent = studentHeadline(row, true)
    const rep = replyHeadlineForOwner(row)
    const editing = editId === row.id

    return (
      <article key={row.id} className="rh-inq-card">
        <div className="rh-inq-card__top">
          <span className={['rh-inq-badge', row.hasAnswer ? 'rh-inq-badge--ok' : 'rh-inq-badge--wait'].join(' ')}>
            {row.hasAnswer ? 'تم الرد' : 'بانتظار الرد'}
          </span>
          <time className="rh-inq-card__time" dateTime="">
            {formatRelativeTime(row.createTimes)}
          </time>
        </div>
        <div className="rh-inq-card__q">
          <RhIcon as={CircleHelp} size={18} strokeWidth={RH_ICON_STROKE} aria-hidden />
          <p>{row.question}</p>
        </div>
        {!row.hasAnswer && canEditOwn && (
          <div className="rh-inq-card__actions">
            {editing ? (
              <>
                <TextAreaField label="تعديل الاستفسار" value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={4} />
                <div className="rh-inq-card__btn-row">
                  <Button type="button" variant="secondary" onClick={() => { setEditId(''); setEditDraft('') }}>
                    إلغاء
                  </Button>
                  <Button type="button" onClick={() => void saveEdit()} disabled={busy}>
                    حفظ
                  </Button>
                </div>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditId(row.id)
                  setEditDraft(row.question)
                }}
              >
                <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                تعديل
              </Button>
            )}
          </div>
        )}
        {row.hasAnswer && (
          <div className="rh-inq-card__answer">
            <div className="rh-inq-card__answer-head">
              {rep?.avatar ? (
                <img src={rep.avatar} alt="" className="rh-inq-card__avatar" />
              ) : (
                <span className="rh-inq-card__avatar rh-inq-card__avatar--fallback" aria-hidden>
                  <RhIcon as={ShieldCheck} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
              )}
              <div>
                <strong>{rep?.title}</strong>
                {rep?.subtitle ? <span className="rh-inq-card__muted">{rep.subtitle}</span> : null}
              </div>
            </div>
            <p className="rh-inq-card__answer-text">{row.answer}</p>
          </div>
        )}
        <div className="rh-inq-card__meta">
          <span className="rh-inq-card__muted">
            {mineStudent.anonymous ? 'أرسلتَ بلا إظهار اسمك للمشرفين' : 'ظهر اسمك للمشرفين حسب صلاحياتهم'}
          </span>
        </div>
      </article>
    )
  }

  const renderAdminRow = (row) => {
    const st = studentHeadline(row, canSeeStudent)
    const active = row.id === adminPickId
    return (
      <button
        key={row.id}
        type="button"
        className={['rh-inq-admin-row', active ? 'is-active' : ''].filter(Boolean).join(' ')}
        onClick={() => {
          rhHapticChromeTap()
          setAdminPickId(row.id)
        }}
      >
        <div className="rh-inq-admin-row__avatar-wrap">
          {st.avatar ? (
            <img src={st.avatar} alt="" className="rh-inq-admin-row__avatar" />
          ) : (
            <span className="rh-inq-admin-row__avatar rh-inq-admin-row__avatar--fb" aria-hidden>
              <RhIcon as={UserRound} size={18} strokeWidth={RH_ICON_STROKE} />
            </span>
          )}
        </div>
        <div className="rh-inq-admin-row__body">
          <div className="rh-inq-admin-row__title">
            <strong>{st.title}</strong>
            <span className={['rh-inq-badge', row.hasAnswer ? 'rh-inq-badge--ok' : 'rh-inq-badge--wait'].join(' ')}>
              {row.hasAnswer ? 'مُجاب' : 'مفتوح'}
            </span>
          </div>
          <p className="rh-inq-admin-row__preview">{row.question}</p>
        </div>
        <time className="rh-inq-admin-row__time">{formatRelativeTime(row.createTimes)}</time>
      </button>
    )
  }

  return (
    <div className="rh-inquiries-page">
      <ServicePageImpersonationBanner actor={user} impersonateUid={impersonateUid} hidePlansLink={hidePlanNavigation} />

      <header className="rh-inquiries-hero card">
        <div className="rh-inquiries-hero__glow" aria-hidden />
        <div className="rh-inquiries-hero__icon" aria-hidden>
          <RhIcon as={MessageCircleQuestion} size={34} strokeWidth={RH_ICON_STROKE} />
        </div>
        <div className="rh-inquiries-hero__text">
          <h1 className="rh-inquiries-hero__title">الاستفسارات</h1>
          <p className="rh-inquiries-hero__lead">
            اكتب استفسارك بكل وضوح؛ تصله الإدارة وترد عليك هنا. يمكنك اختيار إظهار اسمك أو إخفائه عن العرض حسب
            الخيارات أدناه.
          </p>
          <CrossNav items={crossItems} className="rh-inquiries-hero__cross" />
        </div>
      </header>

      <div className="rh-inquiries-layout">
        <section className="rh-inquiries-col">
          {!canSubmit && canAccessPage(INQ) ? (
            <div className="rh-inq-notice card" role="status">
              <p>لا تملك حالياً صلاحية إرسال استفسار جديد؛ يمكنك فقط مراجعة استفساراتك السابقة إن وُجدت.</p>
            </div>
          ) : null}
          {canSubmit && (
            <div className="rh-inq-compose card">
              <div className="rh-inq-compose__head">
                <RhIcon as={Sparkles} size={22} strokeWidth={RH_ICON_STROKE} aria-hidden />
                <h2 className="rh-inq-compose__title">استفسار جديد</h2>
              </div>
              <TextAreaField
                label="نص الاستفسار"
                hint="كلما كان السؤال أوضح، كان الرد أدق بإذن الله."
                placeholder="اكتب استفسارك هنا…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
              />
              <fieldset className="rh-inq-toggle-field">
                <legend className="rh-inq-toggle-field__legend">الظهور لدى المشرفين</legend>
                <label className="rh-inq-toggle">
                  <input
                    type="radio"
                    name="inq_pub"
                    checked={showStudentPublic}
                    onChange={() => setShowStudentPublic(true)}
                  />
                  <span>إظهار اسمي وصورتي مع الاستفسار</span>
                </label>
                <label className="rh-inq-toggle">
                  <input
                    type="radio"
                    name="inq_pub"
                    checked={!showStudentPublic}
                    onChange={() => setShowStudentPublic(false)}
                  />
                  <span>إخفاء اسمي — يظهر المحتوى فقط كـ «طالب»</span>
                </label>
              </fieldset>
              <Button type="button" className="rh-inq-compose__submit" onClick={() => void submitNew()} disabled={busy}>
                <RhIcon as={Send} size={18} strokeWidth={RH_ICON_STROKE} />
                إرسال الاستفسار
              </Button>
            </div>
          )}

          <div className="rh-inq-feed">
            <h2 className="rh-inq-feed__title">استفساراتي</h2>
            {mine.length === 0 ? (
              <div className="rh-inq-empty card">
                <RhIcon as={MessageCircleQuestion} size={40} strokeWidth={RH_ICON_STROKE} />
                <p>لا توجد استفسارات بعد. ابدأ بسؤالك الأول.</p>
              </div>
            ) : (
              <div className="rh-inq-feed__list">{mine.map(renderMineCard)}</div>
            )}
          </div>
        </section>

        {canViewAll && (
          <section className="rh-inquiries-col rh-inquiries-col--admin">
            <div className="rh-inq-admin-head card">
              <RhIcon as={ShieldCheck} size={26} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <div>
                <h2 className="rh-inq-admin-head__title">لوحة الاستفسارات</h2>
                <p className="rh-inq-admin-head__sub">عرض كل الطلبات والرد عليها — مع احترام خيارات إظهار الهوية.</p>
              </div>
            </div>

            <div className="rh-inq-admin-split">
              <div className="rh-inq-admin-list card">{allRows.length === 0 ? <p className="rh-inq-admin-empty">لا توجد استفسارات بعد.</p> : allRows.map(renderAdminRow)}</div>

              <div className="rh-inq-admin-detail card">
                {!pickedAdminRow ? (
                  <p className="rh-inq-admin-empty">اختر استفساراً من القائمة.</p>
                ) : (
                  <>
                    <div className="rh-inq-admin-detail__q">
                      <h3>السؤال</h3>
                      <p>{pickedAdminRow.question}</p>
                    </div>
                    {pickedAdminRow.hasAnswer ? (
                      <div className="rh-inq-admin-detail__a">
                        <h3>الرد</h3>
                        <p>{pickedAdminRow.answer}</p>
                      </div>
                    ) : canReply ? (
                      <>
                        <TextAreaField label="رد الإدارة" value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={6} />
                        <fieldset className="rh-inq-toggle-field">
                          <legend className="rh-inq-toggle-field__legend">توقيع الرد</legend>
                          <label className="rh-inq-toggle">
                            <input
                              type="radio"
                              name="inq_rep"
                              checked={replyShowName}
                              onChange={() => setReplyShowName(true)}
                            />
                            <span>إظهار اسمي كمُجيب</span>
                          </label>
                          <label className="rh-inq-toggle">
                            <input
                              type="radio"
                              name="inq_rep"
                              checked={!replyShowName}
                              onChange={() => setReplyShowName(false)}
                            />
                            <span>الرد باسم «إدارة المنصة» فقط</span>
                          </label>
                        </fieldset>
                        <Button type="button" onClick={() => void sendReply()} disabled={busy}>
                          إرسال الرد
                        </Button>
                      </>
                    ) : (
                      <p className="rh-inq-admin-empty">ليس لديك صلاحية الرد.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
