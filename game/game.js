(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const TAU=Math.PI*2;
let W=0,H=0,DPR=1,paused=false,last=0,raf=0,deathLock=false;
const input={left:false,right:false,jump:false};
let jumpBuffer=0,levelRunDeaths=0;
const run={level:0,deaths:0,start:performance.now(),levelDeaths:0};
const player={x:70,y:0,w:22,h:30,vx:0,vy:0,onGround:false,coyote:0,jumpLock:false,landed:false};
const particles=[]; const camera={x:0};
let levelState=null,ai=null,aiBusy=false,supabaseClient=null,authUser=null,authReady=false,unlockedLevel=0,continueLevel=0,replaying=false,levelsCompleted=0,shards=0,shardMask=[0,0,0];
const behavior={attempts:0,deaths:0,jumps:0,airTime:0,progress:0,deathXs:[],recentDeaths:[],mode:'NORMAL',adaptation:0};
const SAVE='acerola-game-core-v3';
function profileMode(){const d=run.levelDeaths, recent=behavior.recentDeaths.length; if(d>=5)return 'SUPPORT'; if(d>=3)return 'FOCUS'; if(behavior.progress>0.72&&d<=1)return 'PRESSURE'; return 'NORMAL'}
function updateBehavior(){behavior.mode=profileMode();behavior.adaptation=behavior.mode==='SUPPORT'?-1:behavior.mode==='PRESSURE'?1:0}
function recordDeath(reason){behavior.deaths++;behavior.attempts++;behavior.deathXs.push(Math.round(player.x));behavior.recentDeaths.push({x:Math.round(player.x),reason,level:run.level+1});if(behavior.recentDeaths.length>12)behavior.recentDeaths.shift();updateBehavior()}
function adaptationLabel(){return behavior.mode==='SUPPORT'?'SUPPORT MODE':behavior.mode==='PRESSURE'?'PRESSURE MODE':behavior.mode==='FOCUS'?'FOCUS MODE':'CORE BALANCED'}

const levels=[
 {name:'FIRST CONTACT',shards:[[300,255],[760,240],[1580,240]],world:1900,spawn:{x:70,y:300},goal:{x:1770,y:270},platforms:[
  [0,350,440,40],[520,350,420,40],[1010,350,300,40],[1400,350,500,40],
  [250,300,80,18],[650,285,90,18],[1120,285,90,18],[1510,285,110,18]
 ],hazards:[[440,380,80,20],[940,380,70,20],[1310,380,90,20]],moving:[]},
 {name:'THE FLOOR REMEMBERS',shards:[[260,240],[945,225],[1785,225]],world:2050,spawn:{x:60,y:300},goal:{x:1910,y:270},platforms:[
  [0,350,330,40],[430,350,280,40],[810,350,300,40],[1210,350,300,40],[1610,350,440,40],
  [210,285,90,18],[520,270,90,18],[900,270,90,18],[1320,275,90,18],[1740,270,100,18]
 ],hazards:[[330,380,100,20],[710,380,100,20],[1110,380,100,20],[1510,380,100,20]],moving:[[735,290,70,14,760,180,1]]},
 {name:'TRUST NOTHING',shards:[[220,235],[970,225],[1715,225]],world:2200,spawn:{x:60,y:300},goal:{x:2050,y:270},platforms:[
  [0,350,370,40],[480,350,250,40],[850,350,260,40],[1230,350,260,40],[1580,350,260,40],[1940,350,260,40],
  [170,280,100,18],[560,275,100,18],[930,270,90,18],[1310,275,100,18],[1670,270,100,18]
 ],hazards:[[370,380,110,20],[730,380,120,20],[1110,380,120,20],[1490,380,90,20],[1840,380,100,20]],moving:[]}
];

function resize(){const r=canvas.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);W=Math.max(320,r.width);H=Math.max(400,r.height);canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
function loadSave(){
 try{
  const s=JSON.parse(localStorage.getItem(SAVE)||'{}');
  continueLevel=Math.max(0,Math.min(levels.length-1,Number(s.continueLevel??s.level)||0));
  unlockedLevel=Math.max(0,Math.min(levels.length-1,Number(s.unlockedLevel??continueLevel)||0));
  unlockedLevel=Math.max(unlockedLevel,continueLevel);
  run.level=continueLevel;
  run.deaths=Math.max(0,Number(s.deaths)||0);shardMask=Array.isArray(s.shardMask)?s.shardMask.slice(0,levels.length).map(v=>Number(v)||0):shardMask;while(shardMask.length<levels.length)shardMask.push(0);levelsCompleted=Math.max(0,Number(s.levelsCompleted)||0);shards=Math.max(0,Number(s.shards)||0);
 }catch(_){}
}
function save(){
 try{localStorage.setItem(SAVE,JSON.stringify({level:run.level,continueLevel,unlockedLevel,deaths:run.deaths,levelsCompleted,shards,shardMask}))}catch(_){}
 saveCloud();
}
async function saveCloud(){
 if(!supabaseClient||!authUser||authUser.is_anonymous)return;
 try{
  await supabaseClient.from('game_saves').upsert({
   user_id:authUser.id,
   current_level:continueLevel,
   unlocked_level:unlockedLevel,
   total_deaths:run.deaths,levels_completed:levelsCompleted,shards,shard_mask:shardMask,
   level_deaths:run.levelDeaths,
   updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
 }catch(_){}
}
async function loadCloud(){
 if(!supabaseClient||!authUser||authUser.is_anonymous)return;
 try{
  const {data,error}=await supabaseClient.from('game_saves').select('current_level,unlocked_level,total_deaths,level_deaths,levels_completed,shards,shard_mask').eq('user_id',authUser.id).maybeSingle();
  if(error)throw error;
  if(data){
   continueLevel=Math.max(0,Math.min(levels.length-1,Number(data.current_level)||0),continueLevel);
   unlockedLevel=Math.max(0,Math.min(levels.length-1,Number(data.unlocked_level)||0),unlockedLevel,continueLevel);
   run.deaths=Math.max(run.deaths,Number(data.total_deaths)||0);
   run.level=continueLevel;
   run.levelDeaths=Number(data.level_deaths)||0;levelsCompleted=Math.max(levelsCompleted,Number(data.levels_completed)||0);shards=Math.max(shards,Number(data.shards)||0);if(Array.isArray(data.shard_mask)){shardMask=data.shard_mask.slice(0,levels.length).map(v=>Number(v)||0);while(shardMask.length<levels.length)shardMask.push(0)}
  }
  await saveCloud();
  updateAccountUI();
 }catch(_){}
}
function updateAccountUI(){
 const signed=!!authUser&&!authUser.is_anonymous;
 const name=signed?(authUser.user_metadata?.full_name||authUser.user_metadata?.name||'Acerola Player'):'Guest Runner';
 $('accountTitle').textContent=signed?'View account':'Sign in';
 $('accountSub').textContent=signed?'Progress sync is on':'Play locally or sign in to sync';
 $('accountBtn').title=signed?'View account':'Sign in';
 if($('accountName'))$('accountName').textContent=name;
 if($('accountEmail'))$('accountEmail').textContent=signed?(authUser.email||'Cloud save active'):'Local progress only';
 if($('accountStats'))$('accountStats').innerHTML=[
  ['SECTORS',String(unlockedLevel+1)+' / '+levels.length],
  ['FAILS',String(run.deaths)],
  ['SHARDS',String(shards)+' / 9']
 ].map(x=>'<div style="padding:8px;border:1px solid #20324e;border-radius:10px;background:#0a1627"><b style="display:block;font-size:14px">'+x[1]+'</b><small style="color:#8292aa">'+x[0]+'</small></div>').join('');
 if($('accountAchievements'))$('accountAchievements').innerHTML='ACHIEVEMENTS<br><span style="color:#8292aa">'+(levelsCompleted>=1?'✓ First Contact  ':'○ First Contact  ')+(levelsCompleted>=2?'✓ Deep Signal  ':'○ Deep Signal  ')+(levelsCompleted>=3?'✓ Core Complete  ':'○ Core Complete  ')+(shards>=3?'✓ Signal Hunter':'○ Signal Hunter')+'</span>';
 if($('accountAction'))$('accountAction').textContent=signed?'Sign out':'Sign in with Google';
} 
function setText(id,t){$(id).textContent=t}
function flash(title,sub,duration=900){setText('statusTitle',title);setText('statusSub',sub);$('status').classList.add('show');clearTimeout(flash.t);flash.t=setTimeout(()=>$('status').classList.remove('show'),duration)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function current(){return levels[run.level]}

function resetLevel(resetCounter=false){
 const l=current();
 const spawnX=levelState?.checkpointX??l.spawn.x;
 player.x=spawnX;player.y=l.spawn.y;player.vx=0;player.vy=0;player.onGround=false;player.coyote=0;player.landed=false;jumpBuffer=0;deathLock=false;
 camera.x=0;
 if(resetCounter){run.levelDeaths=0;levelRunDeaths=0}
 levelState={moving:l.moving.map(m=>({x:m[0],y:m[1],w:m[2],h:m[3],min:m[4],max:m[5],dir:m[6]})),start:performance.now(),checkpointX:resetCounter?l.spawn.x:(levelState?.checkpointX??l.spawn.x),checkpointShown:false};
 setText('levelLabel',String(run.level+1).padStart(2,'0'));setText('deaths',run.deaths);behavior.progress=spawnX/l.world;updateBehavior();
 flash('SECTOR '+String(run.level+1).padStart(2,'0'),l.name,700);
 aiEvent('level_started',{level:run.level+1,name:l.name,checkpoint:levelState.checkpointX});
}
function setInput(k,v){input[k]=v}
[['left','left'],['right','right'],['jump','jump']].forEach(([id,k])=>{const b=$(id);['pointerdown','touchstart'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();setInput(k,true)},{passive:false}));['pointerup','pointercancel','pointerleave','touchend'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();setInput(k,false)},{passive:false}))});
addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')input.left=true;if(e.code==='ArrowRight'||e.code==='KeyD')input.right=true;if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')input.jump=true;if(e.code==='Escape')toggleMenu()});
addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')input.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')input.right=false;if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')input.jump=false});
$('home').onclick=()=>location.href='../';
$('menuBtn').onclick=toggleMenu;
$('accountBtn').onclick=()=>{paused=true;$('menu').classList.add('show');showAccount()};
$('accountMenu').onclick=showAccount;
$('resume').onclick=toggleMenu;
$('restart').onclick=()=>{toggleMenu();replaying=false;levelState=null;resetLevel(true)};
$('resetRun').onclick=()=>{run.level=0;continueLevel=0;unlockedLevel=0;run.deaths=0;replaying=false;save();toggleMenu();levelState=null;resetLevel(true)};
$('replayBtn').onclick=showReplayList;
function toggleMenu(){paused=!paused;$('menu').classList.toggle('show',paused)}
function showReplayList(){
 const box=$('replayList');box.style.display=box.style.display==='none'?'block':'none';
 if(box.style.display==='none')return;
 box.innerHTML='';
 for(let i=0;i<=unlockedLevel;i++){
  const b=document.createElement('button');
  b.style.cssText='display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #20324e;border-radius:10px;background:#0a1627;color:#fff;text-align:left';
  b.innerHTML='<b>Sector '+String(i+1).padStart(2,'0')+'</b><small style="display:block;color:#8292aa">'+levels[i].name+(i===continueLevel?' · CONTINUE POINT':' · UNLOCKED')+'</small>';
  b.onclick=()=>selectReplay(i);
  box.appendChild(b);
 }
}
function selectReplay(i){
 run.level=i;
 replaying=i<continueLevel;
 levelState=null;
 $('replayList').style.display='none';
 toggleMenu();
 resetLevel(true);
 flash('SECTOR '+String(i+1).padStart(2,'0'),replaying?'REPLAY MODE':'CONTINUE',900);
}
function showAccount(){
 paused=true;$('menu').classList.add('show');
 $('replayList').style.display='none';$('accountPanel').style.display='block';updateAccountUI();
}
$('accountAction').onclick=()=>{
 const signed=!!authUser&&!authUser.is_anonymous;
 if(signed){supabaseClient.auth.signOut().then(()=>{authUser=null;updateAccountUI()});return}
 if(!supabaseClient){alert('Account service is not ready yet.');return}
 supabaseClient.auth.signInWithOAuth({
  provider:'google',
  options:{redirectTo:location.origin+location.pathname}
 }).then(({error})=>{if(error)alert('Sign-in could not start: '+error.message)});
};

