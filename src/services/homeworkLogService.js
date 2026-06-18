import { firestoreApi } from './firestoreApi.js'
import { localYmd } from '../utils/planDailyQuota.js'

export const HOMEWORK_LOG_KIND = 'homework_log'

function homeworkLogDocId(categoryId, ymd) {
  return `${String(categoryId || '').trim()}_${String(ymd || '').trim()}`
}

function normalizeHomeworkLogSnapshot(ownerUid, snap) {
  const data = snap?.data?.() || snap?.data || snap || {}
  if (data.kind !== HOMEWORK_LOG_KIND) return null
  const completed = data.completed === true
  return {
    id: snap?.id || data.id || '',
    ownerUid: data.ownerUid || ownerUid || '',
    categoryId: String(data.categoryId || '').trim(),
    categoryLabel: String(data.categoryLabel || '').trim(),
    ymd: String(data.ymd || '').trim(),
    completed,
    completedLabel: completed ? 'نعم' : 'لا',
    recordedAt: data.recordedAt || data.createTimes || null,
    updatedAt: data.updatedAt || data.updatedTimes || null,
  }
}

function toMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function sortRecent(a, b) {
  return toMs(b.updatedAt) - toMs(a.updatedAt) || toMs(b.recordedAt) - toMs(a.recordedAt)
}

function userHomeworkCollection(userId) {
  return firestoreApi.getUserHomeworkCollection(userId)
}

function userHomeworkDoc(userId, logId) {
  return firestoreApi.getUserHomeworkDoc(userId, logId)
}

export async function loadHomeworkLogsForUser(userId) {
  if (!userId) return []
  const docs = await firestoreApi.getDocuments(userHomeworkCollection(userId))
  return docs.map((d) => normalizeHomeworkLogSnapshot(userId, d)).filter(Boolean).sort(sortRecent)
}

export function subscribeHomeworkLogsForUser(userId, onNext, onError) {
  if (!userId) return () => {}
  return firestoreApi.subscribeSnapshot(
    userHomeworkCollection(userId),
    (snapshot) => {
      const rows = snapshot.docs
        .map((d) => normalizeHomeworkLogSnapshot(userId, d))
        .filter(Boolean)
        .sort(sortRecent)
      onNext(rows)
    },
    onError,
  )
}

/**
 * حفظ إجابة الطالب على واجب يومي (نعم/لا).
 * @param {{ ownerUid: string, categoryId: string, categoryLabel: string, completed: boolean, ymd?: string, userData?: object }} params
 */
export async function saveHomeworkLog({
  ownerUid,
  categoryId,
  categoryLabel,
  completed,
  ymd = localYmd(),
  userData = {},
}) {
  if (!ownerUid) throw new Error('HOMEWORK_OWNER_REQUIRED')
  const catId = String(categoryId || '').trim()
  if (!catId) throw new Error('HOMEWORK_CATEGORY_REQUIRED')
  const day = String(ymd || '').trim() || localYmd()
  const logId = homeworkLogDocId(catId, day)
  const ref = userHomeworkDoc(ownerUid, logId)
  const now = new Date().toISOString()
  await firestoreApi.setData({
    docRef: ref,
    data: {
      kind: HOMEWORK_LOG_KIND,
      ownerUid,
      categoryId: catId,
      categoryLabel: String(categoryLabel || '').trim() || catId,
      ymd: day,
      completed: completed === true,
      recordedAt: now,
      updatedAt: now,
    },
    merge: true,
    userData,
  })
  return logId
}

export function findTodayHomeworkLog(logs, categoryId, ymd = localYmd()) {
  const day = String(ymd || '').trim()
  const catId = String(categoryId || '').trim()
  return (logs || []).find((r) => r.categoryId === catId && r.ymd === day) || null
}

export function homeworkCompletedLabel(completed) {
  if (completed === true) return 'نعم'
  if (completed === false) return 'لا'
  return '—'
}
