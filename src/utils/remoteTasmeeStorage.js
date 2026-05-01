import { firestoreApi } from '../services/firestoreApi.js'
import { leavingUserDeletesWholeGroup } from './groupMembership.js'
import {
  HALAKA_MEMBER_ROLES,
  assertCanAssignRole,
  canManageRole,
  normalizeHalakaRole,
} from './halakatStorage.js'

/** نوع البث: صوتي أو مرئي */
export const REMOTE_TASMEE_MEDIA = {
  AUDIO: 'audio',
  VIDEO: 'video',
}

/** تطبيق الاجتماع / البث */
export const REMOTE_TASMEE_PROVIDER = {
  GOOGLE_MEET: 'google_meet',
  ZOOM: 'zoom',
  TEAMS: 'teams',
  JITSI: 'jitsi',
  DISCORD: 'discord',
  WEBEX: 'webex',
  OTHER: 'other',
}

const PROVIDER_SET = new Set(Object.values(REMOTE_TASMEE_PROVIDER))
const MEDIA_SET = new Set(Object.values(REMOTE_TASMEE_MEDIA))

function userMirrorsCol(userId) {
  return firestoreApi.getUserRemoteTasmeeCollection(userId)
}

function mirrorDoc(userId, broadcastId) {
  return firestoreApi.getUserRemoteTasmeeDoc(userId, broadcastId)
}

function canonicalRef(broadcastId) {
  return firestoreApi.getRemoteTasmeeCanonicalDoc(broadcastId)
}

function memberRef(broadcastId, userId) {
  return firestoreApi.getPlanMemberDoc(broadcastId, userId)
}

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

/**
 * توحيد رابط الاجتماع: يدعم https://meet.google.com/xxx-yyy-zzz وكود الميت وحده (ثلاث مقاطع على الأقل مفصولة بشرطة).
 */
