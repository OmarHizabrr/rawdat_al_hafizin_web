import { getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { normalizePlanCalendarDays } from '../utils/hijriDates.js'
import { firestoreApi } from './firestoreApi.js'

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

/**
 * استعلام الخطط العامة (planVisibility === public).
 * الفهرسة: قد تحتاج فهرساً مركّباً في Firestore إذا أضفت orderBy لاحقاً.
 */
export function getPublicPlansQuery() {
  return query(
    firestoreApi.getPlansCollection(),
    where('planVisibility', '==', 'public'),
  )
}

async function resolveMemberCount(planId, stored) {
  if (typeof stored === 'number' && Number.isFinite(stored) && stored >= 0) return stored
  try {
    return await firestoreApi.getSubCollectionCount('members', planId, 'members')
  } catch {
    return 0
  }
}

/**
 * يدمج مستندات اللقطة مع بيانات المنشئ (users) وعدد الأعضاء.
 * @param {import('firebase/firestore').QueryDocumentSnapshot[]} docs
 */
export async function enrichPublicPlanDocs(docs) {
  const plans = docs.map((d) => ({ id: d.id, ...d.data() }))
  const ownerUids = [...new Set(plans.map((p) => p.ownerUid).filter(Boolean))]
  const profiles = await Promise.all(
    ownerUids.map((uid) => firestoreApi.getData(firestoreApi.getUserDoc(uid))),
  )
  const creatorByUid = Object.fromEntries(ownerUids.map((uid, i) => [uid, profiles[i] || {}]))

  return Promise.all(
    plans.map(async (p) => {
      const ownerUid = p.ownerUid || ''
      const creator = creatorByUid[ownerUid] || {}
      const memberCount = await resolveMemberCount(p.id, p.memberCount)
      return normalizePlanCalendarDays({
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

export async function loadPublicPlansForExplore() {
  const snap = await getDocs(getPublicPlansQuery())
  return enrichPublicPlanDocs(snap.docs)
}

/**
 * اشتراك لحظي بالخطط العامة (مع إثراء المنشئ والعدد).
 * @param {(plans: object[]) => void} onNext
 */
export function subscribePublicPlansForExplore(onNext, onError) {
  const q = getPublicPlansQuery()
  return onSnapshot(
    q,
    (snapshot) => {
      ;(async () => {
        try {
          const rows = await enrichPublicPlanDocs(snapshot.docs)
          onNext(rows)
        } catch (e) {
          onError?.(e)
        }
      })()
    },
    onError,
  )
}

/** فرز وبحث على الواجهة (بدون استعلام إضافي) */
export const EXPLORE_SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث إنشاءً' },
  { value: 'oldest', label: 'الأقدم إنشاءً' },
  { value: 'updated_newest', label: 'آخر تحديث' },
  { value: 'updated_oldest', label: 'أقدم تحديث' },
  { value: 'members_desc', label: 'الأكثر أعضاءً' },
  { value: 'members_asc', label: 'الأقل أعضاءً' },
  { value: 'name_asc', label: 'الاسم أ → ي' },
  { value: 'name_desc', label: 'الاسم ي → أ' },
]

export function filterPublicPlansBySearch(plans, searchRaw) {
  const q = (searchRaw || '').trim().toLowerCase()
  if (!q) return plans
  return plans.filter((p) => {
    const name = (p.name || '').toLowerCase()
    const id = (p.id || '').toLowerCase()
    const pt = (p.planType || '').toLowerCase()
    const vols = (p.volumes || []).map((v) => `${v.label || ''} ${v.id || ''}`).join(' ').toLowerCase()
    const creator = `${p.creatorDisplayName || ''} ${p.creatorEmail || ''} ${p.creatorUid || ''}`.toLowerCase()
    return (
      name.includes(q) ||
      id.includes(q) ||
      pt.includes(q) ||
      vols.includes(q) ||
      creator.includes(q)
    )
  })
}

export function sortPublicPlans(plans, sortValue) {
  const list = [...plans]
  const byCreatedDesc = (a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt)
  const byCreatedAsc = (a, b) => timestampMs(a.createdAt) - timestampMs(b.createdAt)
  const byUpdatedDesc = (a, b) => timestampMs(b.updatedAt) - timestampMs(a.updatedAt)
  const byUpdatedAsc = (a, b) => timestampMs(a.updatedAt) - timestampMs(b.updatedAt)
  const byMembersDesc = (a, b) => (Number(b.memberCount) || 0) - (Number(a.memberCount) || 0)
  const byMembersAsc = (a, b) => (Number(a.memberCount) || 0) - (Number(b.memberCount) || 0)
  const byNameAsc = (a, b) =>
    (a.name || '').localeCompare(b.name || '', 'ar', { sensitivity: 'base' })
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
