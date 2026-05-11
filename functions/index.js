/* eslint-env node */
/* global require, exports */
const admin = require('firebase-admin')
const functions = require('firebase-functions/v1')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()
const messaging = admin.messaging()

function toSafeString(value) {
  return String(value || '').trim()
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
    const token = toSafeString(userData.pushToken)

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
        },
        webpush: {
          fcmOptions: { link },
          notification: {
            title,
            body,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: `push-${queueId}`,
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
