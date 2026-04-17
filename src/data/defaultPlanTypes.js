/** أنواع الخطط الافتراضية عندما تكون مجموعة Firestore `plan_types` فارغة. */
export const DEFAULT_PLAN_TYPES = [
  {
    value: 'hifz',
    label: 'حفظ',
    hint: 'حفظ متون الأحاديث وفق المجلدات المختارة',
    order: 0,
  },
  {
    value: 'murajaah',
    label: 'مراجعة',
    hint: 'تثبيت ما سبق حفظه أو مراجعة سريعة',
    order: 1,
  },
  {
    value: 'qiraah',
    label: 'قراءة',
    hint: 'قراءة مطالعة دون اشتراط الحفظ',
    order: 2,
  },
]
