import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { saveBranding } from '../services/siteConfigService.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { Button, TextAreaField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function AdminBrandingPage() {
  const { user } = useAuth()
  const { branding } = useSiteContent()
  const toast = useToast()
  const [siteName, setSiteName] = useState(branding.siteName)
  const [siteTitle, setSiteTitle] = useState(branding.siteTitle)
  const [siteDescription, setSiteDescription] = useState(branding.siteDescription)
  const [ogImagePath, setOgImagePath] = useState(branding.ogImagePath)

  useEffect(() => {
    document.title = `هوية الموقع — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    setSiteName(branding.siteName)
    setSiteTitle(branding.siteTitle)
    setSiteDescription(branding.siteDescription)
    setOgImagePath(branding.ogImagePath)
  }, [branding.siteName, branding.siteTitle, branding.siteDescription, branding.ogImagePath])

  const onSave = async () => {
    if (!user) return
    try {
      await saveBranding(user, { siteName, siteTitle, siteDescription, ogImagePath })
      toast.success('تم حفظ هوية الموقع.', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ.', 'تنبيه')
    }
  }

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app', label: 'الرئيسية' },
  ]

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
          تُستخدم هذه القيم في عناوين الصفحات، الوصف العام، والنصوص التي تعتمد على{' '}
          <code className="rh-admin-dashboard__code">{'{siteName}'}</code> في محرر النصوص الثابتة.
        </p>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <section className="rh-admin-branding__form card">
        <TextField label="اسم الموقع القصير" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        <TextField label="العنوان الكامل (يظهر مع أسماء الصفحات)" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
        <TextAreaField label="وصف الموقع" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={4} />
        <TextField
          label="مسار صورة المشاركة (OG)"
          hint="مسار نسبي من جذر الموقع، مثل /logo.png"
          value={ogImagePath}
          onChange={(e) => setOgImagePath(e.target.value)}
        />
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="primary" onClick={onSave}>
            حفظ
          </Button>
        </div>
      </section>
    </div>
  )
}
