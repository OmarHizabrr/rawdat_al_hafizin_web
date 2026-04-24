import { firestoreApi } from './firestoreApi.js'

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function normalizeNotificationDoc(docSnap) {
  const raw = docSnap.data() || {}
  return {
    id: docSnap.id,
    notificationId: docSnap.id,
    kind: raw.kind || '',
    notificationType: raw.notificationType || '',
    title: raw.title || '',
    body: raw.body || '',
    planId: raw.planId || '',
    userId: raw.userId || '',
    ymd: raw.ymd || '',
    overdueSinceYmd: raw.overdueSinceYmd || '',
    owedPages: Math.max(0, Number(raw.owedPages) || 0),
    creatorUid: raw.creatorUid || '',
    creatorDisplayName: raw.creatorDisplayName || raw.createdByName || '',
    creatorPhotoURL: raw.creatorPhotoURL || raw.createdByImageUrl || '',
    isRead: Boolean(raw.isRead),
    readAt: raw.readAt || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  }
}

export function subscribeUserNotifications(userId, onNext) {
  if (!userId) return () => {}
  const ref = firestoreApi.getUserNotificationsCollection(userId)
  return firestoreApi.subscribeSnapshot(ref, (snapshot) => {
    const rows = snapshot.docs
      .map((d) => normalizeNotificationDoc(d))
      .filter((n) => n.kind === 'notification')
      .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt))
    onNext(rows)
  })
}

export async function upsertUserNotification({
  userId,
  notificationId,
  title,
  body,
  notificationType = 'general',
  planId = '',
  ymd = '',
  overdueSinceYmd = '',
  owedPages = 0,
  userData = {},
}) {
  if (!userId || !notificationId) return
  const ref = firestoreApi.getUserNotificationDoc(userId, notificationId)
  const nowIso = new Date().toISOString()
  const creatorDisplayName =
    String(userData?.displayName || '').trim() ||
    String(userData?.createdByName || '').trim()
  const creatorPhotoURL =
    String(userData?.photoURL || '').trim() ||
    String(userData?.createdByImageUrl || '').trim()
  await firestoreApi.setData({
    docRef: ref,
    data: {
      id: notificationId,
      kind: 'notification',
      notificationType,
      title: String(title || '').trim() || 'إشعار',
      body: String(body || '').trim(),
      userId,
      planId: planId || '',
      ymd: ymd || '',
      overdueSinceYmd: overdueSinceYmd || '',
      owedPages: Math.max(0, Number(owedPages) || 0),
      creatorUid: String(userData?.uid || '').trim(),
      creatorDisplayName,
      creatorPhotoURL,
      isRead: false,
      readAt: null,
      updatedAt: nowIso,
      createdAt: nowIso,
    },
    merge: true,
    userData,
  })
}

export async function markUserNotificationRead(userId, dawraId, userData = {}) {
  if (!userId || !dawraId) return
  const ref = firestoreApi.getUserNotificationDoc(userId, dawraId)
  await firestoreApi.updateData({
    docRef: ref,
    data: {
      isRead: true,
      readAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    userData,
  })
}

export async function markAllUserNotificationsRead(userId, rows, userData = {}) {
  if (!userId || !Array.isArray(rows) || rows.length === 0) return
  const unread = rows.filter((r) => r.kind === 'notification' && !r.isRead)
  for (const row of unread) {
    await markUserNotificationRead(userId, row.id, userData)
  }
}

/** حذف إشعار واحد من مجموعة المستخدم */
export async function deleteUserNotification(userId, notificationId) {
  if (!userId || !notificationId) return
  const ref = firestoreApi.getUserNotificationDoc(userId, notificationId)
  await firestoreApi.deleteData(ref)
}