export function normalizeMeetingUrl(raw) {
  let s = String(raw || '').trim()
  if (!s) return ''
  s = s.replace(/^<([^>]+)>$/,'$1').replace(/^["'](.+)["']$/,'$1').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const hasHostish = s.includes('.') || s.includes('/') || s.includes(':')
  if (
    !hasHostish &&
    /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/i.test(s)
  ) {
    return `https://meet.google.com/${s}`
  }
  return `https://${s}`
}

export function normalizeRemoteTasmeeProvider(v) {
  const k = String(v || '').trim()
  return PROVIDER_SET.has(k) ? k : REMOTE_TASMEE_PROVIDER.OTHER
}

export function normalizeRemoteTasmeeMedia(v) {
  const k = String(v || '').trim()
  return MEDIA_SET.has(k) ? k : REMOTE_TASMEE_MEDIA.VIDEO
}

/** معرّف مجموعة الاختبار المرتبطة بالبث (اختياري). */
export function normalizeLinkedExamId(raw) {
  return String(raw || '').trim()
}

/** اسم الاختبار لحظة الربط (للعرض دون جلب إضافي). */
export function normalizeLinkedExamTitle(raw) {
  return String(raw || '').trim()
}

function canonicalPayload(row) {
  const rest = { ...row }
  delete rest.id
  delete rest.broadcastRole
  delete rest.memberCount
  return rest
}

async function syncRemoteTasmeeMemberCount(broadcastId) {
  if (!broadcastId) return
  const ref = canonicalRef(broadcastId)
  const canon = await firestoreApi.getData(ref)
  if (!canon) return
  const n = await firestoreApi.getSubCollectionCount('members', broadcastId, 'members')
  await firestoreApi.updateData({
    docRef: ref,
    data: { memberCount: n },
    userData: {},
  })
}

async function mergeMirrorDocs(mirrorDocs) {
  const out = []
  for (const d of mirrorDocs) {
    const broadcastId = d.id
    const mirrorData = d.data() || {}
    const role = normalizeHalakaRole(mirrorData.role)
    const canonical = await firestoreApi.getData(canonicalRef(broadcastId))
    if (!canonical) continue
    out.push({
      id: broadcastId,
      ...canonical,
      broadcastRole: role,
    })
  }
  return out.sort(
    (a, b) =>
      timestampMs(b.updatedAt ?? b.updatedTimes) - timestampMs(a.updatedAt ?? a.updatedTimes) ||
      timestampMs(b.createdAt ?? b.createTimes) - timestampMs(a.createdAt ?? a.createTimes),
  )
}

export async function loadRemoteTasmeeBroadcasts(userId) {
  if (!userId) return []
  const mirrorDocs = await firestoreApi.getDocuments(userMirrorsCol(userId))
  return mergeMirrorDocs(mirrorDocs)
}

export function subscribeRemoteTasmeeBroadcasts(userId, onNext, onError) {
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

export async function deleteRemoteTasmeeFully(broadcastId) {
  if (!broadcastId) return
  const memCol = firestoreApi.getPlanMembersCollection(broadcastId)
  const memberDocs = await firestoreApi.getDocuments(memCol)
  for (const md of memberDocs) {
    const uid = md.id
    await firestoreApi.deleteData(mirrorDoc(uid, broadcastId))
    await firestoreApi.deleteData(md.ref)
  }
  await firestoreApi.deleteData(canonicalRef(broadcastId))
}

/** @returns {'deletedFully' | 'left' | 'noop'} */
export async function removeRemoteTasmeeForUser(userId, broadcastId) {
  if (!userId || !broadcastId) return 'noop'
  const canon = await firestoreApi.getData(canonicalRef(broadcastId))
  if (!canon) return 'noop'
  const memSnap = await firestoreApi.getData(memberRef(broadcastId, userId))
  const role = normalizeHalakaRole(memSnap?.role)
  if (leavingUserDeletesWholeGroup(userId, canon.ownerUid, role, HALAKA_MEMBER_ROLES)) {
    await deleteRemoteTasmeeFully(broadcastId)
    return 'deletedFully'
  }
  if (!memSnap) return 'noop'
  await firestoreApi.deleteData(memberRef(broadcastId, userId))
  await firestoreApi.deleteData(mirrorDoc(userId, broadcastId))
  await syncRemoteTasmeeMemberCount(broadcastId)
  return 'left'
}

export async function saveRemoteTasmeeBroadcast(userId, row, userData = {}) {
  if (!userId) return
  const list = Array.isArray(row) ? row : [row]
  for (const b of list) {
    if (!b?.id) continue
    await upsertRemoteTasmeeForUser(userId, b, userData)
  }
}

async function upsertRemoteTasmeeForUser(userId, broadcast, userData) {
  const broadcastId = broadcast.id
  const canonRef = canonicalRef(broadcastId)
  const existingCanon = await firestoreApi.getData(canonRef)
  const mem = await firestoreApi.getData(memberRef(broadcastId, userId))
  const role = mem?.role ?? (existingCanon ? null : HALAKA_MEMBER_ROLES.OWNER)
  const payload = canonicalPayload(broadcast)
  const meetingUrl = normalizeMeetingUrl(payload.meetingUrl ?? broadcast.meetingUrl)
  const mediaType = normalizeRemoteTasmeeMedia(payload.mediaType ?? broadcast.mediaType)
  const provider = normalizeRemoteTasmeeProvider(payload.provider ?? broadcast.provider)

  if (!existingCanon) {
    if (!meetingUrl) throw new Error('REMOTE_TASMEE_URL_REQUIRED')
    const linkedExamId = normalizeLinkedExamId(payload.linkedExamId ?? broadcast.linkedExamId)
    const linkedExamTitle = linkedExamId
      ? normalizeLinkedExamTitle(payload.linkedExamTitle ?? broadcast.linkedExamTitle)
      : ''
    const data = {
      ...payload,
      mediaType,
      provider,
      meetingUrl,
      meetingCode: String(payload.meetingCode || '').trim(),
      ownerUid: userId,
      remoteTasmeeVisibility:
        broadcast.remoteTasmeeVisibility === 'public' ? 'public' : 'private',
      linkedExamId: linkedExamId || '',
      linkedExamTitle: linkedExamTitle || '',
    }
    await firestoreApi.setData({
      docRef: canonRef,
      data,
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: memberRef(broadcastId, userId),
      data: { role: HALAKA_MEMBER_ROLES.OWNER },
      merge: true,
      userData,
    })
    await firestoreApi.setData({
      docRef: mirrorDoc(userId, broadcastId),
      data: {
        role: HALAKA_MEMBER_ROLES.OWNER,
        joinedAt: new Date().toISOString(),
      },
      merge: true,
      userData,
    })
    await syncRemoteTasmeeMemberCount(broadcastId)
    return
  }

  if (role !== HALAKA_MEMBER_ROLES.OWNER && role !== HALAKA_MEMBER_ROLES.SUPERVISOR) {
    return
  }

  const data = {
    ...payload,
    mediaType,
    provider,
    meetingUrl: meetingUrl || existingCanon.meetingUrl || '',
    meetingCode: String(payload.meetingCode ?? existingCanon.meetingCode ?? '').trim(),
    remoteTasmeeVisibility: broadcast.remoteTasmeeVisibility === 'public' ? 'public' : 'private',
  }
  if (!data.meetingUrl) throw new Error('REMOTE_TASMEE_URL_REQUIRED')

  const linkedExamId = normalizeLinkedExamId(payload.linkedExamId ?? broadcast.linkedExamId)
  const linkedExamTitle = linkedExamId
    ? normalizeLinkedExamTitle(
        payload.linkedExamTitle ??
          broadcast.linkedExamTitle ??
          existingCanon.linkedExamTitle ??
          '',
      )
    : ''

  await firestoreApi.updateData({
    docRef: canonRef,
    data: {
      ...data,
      linkedExamId: linkedExamId || '',
      linkedExamTitle: linkedExamTitle || '',
    },
    userData,
  })
}

async function assertRemoteTasmeeManager(actorUid, broadcastId) {
  const mem = await firestoreApi.getData(memberRef(broadcastId, actorUid))
  const r = normalizeHalakaRole(mem?.role)
  if (
    r === HALAKA_MEMBER_ROLES.OWNER ||
    r === HALAKA_MEMBER_ROLES.SUPERVISOR ||
    r === HALAKA_MEMBER_ROLES.TEACHER
  ) {
    return r
  }
  throw new Error('REMOTE_TASMEE_FORBIDDEN')
}

export async function loadRemoteTasmeeMembers(broadcastId) {
  if (!broadcastId) return []
  const docs = await firestoreApi.getDocuments(firestoreApi.getPlanMembersCollection(broadcastId))
  return docs.map((d) => {
    const data = d.data() || {}
    return {
      userId: d.id,
      ...data,
      role: normalizeHalakaRole(data.role),
    }
  })
}

export async function loadRemoteTasmeeMembersWithProfiles(broadcastId) {
  const rows = await loadRemoteTasmeeMembers(broadcastId)
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

export async function addUserToRemoteTasmee(actorUser, broadcastId, targetUid, userData = {}) {
  if (!actorUser?.uid || !broadcastId || !targetUid) return
  const canon = await firestoreApi.getData(canonicalRef(broadcastId))
  if (!canon) throw new Error('REMOTE_TASMEE_NOT_FOUND')
  const actorMem = await firestoreApi.getData(memberRef(broadcastId, actorUser.uid))
  const actorRole = normalizeHalakaRole(actorMem?.role)
  const isManager = canManageRole(actorRole, HALAKA_MEMBER_ROLES.STUDENT)
  const isPublic = canon.remoteTasmeeVisibility === 'public'
  const selfJoinPublic = isPublic && actorUser.uid === targetUid
  if (!isManager && !selfJoinPublic) throw new Error('REMOTE_TASMEE_FORBIDDEN')
  const existing = await firestoreApi.getData(memberRef(broadcastId, targetUid))
  if (existing) throw new Error('ALREADY_MEMBER')
  await firestoreApi.setData({
    docRef: memberRef(broadcastId, targetUid),
    data: { role: HALAKA_MEMBER_ROLES.STUDENT },
    merge: true,
    userData,
  })
  await firestoreApi.setData({
    docRef: mirrorDoc(targetUid, broadcastId),
    data: {
      role: HALAKA_MEMBER_ROLES.STUDENT,
      joinedAt: new Date().toISOString(),
    },
    merge: true,
    userData,
  })
  await syncRemoteTasmeeMemberCount(broadcastId)
}

export async function joinPublicRemoteTasmee(userId, broadcastId, userData = {}) {
  if (!userId || !broadcastId) return
  const canon = await firestoreApi.getData(canonicalRef(broadcastId))
  if (!canon) throw new Error('REMOTE_TASMEE_NOT_FOUND')
  if (canon.remoteTasmeeVisibility !== 'public') throw new Error('REMOTE_TASMEE_NOT_PUBLIC')
  await addUserToRemoteTasmee({ uid: userId }, broadcastId, userId, userData)
}

export async function removeRemoteTasmeeMember(actorUser, broadcastId, targetUid) {
  if (!actorUser?.uid || !broadcastId || !targetUid) return
  const actorRole = await assertRemoteTasmeeManager(actorUser.uid, broadcastId)
  const canon = await firestoreApi.getData(canonicalRef(broadcastId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(broadcastId, targetUid))
  if (!targetMem) return
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_REMOVE_OWNER')
  }
  if (!canManageRole(actorRole, targetRole)) throw new Error('REMOTE_TASMEE_FORBIDDEN_ROLE_SCOPE')
  await firestoreApi.deleteData(memberRef(broadcastId, targetUid))
  await firestoreApi.deleteData(mirrorDoc(targetUid, broadcastId))
  await syncRemoteTasmeeMemberCount(broadcastId)
}

export async function setRemoteTasmeeMemberRole(actorUser, broadcastId, targetUid, nextRole, userData = {}) {
  if (!actorUser?.uid || !broadcastId || !targetUid) return
  if (
    nextRole !== HALAKA_MEMBER_ROLES.SUPERVISOR &&
    nextRole !== HALAKA_MEMBER_ROLES.TEACHER &&
    nextRole !== HALAKA_MEMBER_ROLES.STUDENT
  ) {
    throw new Error('INVALID_ROLE')
  }
  const actorRole = await assertRemoteTasmeeManager(actorUser.uid, broadcastId)
  const canon = await firestoreApi.getData(canonicalRef(broadcastId))
  const ownerUid = canon?.ownerUid
  const targetMem = await firestoreApi.getData(memberRef(broadcastId, targetUid))
  if (!targetMem) throw new Error('NOT_MEMBER')
  const targetRole = normalizeHalakaRole(targetMem.role)
  if (targetUid === ownerUid && targetRole === HALAKA_MEMBER_ROLES.OWNER) {
    throw new Error('CANNOT_DEMOTE_OWNER')
  }
  assertCanAssignRole(actorRole, targetRole, nextRole)
  await firestoreApi.updateData({
    docRef: memberRef(broadcastId, targetUid),
    data: { role: nextRole },
    userData,
  })
  await firestoreApi.updateData({
    docRef: mirrorDoc(targetUid, broadcastId),
    data: { role: nextRole },
    userData,
  })
}

export async function loadRemoteTasmeeCanonical(broadcastId) {
  if (!broadcastId) return null
  const data = await firestoreApi.getData(canonicalRef(broadcastId))
  if (!data) return null
  return { id: broadcastId, ...data }
}

const PROVIDER_LABELS_AR = {
  [REMOTE_TASMEE_PROVIDER.GOOGLE_MEET]: 'جوجل ميت',
  [REMOTE_TASMEE_PROVIDER.ZOOM]: 'زووم',
  [REMOTE_TASMEE_PROVIDER.TEAMS]: 'مايكروسوفت تيمز',
  [REMOTE_TASMEE_PROVIDER.JITSI]: 'جيتسي',
  [REMOTE_TASMEE_PROVIDER.DISCORD]: 'ديسكورد',
  [REMOTE_TASMEE_PROVIDER.WEBEX]: 'Webex',
  [REMOTE_TASMEE_PROVIDER.OTHER]: 'أخرى / رابط مباشر',
}

export function remoteTasmeeProviderLabelAr(k) {
  return PROVIDER_LABELS_AR[normalizeRemoteTasmeeProvider(k)] || PROVIDER_LABELS_AR[REMOTE_TASMEE_PROVIDER.OTHER]
}

export function remoteTasmeeMediaLabelAr(k) {
  return normalizeRemoteTasmeeMedia(k) === REMOTE_TASMEE_MEDIA.AUDIO ? 'بث صوتي' : 'بث مرئي'
}
