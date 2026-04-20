import { ScrollText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { ContactPhonesBulkSend } from '../components/ContactPhonesBulkSend.jsx'
import { ContactPhonesSection } from '../components/ContactPhonesSection.jsx'
import { ServicePageImpersonationBanner } from '../components/ServicePageImpersonationBanner.jsx'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { TextAreaField, TextField } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function CertificatesPage() {
  const { user } = useAuth()
  const { search } = useLocation()
  const { canAccessPage } = usePermissions()
  const { branding, contactPhones, str } = useSiteContent()
  const impersonateUid = getImpersonateUid(user, search)
  const appLink = useCallback(
    (path) => withImpersonationQuery(path, impersonateUid),
    [impersonateUid],
  )
  const [fullName, setFullName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')

  const actingAsUser = Boolean(impersonateUid && user?.uid && impersonateUid !== user.uid)

  useEffect(() => {
    document.title = actingAsUser
      ? `الشهادات (نيابة) — ${branding.siteTitle}`
      : `الشهادات — ${branding.siteTitle}`
  }, [actingAsUser, branding.siteTitle])

  const messageBody = useMemo(() => {
    const n = fullName.trim()
    const p = purpose.trim()
    const x = notes.trim()
    const lines = [
      'السلام عليكم ورحمة الله وبركاته',
      '',
      `طلب شهادة / وثيقة — ${branding.siteName}`,
      '',
      `الاسم الرباعي: ${n || '—'}`,
      `الغرض أو نوع الشهادة: ${p || '—'}`,
      '',
      x ? `ملاحظات إضافية:\n${x}` : '',
    ].filter(Boolean)
    if (impersonateUid && user?.uid && impersonateUid !== user.uid) {
      lines.push(`— إعداد الطلب من حساب المشرف نيابةً عن المستخدم (${impersonateUid}) —`)
    }
    return lines.join('\n')
  }, [fullName, purpose, notes, branding.siteName, impersonateUid, user])

  const crossItems = useMemo(() => {
    const base = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
    ]
    if (canAccessPage('halakat')) {
      base.push({ to: appLink('/app/halakat'), label: str('layout.nav_halakat') })
    }
    if (canAccessPage('dawrat')) {
      base.push({ to: appLink('/app/dawrat'), label: str('layout.nav_dawrat') })
    }
    base.push(
      { to: appLink('/app/awrad'), label: str('layout.nav_awrad') },
      { to: appLink('/app/welcome'), label: str('layout.nav_welcome') },
      { to: appLink('/app/feelings'), label: str('layout.nav_feelings') },
      { to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') },
      { to: appLink('/app/settings'), label: str('layout.nav_settings') },
    )
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str, canAccessPage, appLink])

  return (
    <div className="rh-service-page rh-service-page--cert">
      <ServicePageImpersonationBanner actor={user} impersonateUid={impersonateUid} />
      <header className="rh-service-page__hero card">
        <div className="rh-service-page__hero-icon" aria-hidden>
          <RhIcon as={ScrollText} size={32} strokeWidth={RH_ICON_STROKE} />
        </div>
        <div>
          <h1 className="rh-service-page__title">الشهادات والوثائق</h1>
          <p className="rh-service-page__lead">
            سجّل بياناتك ونوع الطلب، ثم تواصل مع الإدارة عبر واتساب أو تيليجرام أو الرسائل. استخدم الأسفل لإرسال الطلب
            إلى عدة جهات وعدة وسائل دفعة واحدة.
          </p>
          <CrossNav items={crossItems} className="rh-service-page__cross" />
        </div>
      </header>

      <div className="rh-service-page__grid">
        <section className="rh-service-page__form card">
          <h2 className="rh-service-page__h2">نموذج الطلب</h2>
          <TextField
            label="الاسم الرباعي"
            placeholder="كما تود أن تظهر في الوثيقة"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <TextField
            label="نوع الشهادة أو الغرض"
            placeholder="مثال: شهادة إتمام مستوى، توصية، بيان درجات…"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          <TextAreaField
            label="تفاصيل أو ملاحظات (اختياري)"
            hint="تواريخ، مستوى، رقم الحلقة، أو أي معلومة تساعد المشرف."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
          />
          <div className="rh-service-page__preview" aria-live="polite">
            <span className="rh-service-page__preview-label">معاينة الرسالة</span>
            <pre className="rh-service-page__preview-pre">{messageBody}</pre>
          </div>
        </section>

        <aside className="rh-service-page__aside">
          {contactPhones.length > 0 ? (
            <ContactPhonesSection
              phones={contactPhones}
              title="مراسلة الإدارة — وسيلة واحدة"
              subtitle="اختصار لكل جهة. للإرسال الجماعي استخدم المربع في أسفل الصفحة."
              prefillBody={messageBody}
              className="rh-service-page__contacts"
            />
          ) : (
            <div className="rh-service-page__empty-contact card">
              <p className="rh-service-page__empty-p">
                لا توجد أرقام مضبوطة بعد. راجع المشرف لإضافة أرقام التواصل من لوحة التحكم ← هوية الموقع.
              </p>
            </div>
          )}
        </aside>
      </div>

      {contactPhones.length > 0 ? (
        <ContactPhonesBulkSend
          className="card rh-service-page__bulk"
          phones={contactPhones}
          messageBody={messageBody}
        />
      ) : null}
    </div>
  )
}
