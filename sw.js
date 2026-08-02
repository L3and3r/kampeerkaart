/* Kampeerkaart - houdt de app beschikbaar zonder bereik.
   v2: de pagina zelf komt eerst van het netwerk, zodat een nieuwe upload
   meteen zichtbaar is. Kaarttegels staan in IndexedDB, niet hier. */
const CACHE = 'kampeerkaart-v2';
const SHELL = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // kaarttegels, radar en weer-API's nooit hier cachen
  if (/kartverket|tile\.openstreetmap|rainviewer|api\.met\.no|overpass/.test(req.url)) return;

  // de pagina zelf: eerst netwerk, cache alleen als vangnet
  if (req.mode === 'navigate' || req.url.endsWith('.html') || req.url.endsWith('/')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Leaflet e.d.: eerst cache, dat verandert toch niet
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
