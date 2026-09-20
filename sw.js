/*
GoTrain - a personal workout tracker
Copyright (C) 2026 Nikolaos Lykouresis

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
// GoTrain Service Worker
const CACHE_NAME = 'gotrain-v17';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './fonts/bebas-neue-latin.woff2',
  './fonts/bebas-neue-latin-ext.woff2',
  './fonts/dm-sans-latin.woff2',
  './fonts/dm-sans-latin-ext.woff2'
];

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

  // Nothing cross-origin is ours to answer -- the app makes no third-party
  // requests at all now that the fonts are self-hosted. Intercepting a foreign
  // origin would turn a network failure into a bogus success.
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return;

  // App shell: cache-first, falling back to index.html only for navigations.
  if (SHELL_PATHS.has(url.pathname)) {
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

  // Other same-origin assets: network with cache fallback.
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
