import { firestoreApi } from '../services/firestoreApi.js'
import { leavingUserDeletesWholeGroup } from './groupMembership.js'
import {
  HALAKA_MEMBER_ROLES,
  assertCanAssignRole,
  canManageRole,
  normalizeHalakaRole,
} from './halakatStorage.js'

function userMirrorsCol(userId) {
  return firestoreApi.getUserActivitiesCollection(userId)
}

function mirrorDoc(userId, activityId) {
  return firestoreApi.getUserActivityDoc(userId, activityId)
}

function canonicalRef(activityId) {
  return firestoreApi.getActivityCanonicalDoc(activityId)
}

function memberRef(activityId, userId) {
  return firestoreApi.getPlanMemberDoc(activityId, userId)
}

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function canonicalPayload(row) {
  const rest = { ...row }
  delete rest.id
  delete rest.activityRole
  delete rest.memberCount
  return rest
}

async function syncActivityMemberCount(activityId) {
  if (!activityId) return
  const ref = canonicalRef(activityId)
  const canon = await firestoreApi.getData(ref)
  if (!canon) return
  const n = await firestoreApi.getSubCollectionCount('members', activityId, 'members')
  await firestoreApi.updateData({
    docRef: ref,
    data: { memberCount: n },
    userData: {},
  })
}

async function mergeMirrorDocs(mirrorDocs) {
  const out = []
  for (const d of mirrorDocs) {
    const activityId = d.id
    const mirrorData = d.data() || {}
    const role = normalizeHalakaRole(mirrorData.role)
    const canonical = await firestoreApi.getData(canonicalRef(activityId))
    if (!canonical) continue
    out.push({
      id: activityId,
      ...canonical,
      activityRole: role,
    })
  }
  return out.sort(
    (a, b) =>
      timestampMs(b.updatedAt ?? b.updatedTimes) - timestampMs(a.updatedAt ?? a.updatedTimes) ||
      timestampMs(b.createdAt ?? b.createTimes) - timestampMs(a.createdAt ?? a.createTimes),
  )
}

export async function loadActivities(userId) {
  if (!userId) return []
  const mirrorDocs = await firestoreApi.getDocuments(userMirrorsCol(userId))
  return mergeMirrorDocs(mirrorDocs)
}

