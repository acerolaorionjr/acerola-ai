(()=>{"use strict";
const byId=id=>document.getElementById(id);
function bind(){
  const menu=byId("menu"); if(menu){menu.type="button";menu.onclick=e=>{e.preventDefault();e.stopPropagation();byId("drawer")?.classList.add("open");byId("dbg")?.classList.add("open")}}
  const bg=document.querySelector(".drawer-bg"); if(bg)bg.onclick=e=>{if(e.target===bg){byId("drawer")?.classList.remove("open");bg.classList.remove("open")}}
  const close=byId("drawerClose"); if(close)close.onclick=e=>{e.preventDefault();byId("drawer")?.classList.remove("open");byId("dbg")?.classList.remove("open")}
  const account=byId("accountBtn"); if(account){account.type="button";account.style.pointerEvents="auto";account.onclick=e=>{e.preventDefault();e.stopPropagation();if(typeof window.acerolaOpenAccount==="function")window.acerolaOpenAccount()}}
  const send=byId("send"); if(send){send.type="button";send.onclick=e=>{e.preventDefault();e.stopPropagation();window.acerolaSend?.()}}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
window.addEventListener("acerola:supabase-ready",()=>setTimeout(bind,50));
})();