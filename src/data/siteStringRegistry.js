import { SITE_NAME, SITE_TITLE } from '../config/site.js'

/**
 * سجل النصوص القابلة للتعديل من لوحة التحكم.
 * المفتاح ثابت في الكود؛ القيمة الافتراضية تُستبدل بما يُخزَّن في `site_config/main.strings`.
 */
export const SITE_STRING_REGISTRY = [
  { key: 'layout.nav_home', group: 'التنقل', label: 'قائمة: الرئيسية', defaultValue: 'الرئيسية' },
  { key: 'layout.nav_welcome', group: 'التنقل', label: 'قائمة: البداية', defaultValue: 'البداية' },
  { key: 'layout.nav_plans', group: 'التنقل', label: 'قائمة: الخطط', defaultValue: 'الخطط' },
  {
    key: 'layout.nav_plans_explore',
    group: 'التنقل',
    label: 'قائمة: استكشاف الخطط العامة',
    defaultValue: 'استكشاف',
  },
  { key: 'layout.nav_halakat', group: 'التنقل', label: 'قائمة: الحلقات', defaultValue: 'الحلقات' },
  {
    key: 'layout.nav_halakat_explore',
    group: 'التنقل',
    label: 'قائمة: استكشاف الحلقات',
    defaultValue: 'استكشاف الحلقات',
  },
  { key: 'layout.nav_dawrat', group: 'التنقل', label: 'قائمة: الدورات', defaultValue: 'الدورات' },
  {
    key: 'layout.nav_dawrat_explore',
    group: 'التنقل',
    label: 'قائمة: استكشاف الدورات',
    defaultValue: 'استكشاف الدورات',
  },
  { key: 'layout.nav_awrad', group: 'التنقل', label: 'قائمة: الأوراد', defaultValue: 'الأوراد' },
  { key: 'layout.nav_settings', group: 'التنقل', label: 'قائمة: الإعدادات', defaultValue: 'الإعدادات' },
  { key: 'layout.nav_foundation', group: 'التنقل', label: 'قائمة: أساس الواجهة', defaultValue: 'أساس الواجهة' },
  { key: 'layout.nav_users', group: 'التنقل', label: 'قائمة: المستخدمون', defaultValue: 'المستخدمون' },
  { key: 'layout.nav_dashboard', group: 'التنقل', label: 'قائمة: لوحة التحكم', defaultValue: 'لوحة التحكم' },
  {
    key: 'layout.sidebar_brand_aria',
    group: 'التنقل',
    label: 'تسمية شعار الشريط (لقارئ الشاشة)',
    defaultValue: 'الرئيسية — روضة الحافظين',
  },
  { key: 'layout.sidebar_title', group: 'التنقل', label: 'عنوان الشريط الجانبي', defaultValue: SITE_NAME },
  { key: 'layout.topbar_heading', group: 'التنقل', label: 'عنوان الشريط العلوي', defaultValue: 'منصة روضة الحافظين' },
  { key: 'layout.collapse_expand', group: 'التنقل', label: 'تلميح طي: توسيع', defaultValue: 'توسيع القائمة' },
  { key: 'layout.collapse_collapse', group: 'التنقل', label: 'تلميح طي: طي', defaultValue: 'طي القائمة' },
  { key: 'layout.collapse_label', group: 'التنقل', label: 'نص زر طي القائمة', defaultValue: 'طي القائمة' },

  { key: 'landing.logo_alt', group: 'الصفحة العامة', label: 'وصف شعار الصفحة الرئيسية', defaultValue: 'شعار روضة الحافظين' },
  { key: 'landing.eyebrow', group: 'الصفحة العامة', label: 'سطر فوق العنوان', defaultValue: 'بجمع الشيخ يحيى بن عبد العزيز اليحيى' },
  { key: 'landing.hero_title', group: 'الصفحة العامة', label: 'عنوان البطل', defaultValue: SITE_NAME },
  {
    key: 'landing.subtitle',
    group: 'الصفحة العامة',
    label: 'وصف تحت العنوان',
    defaultValue: 'برنامج تحفيظ السنة النبوية — منصة ويب تدعم الهاتف والمتصفح',
  },
  { key: 'landing.cta', group: 'الصفحة العامة', label: 'زر الدعوة للإجراء', defaultValue: 'ابدأ رحلتك إلى هنا' },
  { key: 'landing.section_start_title', group: 'الصفحة العامة', label: 'عنوان قسم بداية الرحلة', defaultValue: 'بداية رحلتك' },
  {
    key: 'landing.section_start_p',
    group: 'الصفحة العامة',
    label: 'فقرة قسم بداية الرحلة',
    defaultValue: 'للمتابعة إلى المنصة وتسجيل الدخول عبر Google، اضغط الزر أعلاه أو من هنا.',
  },
  {
    key: 'landing.section_start_login_btn',
    group: 'الصفحة العامة',
    label: 'زر الانتقال لتسجيل الدخول',
    defaultValue: 'الانتقال إلى تسجيل الدخول',
  },
  { key: 'landing.section_start_foundation_link', group: 'الصفحة العامة', label: 'رابط أساس الواجهة', defaultValue: 'أساس الواجهة (للمطورين)' },
  { key: 'landing.footer_line', group: 'الصفحة العامة', label: 'سطر التذييل', defaultValue: SITE_TITLE },
  { key: 'landing.footer_kit_link', group: 'الصفحة العامة', label: 'رابط التذييل', defaultValue: 'دليل المكوّنات' },

  { key: 'program.intro.title', group: 'أقسام البرنامج', label: 'التعريف: العنوان', defaultValue: 'التعريف بالبرنامج' },
  {
    key: 'program.intro.lead',
    group: 'أقسام البرنامج',
    label: 'التعريف: النص',
    defaultValue:
      'برنامج تحفيظ السنة النبوية بجمع الشيخ يحيى بن عبد العزيز اليحيى هو برنامج علمي متكامل يُعنى بحفظ أحاديث السنة النبوية وفق منهجٍ متدرّج، يبدأ بأصح كتب السنة، ثم يتوسّع ليشمل بقية دواوين الحديث، مع اعتماد الجمع بين الروايات وحذف التكرار والأسانيد، ليكون الحافظ على صلةٍ مباشرة بأكبر قدر ممكن من كلام النبي ﷺ.',
  },
  { key: 'program.goals.title', group: 'أقسام البرنامج', label: 'الأهداف: العنوان', defaultValue: 'أهداف البرنامج' },
  {
    key: 'program.goals.list',
    group: 'أقسام البرنامج',
    label: 'الأهداف: قائمة (سطر لكل بند)',
    defaultValue: 'العناية بالسنة النبوية\nتمكين الطالب من حفظ أكبر قدر من الأحاديث الصحيحة',
  },
  { key: 'program.approach.title', group: 'أقسام البرنامج', label: 'المنهج: العنوان', defaultValue: 'منهج البرنامج' },
  {
    key: 'program.approach.p1',
    group: 'أقسام البرنامج',
    label: 'المنهج: فقرة ١',
    defaultValue:
      'يقوم البرنامج على: التدرّج العلمي من الأصح إلى ما دونه، وجمع الأحاديث دون تكرار قدر الإمكان، والتركيز على دواوين السنة المعتمدة.',
  },
  {
    key: 'program.approach.p2',
    group: 'أقسام البرنامج',
    label: 'المنهج: فقرة ٢',
    defaultValue: 'ويبدأ بـ: الجمع بين صحيح البخاري وصحيح مسلم، ثم الانتقال إلى الزوائد وبقية كتب السنة.',
  },
  { key: 'program.content.title', group: 'أقسام البرنامج', label: 'المحتوى: العنوان', defaultValue: 'محتوى البرنامج' },
  {
    key: 'program.content.list',
    group: 'أقسام البرنامج',
    label: 'المحتوى: قائمة (سطر لكل بند)',
    defaultValue:
      'الجمع بين الصحيحين (أربع مجلدات)\nمفردات البخاري\nمفردات مسلم\nزوائد أبي داود (مجلدان)\nزوائد الترمذي\nزوائد النسائي وابن ماجه والدارمي\nالمسانيد\nالصحاح والمعاجم',
  },
  { key: 'program.features.title', group: 'أقسام البرنامج', label: 'المميزات: العنوان', defaultValue: 'مميزات البرنامج' },
  {
    key: 'program.features.list',
    group: 'أقسام البرنامج',
    label: 'المميزات: قائمة',
    defaultValue:
      'الاعتماد على أصح مصادر السنة\nترتيب علمي متقن ومتدرّج مع حذف التكرار والأسانيد واعتماد الروايات الجامعة\nمناسب لجميع طلاب العلم',
  },
  { key: 'program.audience.title', group: 'أقسام البرنامج', label: 'الفئة: العنوان', defaultValue: 'الفئة المستهدفة' },
  {
    key: 'program.audience.list',
    group: 'أقسام البرنامج',
    label: 'الفئة: قائمة',
    defaultValue: 'طلاب وطالبات العلم الشرعي\nالراغبون في حفظ السنة النبوية',
  },
  { key: 'program.message.title', group: 'أقسام البرنامج', label: 'الرسالة: العنوان', defaultValue: 'رسالة البرنامج' },
  {
    key: 'program.message.lead',
    group: 'أقسام البرنامج',
    label: 'الرسالة: النص',
    defaultValue: 'الإسهام في تخريج جيلٍ مرتبطٍ بسنة النبي ﷺ.',
  },

  { key: 'app.home_greeting_fallback', group: 'التطبيق', label: 'الرئيسية: اسم افتراضي للزائر', defaultValue: 'ضيفنا الكريم' },
  { key: 'app.home_greeting_user_fallback', group: 'التطبيق', label: 'الرئيسية: مستخدم بدون اسم', defaultValue: 'مستخدم' },
  {
    key: 'app.home_lead_impersonate',
    group: 'التطبيق',
    label: 'الرئيسية: وصف عند العمل نيابة (استخدم {siteName})',
    defaultValue:
      '{siteName} — تعرض هذه الصفحة تقدّم المستخدم المحدد؛ التعديلات تُحفظ لحسابه وأنت ما زلت مسجّلاً كمشرف.',
  },
  {
    key: 'app.home_lead_normal',
    group: 'التطبيق',
    label: 'الرئيسية: وصف عادي (استخدم {siteName})',
    defaultValue: '{siteName} معك خطوة بخطوة — تابع خطتك اليوم، وسجّل وردك بضغطة واحدة.',
  },
  { key: 'app.home_cross_plans', group: 'التطبيق', label: 'الرئيسية: روابط سريعة — الخطط', defaultValue: 'الخطط' },
  { key: 'app.home_cross_halakat', group: 'التطبيق', label: 'الرئيسية: روابط سريعة — الحلقات', defaultValue: 'الحلقات' },
  { key: 'app.home_cross_dawrat', group: 'التطبيق', label: 'الرئيسية: روابط سريعة — الدورات', defaultValue: 'الدورات' },
  { key: 'app.home_cross_awrad', group: 'التطبيق', label: 'الرئيسية: روابط سريعة — الأوراد', defaultValue: 'كل الأوراد' },
  { key: 'app.home_cross_welcome', group: 'التطبيق', label: 'الرئيسية: روابط سريعة — البداية', defaultValue: 'البداية' },
  { key: 'app.home_cross_settings', group: 'التطبيق', label: 'الرئيسية: روابط سريعة — الإعدادات', defaultValue: 'الإعدادات' },
  { key: 'app.home_cross_users', group: 'التطبيق', label: 'الرئيسية: روابط سريعة — المستخدمون', defaultValue: 'المستخدمون' },
  { key: 'app.home_impersonation_users', group: 'التطبيق', label: 'الرئيسية: رابط المستخدمون (نيابة)', defaultValue: '← المستخدمون' },
  { key: 'app.home_impersonation_plans', group: 'التطبيق', label: 'الرئيسية: رابط خططه', defaultValue: 'خططه' },
  { key: 'app.home_impersonation_halakat', group: 'التطبيق', label: 'الرئيسية: رابط حلقاته', defaultValue: 'حلقاته' },
  { key: 'app.home_impersonation_dawrat', group: 'التطبيق', label: 'الرئيسية: رابط دوراته', defaultValue: 'دوراته' },
  { key: 'app.home_impersonation_awrad', group: 'التطبيق', label: 'الرئيسية: رابط أوراده', defaultValue: 'أوراده' },
  { key: 'app.home_impersonation_my_account', group: 'التطبيق', label: 'الرئيسية: رابط حسابي', defaultValue: 'حسابي' },
  { key: 'app.home_plan_now_you', group: 'التطبيق', label: 'الرئيسية: تسمية خطتك الآن', defaultValue: 'خطتك الآن' },
  { key: 'app.home_plan_now_other', group: 'التطبيق', label: 'الرئيسية: تسمية خطته الآن', defaultValue: 'خطته الآن' },
  { key: 'app.home_progress_label', group: 'التطبيق', label: 'الرئيسية: تسمية نسبة الإنجاز', defaultValue: 'إنجاز الخطة' },
  { key: 'app.home_menu_awrad_link', group: 'التطبيق', label: 'الرئيسية: رابط أوراد من القائمة', defaultValue: 'أوراد' },
]

/** خريطة المفتاح → القيمة الافتراضية */
export function buildDefaultStringsMap() {
  return Object.fromEntries(SITE_STRING_REGISTRY.map((e) => [e.key, e.defaultValue]))
}
