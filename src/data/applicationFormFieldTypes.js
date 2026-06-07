import {
  Calendar,
  CheckSquare,
  CircleDot,
  Hash,
  Link2,
  List,
  ListChecks,
  Mail,
  Phone,
  SquareCheck,
  Text,
  TextCursorInput,
  ToggleLeft,
  Users,
  BookOpen,
  Clock,
  Globe,
} from 'lucide-react'

/** أنواع حقول استمارة طلب الالتحاق */
export const APPLICATION_FORM_FIELD_TYPES = [
  { value: 'text', label: 'نص قصير', hint: 'سطر واحد — اسم، مدينة…', Icon: TextCursorInput },
  { value: 'textarea', label: 'نص طويل', hint: 'فقرات متعددة.', Icon: Text },
  { value: 'email', label: 'بريد إلكتروني', hint: 'يمكن ربطه ببريد حساب المستخدم (للقراءة فقط).', Icon: Mail },
  { value: 'number', label: 'رقم', hint: 'عدد صحيح مع حد أدنى/أقصى اختياري.', Icon: Hash },
  { value: 'phone', label: 'هاتف + مفتاح دولة', hint: 'رقم وطني مع اختيار مفتاح الدولة.', Icon: Phone },
  { value: 'url', label: 'رابط', hint: 'عنوان URL.', Icon: Link2 },
  { value: 'date', label: 'تاريخ', hint: 'تاريخ (ميلادي).', Icon: Calendar },
  { value: 'time', label: 'وقت', hint: 'ساعة ودقيقة.', Icon: Clock },
  { value: 'select', label: 'قائمة اختيار (واحد)', hint: 'خيارات منسدلة — سطر لكل خيار: value|التسمية', Icon: List },
  { value: 'multi_select', label: 'قائمة اختيار (متعدد)', hint: 'اختيار أكثر من خيار.', Icon: ListChecks },
  { value: 'radio', label: 'اختيار واحد (راديو)', hint: 'أزرار راديو — سطر لكل خيار.', Icon: CircleDot },
  { value: 'checkbox', label: 'موافقة / نعم-لا', hint: 'مربع واحد (صح/خطأ).', Icon: SquareCheck },
  { value: 'checkbox_group', label: 'مجموعة مربعات', hint: 'اختيار متعدد بمربعات.', Icon: CheckSquare },
  { value: 'country', label: 'دولة / جنسية', hint: 'قائمة الدول العربية.', Icon: Globe },
  { value: 'country_dial', label: 'مفتاح دولة', hint: 'مفتاح الهاتف الدولي فقط.', Icon: Phone },
  { value: 'gender', label: 'الجنس', hint: 'ذكر / أنثى — يُحدَّث في ملف المستخدم عند القبول.', Icon: Users },
  { value: 'quran_juz', label: 'أجزاء القرآن', hint: 'قائمة الأجزاء 1–30.', Icon: BookOpen },
  { value: 'toggle', label: 'مفتاح تشغيل', hint: 'نعم / لا بشكل مفتاح.', Icon: ToggleLeft },
]

const TYPE_MAP = Object.fromEntries(APPLICATION_FORM_FIELD_TYPES.map((t) => [t.value, t]))

export const APPLICATION_FORM_FIELD_TYPE_VALUES = new Set(APPLICATION_FORM_FIELD_TYPES.map((t) => t.value))

export const APPLICATION_FORM_FIELD_TYPE_OPTIONS = APPLICATION_FORM_FIELD_TYPES.map(
  ({ value, label, hint, Icon }) => ({
    value,
    label,
    Icon,
    detail: hint,
    searchText: `${label} ${hint} ${value}`,
  }),
)

export function applicationFormFieldTypeLabel(value) {
  return TYPE_MAP[value]?.label || value
}

export function applicationFormFieldTypeHint(value) {
  return TYPE_MAP[value]?.hint || ''
}

export function resolveApplicationFormFieldTypeIcon(value) {
  return TYPE_MAP[value]?.Icon || TextCursorInput
}
