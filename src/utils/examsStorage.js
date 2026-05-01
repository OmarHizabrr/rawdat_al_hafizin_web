import { firestoreApi } from '../services/firestoreApi.js'
import { normalizeExamVolumeSpecs } from './examVolumeSpec.js'
import { leavingUserDeletesWholeGroup } from './groupMembership.js'
import {
  HALAKA_MEMBER_ROLES,
  assertCanAssignRole,
  canManageRole,
  normalizeHalakaRole,
} from './halakatStorage.js'

function userMirrorsCol(userId) {
  return firestoreApi.getUserExamsCollection(userId)
}

function mirrorDoc(userId, examId) {
  return firestoreApi.getUserExamDoc(userId, examId)
}

function canonicalRef(examId) {
  return firestoreApi.getExamCanonicalDoc(examId)
}

function memberRef(examId, userId) {
  return firestoreApi.getPlanMemberDoc(examId, userId)
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
  delete rest.examRole
  delete rest.memberCount
  return rest
}

async function syncExamMemberCount(examId) {
  if (!examId) return
  const ref = canonicalRef(examId)
  const canon = await firestoreApi.getData(ref)
  if (!canon) return
  const n = await firestoreApi.getSubCollectionCount('members', examId, 'members')
  await firestoreApi.updateData({
    docRef: ref,
    data: { memberCount: n },
    userData: {},
  })
}

async function mergeMirrorDocs(mirrorDocs) {
  const out = []
  for (const d of mirrorDocs) {
    const examId = d.id
    const mirrorData = d.data() || {}
    const role = normalizeHalakaRole(mirrorData.role)
    const canonical = await firestoreApi.getData(canonicalRef(examId))
    if (!canonical) continue
    out.push({
      id: examId,
      ...canonical,
      examRole: role,
    })
  }
  return out.sort(
    (a, b) =>
      timestampMs(b.updatedAt ?? b.updatedTimes) - timestampMs(a.updatedAt ?? a.updatedTimes) ||
      timestampMs(b.createdAt ?? b.createTimes) - timestampMs(a.createdAt ?? a.createTimes),
  )
}

export async function loadExams(userId) {
  if (!userId) return []
  const mirrorDocs = await firestoreApi.getDocuments(userMirrorsCol(userId))
  return mergeMirrorDocs(mirrorDocs)
}

