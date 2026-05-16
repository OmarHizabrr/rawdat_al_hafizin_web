/**
 * سجل صلاحيات الواجهة: كل صفحة لها معرّف ثابت وقائمة إجراءات (أزرار/بطاقات).
 * عند إضافة صفحة جديدة في التطبيق، أضفها هنا ثم استخدم نفس المعرّف في PageGuard وusePermissions.
 */

/** إجراء موحّد — إظهار منشئ/مالك/كاتب العنصر (اسم، صورة، بريد، معرّف) */
export const VIEW_CREATOR_ACTION = 'view_creator'

const VIEW_CREATOR_ACTION_DEF = {
  id: VIEW_CREATOR_ACTION,
  label: 'إظهار منشئ/مالك العنصر (الاسم، الصورة، المعرف)',
}

export const PERMISSION_PAGE_IDS = {
  home: 'home',
  welcome: 'welcome',
  plans: 'plans',
  plans_explore: 'plans_explore',
  halakat: 'halakat',
  halakat_explore: 'halakat_explore',
  remote_tasmee: 'remote_tasmee',
  remote_tasmee_explore: 'remote_tasmee_explore',
  exams: 'exams',
  exams_explore: 'exams_explore',
  dawrat: 'dawrat',
  dawrat_explore: 'dawrat_explore',
  awrad: 'awrad',
  activities: 'activities',
  activities_explore: 'activities_explore',
  reports: 'reports',
  settings: 'settings',
  notifications: 'notifications',
  feelings: 'feelings',
  foundation: 'foundation',
  leave_request: 'leave_request',
  certificates: 'certificates',
  inquiries: 'inquiries',
}

/** @typedef {{ id: string, label: string }} PermissionActionDef */
/** @typedef {{ id: string, path: string, pathEnd?: boolean, label: string, actions: PermissionActionDef[] }} PermissionPageDef */

