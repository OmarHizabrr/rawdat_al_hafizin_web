import { firestoreApi } from '../services/firestoreApi.js'
import { leavingUserDeletesWholeGroup } from './groupMembership.js'
import { normalizePlanCalendarDays } from './hijriDates.js'

/** أدوار عضو الخطة (مطابقة لحقل role في members/{planId}/members/{uid}) */
export const PLAN_MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
}

function userMirrorsCol(userId) {
  return firestoreApi.getUserPlansCollection(userId)
}

function mirrorDoc(userId, planId) {
  return firestoreApi.getUserPlanDoc(userId, planId)
}

function canonicalRef(planId) {
  return firestoreApi.getPlanCanonicalDoc(planId)
}

function memberRef(planId, userId) {
  return firestoreApi.getPlanMemberDoc(planId, userId)
}

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

/** يزيل حقول الواجهة قبل الكتابة في plans/{planId} */
function canonicalPayload(plan) {
  const rest = { ...plan }
  delete rest.id
  delete rest.planRole
  delete rest.memberCount
  return rest
}

/** يحدّث memberCount من عدد مستندات members/{planId}/members */
async function syncPlanMemberCount(planId) {
  if (!planId) return
  const ref = canonicalRef(planId)
  const canon = await firestoreApi.getData(ref)
  if (!canon) return
  const n = await firestoreApi.getSubCollectionCount('members', planId, 'members')
  await firestoreApi.updateData({
    docRef: ref,
    data: { memberCount: n },
    userData: {},
  })
}

async function mergeMirrorDocs(mirrorDocs) {
  const out = []
  for (const d of mirrorDocs) {
    const planId = d.id
    const mirrorData = d.data() || {}
    const role = mirrorData.role || PLAN_MEMBER_ROLES.MEMBER
    const canonical = await firestoreApi.getData(canonicalRef(planId))
    if (!canonical) continue
    out.push(
      normalizePlanCalendarDays({
        id: planId,
        ...canonical,
        planRole: role,
      }),
    )
  }
  return out.sort(
    (a, b) =>
      timestampMs(b.updatedAt) - timestampMs(a.updatedAt) ||
      timestampMs(b.createdAt) - timestampMs(a.createdAt),
  )
}

export async function loadPlans(userId) {
  if (!userId) return []
  const mirrorDocs = await firestoreApi.getDocuments(userMirrorsCol(userId))
  return mergeMirrorDocs(mirrorDocs)
}

export function subscribePlans(userId, onNext, onError) {
  if (!userId) return () => {}
  return firestoreApi.subscribeSnapshot(
    userMirrorsCol(userId),
    (snapshot) => {
      ;(async () => {
        try {
          const merged = await mergeMirrorDocs(snapshot.docs)
          onNext(merged)
        } catch (e) {
          onError?.(e)
        }
      })()
    },
    onError,
  )
}

/**
 * حذف الخطة بالكامل: members + مرايا Myplans + plans/{planId}
 */
export async function deletePlanFully(planId) {
  if (!planId) return
  const memCol = firestoreApi.getPlanMembersCollection(planId)
  const memberDocs = await firestoreApi.getDocuments(memCol)
  for (const md of memberDocs) {
    const uid = md.id
    await firestoreApi.deleteData(mirrorDoc(uid, planId))
    await firestoreApi.deleteData(md.ref)
  }
  await firestoreApi.deleteData(canonicalRef(planId))
}

/**
 * إزالة خطة من المستخدم: الحذف الكامل فقط لمالك الخطة (ownerUid). المشرف والعضو يغادرون فقط.
 * @returns {'deletedFully' | 'left' | 'noop'}
 */
export async function removePlanForUser(userId, planId) {
  if (!userId || !planId) return 'noop'
  const canon = await firestoreApi.getData(canonicalRef(planId))
  if (!canon) return 'noop'
  const memSnap = await firestoreApi.getData(memberRef(planId, userId))
  const role = memSnap?.role || PLAN_MEMBER_ROLES.MEMBER
  if (leavingUserDeletesWholeGroup(userId, canon.ownerUid, role, PLAN_MEMBER_ROLES)) {
    await deletePlanFully(planId)
    return 'deletedFully'
  }
  if (!memSnap) return 'noop'
  await firestoreApi.deleteData(memberRef(planId, userId))
  await firestoreApi.deleteData(mirrorDoc(userId, planId))
  await syncPlanMemberCount(planId)
  return 'left'
}

async function assertPlanManager(actorUid, planId) {
  const mem = await firestoreApi.getData(memberRef(planId, actorUid))
  const r = mem?.role
  if (r === PLAN_MEMBER_ROLES.OWNER || r === PLAN_MEMBER_ROLES.ADMIN) return
  throw new Error('PLAN_FORBIDDEN')
}

/**
 * حفظ قائمة الخطط: يحدّث المستند الرئيسي فقط لمن له دور owner أو admin؛ لا يحذف خططاً ناقصة من القائمة.
 */
export async function savePlans(userId, plans, userData = {}) {
  if (!userId) return
  for (const plan of plans) {
    if (!plan?.id) continue
    await upsertPlanForUser(userId, plan, userData)
  }
}

