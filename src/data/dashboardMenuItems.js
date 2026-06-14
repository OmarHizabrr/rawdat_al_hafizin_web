import {
  Bird,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
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
      Icon: ListChecks,
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

export const DASHBOARD_ACCENT_STYLES = {
  emerald: {
    ring: 'tw-ring-emerald-500/30',
    bg: 'tw-bg-emerald-50',
    icon: 'tw-text-emerald-600',
    badge: 'tw-bg-emerald-100 tw-text-emerald-800',
  },
  sky: {
    ring: 'tw-ring-sky-500/30',
    bg: 'tw-bg-sky-50',
    icon: 'tw-text-sky-600',
    badge: 'tw-bg-sky-100 tw-text-sky-800',
  },
  violet: {
    ring: 'tw-ring-violet-500/30',
    bg: 'tw-bg-violet-50',
    icon: 'tw-text-violet-600',
    badge: 'tw-bg-violet-100 tw-text-violet-800',
  },
  amber: {
    ring: 'tw-ring-amber-500/30',
    bg: 'tw-bg-amber-50',
    icon: 'tw-text-amber-600',
    badge: 'tw-bg-amber-100 tw-text-amber-800',
  },
  rose: {
    ring: 'tw-ring-rose-500/30',
    bg: 'tw-bg-rose-50',
    icon: 'tw-text-rose-600',
    badge: 'tw-bg-rose-100 tw-text-rose-800',
  },
  indigo: {
    ring: 'tw-ring-indigo-500/30',
    bg: 'tw-bg-indigo-50',
    icon: 'tw-text-indigo-600',
    badge: 'tw-bg-indigo-100 tw-text-indigo-800',
  },
  orange: {
    ring: 'tw-ring-orange-500/30',
    bg: 'tw-bg-orange-50',
    icon: 'tw-text-orange-600',
    badge: 'tw-bg-orange-100 tw-text-orange-800',
  },
  slate: {
    ring: 'tw-ring-slate-500/30',
    bg: 'tw-bg-slate-50',
    icon: 'tw-text-slate-600',
    badge: 'tw-bg-slate-100 tw-text-slate-800',
  },
  pink: {
    ring: 'tw-ring-pink-500/30',
    bg: 'tw-bg-pink-50',
    icon: 'tw-text-pink-600',
    badge: 'tw-bg-pink-100 tw-text-pink-800',
  },
  teal: {
    ring: 'tw-ring-teal-500/30',
    bg: 'tw-bg-teal-50',
    icon: 'tw-text-teal-600',
    badge: 'tw-bg-teal-100 tw-text-teal-800',
  },
}
