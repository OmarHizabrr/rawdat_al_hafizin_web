import { firestoreApi } from '../services/firestoreApi.js'

export const DAWRA_MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
}

function userMirrorsCol(userId) {
  return firestoreApi.getUserDawratCollection(userId)
}

function mirrorDoc(userId, dawraId) {
  return firestoreApi.getUserDawratDoc(userId, dawraId)
}

function canonicalRef(dawraId) {
  return firestoreApi.getDawraCanonicalDoc(dawraId)
}

function memberRef(dawraId, userId) {
  return firestoreApi.getPlanMemberDoc(dawraId, userId)
}

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function canonicalPayload(dawra) {
  const rest = { ...dawra }
  delete rest.id
  delete rest.dawraRole
  delete rest.memberCount
  return rest
}

async function syncDawraMemberCount(dawraId) {
  if (!dawraId) return
  const ref = canonicalRef(dawraId)
  const canon = await firestoreApi.getData(ref)
  if (!canon) return
  const n = await firestoreApi.getSubCollectionCount('members', dawraId, 'members')
  await firestoreApi.updateData({
    docRef: ref,
    data: { memberCount: n },
    userData: {},
  })
}

async function mergeMirrorDocs(mirrorDocs) {
  const out = []
  for (const d of mirrorDocs) {
    const dawraId = d.id
    const mirrorData = d.data() || {}
    const role = mirrorData.role || DAWRA_MEMBER_ROLES.MEMBER
    const canonical = await firestoreApi.getData(canonicalRef(dawraId))
    if (!canonical) continue
    out.push({
      id: dawraId,
      ...canonical,
      dawraRole: role,
    })
  }
  return out.sort(
    (a, b) =>
      timestampMs(b.updatedAt ?? b.updatedTimes) - timestampMs(a.updatedAt ?? a.updatedTimes) ||
      timestampMs(b.createdAt ?? b.createTimes) - timestampMs(a.createdAt ?? a.createTimes),
  )
}

export async function loadDawrat(userId) {
  if (!userId) return []
  const mirrorDocs = await firestoreApi.getDocuments(userMirrorsCol(userId))
  return mergeMirrorDocs(mirrorDocs)
}

