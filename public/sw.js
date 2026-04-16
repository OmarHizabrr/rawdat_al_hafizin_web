/* روضة الحافظين — عامل خدمة خفيف لدعم التثبيت وتجربة أقرب للتطبيق */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
