/**
 * هل يُحذف الكيان (خطة / حلقة / دورة) بالكامل عند مغادرة هذا المستخدم؟
 * فقط مالك المسجّل في المستند الرئيسي (ownerUid). المشرف (admin) يغادر مثل العضو.
 * إن لم يُخزَّن ownerUid (بيانات قديمة): يُعتمد دور member الفعلي === owner فقط.
 *
 * @param {string} userId
 * @param {unknown} ownerUid من المستند الرئيسي
 * @param {string} memberRole من members/{id}/members/{userId}
 * @param {{ OWNER: string }} roles كائن يحوي OWNER (مثل PLAN_MEMBER_ROLES)
 */
export function leavingUserDeletesWholeGroup(userId, ownerUid, memberRole, roles) {
  if (!userId || !roles?.OWNER) return false
  const ou = ownerUid != null && String(ownerUid).trim() !== '' ? String(ownerUid).trim() : ''
  if (ou) return userId === ou
  return memberRole === roles.OWNER
}
