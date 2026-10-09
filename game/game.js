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
const player=new THREE.Group();player.position.set(0,0,0);world.add(player); const starterObjects=new THREE.Group();world.add(starterObjects);
const skin=new THREE.MeshLambertMaterial({color:0x7b4a2e}),shirt=new THREE.MeshLambertMaterial({color:0x111820}),pants=new THREE.MeshLambertMaterial({color:0x20262d}),shoe=new THREE.MeshLambertMaterial({color:0x090b0e});
function limb(x,y,z,w,h,d,mat){return box('player limb',x,y,z,w,h,d,mat,player)}
limb(-.38,0,-.02,.45,1.5,.45,pants);limb(.38,0,-.02,.45,1.5,.45,pants);limb(-.38,0,-.02,.5,.28,.58,shoe);limb(.38,0,-.02,.5,.28,.58,shoe);limb(0,1.35,0,1.05,1.35,.55,shirt);cyl('player head',0,2.65,0,.48,.65,skin,player);cyl('hair',0,3.15,0,.5,.18,shoe,player);limb(-.72,1.35,0,.25,1.1,.25,shirt);limb(.72,1.35,0,.25,1.1,.25,shirt);const tag=textSprite('@Player','#9ff3ff');tag.position.set(0,4,0);player.add(tag);
function makeStarterVisual(start){starterObjects.clear();const [sx,sz]=start.spawn;const home=box('starter home',sx,0,sz,5.5,2.4,4.5,new THREE.MeshLambertMaterial({color:start.color}),starterObjects);const sign=textSprite(start.home,'#fff');sign.position.set(sx,3.7,sz-2.3);starterObjects.add(sign);if(start.car!=='No car'){const car=box('starter car',sx+4,.2,sz,2.7,.7,1.45,mats.dark,starterObjects);cyl('wheel',sx+3,.05,sz-0.7,.32,.18,shoe,starterObjects).rotation.z=Math.PI/2;cyl('wheel',sx+5,.05,sz-0.7,.32,.18,shoe,starterObjects).rotation.z=Math.PI/2;cyl('wheel',sx+3,.05,sz+0.7,.32,.18,shoe,starterObjects).rotation.z=Math.PI/2;cyl('wheel',sx+5,.05,sz+0.7,.32,.18,shoe,starterObjects).rotation.z=Math.PI/2;const cs=textSprite(start.car,'#9ff3ff');cs.position.set(sx+4,1.6,sz);starterObjects.add(cs)}}
const npcs=[];const npcColors=[0x2e6fb0,0xd68b3e,0x7e4e9a,0x2e946e,0xb53f49];
function npc(x,z,name,i){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);const body=new THREE.Mesh(new THREE.BoxGeometry(.8,1.25,.48),new THREE.MeshLambertMaterial({color:npcColors[i%npcColors.length]}));body.position.y=1;g.add(body);const head=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.45,10),skin);head.position.y=1.85;g.add(head);const s=textSprite(name,'#fff');s.position.y=2.65;g.add(s);npcs.push({g,baseX:x,baseZ:z,t:Math.random()*10,phase:Math.random()*6.28})}
npc(-6,10,'@Ife',0);npc(7,10,'@Tobi',1);npc(-10,-8,'@Zainab',2);npc(10,-8,'@Daniel',3);npc(18,5,'@Chris',4);
const STARTS={
 lapo:{label:'Lapo',money:5000,debt:80000,allowance:0,home:'Shared room',car:'No car',support:'Low',job:'Street Hustle / Job Hunt',circumstance:'Debt pressure: rent and repayments come first.',spawn:[-27,3],color:0xb8473f},
 average:{label:'Average',money:25000,debt:0,allowance:5000,home:'Modest apartment',car:'Used sedan',support:'₦5,000',job:'Student',circumstance:'Balanced start with normal family support.',spawn:[-2,2],color:0x477fb1},
 comfortable:{label:'Comfortable',money:120000,debt:0,allowance:15000,home:'Furnished apartment',car:'Sedan',support:'₦15,000',job:'Student / Part-time',circumstance:'Stable home life gives you room to build.',spawn:[-20,18],color:0x2e946e},
 nepo:{label:'Nepo Baby',money:500000,debt:0,allowance:50000,home:'Luxury apartment',car:'SUV',support:'₦50,000',job:'Family Business Trainee',circumstance:'Connections unlock opportunities, but reputation matters.',spawn:[20,17],color:0x7e4e9a},
 wealthy:{label:'Wealthy',money:2000000,debt:0,allowance:100000,home:'Luxury home',car:'Premium SUV',support:'₦100,000',job:'Investor / Business Owner',circumstance:'Large resources and property access create a major head start.',spawn:[26,-2],color:0xe7b83b}
};
const JOBS=[
 {id:'gig',name:'Delivery Rider',pay:3500,energy:10,req:0,desc:'Short delivery shifts around Ibadan.'},
 {id:'retail',name:'Shop Assistant',pay:5000,energy:14,req:1,desc:'Work a market or mall retail shift.'},
 {id:'office',name:'Office Assistant',pay:8500,energy:16,req:2,desc:'Entry-level office work.'},
 {id:'developer',name:'Junior Developer',pay:15000,energy:18,req:3,desc:'Tech work unlocked by higher reputation.'},
 {id:'family',name:'Family Business',pay:22000,energy:14,req:2,desc:'Available early to connected starts.'}
];
let bankDebt=0,bankSavings=0,currentJob=null,lastPayDay=-1;
let activeStart=null,money=25000,progress=35,rep=2,hunger=78,energy=72,fun=64,social=58,hygiene=84,health=92,gameMinutes=8*60;const keys={w:false,a:false,s:false,d:false};let camAngle=.62,camDistance=23,dragging=false,lastX=0;
const $=id=>document.getElementById(id);function moneyText(n){return '₦'+Math.max(0,Math.round(n)).toLocaleString('en-NG')}
function applyStart(key){const s=STARTS[key];if(!s)return;activeStart=key;money=s.money;bankDebt=s.debt;bankSavings=0;currentJob=null;progress=key==='lapo'?10:key==='wealthy'?70:key==='nepo'?55:key==='comfortable'?45:35;rep=key==='lapo'?1:key==='wealthy'?4:key==='nepo'?3:2;player.position.set(s.spawn[0],0,s.spawn[1]);makeStarterVisual(s);$('jobTitle').textContent=s.job;$('place').textContent=s.home+' · Ibadan';$('task').textContent=s.circumstance;localStorage.setItem('ibadanLifeStart',key);renderUI();$('startScreen').classList.remove('show');$('startScreen').style.display='none';toast('🌆 '+s.label+' life started');}
function showStart(){const saved=localStorage.getItem('ibadanLifeStart');if(saved&&STARTS[saved]){selectStart(saved);return}document.getElementById('startScreen').classList.add('show')}
function selectStart(key){document.querySelectorAll('.startOption').forEach(b=>b.classList.toggle('selected',b.dataset.start===key));const s=STARTS[key];if(!s)return;selectedStart=key;$('startSummary').textContent=s.label+' · '+s.circumstance+' Home: '+s.home+' · Vehicle: '+s.car; $('startGame').disabled=false}
let selectedStart=null;
document.querySelectorAll('.startOption').forEach(b=>b.addEventListener('click',()=>selectStart(b.dataset.start)));
$('startGame').addEventListener('click',()=>{if(selectedStart)applyStart(selectedStart)});
$('resetStart').addEventListener('click',()=>{localStorage.removeItem('ibadanLifeStart');location.reload()});

