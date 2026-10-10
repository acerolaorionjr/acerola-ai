(()=>{'use strict';
const STYLE='acerola-interaction-fix-style';
if(!document.getElementById(STYLE)){
 const s=document.createElement('style');s.id=STYLE;s.textContent=`
 /* Mobile-safe chat actions: never require a long press to discover controls. */
 .list .row,.list .bubble,.history .chat-item{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
 .list .bubble{touch-action:pan-y!important}
 .message-actions{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:2!important;flex-wrap:wrap!important;gap:4px!important}
 .message-actions button{display:inline-flex!important;visibility:visible!important;pointer-events:auto!important;min-width:36px!important;min-height:36px!important;touch-action:manipulation!important}
 .chat-context{position:fixed;z-index:100000;min-width:150px;padding:6px;border:1px solid #484848;border-radius:12px;background:#2f2f2f;box-shadow:0 12px 35px #0008}
 .chat-context button{display:block;width:100%;min-height:42px;padding:9px 12px;border:0;border-radius:8px;background:transparent;color:#eee;text-align:left}
 .chat-context button:active{background:#414141}
 `;document.head.appendChild(s);
}
function openAccount(e){
 const b=e.target?.closest?.('#accountBtn');if(!b)return;
 e.preventDefault();e.stopPropagation();
 if(typeof window.acerolaOpenAccount==='function'){window.acerolaOpenAccount();return}
 b.setAttribute('aria-busy','true');
 let n=0;const retry=()=>{if(typeof window.acerolaOpenAccount==='function'){b.removeAttribute('aria-busy');window.acerolaOpenAccount()}else if(++n<20)setTimeout(retry,250);else{b.removeAttribute('aria-busy');alert('Account is still loading. Please refresh Acerola and try again.') }};setTimeout(retry,100);
}
document.addEventListener('click',openAccount,true);
function ensureMessageActions(){
 const list=document.querySelector('.list');if(!list)return;
 [...list.children].forEach((row,index)=>{
  if(!row.classList.contains('row'))return;
  const bubble=row.querySelector('.bubble');if(!bubble)return;
  let actions=bubble.querySelector('.message-actions');
  if(!actions){actions=document.createElement('div');actions.className='message-actions';actions.setAttribute('aria-label','Message actions');bubble.appendChild(actions)}
  const role=row.classList.contains('user')?'user':'assistant';
  const items=role==='user'?[['copy','⧉','Copy'],['edit','✎','Edit message'],['share','↗','Share']]:[['copy','⧉','Copy'],['read','◖','Read aloud'],['share','↗','Share'],['feedback','👍','Good response'],['bad','👎','Bad response'],['retry','↻','Regenerate']];
  const next=items.map(([a,ico,label])=>'<button type="button" data-fix-action="'+a+'" data-fix-index="'+index+'" title="'+label+'" aria-label="'+label+'">'+ico+'</button>').join('');
  if(actions.innerHTML!==next)actions.innerHTML=next;
 });
}
function activeChat(){try{const all=JSON.parse(localStorage.getItem('acerola-ai-chats-v6')||'[]');const id=localStorage.getItem('acerola-ai-active-v6');return all.find(c=>c.id===id)||all[0]}catch(_){return null}}
function copy(text){const ta=document.createElement('textarea');ta.value=String(text||'');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(_){}ta.remove()}
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('[data-fix-action]');if(!b)return;
 e.preventDefault();e.stopPropagation();
 const index=Number(b.dataset.fixIndex),action=b.dataset.fixAction,chat=activeChat(),msg=chat?.messages?.[index];if(!msg)return;
 if(action==='edit'){if(msg.role==='user')window.acerolaEditMessage?.(index);return}
 if(action==='copy'){copy(msg.content||'');b.textContent='✓';setTimeout(()=>{if(b.isConnected)b.textContent='⧉'},900);return}
 if(action==='share'){if(navigator.share)navigator.share({title:'Acerola',text:String(msg.content||'')}).catch(()=>copy(msg.content||''));else copy(msg.content||'');return}
 if(action==='read'&&'speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(String(msg.content||'')));return}
 if(action==='retry'){window.acerolaRetryLast?.();return}
 if(action==='feedback'||action==='bad'){try{const all=JSON.parse(localStorage.getItem('acerola-ai-chats-v6')||'[]');const c=all.find(x=>x.id===chat.id);if(c?.messages[index]){c.messages[index].feedback=action==='feedback'?'good':'bad';localStorage.setItem('acerola-ai-chats-v6',JSON.stringify(all));b.textContent='✓'}}catch(_){}}
},true);
const mo=new MutationObserver(()=>ensureMessageActions());
mo.observe(document.body,{childList:true,subtree:true});
ensureMessageActions();
/* Send becomes Stop while a generation is active. */
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('#send');if(!b)return;
 if(b.classList.contains('is-generating')||b.getAttribute('aria-label')==='Stop generating'){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(typeof window.acerolaCancelRequest==='function')window.acerolaCancelRequest();
  b.classList.remove('is-generating');b.removeAttribute('aria-busy');b.setAttribute('aria-label','Send message');
 }
},true);
})();