/* روضة الحافظين — عامل خدمة خفيف لدعم التثبيت وتجربة أقرب للتطبيق */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'إشعار جديد',
    body: '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: '/app/notifications' },
  }
  let payload = fallback
  try {
    const raw = event.data ? event.data.json() : {}
    const data = raw?.data || raw || {}
    payload = {
      title: String(raw?.notification?.title || data.title || fallback.title),
      body: String(raw?.notification?.body || data.body || fallback.body),
      icon: String(raw?.notification?.icon || data.icon || fallback.icon),
      badge: String(data.badge || fallback.badge),
      data: { url: String(data.url || '/app/notifications') },
      tag: String(data.tag || raw?.collapseKey || `push-${Date.now()}`),
    }
  } catch {
    payload = fallback
  }
  event.waitUntil(self.registration.showNotification(payload.title, payload))
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
