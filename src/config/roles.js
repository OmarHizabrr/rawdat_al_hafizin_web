/** أدوار المستخدم في المنصة */
export const USER_ROLES = [
  { value: 'student', label: 'طالب' },
  { value: 'teacher', label: 'معلم' },
  { value: 'admin', label: 'ادمن' },
]

/** توحيد القيم القديمة (مثل user) مع الأدوار الحالية */
export function normalizeRole(role) {
  if (role === 'admin') return 'admin'
  if (role === 'teacher') return 'teacher'
  if (role === 'student') return 'student'
  if (role === 'user') return 'student'
  return 'student'
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === 'admin'
}

export function roleLabel(role) {
  const r = normalizeRole(role)
  return USER_ROLES.find((x) => x.value === r)?.label ?? r
}