export function subscribeActivities(userId, onNext, onError) {
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

export async function deleteActivityFully(activityId) {
  if (!activityId) return
  const memCol = firestoreApi.getPlanMembersCollection(activityId)
  const memberDocs = await firestoreApi.getDocuments(memCol)
  for (const md of memberDocs) {
    const uid = md.id
    await firestoreApi.deleteData(mirrorDoc(uid, activityId))
    await firestoreApi.deleteData(md.ref)
  }
  await firestoreApi.deleteData(canonicalRef(activityId))
}

/** @returns {'deletedFully' | 'left' | 'noop'} */
export async function removeActivityForUser(userId, activityId) {
  if (!userId || !activityId) return 'noop'
  const canon = await firestoreApi.getData(canonicalRef(activityId))
  if (!canon) return 'noop'
  const memSnap = await firestoreApi.getData(memberRef(activityId, userId))
  const role = normalizeHalakaRole(memSnap?.role)
  if (leavingUserDeletesWholeGroup(userId, canon.ownerUid, role, HALAKA_MEMBER_ROLES)) {
    await deleteActivityFully(activityId)
    return 'deletedFully'
  }
  if (!memSnap) return 'noop'
  await firestoreApi.deleteData(memberRef(activityId, userId))
  await firestoreApi.deleteData(mirrorDoc(userId, activityId))
  await syncActivityMemberCount(activityId)
  return 'left'
}

export async function saveActivities(userId, rows, userData = {}) {
  if (!userId) return
  const list = Array.isArray(rows) ? rows : [rows]
  for (const act of list) {
    if (!act?.id) continue
    await upsertActivityForUser(userId, act, userData)
  }
}

async function upsertActivityForUser(userId, activity, userData) {
  const activityId = activity.id
  const canonRef = canonicalRef(activityId)
  const existingCanon = await firestoreApi.getData(canonRef)
  const mem = await firestoreApi.getData(memberRef(activityId, userId))
  const role = mem?.role ?? (existingCanon ? null : HALAKA_MEMBER_ROLES.OWNER)
  const payload = canonicalPayload(activity)

  if (!existingCanon) {
    const name =
      String(payload.name ?? activity.name ?? '').trim() || `نشاط ${new Date().toLocaleDateString('ar-SA')}`
    const data = {
      ...payload,
      name,
      description: String(payload.description ?? activity.description ?? '').trim(),
      activityVisibility: activity.activityVisibility === 'public' ? 'public' : 'private',
      activityKind: String(payload.activityKind ?? activity.activityKind ?? 'other').trim() || 'other',
      activityFormat: ['online', 'onsite', 'hybrid'].includes(payload.activityFormat ?? activity.activityFormat)
        ? payload.activityFormat ?? activity.activityFormat
        : 'onsite',
      startAt: String(payload.startAt ?? activity.startAt ?? '').trim(),
      endAt: String(payload.endAt ?? activity.endAt ?? '').trim(),
      location: String(payload.location ?? activity.location ?? '').trim(),
      registrationDeadline: String(
        payload.registrationDeadline ?? activity.registrationDeadline ?? '',
      ).trim(),
      maxParticipants:
        payload.maxParticipants != null && payload.maxParticipants !== ''
          ? Math.max(0, Math.floor(Number(payload.maxParticipants)))
          : null,
      targetAudience: String(payload.targetAudience ?? activity.targetAudience ?? 'students').trim() || 'students',
      feeInfo: String(payload.feeInfo ?? activity.feeInfo ?? '').trim(),
      requirements: String(payload.requirements ?? activity.requirements ?? '').trim(),
      contactName: String(payload.contactName ?? activity.contactName ?? '').trim(),
      contactPhone: String(payload.contactPhone ?? activity.contactPhone ?? '').trim(),
      ownerUid: userId,
    }
    await firestoreApi.setData({
      docRef: canonRef,
      data,
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: memberRef(activityId, userId),
      data: { role: HALAKA_MEMBER_ROLES.OWNER },
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: mirrorDoc(userId, activityId),
      data: {
        role: HALAKA_MEMBER_ROLES.OWNER,
        joinedAt: new Date().toISOString(),
      },
      merge: true,
      userData,
    })
    await syncActivityMemberCount(activityId)
    return
  }

  if (role !== HALAKA_MEMBER_ROLES.OWNER && role !== HALAKA_MEMBER_ROLES.SUPERVISOR) {
    return
  }

  const data = {
    ...payload,
    name: String(payload.name ?? existingCanon.name ?? '').trim() || existingCanon.name,
    description: String(payload.description ?? existingCanon.description ?? '').trim(),
    activityVisibility: activity.activityVisibility === 'public' ? 'public' : 'private',
    activityKind: String(payload.activityKind ?? activity.activityKind ?? 'other').trim() || 'other',
    activityFormat: ['online', 'onsite', 'hybrid'].includes(payload.activityFormat ?? activity.activityFormat)
      ? payload.activityFormat ?? activity.activityFormat
      : existingCanon.activityFormat || 'onsite',
    startAt: String(payload.startAt ?? activity.startAt ?? existingCanon.startAt ?? '').trim(),
    endAt: String(payload.endAt ?? activity.endAt ?? existingCanon.endAt ?? '').trim(),
    location: String(payload.location ?? activity.location ?? existingCanon.location ?? '').trim(),
    registrationDeadline: String(
      payload.registrationDeadline ?? activity.registrationDeadline ?? existingCanon.registrationDeadline ?? '',
    ).trim(),
    maxParticipants:
      payload.maxParticipants != null && payload.maxParticipants !== ''
        ? Math.max(0, Math.floor(Number(payload.maxParticipants)))
        : null,
    targetAudience:
      String(payload.targetAudience ?? activity.targetAudience ?? existingCanon.targetAudience ?? 'students').trim() ||
      'students',
    feeInfo: String(payload.feeInfo ?? activity.feeInfo ?? existingCanon.feeInfo ?? '').trim(),
    requirements: String(payload.requirements ?? activity.requirements ?? existingCanon.requirements ?? '').trim(),
    contactName: String(payload.contactName ?? activity.contactName ?? existingCanon.contactName ?? '').trim(),
    contactPhone: String(payload.contactPhone ?? activity.contactPhone ?? existingCanon.contactPhone ?? '').trim(),
  }

  await firestoreApi.updateData({
    docRef: canonRef,
    data,
    userData,
  })
}

async function assertActivityManager(actorUid, activityId) {
  const mem = await firestoreApi.getData(memberRef(activityId, actorUid))
  const r = normalizeHalakaRole(mem?.role)
  if (
    r === HALAKA_MEMBER_ROLES.OWNER ||
    r === HALAKA_MEMBER_ROLES.SUPERVISOR ||
    r === HALAKA_MEMBER_ROLES.TEACHER
  ) {
    return r
  }
  throw new Error('ACTIVITY_FORBIDDEN')
}

export async function loadActivityMembers(activityId) {
  if (!activityId) return []
  const docs = await firestoreApi.getDocuments(firestoreApi.getPlanMembersCollection(activityId))
  return docs.map((d) => {
    const data = d.data() || {}
    return {
      userId: d.id,
      ...data,
      role: normalizeHalakaRole(data.role),
    }
  })
}

export async function loadActivityMembersWithProfiles(activityId) {
  const rows = await loadActivityMembers(activityId)
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

export async function addUserToActivity(actorUser, activityId, targetUid, userData = {}) {
  if (!actorUser?.uid || !activityId || !targetUid) return
  const canon = await firestoreApi.getData(canonicalRef(activityId))
  if (!canon) throw new Error('ACTIVITY_NOT_FOUND')
  const actorMem = await firestoreApi.getData(memberRef(activityId, actorUser.uid))
  const actorRole = normalizeHalakaRole(actorMem?.role)
  const isManager = canManageRole(actorRole, HALAKA_MEMBER_ROLES.STUDENT)
  const isPublic = canon.activityVisibility === 'public'
  const selfJoinPublic = isPublic && actorUser.uid === targetUid
  if (!isManager && !selfJoinPublic) throw new Error('ACTIVITY_FORBIDDEN')
  const existing = await firestoreApi.getData(memberRef(activityId, targetUid))
  if (existing) throw new Error('ALREADY_MEMBER')
  await firestoreApi.setData({
    docRef: memberRef(activityId, targetUid),
    data: { role: HALAKA_MEMBER_ROLES.STUDENT },
    merge: true,
    userData,
  })
  await firestoreApi.setData({
    docRef: mirrorDoc(targetUid, activityId),
    data: {
      role: HALAKA_MEMBER_ROLES.STUDENT,
      joinedAt: new Date().toISOString(),
    },
    merge: true,
    userData,
  })
  await syncActivityMemberCount(activityId)
}

export async function joinPublicActivity(userId, activityId, userData = {}) {
  if (!userId || !activityId) return
  const canon = await firestoreApi.getData(canonicalRef(activityId))
  if (!canon) throw new Error('ACTIVITY_NOT_FOUND')
  if (canon.activityVisibility !== 'public') throw new Error('ACTIVITY_NOT_PUBLIC')
  await addUserToActivity({ uid: userId }, activityId, userId, userData)
}

export async function removeActivityMember(actorUser, activityId, targetUid) {
  if (!actorUser?.uid || !activityId || !targetUid) return
  const actorRole = await assertActivityManager(actorUser.uid, activityId)
  const canon = await firestoreApi.getData(canonicalRef(activityId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(activityId, targetUid))
  if (!targetMem) return
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_REMOVE_OWNER')
  }
  if (!canManageRole(actorRole, targetRole)) throw new Error('ACTIVITY_FORBIDDEN_ROLE_SCOPE')
  await firestoreApi.deleteData(memberRef(activityId, targetUid))
  await firestoreApi.deleteData(mirrorDoc(targetUid, activityId))
  await syncActivityMemberCount(activityId)
}

export async function setActivityMemberRole(actorUser, activityId, targetUid, nextRole, userData = {}) {
  if (!actorUser?.uid || !activityId || !targetUid) return
  if (
    nextRole !== HALAKA_MEMBER_ROLES.SUPERVISOR &&
    nextRole !== HALAKA_MEMBER_ROLES.TEACHER &&
    nextRole !== HALAKA_MEMBER_ROLES.STUDENT
  ) {
    throw new Error('INVALID_ROLE')
  }
  const actorRole = await assertActivityManager(actorUser.uid, activityId)
  const canon = await firestoreApi.getData(canonicalRef(activityId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(activityId, targetUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_DEMOTE_OWNER')
  }
  assertCanAssignRole(actorRole, targetRole, nextRole)
  await firestoreApi.updateData({
    docRef: memberRef(activityId, targetUid),
    data: { role: nextRole },
    userData,
  })
  await firestoreApi.updateData({
    docRef: mirrorDoc(targetUid, activityId),
    data: { role: nextRole },
    userData,
  })
}
