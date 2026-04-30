import { firestoreApi } from '../services/firestoreApi.js'
import { leavingUserDeletesWholeGroup } from './groupMembership.js'

/** أدوار عضو الحلقة — members/{halakaId}/members/{uid} */
export const HALAKA_MEMBER_ROLES = {
  OWNER: 'owner',
  SUPERVISOR: 'supervisor',
  TEACHER: 'teacher',
  STUDENT: 'student',
}

export const HALAKA_ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  ABSENT: 'absent',
  EXCUSED: 'excused',
  PERMITTED: 'permitted',
  LATE: 'late',
  OTHER: 'other',
}

const LEGACY_ROLE_MAP = {
  admin: HALAKA_MEMBER_ROLES.SUPERVISOR,
  member: HALAKA_MEMBER_ROLES.STUDENT,
}

function normalizeHalakaRole(role) {
  if (role === HALAKA_MEMBER_ROLES.OWNER) return HALAKA_MEMBER_ROLES.OWNER
  if (role === HALAKA_MEMBER_ROLES.SUPERVISOR) return HALAKA_MEMBER_ROLES.SUPERVISOR
  if (role === HALAKA_MEMBER_ROLES.TEACHER) return HALAKA_MEMBER_ROLES.TEACHER
  if (role === HALAKA_MEMBER_ROLES.STUDENT) return HALAKA_MEMBER_ROLES.STUDENT
  return LEGACY_ROLE_MAP[String(role || '').trim()] || HALAKA_MEMBER_ROLES.STUDENT
}

const ROLE_RANK = {
  [HALAKA_MEMBER_ROLES.OWNER]: 4,
  [HALAKA_MEMBER_ROLES.SUPERVISOR]: 3,
  [HALAKA_MEMBER_ROLES.TEACHER]: 2,
  [HALAKA_MEMBER_ROLES.STUDENT]: 1,
}

function roleRank(role) {
  return ROLE_RANK[normalizeHalakaRole(role)] || 0
}

function canManageRole(actorRole, targetRole) {
  const actor = normalizeHalakaRole(actorRole)
  const target = normalizeHalakaRole(targetRole)
  if (actor === HALAKA_MEMBER_ROLES.OWNER) return true
  if (actor === HALAKA_MEMBER_ROLES.SUPERVISOR) {
    return target === HALAKA_MEMBER_ROLES.TEACHER || target === HALAKA_MEMBER_ROLES.STUDENT
  }
  if (actor === HALAKA_MEMBER_ROLES.TEACHER) return target === HALAKA_MEMBER_ROLES.STUDENT
  return false
}

function assertCanAssignRole(actorRole, targetCurrentRole, nextRole) {
  const actor = normalizeHalakaRole(actorRole)
  const current = normalizeHalakaRole(targetCurrentRole)
  const next = normalizeHalakaRole(nextRole)
  if (!canManageRole(actor, current)) throw new Error('HALAKA_FORBIDDEN_ROLE_SCOPE')
  if (!canManageRole(actor, next)) throw new Error('HALAKA_FORBIDDEN_ROLE_SCOPE')
  if (roleRank(next) >= roleRank(actor)) throw new Error('HALAKA_FORBIDDEN_ROLE_SCOPE')
}

function userMirrorsCol(userId) {
  return firestoreApi.getUserHalakatCollection(userId)
}

function mirrorDoc(userId, halakaId) {
  return firestoreApi.getUserHalakatDoc(userId, halakaId)
}

function canonicalRef(halakaId) {
  return firestoreApi.getHalakaCanonicalDoc(halakaId)
}

function memberRef(halakaId, userId) {
  return firestoreApi.getPlanMemberDoc(halakaId, userId)
}

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function canonicalPayload(halaka) {
  const rest = { ...halaka }
  delete rest.id
  delete rest.halakaRole
  delete rest.memberCount
  return rest
}

async function syncHalakaMemberCount(halakaId) {
  if (!halakaId) return
  const ref = canonicalRef(halakaId)
  const canon = await firestoreApi.getData(ref)
  if (!canon) return
  const n = await firestoreApi.getSubCollectionCount('members', halakaId, 'members')
  await firestoreApi.updateData({
    docRef: ref,
    data: { memberCount: n },
    userData: {},
  })
}

