import { UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CrossNav } from '../components/CrossNav.jsx'
import { ThemeModePicker } from '../components/ThemeModePicker.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { auth } from '../firebase.js'
import { updateMyProfileDisplay } from '../services/userService.js'
import { Button, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PS = PERMISSION_PAGE_IDS.settings

export default function SettingsPage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const [draftName, setDraftName] = useState('')
  const [draftPhoto, setDraftPhoto] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const settingsCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: str('layout.nav_home') },
      { to: '/app/plans', label: str('layout.nav_plans') },
      { to: '/app/awrad', label: str('layout.nav_awrad') },
      { to: '/app/welcome', label: str('layout.nav_welcome') },
    ]
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str])

  useEffect(() => {
    document.title = `الإعدادات — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!user) return
    setDraftName(user.displayName?.trim() ?? '')
    setDraftPhoto(typeof user.photoURL === 'string' ? user.photoURL.trim() : '')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- مزامنة المسودة عند تغيّر حقول العرض من الخادم
  }, [user?.uid, user?.displayName, user?.photoURL])

  const name = user?.displayName?.trim() || '—'
  const email = user?.email || '—'
  const photo = user?.photoURL
  const canEditProfile = can(PS, 'settings_edit_profile')

  const onSaveProfile = async () => {
    const fu = auth.currentUser
    if (!fu || fu.uid !== user?.uid) return
    setSavingProfile(true)
    try {
      await updateMyProfileDisplay(fu, { displayName: draftName, photoURL: draftPhoto })
      toast.success('تم حفظ الاسم والصورة.', 'تم')
    } catch (e) {
      if (e?.message === 'DISPLAY_NAME_REQUIRED') {
        toast.warning('يرجى إدخال اسم للعرض.', 'تنبيه')
      } else {
        toast.warning('تعذّر الحفظ. حاول مرة أخرى.', 'تنبيه')
      }
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="rh-settings">
      <header className="rh-settings-header">
        <h1 className="rh-settings-title">الإعدادات</h1>
        <p className="rh-settings-desc">إدارة مظهر المنصة وبيانات العرض في المنصة وحساب Google المرتبط.</p>
        <CrossNav items={settingsCrossItems} className="rh-settings__cross" />
      </header>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">المظهر</h2>
          <p className="rh-settings-card__subtitle">اختر وضع الألوان المناسب لك أو اتركه يتبع النظام.</p>
        </div>
        {can(PS, 'settings_theme') ? (
          <ThemeModePicker />
        ) : (
          <p className="rh-settings-footnote">تغيير المظهر غير مفعّل لصلاحيات حسابك.</p>
        )}
      </section>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">الحساب</h2>
          <p className="rh-settings-card__subtitle">
            البريد مرتبط بحساب Google. يمكنك تغيير الاسم وصورة العرض داخل المنصة أو من إعدادات Google.
          </p>
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

        {canEditProfile ? (
          <div className="rh-settings-profile-form">
            <TextField
              label="الاسم المعروض"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              hint="يظهر في المنصة والقوائم."
              autoComplete="name"
            />
            <TextField
              label="رابط صورة العرض (اختياري)"
              value={draftPhoto}
              onChange={(e) => setDraftPhoto(e.target.value)}
              placeholder="https://…"
              hint="الصورة من رابط مباشر (مثلاً من Google صور أو رابط ينتهي بصيغة صورة). اتركه فارغاً لإزالة الصورة من العرض."
            />
            <div className="rh-settings-profile-form__actions">
              <Button type="button" variant="primary" loading={savingProfile} onClick={onSaveProfile}>
                حفظ الاسم والصورة
              </Button>
            </div>
            <p className="rh-settings-footnote">
              بعد الحفظ تبقى هذه القيم مستخدمة في المنصة حتى لو اختلفت عن ملف Google، إلى أن تعيد المزامنة من هناك
              أو يعدّلها المشرف.
            </p>
          </div>
        ) : (
          <p className="rh-settings-footnote">تعديل الاسم والصورة غير مفعّل لصلاحيات حسابك.</p>
        )}
      </section>
    </div>
  )
}
