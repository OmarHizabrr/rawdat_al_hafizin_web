/**
 * سجل صلاحيات الواجهة: كل صفحة لها معرّف ثابت وقائمة إجراءات (أزرار/بطاقات).
 * عند إضافة صفحة جديدة في التطبيق، أضفها هنا ثم استخدم نفس المعرّف في PageGuard وusePermissions.
 */

export const PERMISSION_PAGE_IDS = {
  home: 'home',
  welcome: 'welcome',
  plans: 'plans',
  plans_explore: 'plans_explore',
  halakat: 'halakat',
  halakat_explore: 'halakat_explore',
  dawrat: 'dawrat',
  dawrat_explore: 'dawrat_explore',
  awrad: 'awrad',
  settings: 'settings',
  feelings: 'feelings',
  foundation: 'foundation',
  leave_request: 'leave_request',
  certificates: 'certificates',
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
      { id: 'plan_join_public', label: 'الانضمام بمعرّف + استكشاف الخطط العامة' },
      { id: 'plan_card_set_home', label: 'بطاقة: جعل الخطة افتراضية للرئيسية' },
      { id: 'plan_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'plan_card_edit', label: 'بطاقة: تعديل الخطة' },
      { id: 'plan_card_delete_leave', label: 'بطاقة: حذف الخطة / مغادرة الخطة' },
      { id: 'plan_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'plan_member_promote', label: 'نافذة الأعضاء: ترقية/إلغاء مشرف' },
      { id: 'plan_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.plans_explore,
    path: '/app/plans/explore',
    label: 'استكشاف الخطط العامة',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف الخطة' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.halakat,
    path: '/app/halakat',
    label: 'الحلقات',
    actions: [
      { id: 'halaka_create', label: 'إضافة حلقة' },
      { id: 'halaka_join_public', label: 'الانضمام بمعرّف + استكشاف الحلقات العامة' },
      { id: 'halaka_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'halaka_card_edit', label: 'بطاقة: تعديل الحلقة' },
      { id: 'halaka_card_delete_leave', label: 'بطاقة: حذف الحلقة / مغادرة الحلقة' },
      { id: 'halaka_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'halaka_member_promote', label: 'نافذة الأعضاء: ترقية/إلغاء مشرف' },
      { id: 'halaka_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.halakat_explore,
    path: '/app/halakat/explore',
    label: 'استكشاف الحلقات العامة',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف الحلقة' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.dawrat,
    path: '/app/dawrat',
    label: 'الدورات',
    actions: [
      { id: 'dawra_create', label: 'إضافة دورة' },
      { id: 'dawra_join_public', label: 'الانضمام بمعرّف + استكشاف الدورات العامة' },
      { id: 'dawra_card_members', label: 'بطاقة: إدارة الأعضاء' },
      { id: 'dawra_card_edit', label: 'بطاقة: تعديل الدورة' },
      { id: 'dawra_card_delete_leave', label: 'بطاقة: حذف الدورة / مغادرة الدورة' },
      { id: 'dawra_member_add', label: 'نافذة الأعضاء: إضافة عضو' },
      { id: 'dawra_member_promote', label: 'نافذة الأعضاء: ترقية/إلغاء مشرف' },
      { id: 'dawra_member_remove', label: 'نافذة الأعضاء: إزالة عضو' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.dawrat_explore,
    path: '/app/dawrat/explore',
    label: 'استكشاف الدورات العامة',
    actions: [
      { id: 'explore_join_by_id', label: 'انضمام بمعرّف الدورة' },
      { id: 'explore_join_card', label: 'زر الانضمام على البطاقة' },
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
    id: PERMISSION_PAGE_IDS.feelings,
    path: '/app/feelings',
    label: 'مشاعر الطلاب',
    actions: [
      { id: 'feelings_create', label: 'إنشاء شعور جديد' },
      { id: 'feelings_edit_own', label: 'تعديل شعوري' },
      { id: 'feelings_delete_own', label: 'حذف شعوري' },
    ],
  },
  {
    id: PERMISSION_PAGE_IDS.settings,
    path: '/app/settings',
    label: 'الإعدادات',
    actions: [
      { id: 'settings_theme', label: 'تغيير وضع المظهر (فاتح/داكن)' },
      { id: 'settings_edit_profile', label: 'تعديل الاسم ورفع صورة الملف الشخصي (تخزين)' },
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