export function subscribeExams(userId, onNext, onError) {
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

export async function deleteExamFully(examId) {
  if (!examId) return
  const memCol = firestoreApi.getPlanMembersCollection(examId)
  const memberDocs = await firestoreApi.getDocuments(memCol)
  for (const md of memberDocs) {
    const uid = md.id
    await firestoreApi.deleteData(mirrorDoc(uid, examId))
    await firestoreApi.deleteData(md.ref)
  }
  await firestoreApi.deleteData(canonicalRef(examId))
}

/** @returns {'deletedFully' | 'left' | 'noop'} */
export async function removeExamForUser(userId, examId) {
  if (!userId || !examId) return 'noop'
  const canon = await firestoreApi.getData(canonicalRef(examId))
  if (!canon) return 'noop'
  const memSnap = await firestoreApi.getData(memberRef(examId, userId))
  const role = normalizeHalakaRole(memSnap?.role)
  if (leavingUserDeletesWholeGroup(userId, canon.ownerUid, role, HALAKA_MEMBER_ROLES)) {
    await deleteExamFully(examId)
    return 'deletedFully'
  }
  if (!memSnap) return 'noop'
  await firestoreApi.deleteData(memberRef(examId, userId))
  await firestoreApi.deleteData(mirrorDoc(userId, examId))
  await syncExamMemberCount(examId)
  return 'left'
}

export async function saveExams(userId, rows, userData = {}) {
  if (!userId) return
  const list = Array.isArray(rows) ? rows : [rows]
  for (const ex of list) {
    if (!ex?.id) continue
    await upsertExamForUser(userId, ex, userData)
  }
}

async function upsertExamForUser(userId, exam, userData) {
  const examId = exam.id
  const canonRef = canonicalRef(examId)
  const existingCanon = await firestoreApi.getData(canonRef)
  const mem = await firestoreApi.getData(memberRef(examId, userId))
  const role = mem?.role ?? (existingCanon ? null : HALAKA_MEMBER_ROLES.OWNER)
  const payload = canonicalPayload(exam)

  if (!existingCanon) {
    const name =
      String(payload.name ?? exam.name ?? '').trim() || `اختبار ${new Date().toLocaleDateString('ar-SA')}`
    const examVolumeSpecs = normalizeExamVolumeSpecs(exam.examVolumeSpecs ?? payload.examVolumeSpecs)
    const data = {
      ...payload,
      name,
      description: String(payload.description ?? exam.description ?? '').trim(),
      examVolumeSpecs,
      ownerUid: userId,
      examVisibility: exam.examVisibility === 'public' ? 'public' : 'private',
    }
    await firestoreApi.setData({
      docRef: canonRef,
      data,
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: memberRef(examId, userId),
      data: { role: HALAKA_MEMBER_ROLES.OWNER },
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: mirrorDoc(userId, examId),
      data: {
        role: HALAKA_MEMBER_ROLES.OWNER,
        joinedAt: new Date().toISOString(),
      },
      merge: true,
      userData,
    })
    await syncExamMemberCount(examId)
    return
  }

  if (role !== HALAKA_MEMBER_ROLES.OWNER && role !== HALAKA_MEMBER_ROLES.SUPERVISOR) {
    return
  }

  const examVolumeSpecs = normalizeExamVolumeSpecs(exam.examVolumeSpecs ?? payload.examVolumeSpecs)
  const data = {
    ...payload,
    name: String(payload.name ?? existingCanon.name ?? '').trim() || existingCanon.name,
    description: String(payload.description ?? existingCanon.description ?? '').trim(),
    examVolumeSpecs,
    examVisibility: exam.examVisibility === 'public' ? 'public' : 'private',
  }

  await firestoreApi.updateData({
    docRef: canonRef,
    data,
    userData,
  })
}

async function assertExamManager(actorUid, examId) {
  const mem = await firestoreApi.getData(memberRef(examId, actorUid))
  const r = normalizeHalakaRole(mem?.role)
  if (
    r === HALAKA_MEMBER_ROLES.OWNER ||
    r === HALAKA_MEMBER_ROLES.SUPERVISOR ||
    r === HALAKA_MEMBER_ROLES.TEACHER
  ) {
    return r
  }
  throw new Error('EXAM_FORBIDDEN')
}

export async function loadExamMembers(examId) {
  if (!examId) return []
  const docs = await firestoreApi.getDocuments(firestoreApi.getPlanMembersCollection(examId))
  return docs.map((d) => {
    const data = d.data() || {}
    return {
      userId: d.id,
      ...data,
      role: normalizeHalakaRole(data.role),
    }
  })
}

export async function loadExamMembersWithProfiles(examId) {
  const rows = await loadExamMembers(examId)
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

export async function addUserToExam(actorUser, examId, targetUid, userData = {}) {
  if (!actorUser?.uid || !examId || !targetUid) return
  const canon = await firestoreApi.getData(canonicalRef(examId))
  if (!canon) throw new Error('EXAM_NOT_FOUND')
  const actorMem = await firestoreApi.getData(memberRef(examId, actorUser.uid))
  const actorRole = normalizeHalakaRole(actorMem?.role)
  const isManager = canManageRole(actorRole, HALAKA_MEMBER_ROLES.STUDENT)
  const isPublic = canon.examVisibility === 'public'
  const selfJoinPublic = isPublic && actorUser.uid === targetUid
  if (!isManager && !selfJoinPublic) throw new Error('EXAM_FORBIDDEN')
  const existing = await firestoreApi.getData(memberRef(examId, targetUid))
  if (existing) throw new Error('ALREADY_MEMBER')
  await firestoreApi.setData({
    docRef: memberRef(examId, targetUid),
    data: { role: HALAKA_MEMBER_ROLES.STUDENT },
    merge: true,
    userData,
  })
  await firestoreApi.setData({
    docRef: mirrorDoc(targetUid, examId),
    data: {
      role: HALAKA_MEMBER_ROLES.STUDENT,
      joinedAt: new Date().toISOString(),
    },
    merge: true,
    userData,
  })
  await syncExamMemberCount(examId)
}

export async function joinPublicExam(userId, examId, userData = {}) {
  if (!userId || !examId) return
  const canon = await firestoreApi.getData(canonicalRef(examId))
  if (!canon) throw new Error('EXAM_NOT_FOUND')
  if (canon.examVisibility !== 'public') throw new Error('EXAM_NOT_PUBLIC')
  await addUserToExam({ uid: userId }, examId, userId, userData)
}

export async function removeExamMember(actorUser, examId, targetUid) {
  if (!actorUser?.uid || !examId || !targetUid) return
  const actorRole = await assertExamManager(actorUser.uid, examId)
  const canon = await firestoreApi.getData(canonicalRef(examId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(examId, targetUid))
  if (!targetMem) return
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_REMOVE_OWNER')
  }
  if (!canManageRole(actorRole, targetRole)) throw new Error('EXAM_FORBIDDEN_ROLE_SCOPE')
  await firestoreApi.deleteData(memberRef(examId, targetUid))
  await firestoreApi.deleteData(mirrorDoc(targetUid, examId))
  await syncExamMemberCount(examId)
}

export async function setExamMemberRole(actorUser, examId, targetUid, nextRole, userData = {}) {
  if (!actorUser?.uid || !examId || !targetUid) return
  if (
    nextRole !== HALAKA_MEMBER_ROLES.SUPERVISOR &&
    nextRole !== HALAKA_MEMBER_ROLES.TEACHER &&
    nextRole !== HALAKA_MEMBER_ROLES.STUDENT
  ) {
    throw new Error('INVALID_ROLE')
  }
  const actorRole = await assertExamManager(actorUser.uid, examId)
  const canon = await firestoreApi.getData(canonicalRef(examId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(examId, targetUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_DEMOTE_OWNER')
  }
  assertCanAssignRole(actorRole, targetRole, nextRole)
  await firestoreApi.updateData({
    docRef: memberRef(examId, targetUid),
    data: { role: nextRole },
    userData,
  })
  await firestoreApi.updateData({
    docRef: mirrorDoc(targetUid, examId),
    data: { role: nextRole },
    userData,
  })
}