export function subscribeDawrat(userId, onNext, onError) {
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

export async function deleteDawraFully(dawraId) {
  if (!dawraId) return
  const memCol = firestoreApi.getPlanMembersCollection(dawraId)
  const memberDocs = await firestoreApi.getDocuments(memCol)
  for (const md of memberDocs) {
    const uid = md.id
    await firestoreApi.deleteData(mirrorDoc(uid, dawraId))
    await firestoreApi.deleteData(md.ref)
  }
  await firestoreApi.deleteData(canonicalRef(dawraId))
}

export async function removeDawraForUser(userId, dawraId) {
  if (!userId || !dawraId) return
  const memSnap = await firestoreApi.getData(memberRef(dawraId, userId))
  const role = memSnap?.role || DAWRA_MEMBER_ROLES.MEMBER
  if (role === DAWRA_MEMBER_ROLES.OWNER || role === DAWRA_MEMBER_ROLES.ADMIN) {
    await deleteDawraFully(dawraId)
    return
  }
  await firestoreApi.deleteData(memberRef(dawraId, userId))
  await firestoreApi.deleteData(mirrorDoc(userId, dawraId))
  await syncDawraMemberCount(dawraId)
}

async function assertDawraManager(actorUid, dawraId) {
  const mem = await firestoreApi.getData(memberRef(dawraId, actorUid))
  const r = mem?.role
  if (r === DAWRA_MEMBER_ROLES.OWNER || r === DAWRA_MEMBER_ROLES.ADMIN) return
  throw new Error('DAWRA_FORBIDDEN')
}

export async function saveDawrat(userId, dawrat, userData = {}) {
  if (!userId) return
  for (const d of dawrat) {
    if (!d?.id) continue
    await upsertDawraForUser(userId, d, userData)
  }
}

async function upsertDawraForUser(userId, dawra, userData) {
  const dawraId = dawra.id
  const canonRef = canonicalRef(dawraId)
  const existingCanon = await firestoreApi.getData(canonRef)
  const mem = await firestoreApi.getData(memberRef(dawraId, userId))
  const role = mem?.role ?? (existingCanon ? null : DAWRA_MEMBER_ROLES.OWNER)
  const payload = canonicalPayload(dawra)

  if (!existingCanon) {
    const data = {
      ...payload,
      ownerUid: userId,
      dawraVisibility: dawra.dawraVisibility === 'public' ? 'public' : 'private',
    }
    await firestoreApi.setData({
      docRef: canonRef,
      data,
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: memberRef(dawraId, userId),
      data: { role: DAWRA_MEMBER_ROLES.OWNER },
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: mirrorDoc(userId, dawraId),
      data: {
        role: DAWRA_MEMBER_ROLES.OWNER,
        joinedAt: new Date().toISOString(),
      },
      merge: true,
      userData,
    })
    await syncDawraMemberCount(dawraId)
    return
  }

  if (role !== DAWRA_MEMBER_ROLES.OWNER && role !== DAWRA_MEMBER_ROLES.ADMIN) {
    return
  }

  await firestoreApi.updateData({
    docRef: canonRef,
    data: payload,
    userData,
  })
}

export async function loadDawratMembers(dawraId) {
  if (!dawraId) return []
  const docs = await firestoreApi.getDocuments(firestoreApi.getPlanMembersCollection(dawraId))
  return docs.map((d) => ({ userId: d.id, ...d.data() }))
}

export async function loadDawratMembersWithProfiles(dawraId) {
  const rows = await loadDawratMembers(dawraId)
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

export async function addUserToDawra(actorUser, dawraId, targetUid, userData = {}) {
  if (!actorUser?.uid || !dawraId || !targetUid) return
  const canon = await firestoreApi.getData(canonicalRef(dawraId))
  if (!canon) throw new Error('DAWRA_NOT_FOUND')
  const actorMem = await firestoreApi.getData(memberRef(dawraId, actorUser.uid))
  const isManager =
    actorMem?.role === DAWRA_MEMBER_ROLES.OWNER || actorMem?.role === DAWRA_MEMBER_ROLES.ADMIN
  const isPublic = canon.dawraVisibility === 'public'
  const selfJoinPublic = isPublic && actorUser.uid === targetUid
  if (!isManager && !selfJoinPublic) throw new Error('DAWRA_FORBIDDEN')
  const existing = await firestoreApi.getData(memberRef(dawraId, targetUid))
  if (existing) throw new Error('ALREADY_MEMBER')
  await firestoreApi.setData({
    docRef: memberRef(dawraId, targetUid),
    data: { role: DAWRA_MEMBER_ROLES.MEMBER },
    merge: true,
    userData,
  })
  await firestoreApi.setData({
    docRef: mirrorDoc(targetUid, dawraId),
    data: {
      role: DAWRA_MEMBER_ROLES.MEMBER,
      joinedAt: new Date().toISOString(),
    },
    merge: true,
    userData,
  })
  await syncDawraMemberCount(dawraId)
}

export async function joinPublicDawra(userId, dawraId, userData = {}) {
  if (!userId || !dawraId) return
  const canon = await firestoreApi.getData(canonicalRef(dawraId))
  if (!canon) throw new Error('DAWRA_NOT_FOUND')
  if (canon.dawraVisibility !== 'public') throw new Error('DAWRA_NOT_PUBLIC')
  await addUserToDawra({ uid: userId }, dawraId, userId, userData)
}

export async function removeDawraMember(actorUser, dawraId, targetUid) {
  if (!actorUser?.uid || !dawraId || !targetUid) return
  await assertDawraManager(actorUser.uid, dawraId)
  const canon = await firestoreApi.getData(canonicalRef(dawraId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(dawraId, targetUid))
  if (!targetMem) return
  if (targetUid === ownerUid && targetMem.role === DAWRA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_REMOVE_OWNER')
  }
  await firestoreApi.deleteData(memberRef(dawraId, targetUid))
  await firestoreApi.deleteData(mirrorDoc(targetUid, dawraId))
  await syncDawraMemberCount(dawraId)
}

export async function setDawraMemberRole(actorUser, dawraId, targetUid, nextRole, userData = {}) {
  if (!actorUser?.uid || !dawraId || !targetUid) return
  if (nextRole !== DAWRA_MEMBER_ROLES.ADMIN && nextRole !== DAWRA_MEMBER_ROLES.MEMBER) {
    throw new Error('INVALID_ROLE')
  }
  await assertDawraManager(actorUser.uid, dawraId)
  const canon = await firestoreApi.getData(canonicalRef(dawraId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(dawraId, targetUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  if (targetUid === ownerUid && targetMem.role === DAWRA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_DEMOTE_OWNER')
  }
  await firestoreApi.updateData({
    docRef: memberRef(dawraId, targetUid),
    data: { role: nextRole },
    userData,
  })
  await firestoreApi.updateData({
    docRef: mirrorDoc(targetUid, dawraId),
    data: { role: nextRole },
    userData,
  })
}
