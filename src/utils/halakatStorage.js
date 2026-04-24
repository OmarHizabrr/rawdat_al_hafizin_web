import { firestoreApi } from '../services/firestoreApi.js'
import { leavingUserDeletesWholeGroup } from './groupMembership.js'

/** أدوار عضو الحلقة — members/{halakaId}/members/{uid} */
export const HALAKA_MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
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
    const role = mirrorData.role || HALAKA_MEMBER_ROLES.MEMBER
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
  const role = memSnap?.role || HALAKA_MEMBER_ROLES.MEMBER
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
  const r = mem?.role
  if (r === HALAKA_MEMBER_ROLES.OWNER || r === HALAKA_MEMBER_ROLES.ADMIN) return
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

  if (role !== HALAKA_MEMBER_ROLES.OWNER && role !== HALAKA_MEMBER_ROLES.ADMIN) {
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
  return docs.map((d) => ({ userId: d.id, ...d.data() }))
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
  const isManager =
    actorMem?.role === HALAKA_MEMBER_ROLES.OWNER || actorMem?.role === HALAKA_MEMBER_ROLES.ADMIN
  const isPublic = canon.halakaVisibility === 'public'
  const selfJoinPublic = isPublic && actorUser.uid === targetUid
  if (!isManager && !selfJoinPublic) throw new Error('HALAKA_FORBIDDEN')
  const existing = await firestoreApi.getData(memberRef(halakaId, targetUid))
  if (existing) throw new Error('ALREADY_MEMBER')
  await firestoreApi.setData({
    docRef: memberRef(halakaId, targetUid),
    data: { role: HALAKA_MEMBER_ROLES.MEMBER },
    merge: true,
    userData,
  })
  await firestoreApi.setData({
    docRef: mirrorDoc(targetUid, halakaId),
    data: {
      role: HALAKA_MEMBER_ROLES.MEMBER,
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
  await assertHalakaManager(actorUser.uid, halakaId)
  const canon = await firestoreApi.getData(canonicalRef(halakaId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(halakaId, targetUid))
  if (!targetMem) return
  if (targetUid === ownerUid && targetMem.role === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_REMOVE_OWNER')
  }
  await firestoreApi.deleteData(memberRef(halakaId, targetUid))
  await firestoreApi.deleteData(mirrorDoc(targetUid, halakaId))
  await syncHalakaMemberCount(halakaId)
}

export async function setHalakaMemberRole(actorUser, halakaId, targetUid, nextRole, userData = {}) {
  if (!actorUser?.uid || !halakaId || !targetUid) return
  if (nextRole !== HALAKA_MEMBER_ROLES.ADMIN && nextRole !== HALAKA_MEMBER_ROLES.MEMBER) {
    throw new Error('INVALID_ROLE')
  }
  await assertHalakaManager(actorUser.uid, halakaId)
  const canon = await firestoreApi.getData(canonicalRef(halakaId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(halakaId, targetUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  if (targetUid === ownerUid && targetMem.role === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_DEMOTE_OWNER')
  }
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
