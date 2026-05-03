import { onSnapshot, query, where } from 'firebase/firestore'
import { firestoreApi } from './firestoreApi.js'
import { EXPLORE_SORT_OPTIONS } from './explorePlansService.js'

export function getPublicActivitiesQuery() {
  return query(firestoreApi.getActivitiesCollection(), where('activityVisibility', '==', 'public'))
}

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

async function resolveMemberCount(activityId, stored) {
  if (typeof stored === 'number' && Number.isFinite(stored) && stored >= 0) return stored
  try {
    return await firestoreApi.getSubCollectionCount('members', activityId, 'members')
  } catch {
    return 0
  }
}

export async function enrichPublicActivityDocs(docs) {
  const rows = docs.map((d) => ({ id: d.id, ...d.data() }))
  const ownerUids = [...new Set(rows.map((p) => p.ownerUid).filter(Boolean))]
  const profiles = await Promise.all(
    ownerUids.map((uid) => firestoreApi.getData(firestoreApi.getUserDoc(uid))),
  )
  const creatorByUid = Object.fromEntries(ownerUids.map((uid, i) => [uid, profiles[i] || {}]))

  return Promise.all(
    rows.map(async (p) => {
      const ownerUid = p.ownerUid || ''
      const creator = creatorByUid[ownerUid] || {}
      const memberCount = await resolveMemberCount(p.id, p.memberCount)
      return {
        ...p,
        memberCount,
        creatorUid: ownerUid,
        creatorDisplayName:
          creator.displayName || creator.createdByName || p.createdByName || '—',
        creatorEmail: (creator.email || '').toString(),
        creatorPhoto: creator.photoURL || creator.createdByImageUrl || p.createdByImageUrl || '',
      }
    }),
  )
}

export function subscribePublicActivitiesForExplore(onNext, onError) {
  const q = getPublicActivitiesQuery()
  return onSnapshot(
    q,
    (snapshot) => {
      ;(async () => {
        try {
          const rows = await enrichPublicActivityDocs(snapshot.docs)
          onNext(rows)
        } catch (e) {
          onError?.(e)
        }
      })()
    },
    onError,
  )
}

export function filterPublicActivitiesBySearch(rows, searchRaw) {
  const q = (searchRaw || '').trim().toLowerCase()
  if (!q) return rows
  return rows.filter((p) => {
    const name = (p.name || '').toLowerCase()
    const desc = (p.description || '').toLowerCase()
    const id = (p.id || '').toLowerCase()
    const creator = `${p.creatorDisplayName || ''} ${p.creatorEmail || ''}`.toLowerCase()
    const kind = (p.activityKind || '').toLowerCase()
    const loc = (p.location || '').toLowerCase()
    const fee = (p.feeInfo || '').toLowerCase()
    const aud = (p.targetAudience || '').toLowerCase()
    const req = (p.requirements || '').toLowerCase()
    const contact = `${p.contactName || ''} ${p.contactPhone || ''}`.toLowerCase()
    return (
      name.includes(q) ||
      desc.includes(q) ||
      id.includes(q) ||
      creator.includes(q) ||
      kind.includes(q) ||
      loc.includes(q) ||
      fee.includes(q) ||
      aud.includes(q) ||
      req.includes(q) ||
      contact.includes(q)
    )
  })
}

export function sortPublicActivities(rows, sortValue) {
  const list = [...rows]
  const byCreatedDesc = (a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt)
  const byCreatedAsc = (a, b) => timestampMs(a.createdAt) - timestampMs(b.createdAt)
  const byUpdatedDesc = (a, b) => timestampMs(b.updatedAt) - timestampMs(a.updatedAt)
  const byUpdatedAsc = (a, b) => timestampMs(a.updatedAt) - timestampMs(b.updatedAt)
  const byMembersDesc = (a, b) => (Number(b.memberCount) || 0) - (Number(a.memberCount) || 0)
  const byMembersAsc = (a, b) => (Number(a.memberCount) || 0) - (Number(b.memberCount) || 0)
  const title = (r) => (r.name || '').toString()
  const byNameAsc = (a, b) => title(a).localeCompare(title(b), 'ar', { sensitivity: 'base' })
  const byNameDesc = (a, b) => byNameAsc(b, a)

  switch (sortValue) {
    case 'oldest':
      return list.sort(byCreatedAsc)
    case 'updated_newest':
      return list.sort(byUpdatedDesc)
    case 'updated_oldest':
      return list.sort(byUpdatedAsc)
    case 'members_desc':
      return list.sort(byMembersDesc)
    case 'members_asc':
      return list.sort(byMembersAsc)
    case 'name_asc':
      return list.sort(byNameAsc)
    case 'name_desc':
      return list.sort(byNameDesc)
    case 'newest':
    default:
      return list.sort(byCreatedDesc)
  }
}

export { EXPLORE_SORT_OPTIONS }
