/** أقسام الواجبات الافتراضية عندما تكون مجموعة Firestore `task_categories` فارغة. */
export const DEFAULT_TASK_CATEGORIES = [
  { value: 'samaa', label: 'سماع', hint: 'الاستماع للتلاوة أو الشرح', order: 0 },
  { value: 'hifz', label: 'حفظ', hint: 'حفظ الورد أو المتن المطلوب', order: 1 },
  { value: 'takrar', label: 'تكرار', hint: 'تكرار ما سبق حفظه', order: 2 },
  { value: 'rabt', label: 'ربط', hint: 'ربط الحفظ الجديد بالقديم', order: 3 },
]