function movePlatforms(dt){const speed=behavior.mode==='SUPPORT'?38:behavior.mode==='PRESSURE'?68:55;for(const m of levelState.moving){m.x+=m.dir*speed*dt;if(m.x>m.max||m.x<m.min){m.x=clamp(m.x,m.min,m.max);m.dir*=-1}}}
function platforms(){const l=current();return l.platforms.map(p=>({x:p[0],y:p[1],w:p[2],h:p[3]})).concat(levelState.moving)}
function hazards(){const mode=behavior.mode;const adjust=mode==='SUPPORT'?-10:mode==='PRESSURE'?5:0;return current().hazards.map(h=>({x:h[0],y:h[1],w:Math.max(18,h[2]+adjust),h:h[3]}))}
function physics(dt){
 behavior.airTime+=dt;const normalizedProgress=player.x/current().world;if(normalizedProgress>behavior.progress)behavior.progress=normalizedProgress;updateBehavior();
 const accel=1050,friction=900,max=245,gravity=1120,jump=-430;
 let dir=(input.right?1:0)-(input.left?1:0);
 player.vx+=dir*accel*dt;
 if(!dir)player.vx-=Math.sign(player.vx)*Math.min(Math.abs(player.vx),friction*dt);
 player.vx=clamp(player.vx,-max,max);
 if(player.onGround)player.coyote=.1;else player.coyote=Math.max(0,player.coyote-dt);
 if(input.jump)jumpBuffer=.12;else jumpBuffer=Math.max(0,jumpBuffer-dt);
 if(jumpBuffer>0&&!player.jumpLock&&player.coyote>0){jumpBuffer=0;player.vy=jump;player.onGround=false;player.jumpLock=true;burst(player.x+11,player.y+30,8)}
 if(!input.jump){player.jumpLock=false;if(player.vy<0)player.vy+=gravity*.55*dt}
 player.vy+=gravity*dt;
 const oldY=player.y;player.x+=player.vx*dt;player.y+=player.vy*dt;
 player.x=clamp(player.x,0,current().world-player.w);
 player.onGround=false;
 for(const p of platforms()){
  const wasBottom=oldY+player.h,nowBottom=player.y+player.h;
  if(player.vy>=0&&wasBottom<=p.y+4&&nowBottom>=p.y&&player.x+player.w>p.x&&player.x<p.x+p.w){
   player.y=p.y-player.h;player.vy=0;
   if(!player.onGround){player.landed=true;burst(player.x+11,player.y+30,4)}
   player.onGround=true;
   if(p.w<100)player.vx*=.98;
  }
 }
 if(player.x>current().world*.55&&levelState.checkpointX<current().world*.55){
  levelState.checkpointX=current().world*.55;levelState.checkpointShown=true;
  burst(levelState.checkpointX,345,14);flash('CHECKPOINT','The core remembers this position.',1100);
  aiEvent('checkpoint_reached',{x:Math.round(levelState.checkpointX),deaths:run.levelDeaths});
 }
 if(player.y>H+200)die('THE VOID');
 const ls=current().shards||[];for(let i=0;i<ls.length;i++){if(shardMask[run.level]&(1<<i))continue;const sx=ls[i][0],sy=ls[i][1];const dx=player.x+player.w/2-sx,dy=player.y+player.h/2-sy;if(dx*dx+dy*dy<34*34){shardMask[run.level]|=(1<<i);shards++;save();burst(sx,sy,12);flash('SIGNAL SHARD','Acerola remembered it.',650);aiEvent('shard_collected',{level:run.level+1,index:i,total:shards})}}
 for(const h of hazards()){const r={x:h.x,y:h.y-8,w:h.w,h:h.h+8};if(rectHit(player,r)){die('TRAP');break}}
 if(player.x+player.w>current().goal.x&&player.y+player.h>current().goal.y-20)completeLevel();
}
function die(reason){
 if(deathLock)return;deathLock=true;run.deaths++;run.levelDeaths++;levelRunDeaths++;recordDeath(reason);save();
 burst(player.x+11,player.y+15,22);flash('RUN TERMINATED',reason,650);
 aiEvent('player_died',{reason,deaths:run.deaths,levelDeaths:run.levelDeaths,x:Math.round(player.x),mode:behavior.mode});
 setTimeout(()=>resetLevel(false),240);
}
function completeLevel(){
 if(deathLock)return;deathLock=true;burst(player.x+10,player.y+10,32);
 if(run.level<levels.length-1){
  levelsCompleted=Math.max(levelsCompleted,run.level+1);save();aiEvent('level_completed',{level:run.level+1,deaths:run.levelDeaths});
  if(run.level>=continueLevel)continueLevel=run.level+1;
  unlockedLevel=Math.max(unlockedLevel,run.level+1);
  if(replaying){
   run.level=continueLevel;
   replaying=false;
   save();
   setTimeout(()=>{levelState=null;resetLevel(true);paused=true;$('menu').classList.add('show');flash('REPLAY COMPLETE','Continue point preserved.',1200)},420);
  }else{
   run.level++;
   save();
   setTimeout(()=>{levelState=null;resetLevel(true)},420);
  }
 }else{
  continueLevel=Math.max(continueLevel,run.level);unlockedLevel=Math.max(unlockedLevel,run.level);save();flash('CORE COMPLETE','You reached the end of the first build.',2500);
  aiEvent('run_completed',{deaths:run.deaths});
 }
}
function burst(x,y,n){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=40+Math.random()*180;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,life:.4+Math.random()*.5,max:.9,r:1+Math.random()*2})}}

