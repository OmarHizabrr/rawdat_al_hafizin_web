/** حقول النظام القديمة — للربط مع التقارير والتصدير دون مصطلحات تقنية */
export const APPLICATION_FORM_LEGACY_KEY_OPTIONS = [
  { value: '', label: 'لا ربط — حقل جديد مستقل' },
  { value: 'fullName', label: 'الاسم الرباعي' },
  { value: 'phone', label: 'رقم الهاتف' },
  { value: 'nationality', label: 'الجنسية' },
  { value: 'permanentResidence', label: 'مكان الإقامة الدائم' },
  { value: 'city', label: 'المحافظة أو المدينة' },
  { value: 'age', label: 'العمر' },
  { value: 'email', label: 'البريد الإلكتروني' },
  { value: 'gender', label: 'الجنس' },
  { value: 'educationLevel', label: 'المستوى التعليمي' },
  { value: 'occupation', label: 'الوظيفة' },
  { value: 'quranMemorizedJuz', label: 'مقدار حفظ القرآن (أجزاء)' },
]

export function applicationFormLegacyKeyLabel(value) {
  return APPLICATION_FORM_LEGACY_KEY_OPTIONS.find((o) => o.value === value)?.label || ''
}
