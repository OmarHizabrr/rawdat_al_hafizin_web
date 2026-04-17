import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BRANDING_THEME_GROUPS } from '../data/brandingThemeFields.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { saveBranding } from '../services/siteConfigService.js'
import { sanitizeImageUrl } from '../utils/brandingAssets.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { Button, TextAreaField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function cloneThemeMap(map) {
  if (!map || typeof map !== 'object') return {}
  const out = { ...map }
  return out
}

export default function AdminBrandingPage() {
  const { user } = useAuth()
  const { branding } = useSiteContent()
  const toast = useToast()
  const [siteName, setSiteName] = useState(branding.siteName)
  const [siteTitle, setSiteTitle] = useState(branding.siteTitle)
  const [siteDescription, setSiteDescription] = useState(branding.siteDescription)
  const [ogImagePath, setOgImagePath] = useState(branding.ogImagePath)
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl)
  const [themeLight, setThemeLight] = useState(() => cloneThemeMap(branding.themeLight))
  const [themeDark, setThemeDark] = useState(() => cloneThemeMap(branding.themeDark))

  useEffect(() => {
    document.title = `هوية الموقع — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    setSiteName(branding.siteName)
    setSiteTitle(branding.siteTitle)
    setSiteDescription(branding.siteDescription)
    setOgImagePath(branding.ogImagePath)
    setLogoUrl(branding.logoUrl)
  }, [branding.siteName, branding.siteTitle, branding.siteDescription, branding.ogImagePath, branding.logoUrl])

  useEffect(() => {
    setThemeLight(cloneThemeMap(branding.themeLight))
    setThemeDark(cloneThemeMap(branding.themeDark))
  }, [branding.themeLight, branding.themeDark])

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

  const onSave = async () => {
    if (!user) return
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
      toast.success('تم حفظ هوية الموقع.', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ.', 'تنبيه')
    }
  }

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app', label: 'الرئيسية' },
  ]

  const renderThemePanel = (label, map, setVar) => (
    <div className="rh-admin-branding__theme-panel card">
      <h3 className="rh-admin-branding__theme-panel-title">{label}</h3>
      <p className="rh-admin-branding__theme-hint">
        اترك الحقل فارغاً للعودة إلى القيمة الافتراضية في التصميم. استخدم صيغة <code className="rh-admin-dashboard__code">#RRGGBB</code> أو{' '}
        <code className="rh-admin-dashboard__code">rgb()</code> / <code className="rh-admin-dashboard__code">rgba()</code>.
      </p>
      {BRANDING_THEME_GROUPS.map((group) => (
        <div key={group.id} className="rh-admin-branding__theme-group">
          <h4 className="rh-admin-branding__theme-group-title">{group.label}</h4>
          <div className="rh-admin-branding__theme-grid">
            {group.vars.map(({ name, label: vlabel }) => (
              <TextField
                key={name}
                label={`${vlabel} (${name})`}
                value={map[name] || ''}
                onChange={(e) => setVar(name, e.target.value)}
                placeholder="—"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="rh-admin-branding">
      <header className="rh-admin-branding__hero card">
        <div className="rh-admin-branding__head-row">
          <Link to="/app/admin" className="rh-admin-plan-types__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> لوحة التحكم
          </Link>
        </div>
        <h1 className="rh-admin-branding__title">هوية الموقع</h1>
        <p className="rh-admin-branding__desc">
          النصوص والعناوين، شعار الموقع (رابط أو مسار)، صورة المشاركة، وتجاوزات ألوان CSS للوضعين الفاتح والداكن — تُطبَّق
          فوراً على الواجهة بعد الحفظ. النصوص التي تستخدم <code className="rh-admin-dashboard__code">{'{siteName}'}</code> في
          «النصوص الثابتة» تتبع اسم الموقع هنا.
        </p>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <section className="rh-admin-branding__form card">
        <TextField label="اسم الموقع القصير" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        <TextField label="العنوان الكامل (يظهر مع أسماء الصفحات)" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
        <TextAreaField label="وصف الموقع" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={4} />
        <TextField
          label="رابط أو مسار الشعار"
          hint="مثال: https://…/logo.png أو /logo.png — يُعرض في الشريط الجانبي، تسجيل الدخول، والصفحة العامة."
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />
        {sanitizeImageUrl(logoUrl) ? (
          <div className="rh-admin-branding__preview">
            <span className="rh-admin-branding__preview-label">معاينة</span>
            <img src={sanitizeImageUrl(logoUrl)} alt="" className="rh-admin-branding__preview-img" width={72} height={72} />
          </div>
        ) : null}
        <TextField
          label="صورة المشاركة (OG) — رابط أو مسار"
          hint="رابط https كامل، أو مسار من جذر الموقع مثل /logo.png"
          value={ogImagePath}
          onChange={(e) => setOgImagePath(e.target.value)}
        />
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="primary" onClick={onSave}>
            حفظ
          </Button>
        </div>
      </section>

      {renderThemePanel('ألوان الوضع الفاتح', themeLight, setLightVar)}

      {renderThemePanel('ألوان الوضع الداكن', themeDark, setDarkVar)}

      <div className="rh-admin-branding__theme-actions card">
        <Button type="button" variant="secondary" onClick={() => setThemeLight({})}>
          مسح تجاوزات الألوان (فاتح)
        </Button>
        <Button type="button" variant="secondary" onClick={() => setThemeDark({})}>
          مسح تجاوزات الألوان (داكن)
        </Button>
      </div>
    </div>
  )
}
