(() => {
'use strict';
const root=document.getElementById('game');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xbfd6e5);
scene.fog=new THREE.Fog(0xbfd6e5,38,110);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,180);
camera.position.set(13,15,18);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.SRGBColorSpace;root.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x71808b,2.1));
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-15,30,12);scene.add(sun);
const world=new THREE.Group();scene.add(world);
const mats={road:new THREE.MeshLambertMaterial({color:0x4f5c64}),grass:new THREE.MeshLambertMaterial({color:0x93b47c}),white:new THREE.MeshLambertMaterial({color:0xf3f5f7}),wall:new THREE.MeshLambertMaterial({color:0xd6d0c5}),dark:new THREE.MeshLambertMaterial({color:0x17202a}),roof:new THREE.MeshLambertMaterial({color:0x8f5142}),green:new THREE.MeshLambertMaterial({color:0x2f8c63}),blue:new THREE.MeshLambertMaterial({color:0x477fb1}),yellow:new THREE.MeshLambertMaterial({color:0xe7b83b}),red:new THREE.MeshLambertMaterial({color:0xb8473f})};
function box(name,x,y,z,w,h,d,mat,group=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y+h/2,z);group.add(m);return m}
function cyl(name,x,y,z,r,h,mat,group=world){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),mat);m.name=name;m.position.set(x,y+h/2,z);group.add(m);return m}
function textSprite(txt,color='#ffffff'){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='700 28px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillStyle='rgba(8,16,26,.72)';x.beginPath();x.roundRect(4,6,248,52,16);x.fill();x.fillStyle=color;x.fillText(txt,128,33);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.scale.set(3.2,.8,1);return s}
box('ground',0,-.2,0,72,.2,72,mats.grass);box('main road',0,0,0,72,.05,8,mats.road);box('cross road',0,.01,0,8,.05,72,mats.road);
for(let x=-32;x<=32;x+=4)box('lane',x,.07,0,1.2,.015,.18,mats.yellow);
for(let z=-32;z<=32;z+=4)box('lane',0,.08,z,.18,.015,1.2,mats.yellow);
function building(x,z,w,d,h,color,label){const g=new THREE.Group();world.add(g);box(label+' building',x,0,z,w,h,d,new THREE.MeshLambertMaterial({color}),g);box(label+' roof',x,h,z,w+.18,.22,d+.18,mats.roof,g);const sign=textSprite(label,'#ffffff');sign.position.set(x,h+1,z-d/2-.05);g.add(sign);for(let xx=x-w/2+1;xx<x+w/2-.5;xx+=1.5)for(let yy=1.2;yy<h-.5;yy+=1.5)box('window',xx,yy,z-d/2-.03,.65,.55,.05,mats.blue,g);return g}
building(-15,-14,8,7,4.5,0xd7a26d,'BODIJA MARKET');building(15,-14,8,7,5.5,0xb6c5d3,'UCH');building(-15,14,8,7,4.2,0xd9c57c,'UNIVERSITY');building(15,14,8,7,5.2,0xc8c8ce,'DUGBE MALL');building(-27,0,7,6,3.6,0xb57c55,'HOME');building(27,0,7,6,4.4,0x9bafbd,'OFFICE');
for(let i=0;i<24;i++){const x=(i%6)*9-22,z=Math.floor(i/6)*9-22;if(Math.abs(x)<6||Math.abs(z)<6)continue;cyl('tree trunk',x,0,z,.28,1.5,mats.roof);cyl('tree crown',x,1.3,z,1.05,1.7,mats.green)}
for(let i=-30;i<=30;i+=6){box('curb',i,.12,4.35,4,.18,.35,mats.white);box('curb',i,.12,-4.35,4,.18,.35,mats.white);box('curb',4.35,.12,i,.35,.18,4,mats.white);box('curb',-4.35,.12,i,.35,.18,4,mats.white)}
const player=new THREE.Group();player.position.set(0,0,0);world.add(player);
const skin=new THREE.MeshLambertMaterial({color:0x7b4a2e}),shirt=new THREE.MeshLambertMaterial({color:0x111820}),pants=new THREE.MeshLambertMaterial({color:0x20262d}),shoe=new THREE.MeshLambertMaterial({color:0x090b0e});
function limb(x,y,z,w,h,d,mat){return box('player limb',x,y,z,w,h,d,mat,player)}
limb(-.38,0,-.02,.45,1.5,.45,pants);limb(.38,0,-.02,.45,1.5,.45,pants);limb(-.38,0,-.02,.5,.28,.58,shoe);limb(.38,0,-.02,.5,.28,.58,shoe);limb(0,1.35,0,1.05,1.35,.55,shirt);cyl('player head',0,2.65,0,.48,.65,skin,player);cyl('hair',0,3.15,0,.5,.18,shoe,player);limb(-.72,1.35,0,.25,1.1,.25,shirt);limb(.72,1.35,0,.25,1.1,.25,shirt);const tag=textSprite('@Player','#9ff3ff');tag.position.set(0,4,0);player.add(tag);
const npcs=[];const npcColors=[0x2e6fb0,0xd68b3e,0x7e4e9a,0x2e946e,0xb53f49];
function npc(x,z,name,i){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);const body=new THREE.Mesh(new THREE.BoxGeometry(.8,1.25,.48),new THREE.MeshLambertMaterial({color:npcColors[i%npcColors.length]}));body.position.y=1;g.add(body);const head=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.45,10),skin);head.position.y=1.85;g.add(head);const s=textSprite(name,'#fff');s.position.y=2.65;g.add(s);npcs.push({g,baseX:x,baseZ:z,t:Math.random()*10,phase:Math.random()*6.28})}
npc(-6,10,'@Ife',0);npc(7,10,'@Tobi',1);npc(-10,-8,'@Zainab',2);npc(10,-8,'@Daniel',3);npc(18,5,'@Chris',4);
let money=25000,progress=35,rep=2,hunger=78,energy=72,fun=64,social=58,hygiene=84,health=92,gameMinutes=8*60;const keys={w:false,a:false,s:false,d:false};let camAngle=.62,camDistance=23,dragging=false,lastX=0;
const $=id=>document.getElementById(id);function moneyText(n){return '₦'+Math.max(0,Math.round(n)).toLocaleString('en-NG')}
function renderUI(){$('money').textContent=moneyText(money);$('progressText').textContent=Math.round(progress)+'%';$('progressBar').style.width=Math.max(0,Math.min(100,progress))+'%';$('rep').textContent=Math.floor(rep)+' / 5';$('clock').textContent=((Math.floor(gameMinutes/60)%24)||12)+':'+String(Math.floor(gameMinutes%60)).padStart(2,'0')+' '+(gameMinutes%1440<720?'AM':'PM');let mood=energy<25?'😴':hunger<25?'😵':social<25?'😔':health<35?'🤒':progress>80?'🔥':'😊';$('mood').textContent=mood;const arr=[['🍛',hunger],['⚡',energy],['🎉',fun],['💬',social],['🧼',hygiene],['❤️',health]];$('needs').innerHTML=arr.map(([a,v])=>`<span class="need">${a} ${Math.round(v)}%</span>`).join('')}
function toast(t){const el=$('toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.opacity=0,1500)}
function action(a){if(a==='eat'){hunger=Math.min(100,hunger+25);money=Math.max(0,money-500);$('task').textContent='Enjoy lunch';toast('🍛 You ate a local meal · −₦500')}if(a==='rest'){energy=Math.min(100,energy+28);toast('😴 You rested')}if(a==='social'){social=Math.min(100,social+20);fun=Math.min(100,fun+10);toast('💬 You made time for people')}if(a==='study'){progress=Math.min(100,progress+8);energy=Math.max(0,energy-7);toast('📚 Study session complete')}if(a==='work'){progress=Math.min(100,progress+15);money+=2500;energy=Math.max(0,energy-12);hunger=Math.max(0,hunger-8);rep=Math.min(5,rep+(progress>70?.05:0));toast('💼 Shift complete · +₦2,500');$('task').textContent=progress>85?'Go home':'Next: assignment'}
const phone=$('phoneOverlay'), appPanel=$('appPanel');
const appCopy={
 jobs:['Jobs','Browse careers, gigs and applications. Build skills to unlock better-paying work.',['Find work','View skills']],
 messages:['Messages','Talk to friends, employers, customers and NPCs.',['Open messages']],
 bank:['Bank','Balance: '+moneyText(money)+' · Bills, savings and account management.',['View balance','Bills']],
 ride:['Ride','Choose walking, bus, keke, okada, cab or your own vehicle. Cost and travel time change by route.',['Find a ride']],
 shop:['Boutique','Buy clothes, accessories and useful items for your character.',['Open shop']],
 food:['Food','Order local meals and groceries to manage hunger.',['Order food']],
 business:['Business','Own and manage shops, restaurants, services and other businesses.',['Manage business','Create business']],
 advertise:['Advertise','Promote your in-game business with billboards, radio, transport placements and featured listings.',['Create campaign','Billboards']],
 invest:['Invest','Put game money into fictional businesses, property and other in-game opportunities.',['View opportunities']],
 map:['Map','Explore Ibadan districts and discover places, jobs, businesses and activities.',['Open map']],
 travel:['Travel','Plan trips from Ibadan to other cities and, later, other Nigerian states. Travel costs money and time.',['Plan trip']],
 events:['Events','Find concerts, football, cinema, community and other activities around the city.',['View events']]
};
function openApp(name){
 const d=appCopy[name]; if(!d)return;
 appPanel.innerHTML='<h3>'+d[0]+'</h3><p>'+d[1]+'</p><div class="appAction">'+d[2].map((x,i)=>'<button class="'+(i?'alt':'')+'" data-app-action="'+name+'">'+x+'</button>').join('')+'</div>';
 appPanel.querySelectorAll('[data-app-action]').forEach(b=>b.addEventListener('click',()=>toast(d[0]+' opened')));
}
document.querySelectorAll('[data-app]').forEach(b=>b.addEventListener('click',()=>openApp(b.dataset.app)));
$('closePhone').addEventListener('click',()=>{phone.classList.remove('show');phone.setAttribute('aria-hidden','true')});
function openPhone(){phone.classList.add('show');phone.setAttribute('aria-hidden','false')}
renderUI()}
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));$('addMoney').addEventListener('click',()=>{money+=1000;toast('Life bonus · +₦1,000');renderUI()});
document.querySelectorAll('.bottom button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.bottom button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const t=b.dataset.tab;if(t==='shop')toast('🛍️ Shop: food, clothes, furniture');if(t==='map')toast('🗺️ Map: Market · Hospital · School · Mall');if(t==='phone'){openPhone();return};if(t==='home')toast('🏠 Home: your current life overview')}));
function setKey(k,v){keys[k]=v}document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();setKey(k,true);b.setPointerCapture(e.pointerId)});b.addEventListener('pointerup',()=>setKey(k,false));b.addEventListener('pointercancel',()=>setKey(k,false))});addEventListener('keydown',e=>{if(e.key.toLowerCase() in keys)setKey(e.key.toLowerCase(),true)});addEventListener('keyup',e=>{if(e.key.toLowerCase() in keys)setKey(e.key.toLowerCase(),false)});
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX});addEventListener('pointerup',()=>dragging=false);addEventListener('pointermove',e=>{if(dragging){camAngle+=(e.clientX-lastX)*.006;lastX=e.clientX}});
function update(dt){const speed=dt*4.2;let dx=(keys.d?1:0)-(keys.a?1:0),dz=(keys.s?1:0)-(keys.w?1:0);if(dx||dz){const len=Math.hypot(dx,dz);dx/=len;dz/=len;player.position.x+=dx*speed;player.position.z+=dz*speed;player.position.x=Math.max(-32,Math.min(32,player.position.x));player.position.z=Math.max(-32,Math.min(32,player.position.z));player.rotation.y=Math.atan2(dx,dz);progress=Math.min(100,progress+dt*1.5)}gameMinutes+=dt*2.2;hunger=Math.max(0,hunger-dt*.45);energy=Math.max(0,energy-dt*.25);fun=Math.max(0,fun-dt*.12);social=Math.max(0,social-dt*.08);hygiene=Math.max(0,hygiene-dt*.1);if(health<100&&energy>60)health=Math.min(100,health+dt*.04);npcs.forEach((n,i)=>{n.t+=dt*(.35+i*.04);n.g.position.x=n.baseX+Math.sin(n.t+n.phase)*1.8;n.g.position.z=n.baseZ+Math.cos(n.t*.8+n.phase)*1.5;n.g.rotation.y=Math.sin(n.t)*.25});const target=new THREE.Vector3(player.position.x,1.8,player.position.z);const cp=Math.cos(camAngle),sp=Math.sin(camAngle);camera.position.x=player.position.x+cp*camDistance;camera.position.z=player.position.z+sp*camDistance;camera.position.y=15;camera.lookAt(target);renderUI()}
let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(loop)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5))});renderUI();requestAnimationFrame(loop);
})();