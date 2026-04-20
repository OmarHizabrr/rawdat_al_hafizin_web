import { UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ContactPhonesSection } from '../components/ContactPhonesSection.jsx'
import { CrossNav } from '../components/CrossNav.jsx'
import { ThemeModePicker } from '../components/ThemeModePicker.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { auth } from '../firebase.js'
import { messageForProfilePhotoError } from '../services/profilePhotoStorage.js'
import {
  clearMyProfilePhoto,
  updateMyDisplayName,
  updateMyProfilePhotoFromFile,
} from '../services/userService.js'
import { Button, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PS = PERMISSION_PAGE_IDS.settings

export default function SettingsPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { branding, contactPhones, str } = useSiteContent()
  const toast = useToast()
  const [draftName, setDraftName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [clearingPhoto, setClearingPhoto] = useState(false)
  const photoInputRef = useRef(null)

  const settingsCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: str('layout.nav_home') },
      { to: '/app/plans', label: str('layout.nav_plans') },
    ]
    if (canAccessPage('halakat')) {
      base.push({ to: '/app/halakat', label: str('layout.nav_halakat') })
    }
    if (canAccessPage('dawrat')) {
      base.push({ to: '/app/dawrat', label: str('layout.nav_dawrat') })
    }
    base.push(
      { to: '/app/awrad', label: str('layout.nav_awrad') },
      { to: '/app/leave-request', label: str('layout.nav_leave_request') },
      { to: '/app/certificates', label: str('layout.nav_certificates') },
      { to: '/app/feelings', label: str('layout.nav_feelings') },
      { to: '/app/welcome', label: str('layout.nav_welcome') },
    )
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str, canAccessPage])

  useEffect(() => {
    document.title = `الإعدادات — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!user) return
    setDraftName(user.displayName?.trim() ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- مزامنة المسودة عند تغيّر حقول العرض من الخادم
  }, [user?.uid, user?.displayName])

  const name = user?.displayName?.trim() || '—'
  const email = user?.email || '—'
  const photo = user?.photoURL
  const canEditProfile = can(PS, 'settings_edit_profile')

  const onSaveName = async () => {
    const fu = auth.currentUser
    if (!fu || fu.uid !== user?.uid) return
    setSavingName(true)
    try {
      await updateMyDisplayName(fu, draftName)
      toast.success('تم حفظ الاسم.', 'تم')
    } catch (e) {
      if (e?.message === 'DISPLAY_NAME_REQUIRED') {
        toast.warning('يرجى إدخال اسم للعرض.', 'تنبيه')
      } else {
        toast.warning('تعذّر حفظ الاسم. حاول مرة أخرى.', 'تنبيه')
      }
    } finally {
      setSavingName(false)
    }
  }

  const onProfilePhotoSelected = async (e) => {
    const fu = auth.currentUser
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !fu || fu.uid !== user?.uid) return
    setUploadingPhoto(true)
    try {
      await updateMyProfilePhotoFromFile(fu, file)
      toast.success('تم رفع الصورة وتحديث الملف الشخصي.', 'تم')
    } catch (err) {
      const msg = messageForProfilePhotoError(err)
      toast.warning(msg || 'تعذّر رفع الصورة. تحقق من الاتصال والصلاحيات.', 'تنبيه')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const onClearPhoto = async () => {
    const fu = auth.currentUser
    if (!fu || fu.uid !== user?.uid) return
    setClearingPhoto(true)
    try {
      await clearMyProfilePhoto(fu)
      toast.success('تمت إزالة صورة العرض من حسابك في المنصة.', 'تم')
    } catch {
      toast.warning('تعذّر إزالة الصورة. حاول مرة أخرى.', 'تنبيه')
    } finally {
      setClearingPhoto(false)
    }
  }

  return (
    <div className="rh-settings">
      <header className="rh-settings-header">
        <h1 className="rh-settings-title">الإعدادات</h1>
        <p className="rh-settings-desc">إدارة مظهر المنصة وبيانات العرض في المنصة وحساب Google المرتبط.</p>
        <CrossNav items={settingsCrossItems} className="rh-settings__cross" />
      </header>

      {contactPhones.length > 0 ? (
        <ContactPhonesSection
          phones={contactPhones}
          title="أرقام التواصل"
          subtitle="واتساب أو تيليجرام أو رسالة نصية — حسب ما ضبطه المشرف لكل جهة."
          className="rh-settings__contacts"
        />
      ) : (
        <section className="rh-settings-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">أرقام التواصل</h2>
            <p className="rh-settings-card__subtitle">
              لم تُضف أرقام بعد. يضبطها مشرف الموقع من لوحة التحكم ← هوية الموقع ← أرقام التواصل العامة.
            </p>
          </div>
        </section>
      )}

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
            البريد مرتبط بحساب Google. يمكنك تغيير الاسم كنص، ورفع صورة للملف الشخصي إلى التخزين السحابي للمنصة، أو
            ضبطهما من إعدادات Google.
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
              hint="يظهر في المنصة والقوائم. احفظه منفصلاً عن الصورة."
              autoComplete="name"
            />
            <div className="rh-settings-profile-form__actions">
              <Button type="button" variant="primary" loading={savingName} onClick={onSaveName}>
                حفظ الاسم
              </Button>
            </div>
            <p className="rh-settings-footnote rh-settings-footnote--tight">
              صورة العرض: اختر ملفاً (حتى 2 ميجابايت، ‎JPEG / PNG / WebP / GIF). يُرفع إلى تخزين المنصة ويُربط بحسابك.
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="rh-settings-profile-form__file-input"
              onChange={onProfilePhotoSelected}
              tabIndex={-1}
            />
            <div className="rh-settings-profile-form__actions">
              <Button
                type="button"
                variant="secondary"
                loading={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
              >
                اختيار صورة ورفعها
              </Button>
              <Button
                type="button"
                variant="ghost"
                loading={clearingPhoto}
                disabled={!photo}
                onClick={onClearPhoto}
              >
                إزالة الصورة من العرض
              </Button>
            </div>
            <p className="rh-settings-footnote">
              بعد الحفظ أو الرفع تبقى هذه القيم مستخدمة في المنصة حتى لو اختلفت عن ملف Google، إلى أن تعيد المزامنة من
              هناك أو يعدّلها المشرف.
            </p>
          </div>
        ) : (
          <p className="rh-settings-footnote">تعديل الاسم والصورة غير مفعّل لصلاحيات حسابك.</p>
        )}
      </section>
    </div>
  )
}
