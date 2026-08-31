// GoTrain Service Worker
const CACHE_NAME = 'gotrain-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Cross-origin hosts we still want cached for offline use. Everything else
// cross-origin is passed straight through to the network, untouched.
const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

// Resolved once so shell matching is an exact pathname comparison. The old
// `ASSETS.some(a => url.pathname.endsWith(a.replace('./', '')))` test matched
// everything: './' collapses to '' and `endsWith('')` is always true, so every
// request -- cross-origin ones included -- took the app-shell branch and its
// `.catch(() => caches.match('./index.html'))`. A blocked request would then
// resolve as a 200 full of our own HTML instead of rejecting.
const SHELL_PATHS = new Set(ASSETS.map(a => new URL(a, self.location.href).pathname));

// Install: cache all shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for shell, network-first for fonts, hands off otherwise
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only GETs are cacheable, and only our own origin plus the font CDNs are
  // ours to answer. The sync flow talks to a LAN server on another origin;
  // intercepting that would turn a network failure into a bogus success.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin && !FONT_HOSTS.includes(url.origin)) return;

  // App shell: cache-first, falling back to index.html only for navigations.
  if (sameOrigin && SHELL_PATHS.has(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return resp;
        }).catch(err => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          throw err;
        });
      })
    );
    return;
  }

  // Fonts and other same-origin assets: network with cache fallback.
  event.respondWith(
    fetch(req).then(resp => {
      if (resp && resp.status === 200 && resp.type !== 'opaque') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
      }
      return resp;
    }).catch(err => caches.match(req).then(cached => {
      if (cached) return cached;
      throw err;
    }))
  );
});
