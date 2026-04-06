const CACHE_NAME = 'nuances-v2'
const DATA_URLS = [
  '/data/communes-france.geojson',
  '/data/communes_geo.json',
  '/data/communes_scores.json',
  '/data/departements.json',
  '/data/communes_centroids.json',
  '/data/indicators.json',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (DATA_URLS.some(d => url.pathname === d)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone())
            return response
          }).catch(() => cached)

          return cached || fetchPromise
        })
      )
    )
    return
  }
})
