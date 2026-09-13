/* Acerola chat UX enhancements. Loaded by index.html when available. */
(()=>{
  const HK='acerola-ai-chats-v5', AK='acerola-ai-active-v5', SESSION='acerola-session-v1';
  try{if(!sessionStorage.getItem(SESSION)){sessionStorage.setItem(SESSION,'1');localStorage.removeItem(AK)}}catch{}
  const style=document.createElement('style');
  style.textContent='.history .chat-item{display:flex;align-items:center;gap:6px}.history .chat-item>button:first-child{flex:1;min-width:0}.history .chat-delete{width:32px!important;height:32px;padding:0!important;display:grid;place-items:center;border:1px solid #39243b!important;color:#ff69b8!important;background:#120b18!important;border-radius:9px!important;margin:0!important}';
  document.head.appendChild(style);
  const patch=()=>{
    const h=document.querySelector('#history'); if(!h)return;
    [...h.querySelectorAll('button[data-id]')].forEach(btn=>{
      if(btn.parentElement?.classList.contains('chat-item'))return;
      const wrap=document.createElement('div');wrap.className='chat-item';btn.parentNode.insertBefore(wrap,btn);wrap.appendChild(btn);
      const del=document.createElement('button');del.className='chat-delete';del.textContent='×';del.setAttribute('aria-label','Delete chat');wrap.appendChild(del);
      del.onclick=e=>{e.stopPropagation();const id=btn.dataset.id;let chats=[];try{chats=JSON.parse(localStorage.getItem(HK)||'[]')}catch{};chats=Array.isArray(chats)?chats.filter(c=>c.id!==id):[];localStorage.setItem(HK,JSON.stringify(chats));if(localStorage.getItem(AK)===id)localStorage.removeItem(AK);location.reload()};
    });
  };
  setInterval(patch,700);
})();