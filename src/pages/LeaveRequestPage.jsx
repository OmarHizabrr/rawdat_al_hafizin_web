import { CalendarClock } from 'lucide-react'
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

export default function LeaveRequestPage() {
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
  const [details, setDetails] = useState('')

  const actingAsUser = Boolean(impersonateUid && user?.uid && impersonateUid !== user.uid)

  useEffect(() => {
    document.title = actingAsUser
      ? `طلب إجازة (نيابة) — ${branding.siteTitle}`
      : `طلب إجازة — ${branding.siteTitle}`
  }, [actingAsUser, branding.siteTitle])

  const messageBody = useMemo(() => {
    const n = fullName.trim()
    const d = details.trim()
    const lines = [
      'السلام عليكم ورحمة الله وبركاته',
      '',
      `طلب إجازة — ${branding.siteName}`,
      '',
      `الاسم الرباعي: ${n || '—'}`,
      '',
      'تفاصيل الطلب:',
      d || '—',
    ]
    if (impersonateUid && user?.uid && impersonateUid !== user.uid) {
      lines.push('', `— إعداد الطلب من حساب المشرف نيابةً عن المستخدم (${impersonateUid}) —`)
    }
    return lines.join('\n')
  }, [fullName, details, branding.siteName, impersonateUid, user?.uid])

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
      { to: appLink('/app/certificates'), label: str('layout.nav_certificates') },
      { to: appLink('/app/settings'), label: str('layout.nav_settings') },
    )
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str, canAccessPage, appLink])

  return (
    <div className="rh-service-page rh-service-page--leave">
      <ServicePageImpersonationBanner actor={user} impersonateUid={impersonateUid} />
      <header className="rh-service-page__hero card">
        <div className="rh-service-page__hero-icon" aria-hidden>
          <RhIcon as={CalendarClock} size={32} strokeWidth={RH_ICON_STROKE} />
        </div>
        <div>
          <h1 className="rh-service-page__title">طلب إجازة</h1>
          <p className="rh-service-page__lead">
            املأ الاسم الرباعي ووضّح طلبك، ثم أرسله عبر واتساب أو تيليجرام أو الرسائل النصية — تُعبَّأ الرسالة
            تلقائياً. يمكنك استخدام الأزرار السريعة أو «إرسال الطلب دفعة واحدة» في أسفل الصفحة لعدة جهات وعدة وسائل.
          </p>
          <CrossNav items={crossItems} className="rh-service-page__cross" />
        </div>
      </header>

      <div className="rh-service-page__grid">
        <section className="rh-service-page__form card">
          <h2 className="rh-service-page__h2">البيانات</h2>
          <TextField
            label="الاسم الرباعي"
            placeholder="مثال: فلان بن فلان آل فلان"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <TextAreaField
            label="ماذا تطلب؟"
            hint="المدة، التواريخ، أو أي تفاصيل يلزم أن يعرفها المشرف."
            placeholder="اكتب طلبك هنا…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={6}
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
              title="أرسل الطلب — وسيلة واحدة"
              subtitle="اختصار لكل جهة. للإرسال لعدة جهات معاً استخدم المربع في أسفل الصفحة."
              prefillBody={messageBody}
              className="rh-service-page__contacts"
            />
          ) : (
            <div className="rh-service-page__empty-contact card">
              <p className="rh-service-page__empty-p">
                لم تُعرَّف أرقام تواصل بعد. يمكن للمشرف إضافتها من لوحة التحكم ← هوية الموقع ← أرقام التواصل العامة.
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
