/* روضة الحافظين — عامل خدمة خفيف لدعم التثبيت وتجربة أقرب للتطبيق */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const DEFAULT_PUSH_VIBRATE = [22, 45, 28, 45, 32, 55, 28, 70, 200]

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'إشعار جديد',
    body: '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: '/app/notifications' },
    tag: `push-${Date.now()}`,
  }
  let payload = fallback
  try {
    const raw = event.data ? event.data.json() : {}
    const data = raw?.data || raw || {}
    let vibrate = DEFAULT_PUSH_VIBRATE
    try {
      const v = data.vibrate
      if (typeof v === 'string' && v.trim()) {
        const parsed = JSON.parse(v)
        if (Array.isArray(parsed) && parsed.length) vibrate = parsed.map((n) => Number(n) || 0).filter((n) => n > 0)
      }
    } catch {
      /* keep default */
    }
    const title = String(raw?.notification?.title || data.title || fallback.title)
    const body = String(raw?.notification?.body || data.body || fallback.body)
    const icon = String(raw?.notification?.icon || data.icon || fallback.icon)
    const badge = String(data.badge || fallback.badge)
    const url = String(data.url || '/app/notifications')
    const tag = String(data.tag || raw?.collapseKey || `push-${Date.now()}`)
    payload = { title, body, icon, badge, data: { url }, tag, vibrate }
  } catch {
    payload = { ...fallback, vibrate: DEFAULT_PUSH_VIBRATE }
  }
  const { title, body, icon, badge, data, tag, vibrate } = payload
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data,
      tag,
      vibrate,
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = String(event.notification?.data?.url || '/app/notifications')
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
      return undefined
    }),
  )
})
