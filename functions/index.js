/* eslint-env node */
/* global require, exports */
const admin = require('firebase-admin')
const functions = require('firebase-functions/v1')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()
const messaging = admin.messaging()

/** يُمرَّر كسلسلة في FCM data (كل القيم نصية) ليقرأها service worker */
const PUSH_VIBRATE_JSON = JSON.stringify([22, 45, 28, 45, 32, 55, 28, 70, 200])

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtmlParagraphs(text) {
  const lines = String(text || '').split('\n')
  return lines.map((line) => `<p style="margin:0 0 8px">${escapeHtml(line) || '&nbsp;'}</p>`).join('')
}

function toSafeString(value) {
  return String(value || '').trim()
}

function shouldNotifyAdminsOfApplicationSubmit(before, after) {
  if (!after) return false
  const status = toSafeString(after.status) || 'pending'
  if (status !== 'pending') return false

  const afterSubmitted = toSafeString(after.submittedAt)
  if (!afterSubmitted) return false

  if (!before) return true

  const beforeStatus = toSafeString(before.status)
  const beforeSubmitted = toSafeString(before.submittedAt)
  if (beforeStatus !== 'pending') return true
  return afterSubmitted !== beforeSubmitted
}

async function loadAdminUserIds() {
  const snap = await db.collection('users').where('role', '==', 'admin').get()
  return snap.docs.map((d) => d.id).filter(Boolean)
}

async function enqueueApplicationSubmitAdminNotification({
  adminUid,
  applicantUid,
  submittedKey,
  applicantName,
}) {
  if (!adminUid || !applicantUid || adminUid === applicantUid) return

  const notificationId = `application-submit-${applicantUid}-${adminUid}-${submittedKey}`
  const title = 'طلب التحاق جديد'
  const body = `قدّم ${applicantName} طلب التحاق جديد. يمكنك مراجعته من «طلبات الالتحاق».`
  const url = '/app/admin/applications'
  const nowIso = new Date().toISOString()

  const notifRef = db
    .collection('notifications')
    .doc(adminUid)
    .collection('notifications')
    .doc(notificationId)

  await notifRef.set(
    {
      id: notificationId,
      kind: 'notification',
      notificationType: 'application_submitted',
      title,
      body,
      userId: adminUid,
      applicantUid,
      isRead: false,
      readAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true },
  )

  const pushQueueId = `push-${notificationId}`
  await db.collection('pushQueue').doc(pushQueueId).set(
    {
      id: pushQueueId,
      userId: adminUid,
      notificationId,
      notificationType: 'application_submitted',
      title,
      body,
      url,
      status: 'pending',
      createdAt: nowIso,
    },
    { merge: true },
  )
}