/** @type {PermissionPageDef[]} */
export const PERMISSION_PAGES = [
  {
    id: PERMISSION_PAGE_IDS.home,
    path: '/app',
    pathEnd: true,
    label: 'الرئيسية',
    actions: [
      { id: 'home_switch_plan', label: 'تغيير الخطة النشطة (قائمة الخطط في البطاقة)' },
      { id: 'home_log_wird', label: 'زر تسجيل الورد (نافذة الورد)' },
      { id: 'home_quick_plans', label: 'اختصار «الخطط»' },
      { id: 'home_quick_welcome', label: 'اختصار «البداية»' },
      { id: 'home_footer_awrad_link', label: 'رابط «صفحة الأوراد لهذه الخطة»' },
      { id: 'home_footer_plans_link', label: 'رابط «تعديل الخطط وتعيين الافتراضية»' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.welcome,
    path: '/app/welcome',
    label: 'صفحة البداية',
    actions: [],
  },
  {
    id: PERMISSION_PAGE_IDS.plans,
    path: '/app/plans',
    label: 'الخطط',
    actions: [
      { id: 'plan_create', label: 'إضافة خطة' },
      { id: 'plan_join_public', label: 'الانضمام لخطة عامة بمعرّف' },
      { id: 'plan_card_set_home', label: 'بطاقة: جعل الخطة افتراضية للرئيسية' },
      { id: 'plan_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'plan_card_edit', label: 'بطاقة: تعديل الخطة' },
      { id: 'plan_card_delete_leave', label: 'بطاقة: حذف الخطة / مغادرة الخطة' },
      { id: 'plan_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'plan_member_promote', label: 'نافذة الأعضاء: ترقية/إلغاء مشرف' },
      { id: 'plan_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.plans_explore,
    path: '/app/plans/explore',
    label: 'استكشاف الخطط العامة (نافذة منبثقة)',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف الخطة' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.halakat,
    path: '/app/halakat',
    label: 'الحلقات',
    actions: [
      { id: 'halaka_create', label: 'إضافة حلقة' },
      { id: 'halaka_join_public', label: 'الانضمام لحلقة عامة بمعرّف' },
      { id: 'halaka_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'halaka_card_sessions', label: 'بطاقة: فتح جلسات الحلقة' },
      { id: 'halaka_card_edit', label: 'بطاقة: تعديل الحلقة' },
      { id: 'halaka_card_delete_leave', label: 'بطاقة: حذف الحلقة / مغادرة الحلقة' },
      { id: 'halaka_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'halaka_member_promote', label: 'نافذة الأعضاء: ترقية/إلغاء مشرف' },
      { id: 'halaka_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.halakat_explore,
    path: '/app/halakat/explore',
    label: 'استكشاف الحلقات العامة (نافذة منبثقة)',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف الحلقة' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.remote_tasmee,
    path: '/app/remote-tasmee',
    label: 'التسميع عن بعد',
    actions: [
      { id: 'remote_tasmee_create', label: 'إضافة بث / جلسة عن بعد' },
      { id: 'remote_tasmee_join_public', label: 'الانضمام لبث عام بمعرّف' },
      { id: 'remote_tasmee_card_open_page', label: 'بطاقة: فتح صفحة البث' },
      { id: 'remote_tasmee_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'remote_tasmee_card_edit', label: 'بطاقة: تعديل البث' },
      { id: 'remote_tasmee_card_delete_leave', label: 'بطاقة: حذف البث / مغادرة' },
      { id: 'remote_tasmee_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'remote_tasmee_member_promote', label: 'نافذة الأعضاء: تغيير الدور' },
      { id: 'remote_tasmee_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.remote_tasmee_explore,
    path: '/app/remote-tasmee/explore',
    label: 'استكشاف التسميع عن بعد العام (نافذة منبثقة)',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف البث' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.exams,
    path: '/app/exams',
    label: 'الاختبار',
    actions: [
      { id: 'exam_create', label: 'إضافة مجموعة اختبار' },
      { id: 'exam_join_public', label: 'الانضمام لمجموعة عامة بمعرّف' },
      { id: 'exam_card_remote_tasmee', label: 'بطاقة: زر بث التسميع المرتبط بالاختبار' },
      { id: 'exam_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'exam_card_edit', label: 'بطاقة: تعديل' },
      { id: 'exam_card_delete_leave', label: 'بطاقة: حذف / مغادرة' },
      { id: 'exam_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'exam_member_promote', label: 'نافذة الأعضاء: تغيير الدور' },
      { id: 'exam_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
      { id: 'exam_student_self_report', label: 'الطالب: تسجيل حالة الإنجاز (تجهيز، إتمام، ملاحظات)' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.exams_explore,
    path: '/app/exams/explore',
    label: 'استكشاف الاختبارات العامة (نافذة منبثقة)',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.dawrat,
    path: '/app/dawrat',
    label: 'الدورات',
    actions: [
      { id: 'dawra_create', label: 'إضافة دورة' },
      { id: 'dawra_join_public', label: 'الانضمام لدورة عامة بمعرّف' },
      { id: 'dawra_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'dawra_card_edit', label: 'بطاقة: تعديل الدورة' },
      { id: 'dawra_card_delete_leave', label: 'بطاقة: حذف الدورة / مغادرة الدورة' },
      { id: 'dawra_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'dawra_member_promote', label: 'نافذة الأعضاء: ترقية/إلغاء مشرف' },
      { id: 'dawra_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
      { id: 'dawra_student_contribute', label: 'عضو الدورة: كتابة مساهمة أو تعليق (تكليف، ملاحظة، …)' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.dawrat_explore,
    path: '/app/dawrat/explore',
    label: 'استكشاف الدورات العامة (نافذة منبثقة)',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف الدورة' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.awrad,
    path: '/app/awrad',
    label: 'الأوراد',
    actions: [
      { id: 'wird_create', label: 'إضافة ورد' },
      { id: 'wird_edit', label: 'بطاقة السجل: تعديل' },
      { id: 'wird_delete', label: 'بطاقة السجل: حذف' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.activities,
    path: '/app/activities',
    label: 'الأنشطة',
    actions: [
      { id: 'activity_create', label: 'إضافة مجموعة نشاط' },
      { id: 'activity_join_public', label: 'الانضمام لنشاط عام بمعرّف' },
      { id: 'activity_print', label: 'الأنشطة: زر الطباعة' },
      { id: 'activity_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'activity_card_edit', label: 'بطاقة: تعديل' },
      { id: 'activity_card_delete_leave', label: 'بطاقة: حذف / مغادرة' },
      { id: 'activity_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'activity_member_promote', label: 'نافذة الأعضاء: تغيير الدور' },
      { id: 'activity_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
      { id: 'activity_student_contribute', label: 'الطالب: كتابة مساهمة أو تعليق على النشاط (تكليف، فائدة، …)' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.activities_explore,
    path: '/app/activities/explore',
    label: 'استكشاف الأنشطة العامة (نافذة منبثقة)',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.reports,
    path: '/app/reports',
    label: 'التقارير',
    actions: [
      { id: 'student_report', label: 'تقرير: طالب مفصل' },
      { id: 'teacher_report', label: 'تقرير: معلم مفصل' },
      { id: 'halaka_report', label: 'تقرير: حلقة مفصل' },
      { id: 'plan_report', label: 'تقرير: خطة مفصل' },
      { id: 'activity_report', label: 'تقرير: نشاط مفصل' },
      { id: 'exam_report', label: 'تقرير: اختبار مفصل' },
      { id: 'dawra_report', label: 'تقرير: دورة مفصل' },
      { id: 'remote_tasmee_report', label: 'تقرير: تسميع عن بعد مفصل' },
      { id: 'reports_print', label: 'التقارير: طباعة' },
      { id: 'reports_export_csv', label: 'التقارير: تنزيل CSV' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.feelings,
    path: '/app/feelings',
    label: 'مشاعر الطلاب',
    actions: [
      { id: 'feelings_create', label: 'إنشاء شعور جديد' },
      { id: 'feelings_edit_own', label: 'تعديل شعوري' },
      { id: 'feelings_delete_own', label: 'حذف شعوري' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.settings,
    path: '/app/settings',
    label: 'الإعدادات',
    actions: [
      { id: 'settings_theme', label: 'تغيير وضع المظهر (فاتح/داكن)' },
      { id: 'settings_feelings_flight_mode', label: 'تعديل حركة طيور المشاعر (تعطيل/تخفيف/تسريع)' },
      { id: 'settings_notifications_mode', label: 'تعديل وضع الإشعارات على الجهاز (تشغيل/إيقاف)' },
      { id: 'settings_push_token_manage', label: 'إدارة توكن إشعارات الهاتف (حفظ/نسخ)' },
      { id: 'settings_edit_profile', label: 'تعديل الاسم ورفع صورة الملف الشخصي (تخزين)' },
      {
        id: 'settings_toggle_hide_home_plan',
        label: 'إظهار خيار إيقاف عرض لوحة الخطة على الرئيسية في الإعدادات',
      },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.notifications,
    path: '/app/notifications',
    label: 'الإشعارات',
    actions: [
      { id: 'notification_mark_all_read', label: 'الإشعارات: زر تعليم الكل كمقروء' },
      { id: 'notification_mark_read', label: 'الإشعارات: زر تمّت القراءة لكل إشعار' },
      { id: 'notification_delete', label: 'حذف إشعار' },
      VIEW_CREATOR_ACTION_DEF,
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.foundation,
    path: '/app/foundation',
    label: 'أساس الواجهة (تجريبي)',
    actions: [{ id: 'foundation_playground', label: 'أزرار المعاينة والتنبيهات التجريبية' }],
  },
  {
    id: PERMISSION_PAGE_IDS.leave_request,
    path: '/app/leave-request',
    label: 'طلب إجازة',
    actions: [],
  },
  {
    id: PERMISSION_PAGE_IDS.certificates,
    path: '/app/certificates',
    label: 'الشهادات',
    actions: [],
  },
  {
    id: PERMISSION_PAGE_IDS.inquiries,
    path: '/app/inquiries',
    label: 'الاستفسارات',
    actions: [
      { id: 'inquiries_submit', label: 'إرسال استفسار جديد' },
      { id: 'inquiries_edit_own', label: 'تعديل استفساري (قبل الرد)' },
      { id: 'inquiries_view_all', label: 'عرض جميع الاستفسارات (لوحة الإدارة)' },
      { id: 'inquiries_reply', label: 'الرد على الاستفسارات' },
      { id: 'inquiries_see_student_identity', label: 'إظهار هوية الطالب في القائمة العامة' },
      { id: 'inquiries_see_admin_identity', label: 'إظهار اسم المُجيب في الرد' },
    ],
  },
]

const PAGE_BY_PATH = new Map()
for (const p of PERMISSION_PAGES) {
  PAGE_BY_PATH.set(p.path, p)
}

/**
 * يطابق مسار المتصفح (pathname) مع صفحة السجل؛ يعيد null إن لم يُعرَّف.
 * يلاحظ أن /app يطابق فقط مع pathEnd (المسار الفارغ بعد /app).
 */
export function getPermissionPageIdFromPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null
  const norm = pathname.replace(/\/+$/, '') || '/'
  if (norm === '/app' || norm === '') return PERMISSION_PAGE_IDS.home
  const hit = PAGE_BY_PATH.get(norm)
  return hit ? hit.id : null
}

/** ترتيب الصفحات لاختيار أول مسار مسموح عند الحظر */
export const PERMISSION_FALLBACK_ORDER = PERMISSION_PAGES.map((p) => p.id)

export function getPagePathById(pageId) {
  return PERMISSION_PAGES.find((p) => p.id === pageId)?.path ?? '/app'
}
