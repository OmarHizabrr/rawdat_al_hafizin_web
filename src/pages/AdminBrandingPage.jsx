import { ArrowLeft } from 'lucide-react'
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandingColorRow } from '../components/BrandingColorRow.jsx'
import { BrandingLivePreview } from '../components/BrandingLivePreview.jsx'
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_PATH, SITE_TITLE } from '../config/site.js'
import { BRANDING_COLOR_PRESETS } from '../data/brandingPresets.js'
import { BRANDING_THEME_GROUPS } from '../data/brandingThemeFields.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { useTheme } from '../theme/useTheme.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { saveBranding, saveContactPhones } from '../services/siteConfigService.js'
import { sanitizeImageUrl } from '../utils/brandingAssets.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { Button, Modal, TextAreaField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function cloneThemeMap(map) {
  if (!map || typeof map !== 'object') return {}
  return { ...map }
}

export default function AdminBrandingPage() {
  const { user } = useAuth()
  const { branding, contactPhones } = useSiteContent()
  const { resolved: appColorScheme } = useTheme()
  const toast = useToast()
  const [siteName, setSiteName] = useState(branding.siteName)
  const [siteTitle, setSiteTitle] = useState(branding.siteTitle)
  const [siteDescription, setSiteDescription] = useState(branding.siteDescription)
  const [ogImagePath, setOgImagePath] = useState(branding.ogImagePath)
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl)
  const [themeLight, setThemeLight] = useState(() => cloneThemeMap(branding.themeLight))
  const [themeDark, setThemeDark] = useState(() => cloneThemeMap(branding.themeDark))
  const [resetAllOpen, setResetAllOpen] = useState(false)
  const [lightSelectKey, setLightSelectKey] = useState(0)
  const [darkSelectKey, setDarkSelectKey] = useState(0)
  const [previewMode, setPreviewMode] = useState(() => (appColorScheme === 'dark' ? 'dark' : 'light'))
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [contactPhonesDraft, setContactPhonesDraft] = useState([])

  const previewLogoSrc = useMemo(() => sanitizeImageUrl(logoUrl) || '/logo.png', [logoUrl])

  useEffect(() => {
    document.title = `هوية الموقع — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    startTransition(() => {
      setSiteName(branding.siteName)
      setSiteTitle(branding.siteTitle)
      setSiteDescription(branding.siteDescription)
      setOgImagePath(branding.ogImagePath)
      setLogoUrl(branding.logoUrl)
    })
  }, [branding.siteName, branding.siteTitle, branding.siteDescription, branding.ogImagePath, branding.logoUrl])

  useEffect(() => {
    startTransition(() => {
      setThemeLight(cloneThemeMap(branding.themeLight))
      setThemeDark(cloneThemeMap(branding.themeDark))
    })
  }, [branding.themeLight, branding.themeDark])

  useEffect(() => {
    startTransition(() => {
      setContactPhonesDraft(contactPhones.map((r) => ({ ...r })))
    })
  }, [contactPhones])

  const setLightVar = useCallback((name, value) => {
    setThemeLight((prev) => {
      const next = { ...prev }
      if (!String(value).trim()) delete next[name]
      else next[name] = value
      return next
    })
  }, [])

  const setDarkVar = useCallback((name, value) => {
    setThemeDark((prev) => {
      const next = { ...prev }
      if (!String(value).trim()) delete next[name]
      else next[name] = value
      return next
    })
  }, [])

  const applyLightPreset = useCallback((id) => {
    if (!id) return
    const p = BRANDING_COLOR_PRESETS.find((x) => x.id === id)
    if (p) {
      setThemeLight({ ...p.light })
      setLightSelectKey((k) => k + 1)
    }
  }, [])

  const applyDarkPreset = useCallback((id) => {
    if (!id) return
    const p = BRANDING_COLOR_PRESETS.find((x) => x.id === id)
    if (p) {
      setThemeDark({ ...p.dark })
      setDarkSelectKey((k) => k + 1)
    }
  }, [])

  const resetEntireFormToProgramDefaults = useCallback(() => {
    setSiteName(SITE_NAME)
    setSiteTitle(SITE_TITLE)
    setSiteDescription(SITE_DESCRIPTION)
    setOgImagePath(SITE_OG_IMAGE_PATH)
    setLogoUrl('')
    setThemeLight({})
    setThemeDark({})
    setLightSelectKey((k) => k + 1)
    setDarkSelectKey((k) => k + 1)
    setResetAllOpen(false)
    toast.info('تمت إعادة النموذج للقيم الافتراضية. اضغط «حفظ التغييرات» لإرسالها إلى السحابة.', '')
  }, [toast])

  const onSave = async () => {
    if (!user) return
    setSaveSubmitting(true)
    try {
      await saveBranding(user, {
        siteName,
        siteTitle,
        siteDescription,
        ogImagePath,
        logoUrl,
        themeLight,
        themeDark,
      })
      await saveContactPhones(user, contactPhonesDraft)
      toast.success('تم حفظ هوية الموقع وأرقام التواصل.', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ.', 'تنبيه')
    } finally {
      setSaveSubmitting(false)
    }
  }

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app', label: 'الرئيسية' },
    { to: '/app/leave-request', label: 'طلب إجازة' },
    { to: '/app/certificates', label: 'الشهادات' },
    { to: '/app/settings', label: 'الإعدادات' },
  ]

  const renderThemePanel = (title, description, map, setVar, mode, onPreset, selectKey) => (
    <section className="rh-admin-branding__theme-panel card">
      <h2 className="rh-admin-branding__step-title">{title}</h2>
      <p className="rh-admin-branding__step-desc">{description}</p>

      <div className="rh-admin-branding__preset-block">
        <label className="rh-admin-branding__preset-label" htmlFor={`preset-${mode}`}>
          تعبئة سريعة بمجموعة ألوان جاهزة
        </label>
        <select
          key={selectKey}
          id={`preset-${mode}`}
          className="rh-admin-branding__preset-select"
          defaultValue=""
          onChange={(e) => onPreset(e.target.value)}
        >
          <option value="">— اختر مجموعة —</option>
          {BRANDING_COLOR_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {BRANDING_THEME_GROUPS.map((group) => (
        <details key={group.id} className="rh-admin-branding__details" open={group.id === 'core'}>
          <summary className="rh-admin-branding__details-summary">{group.label}</summary>
          <div className="rh-admin-branding__color-fields">
            {group.vars.map(({ name, label: vlabel, useColorPicker }) => (
              <BrandingColorRow
                key={name}
                label={vlabel}
                name={name}
                value={map[name] || ''}
                onChange={setVar}
                mode={mode}
                useColorPicker={useColorPicker !== false}
              />
            ))}
          </div>
        </details>
      ))}
    </section>
  )

  return (
    <div className="rh-admin-branding rh-admin-branding--split">
      <header className="rh-admin-branding__hero card">
        <div className="rh-admin-branding__head-row">
          <Link to="/app/admin" className="rh-admin-plan-types__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> لوحة التحكم
          </Link>
        </div>
        <h1 className="rh-admin-branding__title">هوية الموقع</h1>
        <p className="rh-admin-branding__desc">
          خطوات بسيطة: النصوص والشعار وأرقام التواصل العامة أولاً، ثم ألوان الوضع الفاتح والداكن عبر قائمة جاهزة أو منتقي الألوان.
          لا حاجة لفهم أسماء المتغيرات التقنية — استخدم القوائم والألوان. احفظ في النهاية، أو استعد الافتراضي ثم احفظ.
        </p>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <div className="rh-admin-branding__toolbar card">
        <Button type="button" variant="primary" loading={saveSubmitting} onClick={onSave}>
          حفظ التغييرات في السحابة
        </Button>
        <Button type="button" variant="secondary" disabled={saveSubmitting} onClick={() => setResetAllOpen(true)}>
          إعادة الوضع الافتراضي (النموذج)
        </Button>
      </div>

      <div className="rh-admin-branding__split">
        <div className="rh-admin-branding__col-main">
      <section className="rh-admin-branding__form card">
        <h2 className="rh-admin-branding__step-title">١ — اسم الموقع والشعار</h2>
        <p className="rh-admin-branding__step-desc">يظهر الاسم والعنوان في التبويبات والواجهة؛ الشعار يظهر في القائمة الجانبية وصفحة الدخول والصفحة العامة.</p>
        <TextField label="اسم الموقع القصير" hint="مثال: روضة الحافظين" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        <TextField
          label="عنوان الموقع في المتصفح"
          hint="يُضاف بعد اسم كل صفحة، مثل: «الرئيسية — …»"
          value={siteTitle}
          onChange={(e) => setSiteTitle(e.target.value)}
        />
        <TextAreaField label="وصف الموقع" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={4} />
        <TextField
          label="رابط صورة الشعار"
          hint="الصق رابطاً يبدأ بـ https، أو اكتب مساراً يبدأ بـ / مثل /logo.png"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />
        {sanitizeImageUrl(logoUrl) ? (
          <div className="rh-admin-branding__preview">
            <span className="rh-admin-branding__preview-label">معاينة الشعار</span>
            <img src={previewLogoSrc} alt="" className="rh-admin-branding__preview-img" width={80} height={80} />
          </div>
        ) : (
          <p className="rh-admin-branding__preview-fallback">بدون رابط: سيُستخدم الشعار الافتراضي /logo.png</p>
        )}
        <TextField
          label="صورة المشاركة (عند نشر الرابط)"
          hint="رابط https كامل أو مسار من موقعك مثل /logo.png"
          value={ogImagePath}
          onChange={(e) => setOgImagePath(e.target.value)}
        />
      </section>

      <section className="rh-admin-branding__form card">
        <h2 className="rh-admin-branding__step-title">أرقام التواصل العامة</h2>
        <p className="rh-admin-branding__step-desc">
          تظهر في الإعدادات وفي صفحتي «طلب إجازة» و«الشهادات». يفضّل إدخال الرقم بصيغة دولية أو بداية ٠٥ للسعودية. زر
          واتساب يفتح المحادثة، وزر الرسائل النصية بديل عند عدم توفر التطبيق.
        </p>
        <ul className="rh-admin-contact-phones-edit">
          {contactPhonesDraft.map((row) => (
            <li key={row.id} className="rh-admin-contact-phones-edit__row">
              <TextField
                label="التسمية (اختياري)"
                hint="مثال: شؤون الطلاب"
                value={row.label}
                onChange={(e) => {
                  const v = e.target.value
                  setContactPhonesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, label: v } : r)))
                }}
              />
              <TextField
                label="رقم الجوال"
                hint="مثال: 0501234567 أو +966501234567"
                value={row.phone}
                onChange={(e) => {
                  const v = e.target.value
                  setContactPhonesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, phone: v } : r)))
                }}
                dir="ltr"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setContactPhonesDraft((prev) => prev.filter((r) => r.id !== row.id))}
              >
                حذف
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setContactPhonesDraft((prev) => [
              ...prev,
              { id: firestoreApi.getNewId('cphone'), label: '', phone: '' },
            ])
          }
        >
          إضافة رقم
        </Button>
      </section>

      {renderThemePanel(
        '٢ — ألوان الوضع الفاتح',
        'اختر مجموعة جاهزة من القائمة، أو افتح كل مجموعة وعدّل اللون بالمربّع أو بالكود. «مسح» يعيد اللون للتصميم الافتراضي.',
        themeLight,
        setLightVar,
        'light',
        applyLightPreset,
        lightSelectKey,
      )}

      {renderThemePanel(
        '٣ — ألوان الوضع الداكن',
        'نفس الفكرة للوضع الداكن (عندما يختار المستخدم الوضع الداكن من الإعدادات).',
        themeDark,
        setDarkVar,
        'dark',
        applyDarkPreset,
        darkSelectKey,
      )}

      <section className="rh-admin-branding__theme-actions card">
        <Button type="button" variant="secondary" onClick={() => setThemeLight({})}>
          مسح كل ألوان الوضع الفاتح
        </Button>
        <Button type="button" variant="secondary" onClick={() => setThemeDark({})}>
          مسح كل ألوان الوضع الداكن
        </Button>
      </section>
        </div>

        <aside className="rh-admin-branding__aside-preview">
          <BrandingLivePreview
            previewMode={previewMode}
            onPreviewMode={setPreviewMode}
            themeLight={themeLight}
            themeDark={themeDark}
            siteName={siteName}
            siteTitle={siteTitle}
            logoSrc={previewLogoSrc}
          />
        </aside>
      </div>

      <Modal open={resetAllOpen} title="إعادة الوضع الافتراضي؟" onClose={() => setResetAllOpen(false)} size="sm">
        <p className="rh-admin-users__warn">
          سيتم ملء هذا النموذج بالقيم البرمجية الافتراضية (الاسم، العنوان، الوصف، بدون شعار مخصّص، بدون ألوان مخصّصة). لن تُحفظ
          التغييرات في Firebase حتى تضغط «حفظ التغييرات في السحابة».
        </p>
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="danger" onClick={resetEntireFormToProgramDefaults}>
            نعم، صفّر النموذج
          </Button>
          <Button type="button" variant="ghost" onClick={() => setResetAllOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
