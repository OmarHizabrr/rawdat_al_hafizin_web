import { FileText, LayoutDashboard, Palette, Shapes, Shield, Users } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSiteContent } from '../context/useSiteContent.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const tiles = [
  {
    to: '/app/admin/user-types',
    title: 'أنواع المستخدمين',
    desc: 'تعريف طالب / معلم / أدوار مخصّصة: الصفحات الظاهرة وأزرار الإضافة والتعديل والحذف لكل صفحة.',
    Icon: Shield,
  },
  {
    to: '/app/admin/plan-types',
    title: 'أنواع الخطط',
    desc: 'إضافة وتعديل أنواع الخطط التي تظهر في صفحة الخطط والرئيسية.',
    Icon: Shapes,
  },
  {
    to: '/app/admin/copy',
    title: 'النصوص الثابتة',
    desc: 'تعديل النصوص المعروضة في القائمة، الصفحة العامة، وأقسام البرنامج.',
    Icon: FileText,
  },
  {
    to: '/app/admin/branding',
    title: 'هوية الموقع',
    desc: 'النصوص، الشعار برابط، صورة OG، أرقام التواصل العامة (واتساب/رسائل)، وتجاوز ألوان الوضعين الفاتح والداكن على كامل الواجهة.',
    Icon: Palette,
  },
  {
    to: '/app/admin/users',
    title: 'المستخدمون',
    desc: 'إدارة الحسابات والأدوار (كما في الصفحة الحالية).',
    Icon: Users,
  },
]

export default function AdminDashboardPage() {
  const { branding } = useSiteContent()

  useEffect(() => {
    document.title = `لوحة التحكم — ${branding.siteTitle}`
  }, [branding.siteTitle])

  const crossItems = [
    { to: '/app', label: 'الرئيسية' },
    { to: '/app/plans', label: 'الخطط' },
    { to: '/app/awrad', label: 'الأوراد' },
    { to: '/app/feelings', label: 'مشاعر الطلاب' },
    { to: '/app/leave-request', label: 'طلب إجازة' },
    { to: '/app/certificates', label: 'الشهادات' },
    { to: '/app/settings', label: 'الإعدادات' },
  ]

  return (
    <div className="rh-admin-dashboard">
      <header className="rh-admin-dashboard__hero card">
        <div className="rh-admin-dashboard__hero-icon" aria-hidden>
          <RhIcon as={LayoutDashboard} size={28} strokeWidth={RH_ICON_STROKE} />
        </div>
        <div>
          <h1 className="rh-admin-dashboard__title">لوحة التحكم</h1>
          <p className="rh-admin-dashboard__desc">
            اختر أحد الأقسام أدناه لإدارة إعدادات الموقع. تتطلّب التعديلات صلاحية مشرف وقواعد Firestore تسمح بالقراءة/الكتابة
            على المجموعات <code className="rh-admin-dashboard__code">plan_types</code> و{' '}
            <code className="rh-admin-dashboard__code">site_config</code> و{' '}
            <code className="rh-admin-dashboard__code">permission_profiles</code>.
          </p>
        </div>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <div className="rh-admin-dashboard__grid">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="rh-admin-dashboard__card card">
            <span className="rh-admin-dashboard__card-icon" aria-hidden>
              <RhIcon as={t.Icon} size={26} strokeWidth={RH_ICON_STROKE} />
            </span>
            <h2 className="rh-admin-dashboard__card-title">{t.title}</h2>
            <p className="rh-admin-dashboard__card-desc">{t.desc}</p>
            <span className="rh-admin-dashboard__card-cta">فتح ←</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