function draw(){
 ctx.clearRect(0,0,W,H);
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#050a18');sky.addColorStop(1,'#03050b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 camera.x+=(clamp(player.x-W*.35,0,Math.max(0,current().world-W))-camera.x)*.12;
 ctx.save();ctx.translate(-camera.x,0);drawGrid(camera.x,W,H);drawStars();drawPlatforms();drawShards();drawHazards();drawCheckpoint();drawGoal();drawPlayer();drawAdaptationBeacon();ctx.restore();
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=1/60;if(p.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=i%2?'#20f6ff':'#ff4eae';ctx.fillRect(p.x-camera.x,p.y,p.r*2,p.r*2)}ctx.globalAlpha=1;
}
function drawGrid(cx,w,h){ctx.strokeStyle='rgba(100,150,210,.055)';ctx.lineWidth=1;const step=44;for(let x=Math.floor(cx/step)*step;x<cx+w+step;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=40;y<h;y+=step){ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx+w,y);ctx.stroke()}}
function drawStars(){for(let i=0;i<45;i++){const x=(i*173)%current().world,y=45+(i*79)%220;ctx.fillStyle=i%4===0?'#20f6ff':'rgba(180,210,255,.25)';ctx.fillRect(x,y,1.5,1.5)}}
function drawPlatforms(){for(const p of platforms()){const grd=ctx.createLinearGradient(0,p.y,0,p.y+p.h);grd.addColorStop(0,'#162943');grd.addColorStop(1,'#08101d');ctx.fillStyle=grd;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#20f6ff';ctx.fillRect(p.x,p.y,p.w,2);ctx.fillStyle='rgba(32,246,255,.08)';ctx.fillRect(p.x+8,p.y+7,p.w-16,3)}}
function drawHazards(){for(const h of hazards()){ctx.fillStyle='#ff3f77';for(let x=h.x;x<h.x+h.w;x+=16){ctx.beginPath();ctx.moveTo(x,h.y);ctx.lineTo(x+8,h.y-14);ctx.lineTo(x+16,h.y);ctx.fill()}ctx.fillStyle='rgba(255,63,119,.2)';ctx.fillRect(h.x,h.y-2,h.w,5)}}
function drawShards(){const ls=current().shards||[];for(let i=0;i<ls.length;i++){if(shardMask[run.level]&(1<<i))continue;const [x,y]=ls[i];ctx.save();ctx.translate(x,y);ctx.rotate(performance.now()/900);ctx.fillStyle='rgba(32,246,255,.12)';ctx.beginPath();ctx.arc(0,0,14,0,TAU);ctx.fill();ctx.fillStyle='#20f6ff';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(7,0);ctx.lineTo(0,9);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.restore()}}
function drawCheckpoint(){if(!levelState||levelState.checkpointX<=current().spawn.x)return;const x=levelState.checkpointX;ctx.fillStyle='rgba(104,246,160,.12)';ctx.fillRect(x-12,250,24,100);ctx.fillStyle='#68f6a0';ctx.fillRect(x-2,270,4,80);ctx.fillRect(x-2,270,18,3)}
function drawAdaptationBeacon(){if(behavior.mode==='NORMAL')return;const x=player.x+player.w/2;ctx.fillStyle=behavior.mode==='SUPPORT'?'rgba(104,246,160,.16)':'rgba(255,78,174,.13)';ctx.beginPath();ctx.arc(x,70,18,0,TAU);ctx.fill();ctx.fillStyle=behavior.mode==='SUPPORT'?'#68f6a0':'#ff4eae';ctx.font='700 8px system-ui';ctx.textAlign='center';ctx.fillText(adaptationLabel(),x,54)}
function drawGoal(){const g=current().goal;ctx.save();ctx.translate(g.x,g.y);ctx.fillStyle='rgba(32,246,255,.13)';ctx.fillRect(-12,-70,44,95);ctx.strokeStyle='#20f6ff';ctx.lineWidth=2;ctx.strokeRect(0,-50,22,50);ctx.fillStyle='#20f6ff';ctx.fillRect(3,-47,16,44);ctx.fillStyle='#06131b';ctx.fillRect(15,-27,3,3);ctx.restore()}
function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);const moving=Math.abs(player.vx)>20&&!player.onGround;const stretch=moving?Math.min(.12,Math.abs(player.vx)/2200):0;const land=player.landed?Math.min(.12,Math.abs(player.vy)/1800):0;ctx.translate(11,30);ctx.scale(1+land,1-stretch);ctx.translate(-11,-30);const glow=ctx.createRadialGradient(11,16,2,11,16,35);glow.addColorStop(0,'rgba(32,246,255,.25)');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(-24,-20,70,55);ctx.fillStyle='#f4f8ff';ctx.fillRect(3,0,16,24);ctx.fillStyle='#20f6ff';ctx.fillRect(5,4,12,7);ctx.fillStyle='#09131e';ctx.fillRect(7,6,3,3);ctx.fillRect(13,6,3,3);ctx.fillStyle='#ff4eae';ctx.fillRect(3,24,6,5);ctx.fillRect(14,24,6,5);ctx.restore();player.landed=false}

