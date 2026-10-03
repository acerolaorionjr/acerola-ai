(()=>{'use strict';
const $=s=>document.querySelector(s), esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const style=document.createElement('style');style.id='acerola-chatgpt-ux-style';style.textContent=`
/* ChatGPT-style interaction layer */
.chat-item{position:relative;padding-right:34px!important}
.chat-unread-dot{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#4d9cff;box-shadow:0 0 10px rgba(77,156,255,.55)}
.send.is-generating{font-size:0!important;border-radius:12px!important;background:#15171b!important;border-color:rgba(255,255,255,.18)!important}
.send.is-generating:before{content:'';display:block;width:14px;height:14px;margin:auto;border:2px solid #d8e1ee;border-radius:3px}
.send.is-generating:hover:before{border-color:#20f6ff}
.message-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;opacity:.78}
.message-actions button{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:#b8c5d7;border-radius:9px;padding:5px 8px;font-size:10px}
.message-actions button:hover{background:rgba(255,255,255,.08);color:#fff}
.chat-message-menu{position:fixed;z-index:99999;min-width:170px;padding:6px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:#111318;box-shadow:0 16px 45px rgba(0,0,0,.55);backdrop-filter:blur(18px)}
.chat-message-menu button{display:block;width:100%;padding:10px 11px;border:0;border-radius:9px;background:transparent;color:#eef4ff;text-align:left;font-size:12px}
.chat-message-menu button:hover{background:rgba(255,255,255,.08)}
.acerola-research-live{margin:4px 0 4px 40px;padding:10px 12px;border:1px solid rgba(32,246,255,.12);border-radius:13px;background:rgba(9,18,32,.7);font-size:11px;color:#9eafc5}
.acerola-research-live b{display:block;color:#e7f8ff;font-size:11px;margin-bottom:5px}
.acerola-research-live .research-place{display:inline-flex;align-items:center;gap:5px;margin:3px 4px 0 0;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.045);color:#9fb0c8}
.acerola-research-live .research-place:before{content:'↗';color:#20f6ff}
.acerola-sources{margin-top:14px!important}
.acerola-sources-title{cursor:pointer!important;user-select:none;padding:8px 2px}
.acerola-sources.collapsed .acerola-source{display:none}
.acerola-sources-title:after{content:'⌄';margin-left:auto;opacity:.6}
.acerola-sources:not(.collapsed) .acerola-sources-title:after{content:'⌃'}
`;document.head.appendChild(style);

let menu=null,longTimer=null,downX=0,downY=0,progressTimer=null;
const getChats=()=>{try{return JSON.parse(localStorage.getItem('acerola_chats_v1')||'[]')}catch(_){return[]}};
const saveUnread=()=>{try{localStorage.setItem('acerola_unread_v1',JSON.stringify(window.__acerolaUnread||{}))}catch(_){}};
const unread=()=>window.__acerolaUnread||(window.__acerolaUnread={});
function notifyReady(detail={}){
  const title='Acerola reply ready';
  const body=detail.preview||'Acerola has finished replying.';
  if(document.hidden&&'Notification'in window){
    if(Notification.permission==='granted')new Notification(title,{body,icon:'icon.svg',tag:'acerola-reply'});
  }
  try{window.dispatchEvent(new CustomEvent('acerola:reply-notification',{detail:{title,body,...detail}}))}catch(_){}
}
async function enableNotifications(){
  if(!('Notification'in window))return;
  if(Notification.permission==='default'){try{await Notification.requestPermission()}catch(_){}}
}
function markSeen(){
  const id=window.activeId||document.body.dataset.activeChat;
  if(id&&unread()[id]){delete unread()[id];saveUnread()}
  const h=$('#history');h?.querySelectorAll('.chat-item').forEach(b=>b.querySelector('.chat-unread-dot')?.remove());
}
function renderUnread(){
  const u=unread(),h=$('#history');if(!h)return;
  h.querySelectorAll('.chat-item[data-id]').forEach(b=>{const has=!!u[b.dataset.id];b.querySelector('.chat-unread-dot')?.remove();if(has){const d=document.createElement('span');d.className='chat-unread-dot';d.setAttribute('aria-label','Unread reply');b.appendChild(d)}});
}
function enhanceHistory(){
  renderUnread();
  $('#history')?.querySelectorAll('.chat-item[data-id]').forEach(b=>{b.addEventListener('click',()=>{delete unread()[b.dataset.id];saveUnread();setTimeout(renderUnread,0)},{once:false})});
}
function copyText(text){navigator.clipboard?.writeText(String(text||'')).catch(()=>{const ta=document.createElement('textarea');ta.value=String(text||'');document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()})}
function closeMenu(){menu?.remove();menu=null}
function showMenu(row,index,x,y){
 closeMenu();menu=document.createElement('div');menu.className='chat-message-menu';
 const role=row.classList.contains('user')?'user':'assistant';
 const buttons=role==='user'?[['copy','Copy'],['edit','Edit'],['share','Share']]:[['copy','Copy'],['read','Read aloud'],['share','Share'],['feedback','Good response'],['bad','Bad response']];
 menu.innerHTML=buttons.map(([a,t])=>'<button type="button" data-a="'+a+'">'+t+'</button>').join('');
 document.body.appendChild(menu);
 menu.style.left=Math.min(Math.max(8,x),innerWidth-190)+'px';menu.style.top=Math.min(Math.max(8,y),innerHeight-menu.offsetHeight-8)+'px';
 const c=(()=>{try{return JSON.parse(localStorage.getItem('acerola_chats_v1')||'[]')}catch(_){return[]}})().find(z=>z.id===window.activeId);
 const msg=c?.messages?.[index];const act=a=>{
  if(a==='copy')copyText(msg?.content||'');
  if(a==='edit'){window.acerolaEditMessage?.(index)}
  if(a==='read'){if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(String(msg?.content||'')))}}
  if(a==='share'){if(navigator.share)navigator.share({title:'Acerola',text:String(msg?.content||'')}).catch(()=>{});else copyText(msg?.content||'')}
  if(a==='feedback'){msg.feedback='good';try{localStorage.setItem('acerola_chats_v1',JSON.stringify(JSON.parse(localStorage.getItem('acerola_chats_v1')||'[]')))}catch(_){}}
  if(a==='bad'){msg.feedback='bad';try{localStorage.setItem('acerola_chats_v1',JSON.stringify(JSON.parse(localStorage.getItem('acerola_chats_v1')||'[]')))}catch(_){}}
  closeMenu()
 };
 menu.querySelectorAll('button').forEach(b=>b.onclick=()=>act(b.dataset.a));
 setTimeout(()=>document.addEventListener('pointerdown',closeMenu,{once:true}),0);
}
function attachMessageLongPress(){
 const list=$('.list');if(!list)return;
 [...list.children].forEach((row,index)=>{
  if(row.dataset.uxBound)return;row.dataset.uxBound='1';
  const target=row.querySelector('.bubble')||row;
  target.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;downX=e.clientX;downY=e.clientY;clearTimeout(longTimer);longTimer=setTimeout(()=>showMenu(row,index,e.clientX,e.clientY),520)},{passive:true});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>target.addEventListener(ev,()=>clearTimeout(longTimer),{passive:true}));
  target.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-downX)>10||Math.abs(e.clientY-downY)>10)clearTimeout(longTimer)},{passive:true});
 });
}
function collapseSources(){
 document.querySelectorAll('.acerola-sources').forEach(s=>{
  if(s.dataset.uxBound)return;s.dataset.uxBound='1';s.classList.add('collapsed');
  const t=s.querySelector('.acerola-sources-title');if(t)t.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();s.classList.toggle('collapsed')});
 });
}
function researchLive(detail){
 const t=detail?.task||{};const msg=String(t.stepMessage||'').trim();if(!msg)return;
 let box=$('.acerola-research-live');
 if(!box){box=document.createElement('div');box.className='acerola-research-live';box.innerHTML='<b>Researching…</b><div class="research-places"></div>';$('.inner')?.appendChild(box)}
 const places=box.querySelector('.research-places');
 const candidates=msg.match(/https?:\/\/[^\s)]+|\b(?:Google|Wikipedia|YouTube|Reddit|GitHub|OpenAI|official website|web)\b/gi)||[];
 const unique=[...new Set(candidates)].slice(-8);
 if(unique.length)places.innerHTML=unique.map(x=>'<span class="research-place">'+esc(x.replace(/^https?:\/\//,''))+'</span>').join('');
 box.querySelector('b').textContent=/search|research|source|web/i.test(msg)?msg:'Researching…';
 messages?.scrollTo?.({top:messages.scrollHeight,behavior:'smooth'});
}
function finishResearch(){document.querySelector('.acerola-research-live')?.remove()}
function observe(){
 enhanceHistory();attachMessageLongPress();collapseSources();
 const inner=$('.inner');if(inner&&!inner.dataset.uxObserver){inner.dataset.uxObserver='1';new MutationObserver(()=>{enhanceHistory();attachMessageLongPress();collapseSources()}).observe(inner,{childList:true,subtree:true})}
}
window.addEventListener('acerola:engine-task',e=>{researchLive(e.detail);if(e.detail?.type==='complete'||e.detail?.type==='failed')finishResearch()});
window.addEventListener('acerola:reply-ready',e=>{const d=e.detail||{};if(d.chatId&&d.chatId!==window.activeId){unread()[d.chatId]=true;saveUnread();renderUnread()}notifyReady(d)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)markSeen()});
document.addEventListener('click',e=>{if(e.target.closest('#send'))enableNotifications()},{capture:true});
const originalRenderHistory=window.renderHistory; // functions declared in the page are available after boot
setTimeout(()=>{observe();markSeen()},800);
setInterval(observe,1200);
})();