async function upsertPlanForUser(userId, plan, userData) {
  const planId = plan.id
  const canonRef = canonicalRef(planId)
  const existingCanon = await firestoreApi.getData(canonRef)
  const mem = await firestoreApi.getData(memberRef(planId, userId))
  const role = mem?.role ?? (existingCanon ? null : PLAN_MEMBER_ROLES.OWNER)
  const payload = canonicalPayload(plan)

  if (!existingCanon) {
    const data = {
      ...payload,
      ownerUid: userId,
      planVisibility: plan.planVisibility === 'public' ? 'public' : 'private',
    }
    await firestoreApi.setData({
      docRef: canonRef,
      data,
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: memberRef(planId, userId),
      data: { role: PLAN_MEMBER_ROLES.OWNER },
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: mirrorDoc(userId, planId),
      data: {
        role: PLAN_MEMBER_ROLES.OWNER,
        joinedAt: new Date().toISOString(),
      },
      merge: true,
      userData,
    })
    await syncPlanMemberCount(planId)
    return
  }

  if (role !== PLAN_MEMBER_ROLES.OWNER && role !== PLAN_MEMBER_ROLES.ADMIN) {
    return
  }

  await firestoreApi.updateData({
    docRef: canonRef,
    data: payload,
    userData,
  })
}

export async function loadPlanMembers(planId) {
  if (!planId) return []
  const docs = await firestoreApi.getDocuments(firestoreApi.getPlanMembersCollection(planId))
  return docs.map((d) => ({ userId: d.id, ...d.data() }))
}

/** أعضاء الخطة مع دمج بيانات الملف من users/{userId} للعرض في البطاقات */
export async function loadPlanMembersWithProfiles(planId) {
  const rows = await loadPlanMembers(planId)
  return Promise.all(
    rows.map(async (row) => {
      const profile = await firestoreApi.getData(firestoreApi.getUserDoc(row.userId))
      const pr = profile || {}
      return {
        ...row,
        displayName: pr.displayName?.trim() || pr.createdByName || row.userId,
        email: (pr.email || '').toString(),
        photoURL: pr.photoURL || pr.createdByImageUrl || '',
      }
    }),
  )
}

/** يضيف مستخدماً إلى خطة (عامة أو يدعوه مدير/مالك) */
export async function addUserToPlan(actorUser, planId, targetUid, userData = {}) {
  if (!actorUser?.uid || !planId || !targetUid) return
  const canon = await firestoreApi.getData(canonicalRef(planId))
  if (!canon) throw new Error('PLAN_NOT_FOUND')
  const actorMem = await firestoreApi.getData(memberRef(planId, actorUser.uid))
  const isManager =
    actorMem?.role === PLAN_MEMBER_ROLES.OWNER || actorMem?.role === PLAN_MEMBER_ROLES.ADMIN
  const isPublic = canon.planVisibility === 'public'
  const selfJoinPublic = isPublic && actorUser.uid === targetUid
  if (!isManager && !selfJoinPublic) throw new Error('PLAN_FORBIDDEN')
  const existing = await firestoreApi.getData(memberRef(planId, targetUid))
  if (existing) throw new Error('ALREADY_MEMBER')
  await firestoreApi.setData({
    docRef: memberRef(planId, targetUid),
    data: { role: PLAN_MEMBER_ROLES.MEMBER },
    merge: true,
    userData,
  })
  await firestoreApi.setData({
    docRef: mirrorDoc(targetUid, planId),
    data: {
      role: PLAN_MEMBER_ROLES.MEMBER,
      joinedAt: new Date().toISOString(),
    },
    merge: true,
    userData,
  })
  await syncPlanMemberCount(planId)
}

/** انضمام ذاتي لخطة عامة */
export async function joinPublicPlan(userId, planId, userData = {}) {
  if (!userId || !planId) return
  const canon = await firestoreApi.getData(canonicalRef(planId))
  if (!canon) throw new Error('PLAN_NOT_FOUND')
  if (canon.planVisibility !== 'public') throw new Error('PLAN_NOT_PUBLIC')
  await addUserToPlan({ uid: userId }, planId, userId, userData)
}

export async function removePlanMember(actorUser, planId, targetUid) {
  if (!actorUser?.uid || !planId || !targetUid) return
  await assertPlanManager(actorUser.uid, planId)
  const canon = await firestoreApi.getData(canonicalRef(planId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(planId, targetUid))
  if (!targetMem) return
  if (targetUid === ownerUid && targetMem.role === PLAN_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_REMOVE_OWNER')
  }
  await firestoreApi.deleteData(memberRef(planId, targetUid))
  await firestoreApi.deleteData(mirrorDoc(targetUid, planId))
  await syncPlanMemberCount(planId)
}

export async function setPlanMemberRole(actorUser, planId, targetUid, nextRole, userData = {}) {
  if (!actorUser?.uid || !planId || !targetUid) return
  if (nextRole !== PLAN_MEMBER_ROLES.ADMIN && nextRole !== PLAN_MEMBER_ROLES.MEMBER) {
    throw new Error('INVALID_ROLE')
  }
  await assertPlanManager(actorUser.uid, planId)
  const canon = await firestoreApi.getData(canonicalRef(planId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(planId, targetUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  if (targetUid === ownerUid && targetMem.role === PLAN_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_DEMOTE_OWNER')
  }
  await firestoreApi.updateData({
    docRef: memberRef(planId, targetUid),
    data: { role: nextRole },
    userData,
  })
  await firestoreApi.updateData({
    docRef: mirrorDoc(targetUid, planId),
    data: { role: nextRole },
    userData,
  })
}
