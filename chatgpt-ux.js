(()=>{'use strict';
const $=s=>document.querySelector(s), esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const style=document.createElement('style');style.id='acerola-chatgpt-ux-style';style.textContent=`
/* ChatGPT-style interaction layer */
.chat-item{position:relative;padding-right:34px!important}
.chat-unread-dot{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#4d9cff;box-shadow:0 0 10px rgba(77,156,255,.55)}
.send.is-generating{font-size:0!important;border-radius:12px!important;background:#15171b!important;border-color:rgba(255,255,255,.18)!important}
.send.is-generating:before{content:'';display:block;width:14px;height:14px;margin:auto;border:2px solid #d8e1ee;border-radius:3px}
.send.is-generating:hover:before{border-color:#20f6ff}
.message-actions{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:9px;padding-top:7px;border-top:1px solid rgba(255,255,255,.055);opacity:.88}
.message-actions button{display:inline-flex;align-items:center;justify-content:center;min-width:30px;min-height:30px;border:1px solid transparent;background:transparent;color:#9ba6b7;border-radius:8px;padding:5px 7px;font-size:14px;line-height:1;cursor:pointer;touch-action:manipulation}
.message-actions button:hover,.message-actions button:focus-visible{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.09);color:#f4f6fa;outline:none}
.message-actions button[data-message-action="feedback"],.message-actions button[data-message-action="bad"]{font-size:13px}
.message-actions button[data-message-action="edit"]{color:#d2d7e0}
@media(max-width:600px){.message-actions{gap:2px;margin-top:8px}.message-actions button{min-width:32px;min-height:32px;font-size:15px}.chat-message-menu{min-width:180px!important}.chat-message-menu button{min-height:42px;font-size:14px!important}}
.chat-message-menu{position:fixed;z-index:99999;min-width:170px;padding:6px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:#111318;box-shadow:0 16px 45px rgba(0,0,0,.55);backdrop-filter:blur(18px)}
.chat-message-menu button{display:block;width:100%;padding:10px 11px;border:0;border-radius:9px;background:transparent;color:#eef4ff;text-align:left;font-size:12px}
.chat-message-menu button:hover{background:rgba(255,255,255,.08)}
.chat-search-row{padding:0 12px 9px}.chat-search-input{display:block;width:100%;min-height:40px;padding:9px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#15171b;color:#f3f4f6;font-size:13px;outline:none}.chat-search-input:focus{border-color:rgba(255,255,255,.3)}.chat-search-input::placeholder{color:#858b96}
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

let menu=null,longTimer=null,downX=0,downY=0,progressTimer=null,chatSearchQuery='';
const getChats=()=>{try{return JSON.parse(localStorage.getItem('acerola-ai-chats-v6')||'[]')}catch(_){return[]}};
const getActiveChatId=()=>localStorage.getItem('acerola-ai-active-v6')||window.activeId||'';
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
  const id=getActiveChatId();
  if(id&&unread()[id]){delete unread()[id];saveUnread()}
  const h=$('#history');h?.querySelectorAll('.chat-item').forEach(b=>b.querySelector('.chat-unread-dot')?.remove());
}
function renderUnread(){
  const u=unread(),h=$('#history');if(!h)return;
  h.querySelectorAll('.chat-item[data-id]').forEach(b=>{const has=!!u[b.dataset.id];b.querySelector('.chat-unread-dot')?.remove();if(has){const d=document.createElement('span');d.className='chat-unread-dot';d.setAttribute('aria-label','Unread reply');b.appendChild(d)}});
}
function applyChatSearch(){
 const history=$('#history');if(!history)return;
 const q=chatSearchQuery.trim().toLocaleLowerCase();
 const chats=getChats();
 history.querySelectorAll('.chat-item[data-id]').forEach(button=>{
  const chat=chats.find(c=>c.id===button.dataset.id);
  const haystack=[chat?.title||'',...(chat?.messages||[]).map(m=>m.content||'')].join(' ').toLocaleLowerCase();
  button.style.display=!q||haystack.includes(q)?'':'none';
 });
}
function setupChatSearch(){
 const button=document.querySelector('.drawer-search'),head=document.querySelector('.drawer-head');
 if(!button||!head||button.dataset.searchBound)return;button.dataset.searchBound='1';
 let row=document.querySelector('.chat-search-row'),field;
 if(!row){row=document.createElement('div');row.className='chat-search-row';row.hidden=true;field=document.createElement('input');field.className='chat-search-input';field.type='search';field.placeholder='Search chats and messages';field.setAttribute('aria-label','Search chats and messages');row.appendChild(field);head.insertAdjacentElement('afterend',row)}else field=row.querySelector('input');
 button.setAttribute('aria-label','Search chats');
 button.addEventListener('click',()=>{
  row.hidden=!row.hidden;
  if(row.hidden){chatSearchQuery='';field.value='';applyChatSearch();button.setAttribute('aria-pressed','false')}
  else{button.setAttribute('aria-pressed','true');field.focus()}
 });
 field.addEventListener('input',()=>{chatSearchQuery=field.value;applyChatSearch()});
 field.addEventListener('keydown',e=>{if(e.key==='Escape'){field.value='';chatSearchQuery='';applyChatSearch();row.hidden=true;button.setAttribute('aria-pressed','false');button.focus()}});
}
function enhanceHistory(){
  setupChatSearch();applyChatSearch();
  renderUnread();
  $('#history')?.querySelectorAll('.chat-item[data-id]').forEach(b=>{b.addEventListener('click',()=>{delete unread()[b.dataset.id];saveUnread();setTimeout(renderUnread,0)},{once:false})});
}
function copyText(text){navigator.clipboard?.writeText(String(text||'')).catch(()=>{const ta=document.createElement('textarea');ta.value=String(text||'');document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()})}
function closeMenu(){menu?.remove();menu=null}
function showMenu(row,index,x,y){
 closeMenu();menu=document.createElement('div');menu.className='chat-message-menu';
 const role=row.classList.contains('user')?'user':'assistant';
 const buttons=role==='user'?[['copy','Copy'],['edit','Edit'],['share','Share']]:[['copy','Copy'],['read','Read aloud'],['share','Share'],['feedback','Good response'],['bad','Bad response'],['retry','Regenerate response']];
 menu.innerHTML=buttons.map(([a,t])=>'<button type="button" data-a="'+a+'">'+t+'</button>').join('');
 document.body.appendChild(menu);
 menu.style.left=Math.min(Math.max(8,x),innerWidth-190)+'px';menu.style.top=Math.min(Math.max(8,y),innerHeight-menu.offsetHeight-8)+'px';
 const c=getChats().find(z=>z.id===getActiveChatId());
 const msg=c?.messages?.[index];const act=a=>{
  if(a==='copy')copyText(msg?.content||'');
  if(a==='edit'){window.acerolaEditMessage?.(index)}
  if(a==='read'){if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(String(msg?.content||'')))}}
  if(a==='share'){if(navigator.share)navigator.share({title:'Acerola',text:String(msg?.content||'')}).catch(()=>{});else copyText(msg?.content||'')}
  if(a==='retry'){window.acerolaRetryLast?.()}
  if(a==='feedback'||a==='bad'){try{const all=getChats(),active=all.find(z=>z.id===getActiveChatId()),target=active?.messages?.[index];if(target){target.feedback=a==='feedback'?'good':'bad';localStorage.setItem('acerola-ai-chats-v6',JSON.stringify(all));}}catch(_){}}
  closeMenu()
 };
 menu.querySelectorAll('button').forEach(b=>b.onclick=()=>act(b.dataset.a));
 setTimeout(()=>{const dismiss=e=>{if(menu&&!menu.contains(e.target)){closeMenu();document.removeEventListener('pointerdown',dismiss,true)}};document.addEventListener('pointerdown',dismiss,true)},0);
}
function attachMessageLongPress(){
 const list=$('.list');if(!list)return;
 [...list.children].forEach((row,index)=>{
  if(row.dataset.uxBound)return;row.dataset.uxBound='1';
  const target=row.querySelector('.bubble')||row;
  const bubble=row.querySelector('.bubble');
  if(bubble&&!bubble.querySelector('.message-actions')){
   bubble.querySelector('.edit-message')?.remove();
   const actions=document.createElement('div');actions.className='message-actions';actions.setAttribute('aria-label','Message actions');
   const role=row.classList.contains('user')?'user':'assistant';
   const items=role==='user'?[['copy','⧉','Copy'],['edit','✎','Edit'],['share','↗','Share']]:[['copy','⧉','Copy'],['read','◖','Read aloud'],['share','↗','Share'],['feedback','👍','Good response'],['bad','👎','Bad response'],['retry','↻','Regenerate']];
   actions.innerHTML=items.map(([action,icon,label])=>'<button type="button" data-message-action="'+action+'" data-message-index="'+index+'" title="'+label+'" aria-label="'+label+'">'+icon+'</button>').join('');
   bubble.appendChild(actions);
  }
  target.addEventListener('contextmenu',e=>{e.preventDefault();showMenu(row,index,e.clientX,e.clientY)});
  target.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;downX=e.clientX;downY=e.clientY;clearTimeout(longTimer);longTimer=setTimeout(()=>showMenu(row,index,e.clientX,e.clientY),520)},{passive:true});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>target.addEventListener(ev,()=>clearTimeout(longTimer),{passive:true}));
  target.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-downX)>10||Math.abs(e.clientY-downY)>10)clearTimeout(longTimer)},{passive:true});
 });
}
function runMessageAction(action,index){
 const chat=getChats().find(z=>z.id===getActiveChatId()),msg=chat?.messages?.[index];if(!msg)return;
 if(action==='copy'){copyText(msg.content||'');return}
 if(action==='edit'){window.acerolaEditMessage?.(index);return}
 if(action==='read'){if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(String(msg.content||'')))}return}
 if(action==='share'){if(navigator.share)navigator.share({title:'Acerola',text:String(msg.content||'')}).catch(()=>{});else copyText(msg.content||'');return}
 if(action==='feedback'||action==='bad'){try{const all=getChats(),c=all.find(z=>z.id===getActiveChatId()),m=c?.messages?.[index];if(m){m.feedback=action==='feedback'?'good':'bad';localStorage.setItem('acerola-ai-chats-v6',JSON.stringify(all));}}catch(_){}return}
 if(action==='retry'){window.acerolaRetryLast?.();return}
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-message-action]');if(!b)return;e.preventDefault();e.stopPropagation();runMessageAction(b.dataset.messageAction,Number(b.dataset.messageIndex))},true);

function sanitizeRenderedReplies(){
 document.querySelectorAll('.row.assistant .bubble').forEach(b=>{
  const text=b.textContent.trim();
  if(/^[{\\[]/.test(text)&&/"(?:type|message|reply)"\\s*:/.test(text)){
   let message='';
   try{const o=JSON.parse(text);message=typeof o.message==='string'?o.message:(typeof o.reply==='string'?o.reply:'')}catch(_){}
   if(message){b.querySelector('.md')?.remove();const md=document.createElement('div');md.className='md';md.textContent=message;b.insertBefore(md,b.querySelector('.acerola-sources')||null);}
  }
  const lists=[...b.querySelectorAll('ol')];let offset=0;lists.forEach((ol,i)=>{if(i){ol.start=offset+1}offset+=ol.querySelectorAll(':scope > li').length});
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
 enhanceHistory();attachMessageLongPress();collapseSources();sanitizeRenderedReplies();
 const inner=$('.inner');if(inner&&!inner.dataset.uxObserver){inner.dataset.uxObserver='1';new MutationObserver(()=>{enhanceHistory();attachMessageLongPress();collapseSources()}).observe(inner,{childList:true,subtree:true})}
}
window.addEventListener('acerola:engine-task',e=>{researchLive(e.detail);if(e.detail?.type==='complete'||e.detail?.type==='failed')finishResearch()});
window.addEventListener('acerola:reply-ready',e=>{const d=e.detail||{};if(d.chatId&&d.chatId!==getActiveChatId()){unread()[d.chatId]=true;saveUnread();renderUnread()}notifyReady(d)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)markSeen()});
document.addEventListener('click',e=>{const b=e.target.closest('#send');if(!b)return;if(b.classList.contains('is-generating')){e.preventDefault();e.stopImmediatePropagation();window.acerolaCancelRequest?.();b.classList.remove('is-generating');b.removeAttribute('aria-label');return}enableNotifications()},{capture:true});
const originalRenderHistory=window.renderHistory; // functions declared in the page are available after boot
/* The main app already creates a fresh chat on boot. Do not create a second one here. */
window.addEventListener('acerola:gateway-retry',()=>{
  const p=document.querySelector('.engine-progress #engine-progress-text');
  if(p)p.textContent='Connection interrupted — retrying automatically…';
});
setTimeout(()=>{observe();markSeen()},800);
setInterval(observe,1200);
})();