/** إرسال Push عند إنشاء مستند في pushQueue (اسم مختلف لتجنب تعارض Cloud Run مع نشر سابق). */
exports.dispatchPushFromQueue = functions
  .region('us-central1')
  .firestore.document('pushQueue/{queueId}')
  .onCreate(async (snap, context) => {
    const queueId = context.params.queueId
    const payload = snap.data() || {}
    const userId = toSafeString(payload.userId)
    const title = toSafeString(payload.title) || 'إشعار جديد'
    const body = toSafeString(payload.body)
    const link = toSafeString(payload.url) || '/app/notifications'

    const queueRef = db.collection('pushQueue').doc(queueId)
    if (!userId) {
      await queueRef.set(
        {
          status: 'failed',
          errorCode: 'MISSING_USER_ID',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return
    }

    const userRef = db.collection('users').doc(userId)
    const userSnap = await userRef.get()
    const userData = userSnap.exists ? userSnap.data() || {} : {}
    const token = toSafeString(userData.pushToken || userData.fcmToken)

    if (!token) {
      await queueRef.set(
        {
          status: 'failed',
          errorCode: 'MISSING_PUSH_TOKEN',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return
    }

    try {
      const messageId = await messaging.send({
        token,
        notification: {
          title,
          body,
        },
        data: {
          title,
          body,
          url: link,
          tag: `push-${queueId}`,
          vibrate: PUSH_VIBRATE_JSON,
        },
        webpush: {
          fcmOptions: { link },
          notification: {
            title,
            body,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: `push-${queueId}`,
            vibrate: [22, 45, 28, 45, 32, 55, 28, 70, 200],
          },
        },
      })

      await queueRef.set(
        {
          status: 'sent',
          messageId,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    } catch (err) {
      const code = toSafeString(err?.code)
      const message = toSafeString(err?.message)
      functions.logger.error('sendPushFromQueue failed', { queueId, userId, code, message })

      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token') ||
        code.includes('messaging/registration-token-not-registered') ||
        code.includes('messaging/invalid-registration-token')
      ) {
        await userRef.set(
          {
            pushToken: admin.firestore.FieldValue.delete(),
            pushTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
      }

      await queueRef.set(
        {
          status: 'failed',
          errorCode: code || 'UNKNOWN',
          errorMessage: message || 'Push send failed',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }
  })

/**
 * عند تقديم/إعادة تقديم طلب الالتحاق: إشعار داخلي + pushQueue لكل الأدمن.
 * dispatchPushFromQueue يرسل FCM عند إنشاء مستند pushQueue.
 */
exports.enqueueApplicationSubmitAdminNotify = functions
  .region('us-central1')
  .firestore.document('MyProfile/{userId}/MyProfile/{profileId}')
  .onWrite(async (change, context) => {
    const { userId, profileId } = context.params
    if (userId !== profileId) return

    const after = change.after.exists ? change.after.data() || {} : null
    const before = change.before.exists ? change.before.data() || {} : null
    if (!shouldNotifyAdminsOfApplicationSubmit(before, after)) return

    const applicantName =
      toSafeString(after.fullName || after.displayName) || 'مستخدم'
    const submittedKey = Date.parse(toSafeString(after.submittedAt)) || Date.now()

    let adminUids = []
    try {
      adminUids = await loadAdminUserIds()
    } catch (err) {
      functions.logger.error('enqueueApplicationSubmitAdminNotify: load admins failed', {
        userId,
        message: String(err?.message || err),
      })
      return
    }
    if (!adminUids.length) {
      functions.logger.warn('enqueueApplicationSubmitAdminNotify: no admins found', { userId })
      return
    }

    try {
      await Promise.all(
        adminUids.map((adminUid) =>
          enqueueApplicationSubmitAdminNotification({
            adminUid,
            applicantUid: userId,
            submittedKey,
            applicantName,
          }),
        ),
      )
      functions.logger.info('enqueueApplicationSubmitAdminNotify: queued for admins', {
        userId,
        adminCount: adminUids.length,
      })
    } catch (err) {
      functions.logger.error('enqueueApplicationSubmitAdminNotify failed', {
        userId,
        message: String(err?.message || err),
      })
    }
  })

/**
 * عند قبول/رفض طلب الالتحاق: إنشاء مستند في mail بصلاحيات المشرف (تتجاوز قواعد العميل).
 * يتطلّب تثبيت توسعة «Trigger Email from Firestore» وتهيئة SMTP على نفس مجموعة mail.
 */
exports.enqueueApplicationReviewMail = functions
  .region('us-central1')
  .firestore.document('MyProfile/{userId}/MyProfile/{profileId}')
  .onUpdate(async (change, context) => {
    const { userId, profileId } = context.params
    if (userId !== profileId) return

    const before = change.before.data() || {}
    const after = change.after.data() || {}
    if (before.status === after.status) return

    const st = String(after.status || '').trim()
    if (st !== 'approved' && st !== 'rejected') return

    let to = String(after.email || '').trim()
    if (!to) {
      const uSnap = await db.collection('users').doc(userId).get()
      if (uSnap.exists) {
        to = String(uSnap.data()?.email || '').trim()
      }
    }
    if (!to) {
      functions.logger.warn('enqueueApplicationReviewMail: no recipient email', { userId })
      return
    }

    const reviewerLabel = String(after.reviewerName || '').trim() || 'المشرف'
    const note = String(after.statusMessage || '').trim()
    const isApproved = st === 'approved'
    const subject = isApproved
      ? 'تم قبول طلب الالتحاق'
      : 'تم رفض طلب الالتحاق — يمكنك التعديل وإعادة التقديم'
    const text = isApproved
      ? `السلام عليكم ورحمة الله وبركاته،

تم قبول طلب الالتحاق الخاص بك بنجاح.
يمكنك الآن الدخول إلى المنصة واستخدامها وفق صلاحيات حسابك.

مراجعة: ${reviewerLabel}`
      : `السلام عليكم ورحمة الله وبركاته،

لم يُعتمد طلب الالتحاق الخاص بك في هذه المرحلة.
${note ? `\nملاحظة المشرف:\n${note}\n` : '\n'}
يرجى مراجعة البيانات وتعديل ما يلزم ثم إعادة إرسال طلب الالتحاق عند الجاهزية.

مراجعة: ${reviewerLabel}`

    const html = `<div dir="rtl" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.6">${textToHtmlParagraphs(
      text,
    )}</div>`

    try {
      await db.collection('mail').add({
        to: [to],
        userId,
        kind: 'application_review_result',
        message: {
          subject,
          text,
          html,
        },
        createdAt: new Date().toISOString(),
      })
      functions.logger.info('enqueueApplicationReviewMail: mail doc created', { userId })
    } catch (err) {
      functions.logger.error('enqueueApplicationReviewMail failed', {
        userId,
        message: String(err?.message || err),
      })
    }
  })
