const CACHE='acerola-shell-v13';
const ASSETS=['./agent-core.js','./agent-tools.js','./engine-runtime.js','./acerola-features.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function documentResponse(req){
 try{
  const r=await fetch(req,{cache:'no-store'});
  const type=r.headers.get('content-type')||'';
  if(!type.includes('text/html'))return r;
  const html=await r.text();
  const injected=html.includes('acerola-features.js')?html:html.replace('</body>','<script src="acerola-features.js?v=1.0.0"></script></body>');
  return new Response(injected,{status:r.status,statusText:r.statusText,headers:r.headers});
 }catch(e){
  return caches.match('./index.html').then(x=>x||new Response('Acerola is offline.',{status:503}));
 }
}
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 if(e.request.mode==='navigate'||e.request.destination==='document'){e.respondWith(documentResponse(e.request));return;}
 e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});