import {
  ArrowLeft,
  ChevronDown,
  Eraser,
  Layers,
  LayoutTemplate,
  Menu,
  MousePointerClick,
  Palette,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BrandingColorPackages } from '../components/BrandingColorPackages.jsx'
import { BrandingColorRow } from '../components/BrandingColorRow.jsx'
import { BrandingContactPreview } from '../components/BrandingContactPreview.jsx'
import { BrandingIdentityPreview } from '../components/BrandingIdentityPreview.jsx'
import { BrandingLivePreview } from '../components/BrandingLivePreview.jsx'
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_PATH, SITE_TITLE } from '../config/site.js'
import { BRANDING_COLOR_PRESETS, detectMatchingPresetId } from '../data/brandingPresets.js'
import { BRANDING_THEME_GROUP_HINTS, BRANDING_THEME_GROUPS } from '../data/brandingThemeFields.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { useTheme } from '../theme/useTheme.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { saveBranding, saveContactPhones } from '../services/siteConfigService.js'
import { sanitizeImageUrl } from '../utils/brandingAssets.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { ImagePickPreview } from '../components/ImagePickPreview.jsx'
import { Button, Modal, TextAreaField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function cloneThemeMap(map) {
  if (!map || typeof map !== 'object') return {}
  return { ...map }
}

const PAGE_TABS = [
  { id: 'identity', label: 'تسمية الموقع', icon: Type },
  { id: 'colors', label: 'ألوان الموقع', icon: Palette },
  { id: 'contact', label: 'أرقام التواصل', icon: Phone },
]

const GROUP_ICONS = {
  core: Palette,
  surfaces: Layers,
  text: Type,
  buttons: MousePointerClick,
  nav: Menu,
  hero: LayoutTemplate,
  semantic: Sparkles,
}

const GROUP_PREVIEW_FOCUS = {
  core: 'buttons',
  surfaces: 'text',
  text: 'text',
  buttons: 'buttons',
  nav: 'nav',
  hero: 'hero',
  semantic: 'semantic',
}

function scrollToBrandingGroup(mode, groupId) {
  const el = document.getElementById(`branding-group-${mode}-${groupId}`)
  if (!el) return
  el.open = true
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function AdminBrandingPage() {
  const { user } = useAuth()
  const { branding, contactPhones } = useSiteContent()
  const { resolved: appColorScheme } = useTheme()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('identity')
  const [siteName, setSiteName] = useState(branding.siteName)
  const [siteTitle, setSiteTitle] = useState(branding.siteTitle)
  const [siteDescription, setSiteDescription] = useState(branding.siteDescription)
  const [ogImagePath, setOgImagePath] = useState(branding.ogImagePath)
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl)
  const [themeLight, setThemeLight] = useState(() => cloneThemeMap(branding.themeLight))
  const [themeDark, setThemeDark] = useState(() => cloneThemeMap(branding.themeDark))
  const [resetAllOpen, setResetAllOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState(() => (appColorScheme === 'dark' ? 'dark' : 'light'))
  const [colorEditMode, setColorEditMode] = useState(() => (appColorScheme === 'dark' ? 'dark' : 'light'))
  const [showAdvancedColors, setShowAdvancedColors] = useState(false)
  const [previewFocusGroup, setPreviewFocusGroup] = useState(null)
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [contactPhonesDraft, setContactPhonesDraft] = useState([])
  const logoUrlInputRef = useRef(null)
  const ogImageInputRef = useRef(null)

  const previewLogoSrc = useMemo(() => sanitizeImageUrl(logoUrl) || '/logo.png', [logoUrl])
  const selectedPackageId = useMemo(() => detectMatchingPresetId(themeLight, themeDark), [themeLight, themeDark])

  useEffect(() => {
    document.title = `إعدادات الموقع — ${branding.siteTitle}`
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

  const applyPackage = useCallback((id) => {
    if (!id) return
    const preset = BRANDING_COLOR_PRESETS.find((x) => x.id === id)
    if (!preset) return
    setThemeLight({ ...preset.light })
    setThemeDark({ ...preset.dark })
    setShowAdvancedColors(false)
    setPreviewFocusGroup(null)
    toast.info(`تم تطبيق حزمة «${preset.name}» على الوضعين الفاتح والداكن.`, '')
  }, [toast])

  const resetEntireFormToProgramDefaults = useCallback(() => {
    setSiteName(SITE_NAME)
    setSiteTitle(SITE_TITLE)
    setSiteDescription(SITE_DESCRIPTION)
    setOgImagePath(SITE_OG_IMAGE_PATH)
    setLogoUrl('')
    setThemeLight({})
    setThemeDark({})
    setShowAdvancedColors(false)
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
      toast.success('تم حفظ إعدادات الموقع.', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ.', 'تنبيه')
    } finally {
      setSaveSubmitting(false)
    }
  }

  const onColorEditModeChange = useCallback((mode) => {
    setColorEditMode(mode)
    setPreviewMode(mode)
  }, [])

  const colorMap = colorEditMode === 'dark' ? themeDark : themeLight
  const setColorVar = colorEditMode === 'dark' ? setDarkVar : setLightVar

  const onGroupJump = useCallback(
    (groupId) => {
      scrollToBrandingGroup(colorEditMode, groupId)
      setPreviewFocusGroup(GROUP_PREVIEW_FOCUS[groupId] || null)
    },
    [colorEditMode],
  )

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app', label: 'الرئيسية' },
    { to: '/app/leave-request', label: 'طلب إجازة' },
    { to: '/app/certificates', label: 'الشهادات' },
    { to: '/app/settings', label: 'الإعدادات' },
  ]

  const renderAdvancedColors = () => (
    <div className="rh-admin-branding__advanced-colors">
      <div className="rh-admin-branding__mode-tabs" role="tablist" aria-label="وضع تعديل الألوان">
        <button
          type="button"
          role="tab"
          aria-selected={colorEditMode === 'light'}
          className={['rh-admin-branding__mode-tab', colorEditMode === 'light' ? 'rh-admin-branding__mode-tab--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onColorEditModeChange('light')}
        >
          <RhIcon as={Sun} size={16} strokeWidth={RH_ICON_STROKE} aria-hidden />
          الوضع الفاتح
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={colorEditMode === 'dark'}
          className={['rh-admin-branding__mode-tab', colorEditMode === 'dark' ? 'rh-admin-branding__mode-tab--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onColorEditModeChange('dark')}
        >
          <RhIcon as={Moon} size={16} strokeWidth={RH_ICON_STROKE} aria-hidden />
          الوضع الداكن
        </button>
      </div>

      <div className="rh-admin-branding__group-jump" aria-label="انتقال سريع لمجموعات الألوان">
        {BRANDING_THEME_GROUPS.map((group) => {
          const GroupIcon = GROUP_ICONS[group.id] || Palette
          return (
            <button
              key={group.id}
              type="button"
              className="rh-admin-branding__group-jump-btn"
              onClick={() => onGroupJump(group.id)}
            >
              <RhIcon as={GroupIcon} size={14} strokeWidth={RH_ICON_STROKE} aria-hidden />
              {group.label}
            </button>
          )
        })}
      </div>

      {BRANDING_THEME_GROUPS.map((group) => {
        const GroupIcon = GROUP_ICONS[group.id] || Palette
        const hint = BRANDING_THEME_GROUP_HINTS[group.id]
        return (
          <details
            key={group.id}
            id={`branding-group-${colorEditMode}-${group.id}`}
            className="rh-admin-branding__details"
          >
            <summary className="rh-admin-branding__details-summary">
              <span className="rh-admin-branding__details-summary-inner">
                <span className="rh-admin-branding__details-icon" aria-hidden>
                  <RhIcon as={GroupIcon} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
                <span className="rh-admin-branding__details-text">
                  <span className="rh-admin-branding__details-label">{group.label}</span>
                  {hint ? <span className="rh-admin-branding__details-hint">{hint}</span> : null}
                </span>
              </span>
            </summary>
            <div className="rh-admin-branding__color-fields">
              {group.vars.map(({ name, label: vlabel, useColorPicker, pickerMode }) => (
                <BrandingColorRow
                  key={name}
                  label={vlabel}
                  name={name}
                  value={colorMap[name] || ''}
                  onChange={setColorVar}
                  mode={colorEditMode}
                  useColorPicker={useColorPicker !== false}
                  pickerMode={pickerMode || 'hex'}
                />
              ))}
            </div>
          </details>
        )
      })}

      <div className="rh-admin-branding__theme-actions rh-admin-branding__theme-actions--inline">
        <Button type="button" variant="secondary" icon={Eraser} onClick={() => setThemeLight({})}>
          مسح ألوان الوضع الفاتح
        </Button>
        <Button type="button" variant="secondary" icon={Eraser} onClick={() => setThemeDark({})}>
          مسح ألوان الوضع الداكن
        </Button>
      </div>
    </div>
  )

  return (
    <div className="rh-admin-branding rh-admin-branding--split">
      <header className="rh-admin-branding__hero card">
        <div className="rh-admin-branding__head-row">
          <HapticLink to="/app/admin" className="rh-admin-plan-types__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> لوحة التحكم
          </HapticLink>
        </div>
        <h1 className="rh-admin-branding__title">إعدادات الموقع</h1>
        <p className="rh-admin-branding__desc">
          كل قسم منفصل لتسهيل الإدارة: تسمية الموقع والشعار في تبويب، وألوان الموقع في تبويب آخر (حزم جاهزة)، وأرقام
          التواصل في تبويب ثالث. المعاينة الحية تظهر في كل قسم.
        </p>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <div className="rh-admin-branding__toolbar card">
        <Button type="button" variant="primary" icon={Save} loading={saveSubmitting} onClick={onSave}>
          حفظ التغييرات
        </Button>
        <Button
          type="button"
          variant="secondary"
          icon={RotateCcw}
          disabled={saveSubmitting}
          onClick={() => setResetAllOpen(true)}
        >
          إعادة الوضع الافتراضي
        </Button>
      </div>

      <nav className="rh-admin-branding__page-tabs card" aria-label="أقسام إعدادات الموقع">
        {PAGE_TABS.map((tab) => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={['rh-admin-branding__page-tab', activeTab === tab.id ? 'rh-admin-branding__page-tab--active' : '']
                .filter(Boolean)
                .join(' ')}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              <RhIcon as={TabIcon} size={18} strokeWidth={RH_ICON_STROKE} aria-hidden />
              {tab.label}
            </button>
          )
        })}
      </nav>

      {activeTab === 'identity' ? (
        <section className="rh-admin-branding__form card">
          <h2 className="rh-admin-branding__step-title">تسمية الموقع والشعار</h2>
          <p className="rh-admin-branding__step-desc">
            الاسم والعنوان والوصف والشعار — منفصل تماماً عن الألوان. يظهر في التبويبات والقائمة والصفحة العامة.
          </p>

          <BrandingIdentityPreview
            siteName={siteName}
            siteTitle={siteTitle}
            siteDescription={siteDescription}
            logoSrc={previewLogoSrc}
          />

          <TextField label="اسم الموقع القصير" hint="مثال: روضة الحافظين" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          <TextField
            label="عنوان الموقع في المتصفح"
            hint="يُضاف بعد اسم كل صفحة، مثل: «الرئيسية — …»"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
          />
          <TextAreaField label="وصف الموقع" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={4} />
          <TextField
            ref={logoUrlInputRef}
            label="رابط صورة الشعار"
            hint="الصق رابطاً يبدأ بـ https، أو اكتب مساراً يبدأ بـ / مثل /logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          <ImagePickPreview
            pickMode="url"
            label="معاينة الشعار"
            hint="معاينة للرابط أو المسار أعلاه. × يمسح الحقل فيعود الشعار الافتراضي عند الحفظ إن لم تُدخل رابطاً."
            remoteUrl={logoUrl}
            onClearRemote={() => setLogoUrl('')}
            onHitClick={() => logoUrlInputRef.current?.focus()}
            disabled={saveSubmitting}
            busy={saveSubmitting}
          />
          <TextField
            ref={ogImageInputRef}
            label="صورة المشاركة (عند نشر الرابط)"
            hint="رابط https كامل أو مسار من موقعك مثل /logo.png"
            value={ogImagePath}
            onChange={(e) => setOgImagePath(e.target.value)}
          />
          <ImagePickPreview
            pickMode="url"
            compact
            label="معاينة صورة المشاركة"
            hint="× يمسح الرابط من الحقل."
            remoteUrl={ogImagePath}
            onClearRemote={() => setOgImagePath('')}
            onHitClick={() => ogImageInputRef.current?.focus()}
            disabled={saveSubmitting}
            busy={saveSubmitting}
          />
        </section>
      ) : null}

      {activeTab === 'colors' ? (
        <div className="rh-admin-branding__split">
          <div className="rh-admin-branding__col-main">
            <section className="rh-admin-branding__theme-panel card">
              <h2 className="rh-admin-branding__step-title">ألوان الموقع</h2>
              <p className="rh-admin-branding__step-desc">
                اختر حزمة ألوان جاهزة — تُطبَّق على الوضع الفاتح والداكن معاً. المعاينة على اليمين تتحدّث فوراً.
              </p>

              <BrandingColorPackages
                selectedId={selectedPackageId}
                onSelect={applyPackage}
                previewMode={previewMode}
              />

              {selectedPackageId ? (
                <p className="rh-admin-branding__package-note">
                  الحزمة النشطة:{' '}
                  <strong>{BRANDING_COLOR_PRESETS.find((p) => p.id === selectedPackageId)?.name || 'مخصّصة'}</strong>
                </p>
              ) : (
                <p className="rh-admin-branding__package-note rh-admin-branding__package-note--custom">
                  الألوان الحالية مخصّصة أو جزئية — اختر حزمة أو عدّل يدوياً.
                </p>
              )}

              <details
                className="rh-admin-branding__advanced-toggle"
                open={showAdvancedColors}
                onToggle={(e) => setShowAdvancedColors(e.currentTarget.open)}
              >
                <summary className="rh-admin-branding__advanced-toggle-summary">
                  <RhIcon as={ChevronDown} size={18} strokeWidth={RH_ICON_STROKE} aria-hidden />
                  تعديل ألوان يدوياً (متقدم)
                </summary>
                {showAdvancedColors ? renderAdvancedColors() : null}
              </details>
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
              focusGroup={previewFocusGroup}
            />
          </aside>
        </div>
      ) : null}

      {activeTab === 'contact' ? (
        <section className="rh-admin-branding__form card">
          <h2 className="rh-admin-branding__step-title">أرقام التواصل العامة</h2>
          <p className="rh-admin-branding__step-desc">
            تظهر في الإعدادات وفي صفحتي «طلب إجازة» و«الشهادات». أدخل رقماً للجوال و/أو تيليجرام.
          </p>

          <BrandingContactPreview rows={contactPhonesDraft} />

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
                  label="رقم الجوال (اختياري)"
                  hint="مثال: 0501234567 أو +966501234567"
                  value={row.phone}
                  onChange={(e) => {
                    const v = e.target.value
                    setContactPhonesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, phone: v } : r)))
                  }}
                  dir="ltr"
                />
                <TextField
                  label="تيليجرام (اختياري)"
                  hint="اسم المستخدم بدون @ أو رقم بصيغة دولية"
                  value={row.telegram ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setContactPhonesDraft((prev) => prev.map((r) => (r.id === row.id ? { ...r, telegram: v } : r)))
                  }}
                  dir="ltr"
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon={Trash2}
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
            icon={Plus}
            onClick={() =>
              setContactPhonesDraft((prev) => [
                ...prev,
                { id: firestoreApi.getNewId('cphone'), label: '', phone: '', telegram: '' },
              ])
            }
          >
            إضافة رقم
          </Button>
        </section>
      ) : null}

      <Modal open={resetAllOpen} title="إعادة الوضع الافتراضي؟" onClose={() => setResetAllOpen(false)} size="sm">
        <p className="rh-admin-users__warn">
          سيتم ملء هذا النموذج بالقيم الافتراضية (الاسم، العنوان، الوصف، بدون شعار مخصّص، بدون ألوان مخصّصة). لن تُحفظ
          التغييرات حتى تضغط «حفظ التغييرات».
        </p>
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="danger" icon={RotateCcw} onClick={resetEntireFormToProgramDefaults}>
            نعم، صفّر النموذج
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setResetAllOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
