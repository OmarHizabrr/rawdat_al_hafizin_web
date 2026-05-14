import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  CircleDot,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { Button, HapticLink, SearchableSelect, TextAreaField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const STAGE_OPTIONS = [
  { value: 'sahihain', label: 'الجمع بين الصحيحين' },
  { value: 'bukhari', label: 'مفردات البخاري' },
  { value: 'muslim', label: 'مفردات مسلم' },
  { value: 'abidawud', label: 'زوائد أبي داود' },
  { value: 'tirmidhi', label: 'زوائد الترمذي' },
  { value: 'other', label: 'مراحل أخرى' },
]

const PF = PERMISSION_PAGE_IDS.foundation

export default function FoundationPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { branding } = useSiteContent()
  const toast = useToast()
  const homeHref = user ? '/app' : '/'
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [stage, setStage] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    document.title = `أساس الواجهة — ${branding.siteTitle}`
  }, [branding.siteTitle])

  const nameError = useMemo(() => {
    if (!showErrors) return ''
    if (!name.trim()) return 'الرجاء إدخال الاسم'
    return ''
  }, [name, showErrors])

  const stageError = useMemo(() => {
    if (!showErrors) return ''
    if (!stage) return 'الرجاء اختيار مرحلة من القائمة'
    return ''
  }, [stage, showErrors])

  const playground = can(PF, 'foundation_playground')

  const validateDemo = () => {
    setShowErrors(true)
    if (!name.trim() || !stage) {
      toast.warning('يرجى تصحيح الحقول المطلوبة قبل المتابعة.', 'تنبيه')
      return
    }
    toast.success('هذا مثال فقط — النموذج صالح وجاهز للربط لاحقاً.', 'تم بنجاح')
  }

  return (
    <div className="page foundation-page rh-page-surface">
      <header className="foundation-header">
        <div className="foundation-header-inner">
          <HapticLink to={homeHref} className="foundation-back">
            <span className="foundation-back__icon" aria-hidden>
              <RhIcon as={ArrowRight} size={18} strokeWidth={RH_ICON_STROKE} />
            </span>
            العودة للرئيسية
          </HapticLink>
          <h1>أساس الواجهة</h1>
          <p className="foundation-lead">
            حقول موحّدة، قائمة منسدلة قابلة للبحث، أزرار بأنماط متعددة، ورسائل للمستخدم — جاهزة للبناء عليها في{' '}
            {branding.siteName}.
          </p>
          {user &&
          (canAccessPage('leave_request') ||
            canAccessPage('certificates') ||
            canAccessPage('inquiries') ||
            canAccessPage('settings')) ? (
            <div className="foundation-service-links">
              {canAccessPage('leave_request') && <HapticLink to="/app/leave-request">طلب إجازة</HapticLink>}
              {canAccessPage('certificates') && <HapticLink to="/app/certificates">الشهادات</HapticLink>}
              {canAccessPage('inquiries') && <HapticLink to="/app/inquiries">الاستفسارات</HapticLink>}
              {canAccessPage('settings') && <HapticLink to="/app/settings">الإعدادات</HapticLink>}
            </div>
          ) : null}
        </div>
      </header>

      <main className="content foundation-content">
        <section className="card">
          <h2>الحقول</h2>
          <TextField
            label="الاسم"
            placeholder="مثال: فلان الفلاني"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="يظهر نص المساعدة تحت الحقل عند عدم وجود خطأ."
            error={nameError}
            required
            autoComplete="name"
            readOnly={!playground}
          />
          <SearchableSelect
            label="المرحلة الدراسية"
            options={STAGE_OPTIONS}
            value={stage}
            onChange={setStage}
            placeholder="اختر المرحلة"
            searchPlaceholder="ابحث باسم المرحلة…"
            emptyText="لا توجد مرحلة مطابقة"
            hint="يمكن البحث بالكتابة ثم الاختيار من لوحة المفاتيح أو الفأرة."
            error={stageError}
            required
            disabled={!playground}
          />
          <TextAreaField
            label="ملاحظات (اختياري)"
            placeholder="أي ملاحظات للفريق…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            readOnly={!playground}
          />
          {playground && (
          <div className="foundation-actions">
            <Button type="button" variant="primary" icon={BadgeCheck} onClick={validateDemo}>
              تحقق وإظهار رسالة
            </Button>
            <Button type="button" variant="secondary" icon={CircleDot} onClick={() => setShowErrors(false)}>
              إخفاء أخطاء العرض
            </Button>
          </div>
          )}
          {!playground && (
            <p className="lead">معاينة الحقول التفاعلية غير مفعّلة لصلاحياتك (وضع مطالعة).</p>
          )}
        </section>

        {playground && (
        <section className="card">
          <h2>الأزرار</h2>
          <div className="foundation-button-row">
            <Button variant="primary" icon={Sparkles}>
              أساسي
            </Button>
            <Button variant="secondary" icon={Layers}>
              ثانوي
            </Button>
            <Button variant="ghost" icon={CircleDot}>
              شفاف
            </Button>
            <Button variant="danger" icon={AlertTriangle}>
              تنبيه خطر
            </Button>
          </div>
          <div className="foundation-button-row">
            <Button variant="primary" size="sm" icon={Sparkles}>
              صغير
            </Button>
            <Button variant="secondary" size="md" icon={Layers}>
              وسط
            </Button>
            <Button variant="ghost" size="lg" icon={CircleDot}>
              كبير
            </Button>
          </div>
        </section>
        )}

        {playground && (
        <section className="card">
          <h2>رسائل المستخدم (Toast)</h2>
          <p className="lead">استخدم <code className="inline-code">useToast()</code> من أي صفحة داخل التطبيق.</p>
          <div className="foundation-button-row foundation-button-row--wrap">
            <Button variant="secondary" icon={BadgeCheck} onClick={() => toast.success('تم حفظ التقدم بنجاح.', 'تم')}>
              نجاح
            </Button>
            <Button variant="secondary" icon={Info} onClick={() => toast.info('يمكنك المتابعة لاحقاً من نفس النقطة.', 'معلومة')}>
              معلومة
            </Button>
            <Button variant="secondary" icon={Bell} onClick={() => toast.warning('تحقق من الاتصال ثم أعد المحاولة.', 'تنبيه')}>
              تنبيه
            </Button>
            <Button variant="danger" icon={AlertTriangle} onClick={() => toast.danger('تعذر إتمام العملية. جرّب لاحقاً.', 'خطأ')}>
              خطأ
            </Button>
          </div>
        </section>
        )}
      </main>

      <footer className="footer">
        <p>
          <HapticLink to={homeHref}>الرئيسية</HapticLink>
        </p>
      </footer>
    </div>
  )
}
