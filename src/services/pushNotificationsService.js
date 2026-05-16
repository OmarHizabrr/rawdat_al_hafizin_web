import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { app } from '../firebase.js'
import { firestoreApi } from './firestoreApi.js'
import { rhHapticPushDelivery } from '../utils/haptics.js'
import { absoluteUrl } from '../config/site.js'
import { notificationsEnabled } from '../utils/notificationsPrefs.js'

/** أنماط اهتزاز للإشعار في المتصفحات التي تدعمها ضمن Web Notifications */
const PUSH_NOTIFICATION_VIBRATE = Object.freeze([22, 45, 28, 45, 32, 55, 28, 70, 200])

let foregroundUnsubscribe = null

function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

function writePushTokenCache(uid, token) {
  if (!uid) return
  try {
    localStorage.setItem(`rh.push.token.${uid}`, String(token || '').trim())
  } catch {
    /* ignore */
  }
}

async function getMessagingInstance() {
  const ok = await isSupported().catch(() => false)
  if (!ok) return null
  return getMessaging(app)
}

function profileAlreadyHasToken(user, token) {
  const t = String(token || '').trim()
  if (!t) return false
  const a = String(user?.pushToken || '').trim()
  const b = String(user?.fcmToken || '').trim()
  return a === t || b === t
}

async function registerPushTokenForUser(user, token) {
  if (!user?.uid || !token) return false
  if (profileAlreadyHasToken(user, token)) return false
  const nowIso = new Date().toISOString()
  await firestoreApi.updateData({
    docRef: firestoreApi.getUserDoc(user.uid),
    data: {
      /** توكن FCM للويب — يُستخدم في Cloud Functions لإرسال الإشعارات */
      pushToken: token,
      /** نفس القيمة باسم أوضح للمشرفين والتكاملات الخارجية */
      fcmToken: token,
      pushTokenUpdatedAt: nowIso,
      fcmTokenUpdatedAt: nowIso,
      pushTokenPlatform: 'web',
    },
    userData: user,
  })
  return true
}

function showForegroundNotification(payload) {
  if (!notificationsEnabled()) return
  if (!canUseBrowserNotifications()) return
  if (Notification.permission !== 'granted') return
  const title = String(payload?.notification?.title || payload?.data?.title || 'إشعار جديد').trim()
  const body = String(payload?.notification?.body || payload?.data?.body || '').trim()
  const url = String(payload?.data?.url || '/app/notifications').trim() || '/app/notifications'
  const icon =
    String(payload?.notification?.icon || payload?.data?.icon || absoluteUrl('/logo.png')).trim() ||
    absoluteUrl('/logo.png')
  const tag = String(payload?.messageId || payload?.collapseKey || `fg-${Date.now()}`).trim()
  rhHapticPushDelivery()
  new Notification(title, {
    body,
    icon,
    tag,
    vibrate: [...PUSH_NOTIFICATION_VIBRATE],
    data: { url },
  })
}

function attachForegroundListener(messaging) {
  if (typeof foregroundUnsubscribe === 'function') foregroundUnsubscribe()
  if (!messaging || Notification.permission !== 'granted') {
    foregroundUnsubscribe = null
    return
  }
  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    showForegroundNotification(payload)
  })
}

/**
 * يحصل على توكن FCM ويحفظه في مستند المستخدم — مستقل عن وضع «إشعارات المنصة» في الإعدادات
 * (ذلك الوضع يتحكم فقط في التنبيهات المحلية داخل الصفحة، وليس في حفظ توكن الدفع).
 */
export async function syncFcmTokenToProfile(user) {
  if (!user?.uid || !canUseBrowserNotifications()) return { ok: false, reason: 'UNAVAILABLE' }

  const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim()
  if (!vapidKey) {
    console.warn('[push] VITE_FIREBASE_VAPID_KEY missing — cannot obtain FCM token')
    return { ok: false, reason: 'MISSING_VAPID_KEY' }
  }

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission().catch(() => 'denied')
  }
  if (permission !== 'granted') {
    console.warn('[push] Notification permission not granted:', permission)
    return { ok: false, reason: 'DENIED' }
  }

  const reg = await navigator.serviceWorker.ready
  const messaging = await getMessagingInstance()
  if (!messaging) {
    console.warn('[push] Firebase Messaging not supported in this browser')
    return { ok: false, reason: 'MESSAGING_UNSUPPORTED' }
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: reg,
  })
  if (!token) {
    console.warn('[push] getToken returned empty')
    return { ok: false, reason: 'NO_TOKEN' }
  }

  const tokenStr = String(token).trim()

  const didWrite = await registerPushTokenForUser(user, tokenStr)
  writePushTokenCache(user.uid, tokenStr)
  attachForegroundListener(messaging)

  if (import.meta.env.DEV && didWrite) {
    console.log('[push] FCM token saved to users doc', {
      uid: user.uid,
      tokenPreview: `${tokenStr.slice(0, 24)}…`,
    })
  }

  return { ok: true, token: tokenStr }
}

/** اسم قديم / للواجهات التي تطلب «تفعيل الإشعارات» صراحةً */
export const enablePushNotificationsForUser = syncFcmTokenToProfile
