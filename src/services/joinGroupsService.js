import { onSnapshot, query, orderBy } from 'firebase/firestore'
import { firestoreApi } from './firestoreApi.js'

export const JOIN_GROUP_GENDER = {
  MEN: 'men',
  WOMEN: 'women',
  ALL: 'all',
}

export const JOIN_GROUP_PLATFORM = {
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  FACEBOOK: 'facebook',
  DISCORD: 'discord',
  OTHER: 'other',
}

function normalizeGroupRow(id, raw = {}) {
  return {
    id,
    name: String(raw.name || '').trim(),
    description: String(raw.description || '').trim(),
    platform: Object.values(JOIN_GROUP_PLATFORM).includes(raw.platform) ? raw.platform : JOIN_GROUP_PLATFORM.OTHER,
    genderType: Object.values(JOIN_GROUP_GENDER).includes(raw.genderType) ? raw.genderType : JOIN_GROUP_GENDER.ALL,
    joinUrl: String(raw.joinUrl || '').trim(),
    imageUrl: String(raw.imageUrl || '').trim(),
    visibleOnHome: raw.visibleOnHome !== false,
    sortOrder: Number(raw.sortOrder || 0),
    maxAppearances: Math.max(1, Number(raw.maxAppearances || 1)),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    createdBy: raw.createdBy || '',
    updatedBy: raw.updatedBy || '',
  }
}

function canonicalDoc(groupId) {
  return firestoreApi.getDocument('join_groups', groupId)
}

function groupsCollection() {
  return firestoreApi.getCollection('join_groups')
}

function memberDoc(groupId, userId) {
  return firestoreApi.getSubDocument('join_group_members', groupId, 'members', userId)
}

function membersCollection(groupId) {
  return firestoreApi.getSubCollection('join_group_members', groupId, 'members')
}

function userStateDoc(groupId, userId) {
  return firestoreApi.getSubDocument('join_group_user_state', groupId, 'users', userId)
}

function auditCollection(groupId) {
  return firestoreApi.getSubCollection('join_group_audit', groupId, 'events')
}

function auditDoc(groupId, eventId) {
  return firestoreApi.getSubDocument('join_group_audit', groupId, 'events', eventId)
}

export function subscribeJoinGroups(onNext, onError) {
  const q = query(groupsCollection(), orderBy('sortOrder', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => normalizeGroupRow(d.id, d.data() || {}))
        .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'ar'))
      onNext(rows)
    },
    onError,
  )
}

export async function getJoinGroupById(groupId) {
  if (!groupId) return null
  const row = await firestoreApi.getData(canonicalDoc(groupId))
  return row ? normalizeGroupRow(groupId, row) : null
}

export async function saveJoinGroup(actorUser, payload) {
  if (!actorUser?.uid) throw new Error('FORBIDDEN')
  const id = String(payload?.id || '').trim() || firestoreApi.getNewId('join_groups')
  const old = await firestoreApi.getData(canonicalDoc(id))
  const now = new Date().toISOString()
  const row = normalizeGroupRow(id, {
    ...old,
    ...payload,
    id,
    updatedAt: now,
    updatedBy: actorUser.uid,
    createdAt: old?.createdAt || now,
    createdBy: old?.createdBy || actorUser.uid,
  })
  await firestoreApi.setData({
    docRef: canonicalDoc(id),
    data: row,
    merge: true,
    userData: actorUser,
  })
  return row
}

export async function deleteJoinGroup(actorUser, groupId) {
  if (!actorUser?.uid || !groupId) throw new Error('FORBIDDEN')
  await firestoreApi.deleteData(canonicalDoc(groupId))
}

export async function loadJoinGroupMembersWithProfiles(groupId) {
  if (!groupId) return []
  const docs = await firestoreApi.getDocuments(membersCollection(groupId))
  return Promise.all(
    docs.map(async (d) => {
      const data = d.data() || {}
      const uid = d.id
      const profile = (await firestoreApi.getData(firestoreApi.getUserDoc(uid))) || {}
      return {
        userId: uid,
        joinedAt: data.joinedAt || '',
        displayName: profile.displayName || profile.createdByName || uid,
        email: profile.email || '',
        role: profile.role || '',
        gender: profile.gender || '',
        photoURL: profile.photoURL || profile.createdByImageUrl || '',
      }
    }),
  )
}

