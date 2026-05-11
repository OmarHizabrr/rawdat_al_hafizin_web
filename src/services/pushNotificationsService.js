import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { app } from '../firebase.js'
import { firestoreApi } from './firestoreApi.js'

let foregroundUnsubscribe = null

function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

function readPushTokenCache(uid) {
  if (!uid) return ''
  try {
    return String(localStorage.getItem(`rh.push.token.${uid}`) || '').trim()
  } catch {
    return ''
  }
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

async function registerPushTokenForUser(user, token) {
  if (!user?.uid || !token) return
  await firestoreApi.updateData({
    docRef: firestoreApi.getUserDoc(user.uid),
    data: {
      pushToken: token,
      pushTokenUpdatedAt: new Date().toISOString(),
      pushTokenPlatform: 'web',
    },
    userData: user,
  })
}

function showForegroundNotification(payload) {
  if (!canUseBrowserNotifications()) return
  if (Notification.permission !== 'granted') return
  const title = String(payload?.notification?.title || payload?.data?.title || 'إشعار جديد').trim()
  const body = String(payload?.notification?.body || payload?.data?.body || '').trim()
  const url = String(payload?.data?.url || '/app/notifications').trim() || '/app/notifications'
  const icon = String(payload?.notification?.icon || '/logo.png').trim() || '/logo.png'
  const tag = String(payload?.messageId || payload?.collapseKey || `fg-${Date.now()}`).trim()
  // إشعار فوري أثناء فتح التطبيق.
  new Notification(title, { body, icon, tag, data: { url } })
}

export async function enablePushNotificationsForUser(user) {
  if (!user?.uid || !canUseBrowserNotifications()) return { ok: false, reason: 'UNAVAILABLE' }
  const permission = await Notification.requestPermission().catch(() => 'denied')
  if (permission !== 'granted') return { ok: false, reason: 'DENIED' }

  const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim()
  if (!vapidKey) return { ok: false, reason: 'MISSING_VAPID_KEY' }

  const reg = await navigator.serviceWorker.ready
  const messaging = await getMessagingInstance()
  if (!messaging) return { ok: false, reason: 'MESSAGING_UNSUPPORTED' }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: reg,
  })
  if (!token) return { ok: false, reason: 'NO_TOKEN' }

  const cached = readPushTokenCache(user.uid)
  if (cached !== token) {
    await registerPushTokenForUser(user, token)
    writePushTokenCache(user.uid, token)
  }

  if (typeof foregroundUnsubscribe === 'function') foregroundUnsubscribe()
  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    showForegroundNotification(payload)
  })

  return { ok: true, token }
}

