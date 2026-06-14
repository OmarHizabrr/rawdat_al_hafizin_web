import {
  Bird,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  ScrollText,
  UsersRound,
} from 'lucide-react'

/**
 * القائمة الرئيسية للوحة التحكم — مصفوفة كائنات تُعرض في Grid
 * @typedef {{ id: string, title: string, description: string, to: string, Icon: import('react').ComponentType, accent: string, badge?: string }} DashboardMenuItem
 */

/** @type {DashboardMenuItem[]} */
export function buildDashboardMenuItems(str) {
  const s = typeof str === 'function' ? str : () => ''
  return [
    {
      id: 'tasks',
      title: s('layout.nav_tasks'),
      description: 'متابعة مهامك اليومية عبر مراحل التقدّم.',
      to: '/app/tasks',
      Icon: ListChecks,
      accent: 'emerald',
      pageId: 'home',
    },
    {
      id: 'plans',
      title: s('layout.nav_plans'),
      description: 'خطط الحفظ والمراجعة والمجلدات المستهدفة.',
      to: '/app/plans',
      Icon: ClipboardList,
      accent: 'sky',
      pageId: 'plans',
    },
    {
      id: 'halakat',
      title: s('layout.nav_halakat'),
      description: 'حضور الجلسات وتسميع الحفظ مع المعلم.',
      to: '/app/halakat',
      Icon: UsersRound,
      accent: 'violet',
      pageId: 'halakat',
    },
    {
      id: 'awrad',
      title: s('layout.nav_awrad'),
      description: 'تسجيل الورد اليومي ومتابعة الإنجاز.',
      to: '/app/awrad',
      Icon: NotebookPen,
      accent: 'amber',
      pageId: 'awrad',
    },
    {
      id: 'exams',
      title: s('layout.nav_exams'),
      description: 'مجموعات الاختبار والإنجاز المُبلَغ.',
      to: '/app/exams',
      Icon: ScrollText,
      accent: 'rose',
      pageId: 'exams',
    },
    {
      id: 'dawrat',
      title: s('layout.nav_dawrat'),
      description: 'الدورات المسجّل بها والمساهمات.',
      to: '/app/dawrat',
      Icon: GraduationCap,
      accent: 'indigo',
      pageId: 'dawrat',
    },
    {
      id: 'activities',
      title: s('layout.nav_activities'),
      description: 'الأنشطة والفعاليات وتوثيق المشاركة.',
      to: '/app/activities',
      Icon: CalendarDays,
      accent: 'orange',
      pageId: 'activities',
    },
    {
      id: 'reports',
      title: s('layout.nav_reports'),
      description: 'تقارير شاملة للإنجاز والحضور.',
      to: '/app/reports',
      Icon: FileText,
      accent: 'slate',
      pageId: 'reports',
    },
    {
      id: 'feelings',
      title: s('layout.nav_feelings'),
      description: 'تسجيل الحالة وتتبّع المشاعر.',
      to: '/app/feelings',
      Icon: Bird,
      accent: 'pink',
      pageId: 'feelings',
    },
    {
      id: 'home',
      title: s('layout.nav_home'),
      description: 'العودة لبطاقة الورد والملخص اليومي.',
      to: '/app',
      Icon: LayoutDashboard,
      accent: 'teal',
      pageId: 'home',
    },
  ]
}

/** @deprecated استخدم buildDashboardMenuItems(str) */
export const DASHBOARD_MENU_ITEMS = buildDashboardMenuItems(() => '')
