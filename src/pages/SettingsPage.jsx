import { Ban, Bell, BellOff, Eye, EyeOff, Save, Upload, UserRound, Wind, Zap } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ContactPhonesSection } from '../components/ContactPhonesSection.jsx'
import { AdminAdvancedPanel } from '../components/admin/AdminAdvancedPanel.jsx'
import { ImagePickPreview } from '../components/ImagePickPreview.jsx'
import { CrossNav } from '../components/CrossNav.jsx'
import { ThemeModePicker } from '../components/ThemeModePicker.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { auth } from '../firebase.js'
import {
  FEELINGS_FLIGHT_MODE,
  readFeelingsFlightMode,
  writeFeelingsFlightMode,
} from '../utils/feelingsFlightPrefs.js'
import {
  NOTIFICATIONS_MODE,
  readNotificationsMode,
  writeNotificationsMode,
} from '../utils/notificationsPrefs.js'
import { messageForProfilePhotoError } from '../services/profilePhotoStorage.js'
import { enablePushNotificationsForUser } from '../services/pushNotificationsService.js'
import {
  clearMyProfilePhoto,
  updateMyDisplayName,
  updateMyHideHomePlanUi,
  updateMyProfilePhotoFromFile,
} from '../services/userService.js'
import { rhHapticLight } from '../utils/haptics.js'
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
  const [photoDraftFile, setPhotoDraftFile] = useState(null)
  const [feelingsFlightMode, setFeelingsFlightMode] = useState(() => readFeelingsFlightMode())
  const [notificationsMode, setNotificationsMode] = useState(() => readNotificationsMode())
  const [hideHomePlanSaving, setHideHomePlanSaving] = useState(false)
  const [pushTokenSaving, setPushTokenSaving] = useState(false)
  const [pushTokenSaved, setPushTokenSaved] = useState(false)
  const lastFcmTokenRef = useRef('')
  const settingsCrossItems = useMemo(() => {
    const base = [{ to: '/app', label: str('layout.nav_home') }]
    base.push({ to: '/app/plans', label: str('layout.nav_plans') })
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
    )
    if (canAccessPage('notifications')) {
      base.push({ to: '/app/notifications', label: str('layout.nav_notifications') })
    }
    base.push({ to: '/app/welcome', label: str('layout.nav_welcome') })
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_admin') })
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
  const canChangeTheme = can(PS, 'settings_theme')
  const canManageFeelingsFlight = can(PS, 'settings_feelings_flight_mode')
  const canManageNotificationsMode = can(PS, 'settings_notifications_mode')
  const canManagePushToken = can(PS, 'settings_push_token_manage')
  const canEditProfile = can(PS, 'settings_edit_profile')
  const canToggleHideHomePlan = can(PS, 'settings_toggle_hide_home_plan')

  const onToggleHideHomePlanUi = async (hide) => {
    const fu = auth.currentUser
    if (!fu || fu.uid !== user?.uid || hideHomePlanSaving) return
    if (Boolean(user?.hideHomePlanUi) === hide) return
    setHideHomePlanSaving(true)
    try {
      await updateMyHideHomePlanUi(fu, hide)
      toast.success(
        hide
          ? 'تم إيقاف عرض لوحة الخطة على الرئيسية دون إخفاء الخطط من القائمة.'
          : 'تم إظهار لوحة الخطة على الصفحة الرئيسية.',
        'تم',
      )
    } catch {
      toast.warning('تعذّر حفظ الإعداد. حاول مرة أخرى.', 'تنبيه')
    } finally {
      setHideHomePlanSaving(false)
    }
  }

  const onSaveFcmTokenToUserDoc = async () => {
    const fu = auth.currentUser
    if (!fu?.uid || pushTokenSaving) return
    setPushTokenSaving(true)
    setPushTokenSaved(false)
    lastFcmTokenRef.current = ''
    try {
      const res = await enablePushNotificationsForUser(fu)
      if (res?.ok && res.token) {
        lastFcmTokenRef.current = res.token
        setPushTokenSaved(true)
        toast.success('تم تفعيل إشعارات الهاتف على هذا الجهاز.', 'تم')
        return
      }
      if (res?.reason === 'MISSING_VAPID_KEY') {
        toast.warning(
          'إشعارات الهاتف غير مفعّلة في هذا الإصدار من الموقع. تواصل مع إدارة المنصة.',
          'تنبيه',
        )
        return
      }
      if (res?.reason === 'DENIED') {
        toast.warning('لم يُمنح إذن الإشعارات من المتصفح.', 'تنبيه')
        return
      }
      if (res?.reason === 'UNAVAILABLE') {
        toast.warning('المتصفح لا يدعم إشعارات الدفع على هذا الجهاز.', 'تنبيه')
        return
      }
      toast.warning('تعذّر تفعيل إشعارات الهاتف. جرّب من Chrome على الجوال أو بعد تثبيت التطبيق.', 'تنبيه')
    } catch {
      toast.warning('تعذّر تفعيل إشعارات الهاتف. تحقق من الاتصال وحاول مرة أخرى.', 'تنبيه')
    } finally {
      setPushTokenSaving(false)
    }
  }

  const onCopyFcmToken = async () => {
    const t = String(lastFcmTokenRef.current || '').trim()
    if (!t) {
      toast.info('فعّل إشعارات الهاتف أولاً بالزر أعلاه.', 'تنبيه')
      return
    }
    try {
      await navigator.clipboard.writeText(t)
      toast.success('تم النسخ.', 'تم')
    } catch {
      toast.warning('تعذّر النسخ تلقائياً.', 'تنبيه')
    }
  }

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

  const uploadPhotoDraft = async () => {
    const fu = auth.currentUser
    if (!photoDraftFile || !fu || fu.uid !== user?.uid) return
    setUploadingPhoto(true)
    try {
      await updateMyProfilePhotoFromFile(fu, photoDraftFile)
      setPhotoDraftFile(null)
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
      setPhotoDraftFile(null)
      toast.success('تمت إزالة صورة العرض من حسابك في المنصة.', 'تم')
    } catch {
      toast.warning('تعذّر إزالة الصورة. حاول مرة أخرى.', 'تنبيه')
    } finally {
      setClearingPhoto(false)
    }
  }

  const onChangeFeelingsFlightMode = (mode) => {
    setFeelingsFlightMode(mode)
    writeFeelingsFlightMode(mode)
  }

  const onChangeNotificationsMode = (mode) => {
    setNotificationsMode(mode)
    writeNotificationsMode(mode)
    toast.success(
      mode === NOTIFICATIONS_MODE.OFF ? 'تم إيقاف الإشعارات لهذا الجهاز.' : 'تم تفعيل الإشعارات.',
      'تم',
    )
  }

  return (
    <div className="rh-settings">
      <header className="rh-settings-header">
        <h1 className="rh-settings-title">الإعدادات</h1>
        <p className="rh-settings-desc">إدارة مظهر المنصة وبيانات العرض في المنصة وحساب Google المرتبط.</p>
        <p className="rh-settings-desc" style={{ marginTop: 'var(--rh-space-3)' }}>
          <HapticLink
            to="/app/profile"
            className="ui-btn ui-btn--secondary"
            style={{ display: 'inline-flex', textDecoration: 'none', width: 'fit-content' }}
          >
            <RhIcon as={UserRound} size={18} strokeWidth={RH_ICON_STROKE} className="ui-btn__icon" aria-hidden />
            عرض الملف الشخصي
          </HapticLink>
        </p>
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
              لم تُضف أرقام بعد. يضبطها مشرف الموقع من {str('layout.nav_admin')} ← هوية الموقع ← أرقام التواصل العامة.
            </p>
          </div>
        </section>
      )}

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">المظهر</h2>
          <p className="rh-settings-card__subtitle">اختر وضع الألوان المناسب لك أو اتركه يتبع النظام.</p>
        </div>
        {canChangeTheme || canManageFeelingsFlight || canManageNotificationsMode ? (
          <>
            {canChangeTheme ? <ThemeModePicker /> : <p className="rh-settings-footnote">تغيير المظهر غير مفعّل لصلاحيات حسابك.</p>}
            {canManageFeelingsFlight ? (
              <>
                <div className="rh-settings-card__head" style={{ marginTop: 'var(--rh-space-4)' }}>
                  <h3 className="rh-settings-card__title">حركة طيور المشاعر</h3>
                  <p className="rh-settings-card__subtitle">
                    تتحكم بحركة الرسائل الطائرة في الصفحة الرئيسية: تعطيل كامل، حركة هادئة، أو حركة أسرع. يمكنك أيضاً سحب
                    أي طائر بعيداً بإصبعك أو بالفأرة لإخفائه حتى تحديث الصفحة (مثل إيماءة إغلاق على الجوال).
                  </p>
                </div>
                <div className="rh-segment" role="radiogroup" aria-label="وضع حركة طيور المشاعر">
                  <button
                    type="button"
                    className={['rh-segment__btn', feelingsFlightMode === FEELINGS_FLIGHT_MODE.OFF ? 'rh-segment__btn--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      rhHapticLight()
                      onChangeFeelingsFlightMode(FEELINGS_FLIGHT_MODE.OFF)
                    }}
                    aria-pressed={feelingsFlightMode === FEELINGS_FLIGHT_MODE.OFF}
                  >
                    <span className="rh-segment__lead">
                      <RhIcon as={Ban} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
                      <span className="rh-segment__label">تعطيل</span>
                    </span>
                    <span className="rh-segment__hint">إخفاء الطيور المتحركة من الرئيسية</span>
                  </button>
                  <button
                    type="button"
                    className={['rh-segment__btn', feelingsFlightMode === FEELINGS_FLIGHT_MODE.CALM ? 'rh-segment__btn--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      rhHapticLight()
                      onChangeFeelingsFlightMode(FEELINGS_FLIGHT_MODE.CALM)
                    }}
                    aria-pressed={feelingsFlightMode === FEELINGS_FLIGHT_MODE.CALM}
                  >
                    <span className="rh-segment__lead">
                      <RhIcon as={Wind} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
                      <span className="rh-segment__label">تخفيف</span>
                    </span>
                    <span className="rh-segment__hint">عدد أقل وسرعة أهدأ</span>
                  </button>
                  <button
                    type="button"
                    className={['rh-segment__btn', feelingsFlightMode === FEELINGS_FLIGHT_MODE.FAST ? 'rh-segment__btn--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      rhHapticLight()
                      onChangeFeelingsFlightMode(FEELINGS_FLIGHT_MODE.FAST)
                    }}
                    aria-pressed={feelingsFlightMode === FEELINGS_FLIGHT_MODE.FAST}
                  >
                    <span className="rh-segment__lead">
                      <RhIcon as={Zap} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
                      <span className="rh-segment__label">تسريع</span>
                    </span>
                    <span className="rh-segment__hint">حركة أسرع وكثافة أعلى</span>
                  </button>
                </div>
              </>
            ) : null}
            {canManageNotificationsMode ? (
              <>
                <div className="rh-settings-card__head" style={{ marginTop: 'var(--rh-space-4)' }}>
                  <h3 className="rh-settings-card__title">الإشعارات</h3>
                  <p className="rh-settings-card__subtitle">
                    عند الإيقاف لن تظهر إشعارات المنصة (التنبيهات العائمة والجرس والتنبيهات المحلية) على هذا الجهاز.
                  </p>
                </div>
                <div className="rh-segment" role="radiogroup" aria-label="وضع الإشعارات">
                  <button
                    type="button"
                    className={['rh-segment__btn', notificationsMode === NOTIFICATIONS_MODE.ON ? 'rh-segment__btn--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      rhHapticLight()
                      onChangeNotificationsMode(NOTIFICATIONS_MODE.ON)
                    }}
                    aria-pressed={notificationsMode === NOTIFICATIONS_MODE.ON}
                  >
                    <span className="rh-segment__lead">
                      <RhIcon as={Bell} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
                      <span className="rh-segment__label">تشغيل</span>
                    </span>
                    <span className="rh-segment__hint">إظهار الإشعارات بشكل طبيعي</span>
                  </button>
                  <button
                    type="button"
                    className={['rh-segment__btn', notificationsMode === NOTIFICATIONS_MODE.OFF ? 'rh-segment__btn--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      rhHapticLight()
                      onChangeNotificationsMode(NOTIFICATIONS_MODE.OFF)
                    }}
                    aria-pressed={notificationsMode === NOTIFICATIONS_MODE.OFF}
                  >
                    <span className="rh-segment__lead">
                      <RhIcon as={BellOff} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
                      <span className="rh-segment__label">إيقاف</span>
                    </span>
                    <span className="rh-segment__hint">إخفاء كل إشعارات المنصة على هذا الجهاز</span>
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <p className="rh-settings-footnote">خيارات المظهر والإشعارات غير مفعّلة لصلاحيات حسابك.</p>
        )}
      </section>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">إشعارات الهاتف</h2>
          <p className="rh-settings-card__subtitle">
            فعّل إشعارات الهاتف لتصلك التنبيهات حتى عند إغلاق المتصفح. هذا مستقل عن قسم «الإشعارات» أعلاه الذي
            يتحكم في التنبيهات داخل الصفحة فقط.
          </p>
        </div>
        {canManagePushToken ? (
          user?.uid ? (
            <>
              <p className="rh-settings-footnote" style={{ marginTop: 0 }}>
                اضغط الزر ثم وافق على إذن الإشعارات من المتصفح.
              </p>
              <div className="rh-settings-profile-form__actions" style={{ marginTop: 'var(--rh-space-3)' }}>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Bell}
                  loading={pushTokenSaving}
                  onClick={() => void onSaveFcmTokenToUserDoc()}
                >
                  تفعيل إشعارات الهاتف
                </Button>
              </div>
              {pushTokenSaved ? (
                <AdminAdvancedPanel summary="للمشرف المتقدم — نسخ رمز الجهاز">
                  <div className="rh-settings-profile-form__actions" style={{ marginTop: 'var(--rh-space-2)' }}>
                    <Button type="button" variant="ghost" onClick={() => void onCopyFcmToken()}>
                      نسخ رمز الجهاز
                    </Button>
                  </div>
                </AdminAdvancedPanel>
              ) : null}
            </>
          ) : (
            <p className="rh-settings-footnote">سجّل الدخول لتفعيل إشعارات الهاتف.</p>
          )
        ) : (
          <p className="rh-settings-footnote">إدارة إشعارات الهاتف غير مفعّلة لصلاحيات حسابك.</p>
        )}
      </section>

      {canToggleHideHomePlan ? (
        <section className="rh-settings-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">لوحة الخطة على الرئيسية</h2>
            <p className="rh-settings-card__subtitle">
              عند الإيقاف تُخفى لوحة الخطة التفاعلية من الصفحة الرئيسية فقط، ولا تظهر تذكيرات الورد اليومية على الرئيسية.
              تبقى «الخطط» وزر استكشاف الخطط العامة داخل صفحة الخطط ويمكنك إدارتها من هناك. يتحكم المشرف في إظهار هذا
              القسم لنوع صلاحياتك من لوحة أنواع المستخدمين.
            </p>
          </div>
          <div className="rh-segment" role="radiogroup" aria-label="عرض لوحة الخطة على الرئيسية">
            <button
              type="button"
              className={[
                'rh-segment__btn',
                !user?.hideHomePlanUi ? 'rh-segment__btn--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                rhHapticLight()
                void onToggleHideHomePlanUi(false)
              }}
              aria-pressed={!user?.hideHomePlanUi}
              disabled={hideHomePlanSaving}
            >
              <span className="rh-segment__lead">
                <RhIcon as={Eye} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
                <span className="rh-segment__label">عرض لوحة الخطة</span>
              </span>
              <span className="rh-segment__hint">لوحة الخطة وتذكيرات الورد على الرئيسية</span>
            </button>
            <button
              type="button"
              className={[
                'rh-segment__btn',
                user?.hideHomePlanUi ? 'rh-segment__btn--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                rhHapticLight()
                void onToggleHideHomePlanUi(true)
              }}
              aria-pressed={Boolean(user?.hideHomePlanUi)}
              disabled={hideHomePlanSaving}
            >
              <span className="rh-segment__lead">
                <RhIcon as={EyeOff} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
                <span className="rh-segment__label">إيقاف العرض</span>
              </span>
              <span className="rh-segment__hint">إخفاء اللوحة والتذكيرات من الرئيسية فقط</span>
            </button>
          </div>
          <p className="rh-settings-footnote rh-settings-footnote--tight" style={{ marginTop: 'var(--rh-space-3)' }}>
            ما زال بإمكانك فتح صفحة الخطط مباشرة إذا عرفت الرابط، أو يمكن للمشرف تعديل خططك من لوحة المستخدمين.
          </p>
        </section>
      ) : null}

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
              <Button type="button" variant="primary" icon={Save} loading={savingName} onClick={onSaveName}>
                حفظ الاسم
              </Button>
            </div>
            <p className="rh-settings-footnote rh-settings-footnote--tight">
              صورة العرض: حتى 2 ميجابايت (‎JPEG / PNG / WebP / GIF). اختر صورة ثم اضغط «رفع إلى المنصة». يُرفع إلى تخزين المنصة ويُربط بحسابك.
            </p>
            <ImagePickPreview
              label="صورة العرض"
              hint="اضغط المعاينة لاختيار ملف أو استبداله. × يزيل الاختيار المؤقت أو يحذف الصورة المحفوظة من المنصة."
              accept="image/jpeg,image/png,image/webp,image/gif"
              remoteUrl={photo || ''}
              file={photoDraftFile}
              onFileChange={setPhotoDraftFile}
              onClearRemote={() => {
                void onClearPhoto()
              }}
              disabled={!canEditProfile}
              busy={uploadingPhoto || clearingPhoto}
            />
            <div className="rh-settings-profile-form__actions">
              <Button
                type="button"
                variant="primary"
                icon={Upload}
                loading={uploadingPhoto}
                disabled={!photoDraftFile || clearingPhoto}
                onClick={() => void uploadPhotoDraft()}
              >
                رفع إلى المنصة
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
