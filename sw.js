const CACHE='acerola-shell-v16';
const ASSETS=['./agent-core.js','./agent-tools.js','./engine-runtime.js','./acerola-features.js'];
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.clients.claim();const cs=await self.clients.matchAll({type:'window'});for(const c of cs)c.postMessage({type:'ACEROLA_SW_DISABLED'});await self.registration.unregister()})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request,{cache:'no-store'}));});