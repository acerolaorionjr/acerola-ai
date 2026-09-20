(function(global){'use strict';
const features=[
{id:'search',name:'Web Search',icon:'⌕',prompt:'Search the web for this and give me a concise answer with sources.'},
{id:'research',name:'Deep Research',icon:'◎',prompt:'Research this deeply using multiple reliable sources, compare evidence, explain uncertainty, and give me a structured report with sources.'},
{id:'voice',name:'Voice',icon:'◉',action:'voice'},
{id:'files',name:'Files & Vision',icon:'＋',action:'files'},
{id:'image',name:'Image Creation',icon:'✦',prompt:'Create an image of '},
{id:'video',name:'Short Video',icon:'▶',prompt:'Create a short video of '},
{id:'code',name:'Coding',icon:'⌘',prompt:'Inspect the relevant Acerola source code and help me improve it.'},
{id:'analyze',name:'Data & Analysis',icon:'◈',prompt:'Analyze the information or files I provide and explain the important findings.'},
{id:'memory',name:'Memory',icon:'◎',module:'Memory'},
{id:'tasks',name:'Tasks & Runs',icon:'◇',module:'Tasks'},
{id:'projects',name:'Projects',icon:'▦',prompt:'Help me organize this work as a project with a goal, current state, files, decisions and next steps.'}
];
function esc(v){return String(v??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
function install(){
if(document.getElementById('acerolaFeatureHub'))return;
const style=document.createElement('style');style.textContent='#acerolaFeatureHub{position:fixed;inset:0;background:#000b;z-index:120;display:none;padding:12px;overflow:auto}#acerolaFeatureHub.open{display:flex;align-items:center;justify-content:center}.afh{width:min(760px,100%);max-height:92dvh;overflow:auto;background:#080808;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:18px}.afh-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.afh-head h2{margin:0;flex:1;font-size:20px}.afh-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#111;color:#fff}.afh-sub{color:#7d8ca0;font-size:11px;line-height:1.6;margin-bottom:14px}.afh-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.afh-item{padding:12px;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#0d0d0e;color:#f3f8ff}.afh-item b{display:block;font-size:11px}.afh-item span{display:block;color:#708096;font-size:9px;margin-top:3px}.afh-icon{display:inline-grid;place-items:center;width:25px;height:25px;border-radius:8px;background:#111b20;color:#00eaff;margin-bottom:7px}@media(max-width:520px){.afh-grid{grid-template-columns:1fr}}';
document.head.appendChild(style);
const root=document.createElement('div');root.id='acerolaFeatureHub';root.innerHTML='<section class="afh"><div class="afh-head"><h2>Acerola capabilities</h2><button class="afh-close" id="afhClose">×</button></div><div class="afh-sub">Choose a capability or simply describe what you need in normal language.</div><div class="afh-grid">'+features.map(f=>'<button class="afh-item" data-afh="'+f.id+'"><span class="afh-icon">'+f.icon+'</span><b>'+esc(f.name)+'</b><span>Acerola workspace capability</span></button>').join('')+'</div></section>';document.body.appendChild(root);
const close=()=>root.classList.remove('open');document.getElementById('afhClose').onclick=close;root.onclick=e=>{if(e.target===root)close()};
root.querySelectorAll('[data-afh]').forEach(btn=>btn.onclick=()=>{const f=features.find(x=>x.id===btn.dataset.afh);close();if(f.action==='files')return document.getElementById('file')?.click();if(f.action==='voice')return document.getElementById('mic')?.click();if(f.module&&global.acerolaOpenModule)return global.acerolaOpenModule(f.module);const input=document.getElementById('input');if(input){input.value=f.prompt||'';input.dispatchEvent(new Event('input'));input.focus()}});
const drawer=document.getElementById('drawer');if(drawer&&!document.getElementById('afhOpen')){const b=document.createElement('button');b.id='afhOpen';b.className='acerola-core-btn';b.textContent='✦ All capabilities';b.onclick=()=>root.classList.add('open');const box=document.createElement('div');box.className='acerola-core-links';box.innerHTML='<div class="acerola-core-title">ACEROLA WORKSPACE</div>';box.appendChild(b);drawer.insertBefore(box,drawer.querySelector('.drawer-foot')||null)}
global.AcerolaFeatures={features,open:()=>root.classList.add('open'),close};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);