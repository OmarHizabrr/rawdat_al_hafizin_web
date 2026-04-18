import { getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { firestoreApi } from './firestoreApi.js'
import { EXPLORE_SORT_OPTIONS, sortPublicPlans } from './explorePlansService.js'

export function getPublicHalakatQuery() {
  return query(firestoreApi.getHalakatCollection(), where('halakaVisibility', '==', 'public'))
}

async function resolveMemberCount(halakaId, stored) {
  if (typeof stored === 'number' && Number.isFinite(stored) && stored >= 0) return stored
  try {
    return await firestoreApi.getSubCollectionCount('members', halakaId, 'members')
  } catch {
    return 0
  }
}

export async function enrichPublicHalakatDocs(docs) {
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

export async function loadPublicHalakatForExplore() {
  const snap = await getDocs(getPublicHalakatQuery())
  return enrichPublicHalakatDocs(snap.docs)
}

export function subscribePublicHalakatForExplore(onNext, onError) {
  const q = getPublicHalakatQuery()
  return onSnapshot(
    q,
    (snapshot) => {
      ;(async () => {
        try {
          const rows = await enrichPublicHalakatDocs(snapshot.docs)
          onNext(rows)
        } catch (e) {
          onError?.(e)
        }
      })()
    },
    onError,
  )
}

export function filterPublicHalakatBySearch(rows, searchRaw) {
  const q = (searchRaw || '').trim().toLowerCase()
  if (!q) return rows
  return rows.filter((p) => {
    const name = (p.name || '').toLowerCase()
    const desc = (p.description || '').toLowerCase()
    const loc = (p.location || '').toLowerCase()
    const id = (p.id || '').toLowerCase()
    const creator = `${p.creatorDisplayName || ''} ${p.creatorEmail || ''}`.toLowerCase()
    return name.includes(q) || desc.includes(q) || loc.includes(q) || id.includes(q) || creator.includes(q)
  })
}

export function sortPublicHalakat(rows, sortValue) {
  return sortPublicPlans(
    rows.map((r) => ({
      ...r,
      name: r.name || '',
      createdAt: r.createdAt ?? r.createTimes,
      updatedAt: r.updatedAt ?? r.updatedTimes,
    })),
    sortValue,
  )
}

export { EXPLORE_SORT_OPTIONS }
