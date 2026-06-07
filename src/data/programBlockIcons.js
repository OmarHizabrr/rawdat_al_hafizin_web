import {
  Award,
  BookOpen,
  BookOpenText,
  Circle,
  Compass,
  GraduationCap,
  Heart,
  Info,
  LibraryBig,
  Lightbulb,
  MessageCircle,
  ScrollText,
  Sparkles,
  Sprout,
  Star,
  Target,
  Users,
} from 'lucide-react'

/** أيقونات متاحة لأقسام صفحة البداية / البرنامج */
export const PROGRAM_BLOCK_ICON_OPTIONS = [
  { value: 'BookOpenText', label: 'كتاب مفتوح' },
  { value: 'Target', label: 'هدف' },
  { value: 'Compass', label: 'بوصلة / منهج' },
  { value: 'LibraryBig', label: 'مكتبة' },
  { value: 'Sparkles', label: 'مميزات' },
  { value: 'Users', label: 'مستخدمون' },
  { value: 'Sprout', label: 'رسالة / نمو' },
  { value: 'BookOpen', label: 'كتاب' },
  { value: 'GraduationCap', label: 'تخرّج' },
  { value: 'ScrollText', label: 'مخطوطة' },
  { value: 'Lightbulb', label: 'فكرة' },
  { value: 'Heart', label: 'قلب' },
  { value: 'Star', label: 'نجمة' },
  { value: 'Award', label: 'جائزة' },
  { value: 'MessageCircle', label: 'رسالة' },
  { value: 'Info', label: 'معلومة' },
]

const ICON_MAP = {
  BookOpenText,
  Target,
  Compass,
  LibraryBig,
  Sparkles,
  Users,
  Sprout,
  BookOpen,
  GraduationCap,
  ScrollText,
  Lightbulb,
  Heart,
  Star,
  Award,
  MessageCircle,
  Info,
}

export function resolveProgramBlockIcon(name) {
  const key = String(name || '').trim()
  return ICON_MAP[key] || Circle
}
