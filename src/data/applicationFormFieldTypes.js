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
  { value: 'text', label: 'نص قصير', hint: 'سطر واحد — مثل الاسم أو المدينة.', Icon: TextCursorInput },
  { value: 'textarea', label: 'نص طويل', hint: 'فقرات متعددة لشرح أو تفاصيل.', Icon: Text },
  { value: 'email', label: 'بريد إلكتروني', hint: 'يمكن ربطه ببريد حساب الطالب (للقراءة فقط).', Icon: Mail },
  { value: 'number', label: 'رقم', hint: 'عدد صحيح — يمكن تحديد حد أدنى وأقصى.', Icon: Hash },
  { value: 'phone', label: 'هاتف مع مفتاح الدولة', hint: 'رقم وطني مع اختيار مفتاح الدولة.', Icon: Phone },
  { value: 'url', label: 'رابط إنترنت', hint: 'عنوان موقع أو رابط.', Icon: Link2 },
  { value: 'date', label: 'تاريخ', hint: 'تاريخ ميلادي من التقويم.', Icon: Calendar },
  { value: 'time', label: 'وقت', hint: 'ساعة ودقيقة.', Icon: Clock },
  { value: 'select', label: 'قائمة — اختيار واحد', hint: 'قائمة منسدلة — أضف الخيارات في محرر الحقل.', Icon: List },
  { value: 'multi_select', label: 'قائمة — اختيار متعدد', hint: 'يمكن للطالب اختيار أكثر من خيار.', Icon: ListChecks },
  { value: 'radio', label: 'أزرار اختيار (واحد فقط)', hint: 'خيارات ظاهرة كأزرار — واحد فقط.', Icon: CircleDot },
  { value: 'checkbox', label: 'موافقة / نعم-لا', hint: 'مربع واحد للموافقة أو التأكيد.', Icon: SquareCheck },
  { value: 'checkbox_group', label: 'مجموعة مربعات اختيار', hint: 'اختيار متعدد بمربعات منفصلة.', Icon: CheckSquare },
  { value: 'country', label: 'دولة / جنسية', hint: 'قائمة جاهزة بالدول العربية.', Icon: Globe },
  { value: 'country_dial', label: 'مفتاح هاتف دولي', hint: 'اختيار مفتاح الدولة فقط.', Icon: Phone },
  { value: 'gender', label: 'الجنس', hint: 'ذكر / أنثى.', Icon: Users },
  { value: 'quran_juz', label: 'أجزاء القرآن', hint: 'قائمة الأجزاء من 1 إلى 30.', Icon: BookOpen },
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
