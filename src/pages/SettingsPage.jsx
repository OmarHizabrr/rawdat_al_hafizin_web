import { UserRound } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { CrossNav } from '../components/CrossNav.jsx'
import { ThemeModePicker } from '../components/ThemeModePicker.jsx'
import { isAdmin } from '../config/roles.js'
import { SITE_TITLE } from '../config/site.js'
import { useAuth } from '../context/useAuth.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function SettingsPage() {
  const { user } = useAuth()

  const settingsCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: 'الرئيسية' },
      { to: '/app/plans', label: 'الخطط' },
      { to: '/app/awrad', label: 'الأوراد' },
      { to: '/app/welcome', label: 'البداية' },
    ]
    if (isAdmin(user)) base.push({ to: '/app/admin/users', label: 'المستخدمون' })
    return base
  }, [user])

  useEffect(() => {
    document.title = `الإعدادات — ${SITE_TITLE}`
  }, [])

  const name = user?.displayName?.trim() || '—'
  const email = user?.email || '—'
  const photo = user?.photoURL

  return (
    <div className="rh-settings">
      <header className="rh-settings-header">
        <h1 className="rh-settings-title">الإعدادات</h1>
        <p className="rh-settings-desc">إدارة مظهر المنصة وحسابك المرتبط بـ Google.</p>
        <CrossNav items={settingsCrossItems} className="rh-settings__cross" />
      </header>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">المظهر</h2>
          <p className="rh-settings-card__subtitle">اختر وضع الألوان المناسب لك أو اتركه يتبع النظام.</p>
        </div>
        <ThemeModePicker />
      </section>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">الحساب</h2>
          <p className="rh-settings-card__subtitle">بيانات تسجيل الدخول الحالية عبر Google.</p>
        </div>
        <div className="rh-profile-card">
          <div className="rh-profile-card__avatar" aria-hidden={!photo}>
            {photo ? (
              <img src={photo} alt="" width={56} height={56} />
            ) : name !== '—' ? (
              <span>{name.charAt(0)}</span>
            ) : (
              <RhIcon as={UserRound} size={26} strokeWidth={RH_ICON_STROKE} />
            )}
          </div>
          <div className="rh-profile-card__body">
            <span className="rh-profile-card__name">{name}</span>
            <span className="rh-profile-card__email">{email}</span>
            <span className="rh-profile-card__badge">Google</span>
          </div>
        </div>
        <p className="rh-settings-footnote">لتغيير الاسم أو الصورة، حدّث ملفك في حساب Google ثم أعد فتح المنصة.</p>
      </section>
    </div>
  )
}
