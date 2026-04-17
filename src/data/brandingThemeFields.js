/**
 * متغيرات CSS قابلة للتعديل من «هوية الموقع».
 * القيم الفارغة في Firestore تعني الاعتماد على `tokens.css`.
 */
export const BRANDING_THEME_GROUPS = [
  {
    id: 'core',
    label: 'الألوان الأساسية',
    vars: [
      { name: '--rh-primary', label: 'لون أساسي' },
      { name: '--rh-primary-hover', label: 'أساسي عند المرور' },
      { name: '--rh-primary-muted', label: 'أساسي خافت (شفافية فوق الخلفية)', useColorPicker: false },
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
    label: 'النصوص',
    vars: [
      { name: '--rh-text', label: 'نص رئيسي' },
      { name: '--rh-text-muted', label: 'نص ثانوي' },
      { name: '--rh-text-placeholder', label: 'نص توضيحي داخل الحقول' },
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
      { name: '--rh-success-bg', label: 'خلفية نجاح' },
      { name: '--rh-warning', label: 'تحذير' },
      { name: '--rh-warning-bg', label: 'خلفية تحذير' },
      { name: '--rh-danger', label: 'خطر' },
      { name: '--rh-danger-bg', label: 'خلفية خطر' },
      { name: '--rh-info', label: 'معلومة' },
      { name: '--rh-info-bg', label: 'خلفية معلومة' },
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
