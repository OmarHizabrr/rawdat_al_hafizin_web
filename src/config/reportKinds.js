import {
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  Layers,
  Radio,
  UserRound,
  Users,
} from 'lucide-react'

/** أنواع التقارير المتاحة في مركز التقارير */
export const REPORT_KIND_OPTIONS = [
  { value: 'student', label: 'تقرير طالب', icon: GraduationCap, description: 'خطط، حلقات، أنشطة، اختبارات، أوراد، إشعارات' },
  { value: 'teacher', label: 'تقرير معلم', icon: UserRound, description: 'ارتباطات، جلسات، حضور، تسجيلات الطلاب' },
  { value: 'halaka', label: 'تقرير حلقة', icon: Users, description: 'أعضاء، جلسات، حضور، إحصاءات شاملة' },
  { value: 'plan', label: 'تقرير خطة', icon: Layers, description: 'أعضاء الخطة وإنجازهم في الأوراد' },
  { value: 'activity', label: 'تقرير نشاط', icon: Calendar, description: 'أعضاء النشاط ومساهماتهم' },
  { value: 'exam', label: 'تقرير اختبار', icon: ClipboardList, description: 'أعضاء الاختبار وحالة الإنجاز' },
  { value: 'dawra', label: 'تقرير دورة', icon: BookOpen, description: 'أعضاء الدورة ومساهماتهم' },
  { value: 'remote_tasmee', label: 'تقرير تسميع عن بُعد', icon: Radio, description: 'أعضاء البث والتفاصيل' },
]

export const REPORT_KIND_PERMISSION = {
  student: 'student_report',
  teacher: 'teacher_report',
  halaka: 'halaka_report',
  plan: 'plan_report',
  activity: 'activity_report',
  exam: 'exam_report',
  dawra: 'dawra_report',
  remote_tasmee: 'remote_tasmee_report',
}

export const REPORT_RANGE_PRESETS = [
  { value: 'today' },
  { value: 'week' },
  { value: 'month' },
  { value: 'all' },
]

/** كل الخطط / كل الحلقات — قيمة النطاق الافتراضية */
export const REPORT_SCOPE_ALL = 'all'

/** تقارير الطالب/المعلم: بدون فلتر تاريخ يدوي — التواريخ من السجلات */
export function reportKindIsPersonAutoReport(kind) {
  return kind === 'student' || kind === 'teacher'
}

export function reportKindUsesDateFilter(kind) {
  return !reportKindIsPersonAutoReport(kind)
}

/** بدون تقييد نطاق خطة/حلقة — يجمع كل عضويات الشخص */
export function reportKindUsesScopeFilters() {
  return false
}

export function reportPersonSelectHintKey(kind) {
  if (kind === 'student') return 'reports.student_select_hint'
  if (kind === 'teacher') return 'reports.teacher_select_hint'
  return ''
}

export function reportPersonPeriodAutoKey(kind) {
  if (kind === 'student') return 'reports.student_period_auto'
  if (kind === 'teacher') return 'reports.teacher_period_auto'
  return ''
}

export function reportPersonEmptyKey(kind) {
  if (kind === 'student') return 'reports.empty_student'
  if (kind === 'teacher') return 'reports.empty_teacher'
  return 'reports.empty'
}

/** ترتيب أنواع التقارير للأدمن — الكيانات المركزية أولاً */
export const ADMIN_REPORT_KIND_ORDER = [
  'plan',
  'halaka',
  'exam',
  'activity',
  'dawra',
  'remote_tasmee',
  'student',
  'teacher',
]

/** مسار عرض التقرير المفصّل */
export function reportViewPath(params = {}) {
  const q = new URLSearchParams()
  if (params.kind) q.set('reportKind', params.kind)
  const entityIds = Array.isArray(params.entityIds)
    ? params.entityIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  if (entityIds.length > 1) {
    for (const id of entityIds) q.append('reportEntity', id)
  } else if (entityIds.length === 1) {
    q.set('reportEntity', entityIds[0])
  } else if (params.entityId) {
    q.set('reportEntity', params.entityId)
  }
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.rangePreset && params.rangePreset !== 'custom') q.set('rangePreset', params.rangePreset)
  if (params.scopePlan && params.scopePlan !== REPORT_SCOPE_ALL) q.set('scopePlan', params.scopePlan)
  if (params.scopeHalaka && params.scopeHalaka !== REPORT_SCOPE_ALL) q.set('scopeHalaka', params.scopeHalaka)
  const search = q.toString()
  return search ? `/app/reports/view?${search}` : '/app/reports/view'
}
