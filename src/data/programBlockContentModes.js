import {
  AlertTriangle,
  AlignLeft,
  BookMarked,
  CircleCheck,
  Info,
  LayoutGrid,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  ListTree,
  MessageSquareQuote,
  Quote,
  Sparkles,
  Star,
  Text,
} from 'lucide-react'

/** أنماط عرض محتوى بلوك صفحة البداية */
export const PROGRAM_BLOCK_CONTENT_MODES = [
  {
    value: 'lead',
    label: 'نص سردي بارز',
    hint: 'فقرة واحدة بخط أوضح (مثل التعريف بالبرنامج).',
    Icon: AlignLeft,
  },
  {
    value: 'text',
    label: 'نص عادي',
    hint: 'نص سردي بخط عادي — فقرة أو أكثر.',
    Icon: Text,
  },
  {
    value: 'paragraphs',
    label: 'فقرات متعددة',
    hint: 'اكتب كل فقرة في سطر مستقل.',
    Icon: AlignLeft,
  },
  {
    value: 'message',
    label: 'رسالة مميّزة',
    hint: 'نص قصير بأسلوب رسالة أو شعار.',
    Icon: MessageSquareQuote,
  },
  {
    value: 'quote',
    label: 'اقتباس',
    hint: 'نص اقتباس أو شهادة — يظهر داخل إطار اقتباس.',
    Icon: Quote,
  },
  {
    value: 'verse',
    label: 'نص مركزي',
    hint: 'آية، حديث، أو عبارة في منتصف القسم بخط مميّز.',
    Icon: BookMarked,
  },
  {
    value: 'callout',
    label: 'ملاحظة معلومات',
    hint: 'صندوق ملاحظة لفت انتباه القارئ.',
    Icon: Info,
  },
  {
    value: 'warning',
    label: 'تنبيه',
    hint: 'صندوق تحذير — للتنبيهات المهمة.',
    Icon: AlertTriangle,
  },
  {
    value: 'success',
    label: 'تأكيد / نجاح',
    hint: 'صندوق إيجابي — للنتائج أو التشجيع.',
    Icon: CircleCheck,
  },
  {
    value: 'list',
    label: 'قائمة نقاط',
    hint: 'اكتب كل بند في سطر مستقل.',
    Icon: List,
  },
  {
    value: 'numbered',
    label: 'قائمة مرقّمة',
    hint: 'خطوات أو بنود مرقّمة — سطر لكل بند.',
    Icon: ListOrdered,
  },
  {
    value: 'checklist',
    label: 'قائمة إنجاز',
    hint: 'بنود مع علامة ✓ — سطر لكل بند.',
    Icon: ListChecks,
  },
  {
    value: 'steps',
    label: 'خطوات متتابعة',
    hint: 'مراحل متسلسلة — سطر لكل خطوة.',
    Icon: ListOrdered,
  },
  {
    value: 'highlights',
    label: 'نقاط بارزة',
    hint: 'نقاط مميّزة بأيقونة نجمة — سطر لكل نقطة.',
    Icon: Star,
  },
  {
    value: 'definition',
    label: 'تعريفات',
    hint: 'كل سطر: «المصطلح: التعريف» أو «المصطلح | التعريف».',
    Icon: ListTree,
  },
  {
    value: 'links',
    label: 'قائمة روابط',
    hint: 'كل سطر: «العنوان | https://...» أو «العنوان - /مسار».',
    Icon: Link2,
  },
  {
    value: 'cards',
    label: 'بطاقات',
    hint: 'افصل بين البطاقات بسطر فارغ. السطر الأول عنوان البطاقة (أو ينتهي بـ :) والباقي محتواها.',
    Icon: LayoutGrid,
  },
  {
    value: 'badges',
    label: 'وسوم / كلمات مفتاحية',
    hint: 'اكتب كل وسم في سطر — تظهر كشرائط صغيرة.',
    Icon: Sparkles,
  },
]

const MODE_MAP = Object.fromEntries(PROGRAM_BLOCK_CONTENT_MODES.map((m) => [m.value, m]))

/** خيارات القائمة مع أيقونة لكل نوع */
export const PROGRAM_BLOCK_CONTENT_MODE_OPTIONS = PROGRAM_BLOCK_CONTENT_MODES.map(
  ({ value, label, hint, Icon }) => ({
    value,
    label,
    Icon,
    detail: hint,
    searchText: `${label} ${hint} ${value}`,
  }),
)

export function programBlockContentModeLabel(value) {
  return MODE_MAP[value]?.label || value
}

export function programBlockContentModeHint(value) {
  return MODE_MAP[value]?.hint || ''
}

export function resolveProgramBlockContentModeIcon(value) {
  return MODE_MAP[value]?.Icon || Text
}

export function findProgramBlockContentModeOption(value) {
  return PROGRAM_BLOCK_CONTENT_MODE_OPTIONS.find((o) => o.value === value) ?? null
}

export const PROGRAM_BLOCK_CONTENT_MODE_VALUES = new Set(
  PROGRAM_BLOCK_CONTENT_MODES.map((m) => m.value),
)
