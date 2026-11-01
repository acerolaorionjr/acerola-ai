/* Acerola offline shell cache. Cloud AI still requires a working connection. */
'use strict';
const CACHE = 'acerola-shell-v3';
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
      const canonical = new URL(request.url);
      canonical.search = '';
      const cached = await cache.match(canonical);
      // Serve cached assets immediately on weak mobile networks, but refresh the
      // canonical cache key in the background so versioned URLs cannot pin stale JS.
      if (cached) {
        fetch(request).then(response => {
          if (response && response.ok) cache.put(canonical, response.clone()).catch(() => {});
        }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(canonical, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return new Response('', { status: 504, statusText: 'Offline asset unavailable' });
      }
    })());
  }
});

self.addEventListener('notificationclick', event => {
  const chatId = String(event.notification?.data?.chatId || '');
  event.notification?.close();
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.registration.scope)) {
        await client.focus();
        client.postMessage({ type: 'ACEROLA_OPEN_CHAT', chatId });
        return;
      }
    }
    const target = new URL(self.registration.scope);
    if (chatId) target.searchParams.set('acerola_chat', chatId);
    const client = await self.clients.openWindow(target.href);
    if (client) client.postMessage({ type: 'ACEROLA_OPEN_CHAT', chatId });
  })());
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}
  const chatId = String(payload.chatId || '');
  const title = String(payload.title || 'Acerola reply ready').slice(0, 100);
  const body = String(payload.body || 'Acerola has finished replying.').slice(0, 180);
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: new URL('./icon.svg', self.registration.scope).href,
    tag: 'acerola-reply-' + (chatId || 'latest'),
    renotify: true,
    data: { chatId }
  }));
});
