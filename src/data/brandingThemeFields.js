/**
 * متغيرات CSS قابلة للتعديل من «هوية الموقع».
 * القيم الفارغة في Firestore تعني الاعتماد على `tokens.css`.
 */
export const BRANDING_THEME_GROUP_HINTS = {
  core: 'اللون الرئيسي للموقع',
  surfaces: 'خلفيات البطاقات والصفحات',
  text: 'العناوين، الفقرات، الروابط',
  buttons: 'جميع أزرار المنصة',
  nav: 'القائمة الجانبية والأيقونات',
  hero: 'الصفحة العامة للزوار',
  semantic: 'رسائل النجاح والتحذير',
}

export const BRANDING_THEME_GROUPS = [
  {
    id: 'core',
    label: 'الألوان الأساسية',
    vars: [
      { name: '--rh-primary', label: 'لون أساسي' },
      { name: '--rh-primary-hover', label: 'أساسي عند المرور' },
      { name: '--rh-primary-muted', label: 'لمسة خفيفة من اللون الأساسي (شفاف)', pickerMode: 'alpha' },
      { name: '--rh-on-primary', label: 'نص فوق الأساسي' },
      { name: '--rh-accent', label: 'تمييز / ذهبي' },
    ],
  },
  {
    id: 'surfaces',
    label: 'الخلفيات والأسطح',
    vars: [
      { name: '--rh-bg', label: 'خلفية الصفحة' },
      { name: '--rh-surface', label: 'سطح البطاقات' },
      { name: '--rh-surface-elevated', label: 'سطح مرتفع' },
      { name: '--rh-surface-tint', label: 'لمسات سطحية' },
      { name: '--rh-border', label: 'حدود' },
      { name: '--rh-border-strong', label: 'حدود أوضح' },
    ],
  },
  {
    id: 'text',
    label: 'النصوص والعناوين والروابط',
    vars: [
      { name: '--rh-text', label: 'نص رئيسي (فقرات وجسم الصفحة)' },
      { name: '--rh-text-heading', label: 'عناوين الصفحات والحقول' },
      { name: '--rh-text-muted', label: 'نص ثانوي وتلميحات' },
      { name: '--rh-text-placeholder', label: 'نص توضيحي داخل الحقول' },
      { name: '--rh-text-link', label: 'روابط داخل النص' },
      { name: '--rh-text-link-hover', label: 'روابط — عند المرور' },
    ],
  },
  {
    id: 'buttons',
    label: 'الأزرار',
    vars: [
      { name: '--rh-btn-primary-bg', label: 'زر أساسي — خلفية' },
      { name: '--rh-btn-primary-bg-hover', label: 'زر أساسي — خلفية عند المرور' },
      { name: '--rh-btn-primary-text', label: 'زر أساسي — نص وأيقونة' },
      { name: '--rh-btn-secondary-bg', label: 'زر ثانوي — خلفية' },
      { name: '--rh-btn-secondary-text', label: 'زر ثانوي — نص وأيقونة' },
      { name: '--rh-btn-secondary-border', label: 'زر ثانوي — حد' },
      { name: '--rh-btn-ghost-text', label: 'زر شفاف — نص وأيقونة' },
      { name: '--rh-btn-danger-bg', label: 'زر خطر — خلفية' },
      { name: '--rh-btn-danger-text', label: 'زر خطر — نص وأيقونة' },
    ],
  },
  {
    id: 'nav',
    label: 'القائمة الجانبية والأيقونات مع النص',
    vars: [
      { name: '--rh-nav-text', label: 'عنصر عادي — نص وأيقونة' },
      { name: '--rh-nav-text-hover', label: 'عند المرور — نص وأيقونة' },
      { name: '--rh-nav-active-text', label: 'الصفحة الحالية — نص وأيقونة' },
      { name: '--rh-nav-hover-bg', label: 'خلفية عند المرور (شفاف)', pickerMode: 'alpha' },
      { name: '--rh-nav-active-bg', label: 'خلفية الصفحة الحالية (شفاف)', pickerMode: 'alpha' },
    ],
  },
  {
    id: 'hero',
    label: 'تدرّج الصفحة العامة (hero)',
    vars: [
      { name: '--rh-forest-900', label: 'تدرّج — غامق' },
      { name: '--rh-forest-800', label: 'تدرّج — أوسط' },
      { name: '--rh-forest-600', label: 'تدرّج — فاتح' },
    ],
  },
  {
    id: 'semantic',
    label: 'حالات (نجاح / تحذير / خطر)',
    vars: [
      { name: '--rh-success', label: 'نجاح' },
      { name: '--rh-success-bg', label: 'خلفية نجاح', pickerMode: 'alpha' },
      { name: '--rh-warning', label: 'تحذير' },
      { name: '--rh-warning-bg', label: 'خلفية تحذير', pickerMode: 'alpha' },
      { name: '--rh-danger', label: 'خطر' },
      { name: '--rh-danger-bg', label: 'خلفية خطر', pickerMode: 'alpha' },
      { name: '--rh-info', label: 'معلومة' },
      { name: '--rh-info-bg', label: 'خلفية معلومة', pickerMode: 'alpha' },
    ],
  },
]

/** كل أسماء المتغيرات (للتنظيف عند إزالة التجاوزات) */
export function collectAllBrandingThemeVarNames() {
  const s = new Set()
  for (const g of BRANDING_THEME_GROUPS) {
    for (const v of g.vars) s.add(v.name)
  }
  return [...s]
}