export async function removeJoinGroupMember(actorUser, groupId, memberUserId, meta = {}) {
  if (!actorUser?.uid || !groupId || !memberUserId) throw new Error('FORBIDDEN')
  await firestoreApi.deleteData(memberDoc(groupId, memberUserId))
  const eventId = firestoreApi.getNewId('join_group_audit')
  await firestoreApi.setData({
    docRef: auditDoc(groupId, eventId),
    data: {
      id: eventId,
      type: 'member_removed',
      groupId,
      targetUserId: memberUserId,
      targetDisplayName: String(meta?.targetDisplayName || '').trim(),
      targetEmail: String(meta?.targetEmail || '').trim(),
      actorUserId: actorUser.uid,
      actorDisplayName: String(actorUser.displayName || '').trim(),
      actorEmail: String(actorUser.email || '').trim(),
      at: new Date().toISOString(),
    },
    merge: true,
    userData: actorUser,
  })
}

export async function loadJoinGroupAuditEvents(groupId, limitCount = 30) {
  if (!groupId) return []
  const docs = await firestoreApi.getDocuments(auditCollection(groupId), { limitCount })
  return docs
    .map((d) => ({ id: d.id, ...(d.data() || {}) }))
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
}

export async function loadJoinGroupMemberCounts(groupIds) {
  const out = {}
  const ids = Array.isArray(groupIds) ? groupIds : []
  await Promise.all(
    ids.map(async (groupId) => {
      if (!groupId) return
      const docs = await firestoreApi.getDocuments(membersCollection(groupId))
      out[groupId] = docs.length
    }),
  )
  return out
}

export async function hasUserJoinedGroup(groupId, userId) {
  if (!groupId || !userId) return false
  const row = await firestoreApi.getData(memberDoc(groupId, userId))
  return Boolean(row)
}

export async function getUserJoinGroupState(groupId, userId) {
  if (!groupId || !userId) return { joinCount: 0, hasMembership: false }
  const [stateRow, memberRow] = await Promise.all([
    firestoreApi.getData(userStateDoc(groupId, userId)),
    firestoreApi.getData(memberDoc(groupId, userId)),
  ])
  return {
    joinCount: Math.max(0, Number(stateRow?.joinCount || 0)),
    hasMembership: Boolean(memberRow),
  }
}

export async function joinGroup(actorUser, groupId) {
  if (!actorUser?.uid || !groupId) throw new Error('FORBIDDEN')
  const group = await firestoreApi.getData(canonicalDoc(groupId))
  if (!group) throw new Error('GROUP_NOT_FOUND')
  if (group.visibleOnHome === false) throw new Error('GROUP_HIDDEN')
  const existing = await firestoreApi.getData(memberDoc(groupId, actorUser.uid))
  const state = await firestoreApi.getData(userStateDoc(groupId, actorUser.uid))
  const currentJoinCount = Math.max(0, Number(state?.joinCount || 0))
  const maxAppearances = Math.max(1, Number(group.maxAppearances || 1))
  if (currentJoinCount >= maxAppearances) {
    return {
      alreadyJoined: Boolean(existing),
      exhausted: true,
      joinCount: currentJoinCount,
      maxAppearances,
      group: normalizeGroupRow(groupId, group),
    }
  }
  const now = new Date().toISOString()
  const nextJoinCount = currentJoinCount + 1
  await Promise.all([
    firestoreApi.setData({
      docRef: memberDoc(groupId, actorUser.uid),
      data: {
        userId: actorUser.uid,
        joinedAt: now,
        source: 'home',
      },
      merge: true,
      userData: actorUser,
    }),
    firestoreApi.setData({
      docRef: userStateDoc(groupId, actorUser.uid),
      data: {
        userId: actorUser.uid,
        joinCount: nextJoinCount,
        lastJoinedAt: now,
      },
      merge: true,
      userData: actorUser,
    }),
  ])
  return {
    alreadyJoined: Boolean(existing),
    exhausted: nextJoinCount >= maxAppearances,
    joinCount: nextJoinCount,
    maxAppearances,
    group: normalizeGroupRow(groupId, group),
  }
}
