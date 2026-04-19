import { getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { normalizeDawraCalendarDays } from '../utils/hijriDates.js'
import { firestoreApi } from './firestoreApi.js'
import { EXPLORE_SORT_OPTIONS, sortPublicPlans } from './explorePlansService.js'

export function getPublicDawratQuery() {
  return query(firestoreApi.getDawratCollection(), where('dawraVisibility', '==', 'public'))
}

async function resolveMemberCount(dawraId, stored) {
  if (typeof stored === 'number' && Number.isFinite(stored) && stored >= 0) return stored
  try {
    return await firestoreApi.getSubCollectionCount('members', dawraId, 'members')
  } catch {
    return 0
  }
}

export async function enrichPublicDawratDocs(docs) {
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
      return normalizeDawraCalendarDays({
        ...p,
        memberCount,
        creatorUid: ownerUid,
        creatorDisplayName:
          creator.displayName || creator.createdByName || p.createdByName || '—',
        creatorEmail: (creator.email || '').toString(),
        creatorPhoto: creator.photoURL || creator.createdByImageUrl || p.createdByImageUrl || '',
      })
    }),
  )
}

export async function loadPublicDawratForExplore() {
  const snap = await getDocs(getPublicDawratQuery())
  return enrichPublicDawratDocs(snap.docs)
}

export function subscribePublicDawratForExplore(onNext, onError) {
  const q = getPublicDawratQuery()
  return onSnapshot(
    q,
    (snapshot) => {
      ;(async () => {
        try {
          const rows = await enrichPublicDawratDocs(snapshot.docs)
          onNext(rows)
        } catch (e) {
          onError?.(e)
        }
      })()
    },
    onError,
  )
}

export function filterPublicDawratBySearch(rows, searchRaw) {
  const q = (searchRaw || '').trim().toLowerCase()
  if (!q) return rows
  return rows.filter((p) => {
    const title = (p.title || '').toLowerCase()
    const desc = (p.description || '').toLowerCase()
    const cost = (p.costLabel || '').toLowerCase()
    const mode = (p.deliveryMode || '').toLowerCase()
    const id = (p.id || '').toLowerCase()
    const creator = `${p.creatorDisplayName || ''} ${p.creatorEmail || ''}`.toLowerCase()
    const benefitsHay = Array.isArray(p.benefitsList)
      ? p.benefitsList.filter((x) => typeof x === 'string').join(' ').toLowerCase()
      : ''
    const conditionsHay = Array.isArray(p.conditionsList)
      ? p.conditionsList.filter((x) => typeof x === 'string').join(' ').toLowerCase()
      : ''
    const benefitsTextHay = String(p.benefitsText || '').toLowerCase()
    const conditionsTextHay = String(p.conditionsText || '').toLowerCase()
    return (
      title.includes(q) ||
      desc.includes(q) ||
      cost.includes(q) ||
      mode.includes(q) ||
      id.includes(q) ||
      creator.includes(q) ||
      benefitsHay.includes(q) ||
      conditionsHay.includes(q) ||
      benefitsTextHay.includes(q) ||
      conditionsTextHay.includes(q)
    )
  })
}

export function sortPublicDawrat(rows, sortValue) {
  return sortPublicPlans(
    rows.map((r) => ({
      ...r,
      name: r.title || '',
      createdAt: r.createdAt ?? r.createTimes,
      updatedAt: r.updatedAt ?? r.updatedTimes,
    })),
    sortValue,
  )
}

export { EXPLORE_SORT_OPTIONS }