async function mergeMirrorDocs(mirrorDocs) {
  const out = []
  for (const d of mirrorDocs) {
    const halakaId = d.id
    const mirrorData = d.data() || {}
    const role = normalizeHalakaRole(mirrorData.role)
    const canonical = await firestoreApi.getData(canonicalRef(halakaId))
    if (!canonical) continue
    out.push({
      id: halakaId,
      ...canonical,
      halakaRole: role,
    })
  }
  return out.sort(
    (a, b) =>
      timestampMs(b.updatedAt ?? b.updatedTimes) - timestampMs(a.updatedAt ?? a.updatedTimes) ||
      timestampMs(b.createdAt ?? b.createTimes) - timestampMs(a.createdAt ?? a.createTimes),
  )
}

export async function loadHalakat(userId) {
  if (!userId) return []
  const mirrorDocs = await firestoreApi.getDocuments(userMirrorsCol(userId))
  return mergeMirrorDocs(mirrorDocs)
}

export function subscribeHalakat(userId, onNext, onError) {
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

export async function deleteHalakaFully(halakaId) {
  if (!halakaId) return
  const memCol = firestoreApi.getPlanMembersCollection(halakaId)
  const memberDocs = await firestoreApi.getDocuments(memCol)
  for (const md of memberDocs) {
    const uid = md.id
    await firestoreApi.deleteData(mirrorDoc(uid, halakaId))
    await firestoreApi.deleteData(md.ref)
  }
  await firestoreApi.deleteData(canonicalRef(halakaId))
}

/** @returns {'deletedFully' | 'left' | 'noop'} */
export async function removeHalakaForUser(userId, halakaId) {
  if (!userId || !halakaId) return 'noop'
  const canon = await firestoreApi.getData(canonicalRef(halakaId))
  if (!canon) return 'noop'
  const memSnap = await firestoreApi.getData(memberRef(halakaId, userId))
  const role = normalizeHalakaRole(memSnap?.role)
  if (leavingUserDeletesWholeGroup(userId, canon.ownerUid, role, HALAKA_MEMBER_ROLES)) {
    await deleteHalakaFully(halakaId)
    return 'deletedFully'
  }
  if (!memSnap) return 'noop'
  await firestoreApi.deleteData(memberRef(halakaId, userId))
  await firestoreApi.deleteData(mirrorDoc(userId, halakaId))
  await syncHalakaMemberCount(halakaId)
  return 'left'
}

async function assertHalakaManager(actorUid, halakaId) {
  const mem = await firestoreApi.getData(memberRef(halakaId, actorUid))
  const r = normalizeHalakaRole(mem?.role)
  if (
    r === HALAKA_MEMBER_ROLES.OWNER ||
    r === HALAKA_MEMBER_ROLES.SUPERVISOR ||
    r === HALAKA_MEMBER_ROLES.TEACHER
  ) {
    return r
  }
  throw new Error('HALAKA_FORBIDDEN')
}

export async function saveHalakat(userId, halakat, userData = {}) {
  if (!userId) return
  for (const h of halakat) {
    if (!h?.id) continue
    await upsertHalakaForUser(userId, h, userData)
  }
}

async function upsertHalakaForUser(userId, halaka, userData) {
  const halakaId = halaka.id
  const canonRef = canonicalRef(halakaId)
  const existingCanon = await firestoreApi.getData(canonRef)
  const mem = await firestoreApi.getData(memberRef(halakaId, userId))
  const role = mem?.role ?? (existingCanon ? null : HALAKA_MEMBER_ROLES.OWNER)
  const payload = canonicalPayload(halaka)

  if (!existingCanon) {
    const data = {
      ...payload,
      ownerUid: userId,
      halakaVisibility: halaka.halakaVisibility === 'public' ? 'public' : 'private',
    }
    await firestoreApi.setData({
      docRef: canonRef,
      data,
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: memberRef(halakaId, userId),
      data: { role: HALAKA_MEMBER_ROLES.OWNER },
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: mirrorDoc(userId, halakaId),
      data: {
        role: HALAKA_MEMBER_ROLES.OWNER,
        joinedAt: new Date().toISOString(),
      },
      merge: true,
      userData,
    })
    await syncHalakaMemberCount(halakaId)
    return
  }

  if (role !== HALAKA_MEMBER_ROLES.OWNER && role !== HALAKA_MEMBER_ROLES.SUPERVISOR) {
    return
  }

  await firestoreApi.updateData({
    docRef: canonRef,
    data: payload,
    userData,
  })
}

export async function loadHalakatMembers(halakaId) {
  if (!halakaId) return []
  const docs = await firestoreApi.getDocuments(firestoreApi.getPlanMembersCollection(halakaId))
  return docs.map((d) => {
    const data = d.data() || {}
    return {
      userId: d.id,
      ...data,
      role: normalizeHalakaRole(data.role),
    }
  })
}

export async function loadHalakatMembersWithProfiles(halakaId) {
  const rows = await loadHalakatMembers(halakaId)
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

export async function addUserToHalaka(actorUser, halakaId, targetUid, userData = {}) {
  if (!actorUser?.uid || !halakaId || !targetUid) return
  const canon = await firestoreApi.getData(canonicalRef(halakaId))
  if (!canon) throw new Error('HALAKA_NOT_FOUND')
  const actorMem = await firestoreApi.getData(memberRef(halakaId, actorUser.uid))
  const actorRole = normalizeHalakaRole(actorMem?.role)
  const isManager = canManageRole(actorRole, HALAKA_MEMBER_ROLES.STUDENT)
  const isPublic = canon.halakaVisibility === 'public'
  const selfJoinPublic = isPublic && actorUser.uid === targetUid
  if (!isManager && !selfJoinPublic) throw new Error('HALAKA_FORBIDDEN')
  const existing = await firestoreApi.getData(memberRef(halakaId, targetUid))
  if (existing) throw new Error('ALREADY_MEMBER')
  await firestoreApi.setData({
    docRef: memberRef(halakaId, targetUid),
    data: { role: HALAKA_MEMBER_ROLES.STUDENT },
    merge: true,
    userData,
  })
  await firestoreApi.setData({
    docRef: mirrorDoc(targetUid, halakaId),
    data: {
      role: HALAKA_MEMBER_ROLES.STUDENT,
      joinedAt: new Date().toISOString(),
    },
    merge: true,
    userData,
  })
  await syncHalakaMemberCount(halakaId)
}

export async function joinPublicHalaka(userId, halakaId, userData = {}) {
  if (!userId || !halakaId) return
  const canon = await firestoreApi.getData(canonicalRef(halakaId))
  if (!canon) throw new Error('HALAKA_NOT_FOUND')
  if (canon.halakaVisibility !== 'public') throw new Error('HALAKA_NOT_PUBLIC')
  await addUserToHalaka({ uid: userId }, halakaId, userId, userData)
}

export async function removeHalakaMember(actorUser, halakaId, targetUid) {
  if (!actorUser?.uid || !halakaId || !targetUid) return
  const actorRole = await assertHalakaManager(actorUser.uid, halakaId)
  const canon = await firestoreApi.getData(canonicalRef(halakaId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(halakaId, targetUid))
  if (!targetMem) return
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_REMOVE_OWNER')
  }
  if (!canManageRole(actorRole, targetRole)) throw new Error('HALAKA_FORBIDDEN_ROLE_SCOPE')
  await firestoreApi.deleteData(memberRef(halakaId, targetUid))
  await firestoreApi.deleteData(mirrorDoc(targetUid, halakaId))
  await syncHalakaMemberCount(halakaId)
}

export async function setHalakaMemberRole(actorUser, halakaId, targetUid, nextRole, userData = {}) {
  if (!actorUser?.uid || !halakaId || !targetUid) return
  if (
    nextRole !== HALAKA_MEMBER_ROLES.SUPERVISOR &&
    nextRole !== HALAKA_MEMBER_ROLES.TEACHER &&
    nextRole !== HALAKA_MEMBER_ROLES.STUDENT
  ) {
    throw new Error('INVALID_ROLE')
  }
  const actorRole = await assertHalakaManager(actorUser.uid, halakaId)
  const canon = await firestoreApi.getData(canonicalRef(halakaId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(halakaId, targetUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_DEMOTE_OWNER')
  }
  assertCanAssignRole(actorRole, targetRole, nextRole)
  await firestoreApi.updateData({
    docRef: memberRef(halakaId, targetUid),
    data: { role: nextRole },
    userData,
  })
  await firestoreApi.updateData({
    docRef: mirrorDoc(targetUid, halakaId),
    data: { role: nextRole },
    userData,
  })
}

function sessionRef(halakaId, sessionId) {
  return firestoreApi.getHalakaSessionDoc(halakaId, sessionId)
}

function sessionsCol(halakaId) {
  return firestoreApi.getHalakaSessionsCollection(halakaId)
}

function attendanceRef(halakaId, sessionId, userId) {
  return firestoreApi.getHalakaSessionAttendanceDoc(halakaId, sessionId, userId)
}

function attendanceCol(halakaId, sessionId) {
  return firestoreApi.getHalakaSessionAttendanceCollection(halakaId, sessionId)
}

function durationMinutes(startedAt, endedAt) {
  const s = Date.parse(String(startedAt || ''))
  const e = Date.parse(String(endedAt || ''))
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0
  return Math.round((e - s) / 60000)
}

export async function loadHalakaSessions(halakaId) {
  if (!halakaId) return []
  const docs = await firestoreApi.getDocuments(sessionsCol(halakaId))
  return docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a, b) =>
        timestampMs(b.startedAt ?? b.createdAt ?? b.createTimes) -
        timestampMs(a.startedAt ?? a.createdAt ?? a.createTimes),
    )
}

export async function saveHalakaSession(actorUser, halakaId, sessionInput) {
  if (!actorUser?.uid || !halakaId) return null
  const actorRole = await assertHalakaManager(actorUser.uid, halakaId)
  if (!canManageRole(actorRole, HALAKA_MEMBER_ROLES.STUDENT)) throw new Error('HALAKA_FORBIDDEN')
  const startedAt = String(sessionInput?.startedAt || '')
  const endedAt = String(sessionInput?.endedAt || '')
  if (!startedAt || !endedAt || Date.parse(endedAt) <= Date.parse(startedAt)) {
    throw new Error('INVALID_SESSION_TIME')
  }
  const sessionId = sessionInput?.id || firestoreApi.getNewId('halaka_sessions')
  const nowIso = new Date().toISOString()
  const payload = {
    title: String(sessionInput?.title || '').trim(),
    startedAt,
    endedAt,
    durationMinutes: durationMinutes(startedAt, endedAt),
    notes: String(sessionInput?.notes || '').trim(),
    status: sessionInput?.status === 'closed' ? 'closed' : 'open',
    teacherUid: actorUser.uid,
    updatedAt: nowIso,
  }
  if (!sessionInput?.id) payload.createdAt = nowIso
  await firestoreApi.setData({
    docRef: sessionRef(halakaId, sessionId),
    data: payload,
    merge: true,
    userData: actorUser,
  })
  return { id: sessionId, ...payload }
}

export async function closeHalakaSession(actorUser, halakaId, sessionId, userData = {}) {
  if (!actorUser?.uid || !halakaId || !sessionId) return
  const actorRole = await assertHalakaManager(actorUser.uid, halakaId)
  if (!canManageRole(actorRole, HALAKA_MEMBER_ROLES.STUDENT)) throw new Error('HALAKA_FORBIDDEN')
  await firestoreApi.updateData({
    docRef: sessionRef(halakaId, sessionId),
    data: { status: 'closed', updatedAt: new Date().toISOString() },
    userData,
  })
}

export async function loadSessionAttendance(halakaId, sessionId) {
  if (!halakaId || !sessionId) return []
  const docs = await firestoreApi.getDocuments(attendanceCol(halakaId, sessionId))
  return docs.map((d) => ({ userId: d.id, ...d.data() }))
}

export async function upsertSessionAttendance(actorUser, halakaId, sessionId, studentUid, input) {
  if (!actorUser?.uid || !halakaId || !sessionId || !studentUid) return
  const actorRole = await assertHalakaManager(actorUser.uid, halakaId)
  const actorMem = await firestoreApi.getData(memberRef(halakaId, actorUser.uid))
  const targetMem = await firestoreApi.getData(memberRef(halakaId, studentUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  if (
    actorUser.uid !== studentUid &&
    !canManageRole(actorRole, normalizeHalakaRole(targetMem.role))
  ) {
    throw new Error('HALAKA_FORBIDDEN_ROLE_SCOPE')
  }
  const status = String(input?.attendanceStatus || HALAKA_ATTENDANCE_STATUSES.PRESENT)
  const allowed = new Set(Object.values(HALAKA_ATTENDANCE_STATUSES))
  const finalStatus = allowed.has(status) ? status : HALAKA_ATTENDANCE_STATUSES.OTHER
  const data = {
    attendanceStatus: finalStatus,
    memorizationVolumeId: String(input?.memorizationVolumeId || '').trim(),
    memorizedAmount: Number(input?.memorizedAmount || 0),
    memorizedUnit: String(input?.memorizedUnit || 'pages').trim() || 'pages',
    notes: String(input?.notes || '').trim(),
    recordedBy: actorUser.uid,
    recordedByRole: normalizeHalakaRole(actorMem?.role),
    updatedAt: new Date().toISOString(),
  }
  await firestoreApi.setData({
    docRef: attendanceRef(halakaId, sessionId, studentUid),
    data,
    merge: true,
    userData: actorUser,
  })
}