function loop(t){const dt=Math.min(.033,Math.max(.001,(t-last)/1000||.016));last=t;if(!paused){movePlatforms(dt);physics(dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt}}draw();raf=requestAnimationFrame(loop)}

function aiEvent(type,data){if(!ai)return;ai.events.push({type,data,at:Date.now()});if(type==='player_died'&&data.levelDeaths===2)requestInsight('The player has failed twice on the current level. Give one concise, non-spoiler observation based on the event data.');if(type==='player_died'&&data.levelDeaths===3)requestInsight('Analyze the player pattern from the supplied game context. Give one concise observation and one non-spoiler strategy. Do not invent facts.');if(type==='checkpoint_reached')requestInsight('The player reached a checkpoint. Give one short observation about progress, without revealing upcoming traps.');if(type==='level_completed')requestInsight('The player just completed a level. Give a short encouraging observation and mention the next challenge without spoiling it.');if(type==='run_completed')requestInsight('The player completed the first playable build. Give a short celebratory message.')}
async function initAI(){
 $('ai-state').textContent='AI CONNECTING';
 try{
  const client=window.supabase?.createClient('https://djumpimcwzhjujysznox.supabase.co','sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7');
  if(!client)throw Error('Supabase client unavailable');
  supabaseClient=client;
  client.auth.onAuthStateChange(async (event,session)=>{ if(session?.user){authUser=session.user;updateAccountUI();if(!authUser.is_anonymous)await loadCloud()}else{authUser=null;updateAccountUI()} });
  let {data:{session}}=await client.auth.getSession();
  if(session?.user){
   authUser=session.user;
  }else{
   const r=await client.auth.signInAnonymously();
   if(r.error)throw r.error;
   session=r.data.session;authUser=session?.user||null;
  }
  authReady=true;updateAccountUI();
  if(authUser&&!authUser.is_anonymous)await loadCloud();
  if(!session?.access_token)throw Error('No AI session');
  ai={client,token:session.access_token,events:[]};
  $('ai-state').textContent=authUser&&!authUser.is_anonymous?'AI ONLINE · SAVED':'AI ONLINE';
  $('aiCard').classList.add('show');setTimeout(()=>$('aiCard').classList.remove('show'),3500);
 }catch(e){
  $('ai-state').textContent='AI LOCAL';ai={events:[]};updateAccountUI();
  setTimeout(()=>setText('aiText','Acerola is running locally. AI commentary will return when the connection is available.'),200)
 }
}
async function askAcerola(prompt){
 if(aiBusy)return;aiBusy=true;$('aiMode').textContent='THINKING';$('aiCard').classList.add('show');
 if(!ai?.token){setText('aiText','The AI connection is unavailable. Keep playing — local game systems are still active.');$('aiMode').textContent='LOCAL';aiBusy=false;return}
 try{
  const l=current();const context={game:'Acerola Game Core',level:run.level+1,level_name:l.name,deaths:run.deaths,level_deaths:run.levelDeaths,behavior_mode:behavior.mode,adaptation:behavior.adaptation,progress:Math.round(behavior.progress*100),death_positions:behavior.deathXs.slice(-8),checkpoint:Math.round(levelState?.checkpointX??l.spawn.x),player_x:Math.round(player.x),goal_x:l.goal.x,recent_events:ai.events.slice(-8)};
  const body={message:String(prompt),conversation:[{role:'user',content:JSON.stringify(context)}],game_context:context};
  const res=await fetch('https://djumpimcwzhjujysznox.supabase.co/functions/v1/acerola-ai-gateway',{method:'POST',headers:{'Content-Type':'application/json','apikey':'sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7','Authorization':'Bearer '+ai.token},body:JSON.stringify(body)});
  const data=await res.json();if(!res.ok)throw Error(data?.error||'Gateway unavailable');setText('aiText',String(data.reply||'Acerola received the game event.'));$('aiMode').textContent='GAME CORE';
 }catch(e){setText('aiText','Acerola could not reach the AI service right now. The game is still playable.');$('aiMode').textContent='LOCAL'}finally{aiBusy=false}
}
function requestInsight(p){if(!aiBusy)askAcerola(p)}
$('hintBtn').onclick=()=>askAcerola('Give me a single subtle hint for this level. Do not reveal the trap location or exact solution.');
$('chatBtn').onclick=()=>askAcerola('Act as my in-game Acerola companion. Based on the current run, say something useful and concise.');
loadSave();resetLevel(true);initAI();requestAnimationFrame(loop);
})();