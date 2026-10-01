(()=>{"use strict";
const $=s=>document.querySelector(s);
const byId=id=>document.getElementById(id);
function safe(fn){try{fn()}catch(e){console.warn("Acerola UI:",e)}}
function bind(el,event,fn){if(!el)return;el.addEventListener(event,e=>{try{fn(e)}catch(err){console.warn("Acerola UI event:",err)}})}
function closeDrawer(){const d=$(".drawer"),bg=$(".drawer-bg");d?.classList.remove("open");bg?.classList.remove("open")}
function openDrawer(){const d=$(".drawer"),bg=$(".drawer-bg");d?.classList.add("open");bg?.classList.add("open")}
function openAccount(){if(typeof window.acerolaOpenAccount==="function"){window.acerolaOpenAccount();return}const b=byId("accountBtn");if(b&&b.dataset.bound!=="1"){b.click()}}
function bindCore(){
 const menu=byId("menu"); if(menu){menu.type="button";menu.onclick=e=>{e.preventDefault();e.stopPropagation();openDrawer()}}
 const bg=$(".drawer-bg"); if(bg) bg.onclick=e=>{if(e.target===bg)closeDrawer()}
 const close=byId("drawerClose"); if(close) close.onclick=e=>{e.preventDefault();closeDrawer()}
 const account=byId("accountBtn"); if(account){account.type="button";account.dataset.bound="1";account.onclick=e=>{e.preventDefault();e.stopPropagation();openAccount()}}
 const nav=document.querySelectorAll("[data-nav]");
 nav.forEach(b=>{if(b.dataset.stabilityBound==="1")return;b.dataset.stabilityBound="1";b.addEventListener("click",()=>closeDrawer())});
 const send=byId("send");
 if(send){send.type="button";send.onclick=e=>{e.preventDefault();e.stopPropagation();if(typeof window.acerolaSend==="function")window.acerolaSend();}}
}
function cleanDrawer(){
 const nav=document.querySelector(".drawer-nav"); if(!nav)return;
 const wanted=[
  ["Images","▧","Open image creation and image tools."],
  ["Research","⌕","Search and investigate with sources."],
  ["Create","✦","Create images, video, audio and more."],
  ["Code","⌘","Write, inspect and debug code."],
  ["Analyze","◈","Analyze files, images and data."],
  ["Tasks","◇","Plan and track tasks."],
  ["Memory","◎","View and manage Acerola memory."]
 ];
 nav.innerHTML=wanted.map(([name,icon,desc])=>'<button type="button" data-nav="'+name+'"><span>'+icon+'</span><b>'+name+'</b><small>'+desc+'</small></button>').join("");
 nav.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>{
   const type=b.dataset.nav;
   if(type==="Images" && typeof window.openModule==="function") window.openModule("Create");
   else if(typeof window.openModule==="function") window.openModule(type);
   closeDrawer();
 });
}
function polish(){
 safe(()=>cleanDrawer());
 const d=$(".drawer");
 if(d){d.style.overflowY="auto";d.style.overflowX="hidden";d.style.webkitOverflowScrolling="touch"}
 const h=$(".history"); if(h){h.style.overflow="visible";h.style.flex="0 0 auto"}
 const foot=$(".drawer-foot");
 if(foot){const mini=foot.querySelector(".engine-mini");if(mini)mini.remove()}
}
function boot(){polish();bindCore();setTimeout(()=>{polish();bindCore()},350);setTimeout(()=>{polish();bindCore()},1200)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.addEventListener("acerola:supabase-ready",()=>setTimeout(bindCore,50));
})();