function renderUI(){$('money').textContent=moneyText(money);$('progressText').textContent=Math.round(progress)+'%';$('progressBar').style.width=Math.max(0,Math.min(100,progress))+'%';$('rep').textContent=Math.floor(rep)+' / 5';$('clock').textContent=((Math.floor(gameMinutes/60)%24)||12)+':'+String(Math.floor(gameMinutes%60)).padStart(2,'0')+' '+(gameMinutes%1440<720?'AM':'PM');let mood=energy<25?'😴':hunger<25?'😵':social<25?'😔':health<35?'🤒':progress>80?'🔥':'😊';$('mood').textContent=mood;const arr=[['🍛',hunger],['⚡',energy],['🎉',fun],['💬',social],['🧼',hygiene],['❤️',health]];$('needs').innerHTML=arr.map(([a,v])=>`<span class="need">${a} ${Math.round(v)}%</span>`).join('')}
function toast(t){const el=$('toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.opacity=0,1500)}
function action(a){if(a==='eat'){hunger=Math.min(100,hunger+25);money=Math.max(0,money-500);$('task').textContent='Enjoy lunch';toast('🍛 You ate a local meal · −₦500')}if(a==='rest'){energy=Math.min(100,energy+28);toast('😴 You rested')}if(a==='social'){social=Math.min(100,social+20);fun=Math.min(100,fun+10);toast('💬 You made time for people')}if(a==='study'){progress=Math.min(100,progress+8);energy=Math.max(0,energy-7);toast('📚 Study session complete')}if(a==='work'){progress=Math.min(100,progress+15);money+=2500;energy=Math.max(0,energy-12);hunger=Math.max(0,hunger-8);rep=Math.min(5,rep+(progress>70?.05:0));toast('💼 Shift complete · +₦2,500');$('task').textContent=progress>85?'Go home':'Next: assignment'}renderUI()}
const phone=$('phoneOverlay'), appPanel=$('appPanel');
const appCopy={
 jobs:['Jobs','Browse careers, gigs and applications. Build skills to unlock better-paying work.',['Find work','View skills']],
 messages:['Messages','Talk to friends, employers, customers and NPCs.',['Open messages']],
 bank:['Bank','Balance: '+moneyText(money)+' · Debt: '+moneyText(bankDebt)+' · Savings: '+moneyText(bankSavings),['View balance','Deposit ₦5,000','Repay ₦5,000']],
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
const CATALOGUE=[
 {id:'partition',name:'Partition Wall',icon:'🧱',cat:'storage',price:18000},
 {id:'slat',name:'Wooden Slat Divider',icon:'🪵',cat:'design',price:12000},
 {id:'plant',name:'Potted Plant',icon:'🪴',cat:'decor',price:4500},
 {id:'sofa',name:'Italian Leather Sofa',icon:'🛋️',cat:'comfort',price:95000},
 {id:'bath',name:'Bathtub',icon:'🛁',cat:'bath',price:65000},
 {id:'dining',name:'Dining Table',icon:'🍽️',cat:'comfort',price:42000},
 {id:'cooker',name:'Gas Cooker',icon:'🍳',cat:'kitchen',price:28000},
 {id:'fridge',name:'Double-Door Fridge',icon:'🧊',cat:'kitchen',price:110000},
 {id:'sink',name:'Kitchen Sink',icon:'🚰',cat:'kitchen',price:18000},
 {id:'snooker',name:'Snooker Table',icon:'🎱',cat:'fun',price:140000},
 {id:'tv',name:'65\" Smart TV',icon:'📺',cat:'fun',price:135000},
 {id:'fan',name:'Standing Fan',icon:'🌬️',cat:'light',price:22000},
 {id:'ac',name:'Split Air Conditioner',icon:'❄️',cat:'comfort',price:180000},
 {id:'bucket',name:'Bucket & Bowl',icon:'🪣',cat:'bath',price:3500},
 {id:'toilet',name:'WC Toilet',icon:'🚽',cat:'bath',price:32000},
 {id:'counter',name:'Kitchen Counter',icon:'🗄️',cat:'kitchen',price:48000},
 {id:'solar',name:'Solar + Inverter',icon:'☀️',cat:'light',price:260000},
 {id:'lamp',name:'Rechargeable Lamp',icon:'🏮',cat:'light',price:9000},
 {id:'ps5',name:'PS5 Gaming Setup',icon:'🎮',cat:'fun',price:320000},
 {id:'jacuzzi',name:'Jacuzzi',icon:'🫧',cat:'luxury',price:380000},
 {id:'shower',name:'Rain Shower',icon:'🚿',cat:'bath',price:72000},
 {id:'washer',name:'Washing Machine',icon:'🧺',cat:'kitchen',price:125000},
 {id:'glass',name:'Frosted Glass Partition',icon:'🪟',cat:'design',price:38000},
 {id:'royal',name:'Royal Gold Sofa',icon:'👑',cat:'luxury',price:220000},
 {id:'speakers',name:'Party Speakers',icon:'🔊',cat:'fun',price:85000},
 {id:'aquarium',name:'Aquarium',icon:'🐠',cat:'pets',price:95000},
 {id:'lion',name:'Gold Lion Statue',icon:'🦁',cat:'luxury',price:175000}
];
const catalogueCats=[['all','📦 Storage'],['design','🎨 Design'],['sleep','🛏️ Sleep'],['kitchen','🍳 Kitchen'],['bath','🚿 Bath'],['comfort','🛋️ Comfort'],['fun','📺 Fun'],['skills','🎸 Skills'],['light','💡 Light'],['decor','🪴 Decor'],['pets','🐶 Pets'],['luxury','💎 Luxury']];
let catalogueFilter='all';
let inventory=JSON.parse(localStorage.getItem('ibadanLifeInventory')||'[]');
const placedObjects=new THREE.Group();world.add(placedObjects);
function saveInventory(){localStorage.setItem('ibadanLifeInventory',JSON.stringify(inventory))}
function furnitureVisual(item,index){
 const x=((index%4)-1.5)*2.2, z=-2+Math.floor(index/4)*2.1;
 const mat=new THREE.MeshLambertMaterial({color:item.cat==='luxury'?0xd4af37:item.cat==='decor'?0x4e9b68:item.cat==='kitchen'?0xd9d9d9:0x6b5143});
 const o=box(item.name,x,.05,z,1.7,.8,1.0,mat,placedObjects);o.userData.itemId=item.id;
 const label=textSprite(item.name,'#fff');label.position.set(x,1.2,z);placedObjects.add(label);
}
function renderCatalogue(){
 const grid=$('catalogueGrid'), owned=new Set(inventory);
 const list=catalogueFilter==='all'?CATALOGUE:CATALOGUE.filter(x=>x.cat===catalogueFilter);
 $('catalogueCats').innerHTML=catalogueCats.map(([id,label])=>'<button class="'+(id===catalogueFilter?'active':'')+'" data-cat="'+id+'">'+label+'</button>').join('');
 $('catalogueCats').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{catalogueFilter=b.dataset.cat;renderCatalogue()});
 grid.innerHTML=list.map(item=>{const have=owned.has(item.id);return '<article class="catalogueItem"><div class="itemIcon">'+item.icon+'</div><div class="itemName">'+item.name+'</div><div class="itemPrice">'+(have?'Owned':moneyText(item.price))+'</div><button data-buy="'+item.id+'">'+(have?'Place':'Buy · '+moneyText(item.price))+'</button></article>'}).join('');
 grid.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buyOrPlace(b.dataset.buy));
 $('catalogueMoney').textContent=moneyText(money);
}
function buyOrPlace(id){
 const item=CATALOGUE.find(x=>x.id===id);if(!item)return;
 const i=inventory.indexOf(id);
 if(i>=0){furnitureVisual(item,i);inventory.splice(i,1);saveInventory();renderCatalogue();toast('🛋️ '+item.name+' placed');return}
 if(money<item.price){toast('💸 Not enough money for '+item.name);return}
 money-=item.price;inventory.push(id);saveInventory();renderCatalogue();renderUI();toast('📦 '+item.name+' added to storage');
}
function openBuyMode(){catalogueFilter='all';renderCatalogue();$('buyOverlay').classList.add('show');$('buyOverlay').setAttribute('aria-hidden','false')}
function closeBuyMode(){$('buyOverlay').classList.remove('show');$('buyOverlay').setAttribute('aria-hidden','true')}
function openApp(name){
 const d=appCopy[name]; if(!d)return;
 appPanel.innerHTML='<h3>'+d[0]+'</h3><p>'+d[1]+'</p><div class="appAction">'+d[2].map((x,i)=>'<button class="'+(i?'alt':'')+'" data-app-action="'+name+'">'+x+'</button>').join('')+'</div>';
 appPanel.querySelectorAll('[data-app-action]').forEach(b=>b.addEventListener('click',()=>handleAppAction(name,b.textContent)));
}
function lifeModal(title,desc,choices){$('lifeTitle').textContent=title;$('lifeDesc').textContent=desc;$('lifeChoices').innerHTML=choices.map((c,i)=>'<button class="choice" data-choice="'+i+'"><strong>'+c.title+'</strong><small>'+c.desc+'</small></button>').join('');$('lifeModal').classList.add('show');$('lifeModal').setAttribute('aria-hidden','false');$('lifeChoices').querySelectorAll('.choice').forEach((b,i)=>b.addEventListener('click',()=>{const choice=choices[i];choice.run();closeLife()}))}
function closeLife(){$('lifeModal').classList.remove('show');$('lifeModal').setAttribute('aria-hidden','true')}
$('closeLife').addEventListener('click',closeLife);
function handleAppAction(name,label){
 if(name==='jobs'){lifeModal('💼 Jobs','Choose work you can currently qualify for.',JOBS.map(j=>({title:j.name+' · '+moneyText(j.pay),desc:j.desc+' Reputation required: '+j.req,run:()=>{if(rep<j.req){toast('🔒 Build reputation to unlock this job');return}currentJob=j;money+=j.pay;energy=Math.max(0,energy-j.energy);progress=Math.min(100,progress+6);rep=Math.min(5,rep+.08);toast('💼 '+j.name+' complete · +'+moneyText(j.pay));renderUI()}})))}
 else if(name==='bank'){if(label.includes('Deposit')){const n=Math.min(5000,money);money-=n;bankSavings+=n;toast('🏦 Saved '+moneyText(n))}else if(label.includes('Repay')){const n=Math.min(5000,bankDebt,money);money-=n;bankDebt-=n;toast(n?'🏦 Debt repayment · '+moneyText(n):'🏦 Nothing to repay')}else{toast('🏦 Balance '+moneyText(money)+' · Debt '+moneyText(bankDebt)+' · Savings '+moneyText(bankSavings))}renderUI()}
 else if(name==='shop'){openBuyMode()}else if(name==='ride'){toast('🚕 Ride planning will use your map routes next')}
 else if(name==='travel'){toast('🚌 Travel hub ready · inter-state routes coming next')}
 else if(name==='business'){toast('🏢 Business management unlocked for the next economy layer')}
 else if(name==='advertise'){toast('📢 Campaigns will use business budget when businesses go live')}
 else if(name==='invest'){toast('📈 Investment market is being connected to the bank')}
 else {toast(dLabel(name)+' opened')}
}
function dLabel(n){return appCopy[n]?appCopy[n][0]:n}

document.querySelectorAll('[data-app]').forEach(b=>b.addEventListener('click',()=>openApp(b.dataset.app)));
$('closePhone').addEventListener('click',()=>{phone.classList.remove('show');phone.setAttribute('aria-hidden','true')});$('closeBuy').addEventListener('click',closeBuyMode);
function openPhone(){phone.classList.add('show');phone.setAttribute('aria-hidden','false')}
renderUI()
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installBtn').classList.add('show')});
$('installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt){toast('📲 Use your browser menu → Install app');return}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installBtn').classList.remove('show')});
window.addEventListener('appinstalled',()=>{$('installBtn').classList.remove('show');toast('📲 Ibadan Life installed')});
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));
document.querySelectorAll('.bottom button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.bottom button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const t=b.dataset.tab;if(t==='shop'){openBuyMode();return;}if(t==='map')toast('🗺️ Map: Market · Hospital · School · Mall');if(t==='phone'){openPhone();return};if(t==='home')toast('🏠 Home: your current life overview')}));
function setKey(k,v){keys[k]=v}document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();setKey(k,true);b.setPointerCapture(e.pointerId)});b.addEventListener('pointerup',()=>setKey(k,false));b.addEventListener('pointercancel',()=>setKey(k,false))});addEventListener('keydown',e=>{if(e.key.toLowerCase() in keys)setKey(e.key.toLowerCase(),true)});addEventListener('keyup',e=>{if(e.key.toLowerCase() in keys)setKey(e.key.toLowerCase(),false)});
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX});addEventListener('pointerup',()=>dragging=false);addEventListener('pointermove',e=>{if(dragging){camAngle+=(e.clientX-lastX)*.006;lastX=e.clientX}});
function update(dt){const speed=dt*4.2;let dx=(keys.d?1:0)-(keys.a?1:0),dz=(keys.s?1:0)-(keys.w?1:0);if(dx||dz){const len=Math.hypot(dx,dz);dx/=len;dz/=len;player.position.x+=dx*speed;player.position.z+=dz*speed;player.position.x=Math.max(-32,Math.min(32,player.position.x));player.position.z=Math.max(-32,Math.min(32,player.position.z));player.rotation.y=Math.atan2(dx,dz);progress=Math.min(100,progress+dt*1.5)}gameMinutes+=dt*2.2;hunger=Math.max(0,hunger-dt*.45);energy=Math.max(0,energy-dt*.25);fun=Math.max(0,fun-dt*.12);social=Math.max(0,social-dt*.08);hygiene=Math.max(0,hygiene-dt*.1);if(health<100&&energy>60)health=Math.min(100,health+dt*.04);npcs.forEach((n,i)=>{n.t+=dt*(.35+i*.04);n.g.position.x=n.baseX+Math.sin(n.t+n.phase)*1.8;n.g.position.z=n.baseZ+Math.cos(n.t*.8+n.phase)*1.5;n.g.rotation.y=Math.sin(n.t)*.25});const target=new THREE.Vector3(player.position.x,1.8,player.position.z);const cp=Math.cos(camAngle),sp=Math.sin(camAngle);camera.position.x=player.position.x+cp*camDistance;camera.position.z=player.position.z+sp*camDistance;camera.position.y=15;camera.lookAt(target);renderUI()}
let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(loop)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5))});renderUI();requestAnimationFrame(loop);
})();