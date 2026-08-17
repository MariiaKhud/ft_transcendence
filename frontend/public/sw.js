const CACHE_NAME = 'transcendence-static-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL])
    }),
  )

  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Never cache API responses, user data, or articles.
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Only provide an offline fallback for document navigation.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
  }
})