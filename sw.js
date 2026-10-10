/* Acerola offline shell cache. Cloud AI still requires a working connection. */
'use strict';
const CACHE = 'acerola-shell-v1';
const SHELL = [
  './',
  './index.html',
  './agent-core.js',
  './agent-tools.js',
  './engine-runtime.js',
  './chatgpt-ux.js',
  './chat-enhancements.js',
  './ui-enhancements.js',
  './ui-stability.js',
  './account-system.js',
  './acerola-native.js',
  './support.js',
  './manifest.webmanifest',
  './icon.svg'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(path => cache.add(new Request(new URL(path, self.registration.scope), { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('acerola-shell-') && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(new URL('./index.html', self.registration.scope), response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match(request, { ignoreSearch: true })) ||
          (await cache.match(new URL('./index.html', self.registration.scope), { ignoreSearch: true })) ||
          new Response('Acerola is not cached on this device yet. Connect once and reload to enable offline startup.', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }
  if (/\.(?:js|css|svg|webmanifest|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) {
        fetch(request).then(response => {
          if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
        }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return new Response('', { status: 504, statusText: 'Offline asset unavailable' });
      }
    })());
  }
});
