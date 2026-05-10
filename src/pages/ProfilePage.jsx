import { BookOpen, ClipboardList, NotebookPen, Settings, UserRound } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useEffect, useMemo } from 'react'

import { CrossNav } from '../components/CrossNav.jsx'
import { isAdmin, roleLabel } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function ProfilePage() {
  const { user } = useAuth()
  const { canAccessPage } = usePermissions()
  const { branding, str } = useSiteContent()

  useEffect(() => {
    document.title = `الملف الشخصي — ${branding.siteTitle}`
  }, [branding.siteTitle])

  const name = user?.displayName?.trim() || '—'
  const email = user?.email || '—'
  const photo = user?.photoURL
  const role = roleLabel(user?.role)

  const crossItems = useMemo(() => {
    const base = [{ to: '/app', label: str('layout.nav_home') }]
    if (!user?.hideHomePlanUi) {
      base.push({ to: '/app/plans', label: str('layout.nav_plans') })
    }
    if (canAccessPage('halakat')) base.push({ to: '/app/halakat', label: str('layout.nav_halakat') })
    if (canAccessPage('dawrat')) base.push({ to: '/app/dawrat', label: str('layout.nav_dawrat') })
    base.push(
      { to: '/app/awrad', label: str('layout.nav_awrad') },
      { to: '/app/settings', label: str('layout.nav_settings') },
    )
    return base
  }, [user?.hideHomePlanUi, str, canAccessPage])

  return (
    <div className="rh-profile-page">
      <header className="rh-settings-header">
        <h1 className="rh-settings-title">الملف الشخصي</h1>
        <p className="rh-settings-desc">
          عرض بيانات حسابك في المنصة. لتعديل الاسم أو الصورة أو الإعدادات المتقدمة انتقل إلى صفحة الإعدادات.
        </p>
        <CrossNav items={crossItems} className="rh-settings__cross" />
      </header>

      <section className="rh-profile-hero" aria-labelledby="profile-heading">
        <div className="rh-profile-hero__glow" aria-hidden />
        <div className="rh-profile-hero__inner">
          <div className="rh-profile-hero__avatar" aria-hidden={!photo}>
            {photo ? (
              <img src={photo} alt="" width={128} height={128} />
            ) : name !== '—' ? (
              <span>{name.charAt(0)}</span>
            ) : (
              <RhIcon as={UserRound} size={44} strokeWidth={RH_ICON_STROKE} />
            )}
          </div>
          <div className="rh-profile-hero__meta">
            <h2 id="profile-heading" className="rh-profile-hero__name">
              {name}
            </h2>
            <p className="rh-profile-hero__email">{email}</p>
            <div className="rh-profile-hero__roles">
              <span className="rh-profile-chip">
                <RhIcon as={UserRound} size={14} strokeWidth={2.25} aria-hidden />
                {role}
              </span>
              <span className="rh-profile-chip rh-profile-chip--muted">Google</span>
              {isAdmin(user) ? (
                <span className="rh-profile-chip rh-profile-chip--muted">لوحة تحكم</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rh-profile-card-panel">
        <h3 className="rh-profile-card-panel__title">اختصارات سريعة</h3>
        <p className="rh-profile-card-panel__desc">الوصول إلى الخدمات الشائعة بنقرة واحدة.</p>
        <div className="rh-profile-actions">
          <HapticLink to="/app/settings" className="ui-btn ui-btn--primary">
            <RhIcon as={Settings} size={18} strokeWidth={RH_ICON_STROKE} className="ui-btn__icon" aria-hidden />
            الإعدادات والتعديل
          </HapticLink>
          {!user?.hideHomePlanUi ? (
            <HapticLink to="/app/plans" className="ui-btn ui-btn--secondary">
              <RhIcon as={ClipboardList} size={18} strokeWidth={RH_ICON_STROKE} className="ui-btn__icon" aria-hidden />
              خططي
            </HapticLink>
          ) : null}
          <HapticLink to="/app/awrad" className="ui-btn ui-btn--secondary">
            <RhIcon as={NotebookPen} size={18} strokeWidth={RH_ICON_STROKE} className="ui-btn__icon" aria-hidden />
            الأوراد
          </HapticLink>
          <HapticLink to="/app/welcome" className="ui-btn ui-btn--ghost">
            <RhIcon as={BookOpen} size={18} strokeWidth={RH_ICON_STROKE} className="ui-btn__icon" aria-hidden />
            البداية
          </HapticLink>
        </div>
      </section>

      <p className="rh-settings-footnote">
        يعرض هذا القسم بيانات العرض والبريد كما في المنصة. الصلاحيات الفعلية تتحكم بها الإدارة من لوحة المستخدمين.
      </p>
    </div>
  )
}
