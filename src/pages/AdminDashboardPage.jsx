import { Bell, BookOpen, ClipboardList, FileText, LayoutDashboard, ListChecks, Palette, Shapes, Shield, UserCheck, Users } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useEffect, useMemo } from 'react'

import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { AdminAdvancedPanel } from '../components/admin/AdminAdvancedPanel.jsx'
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
    to: '/app/admin/task-categories',
    title: 'أقسام الواجبات',
    desc: 'تعريف خانات الواجبات (سماع، حفظ، تكرار، ربط…) وإضافة أقسام جديدة للطلاب.',
    Icon: ListChecks,
  },
  {
    to: '/app/admin/copy',
    title: 'النصوص الثابتة',
    desc: 'تعديل النصوص المعروضة في القائمة، الصفحة العامة، وأقسام البرنامج.',
    Icon: FileText,
  },
  {
    to: '/app/admin/program-blocks',
    title: 'أقسام صفحة البداية',
    desc: 'إضافة وترتيب أقسام التعريف بالبرنامج: عنوان، أيقونة، نقاط أو فقرات سردية.',
    Icon: BookOpen,
  },
  {
    to: '/app/admin/branding',
    title: 'إعدادات الموقع',
    desc: 'تسمية الموقع، حزم الألوان، وأرقام التواصل — كل قسم منفصل.',
    Icon: Palette,
  },
  {
    to: '/app/admin/users',
    title: 'المستخدمون',
    desc: 'إدارة الحسابات والأدوار (كما في الصفحة الحالية).',
    Icon: Users,
  },
  {
    to: '/app/admin/push-notifications',
    title: 'إشعارات المستخدمين',
    desc: 'عرض كل المستخدمين وإرسال إشعار داخلي (ودفع للهاتف عند توفر التوكن).',
    Icon: Bell,
  },
  {
    to: '/app/admin/applications',
    title: 'طلبات الالتحاق',
    desc: 'مراجعة بيانات طلاب الالتحاق، ثم القبول أو الرفض في أي وقت.',
    Icon: UserCheck,
  },
  {
    to: '/app/admin/application-form',
    title: 'حقول استمارة الالتحاق',
    desc: 'إضافة وترتيب حقول طلب الالتحاق: النوع، الإلزام، الخيارات، والظهور في الاستمارة والتصدير.',
    Icon: ClipboardList,
  },
]

const reportsTile = {
  to: '/app/reports',
  title: 'التقارير',
  desc: 'مركز التقارير: تقارير شاملة للطلاب، الخطط، الحلقات، الأنشطة، الاختبارات، والدورات مع طباعة وPDF.',
  Icon: FileText,
}

export default function AdminDashboardPage() {
  const { branding, str } = useSiteContent()
  const { canAccessPage } = usePermissions()

  useEffect(() => {
    document.title = `${str('layout.nav_admin')} — ${branding.siteTitle}`
  }, [branding.siteTitle, str])

  const visibleTiles = useMemo(
    () => (canAccessPage(PERMISSION_PAGE_IDS.reports) ? [reportsTile, ...tiles] : tiles),
    [canAccessPage],
  )

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
          <h1 className="rh-admin-dashboard__title">{str('layout.nav_admin')}</h1>
          <p className="rh-admin-dashboard__desc">
            اختر أحد الأقسام أدناه لإدارة إعدادات الموقع والمنصة. تحتاج صلاحية مشرف لحفظ التغييرات.
          </p>
          <AdminAdvancedPanel summary="معلومات تقنية للمشرف" className="rh-admin-dashboard__advanced">
            <p className="rh-settings-footnote" style={{ margin: 0 }}>
              التعديلات تُحفظ في قاعدة البيانات (مجموعات: أنواع الخطط، أقسام الواجبات، إعدادات الموقع، صلاحيات المستخدمين).
            </p>
          </AdminAdvancedPanel>
        </div>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <div className="rh-admin-dashboard__grid">
        {visibleTiles.map((t) => (
          <HapticLink key={t.to} to={t.to} className="rh-admin-dashboard__card card">
            <span className="rh-admin-dashboard__card-icon" aria-hidden>
              <RhIcon as={t.Icon} size={26} strokeWidth={RH_ICON_STROKE} />
            </span>
            <h2 className="rh-admin-dashboard__card-title">{t.title}</h2>
            <p className="rh-admin-dashboard__card-desc">{t.desc}</p>
            <span className="rh-admin-dashboard__card-cta">فتح ←</span>
          </HapticLink>
        ))}
      </div>
    </div>
  )
}
