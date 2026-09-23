(()=>{
  'use strict';
  const SUPABASE_URL='https://djumpimcwzhjujysznox.supabase.co';
  const SUPABASE_KEY='sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7';
  const CHAT_KEY='acerola-ai-chats-v6';
  const ACTIVE_KEY='acerola-ai-active-v6';
  const db=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
  if(!db)return;
  // Authentication gate: Acerola's main app requires a signed-in account.
  // Keep the gate here so the login page is the single entry point while
  // preserving the existing account modal for account management.
  db.auth.getSession().then(({data:{session}})=>{
    if(!session && !location.pathname.endsWith('/login.html')){
      const loginUrl=new URL('login.html',location.href);
      loginUrl.searchParams.set('returnTo',location.href);
      location.replace(loginUrl.href);
    }
  }).catch(()=>{});
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const style=document.createElement('style');style.textContent=`#accountBtn{width:40px;height:40px;border:1px solid #1d2b49;border-radius:12px;background:#0b1428;color:#00eaff;font-size:15px}.account-sheet{position:fixed;z-index:40;inset:0;background:#000b;display:none;align-items:center;justify-content:center;padding:16px}.account-sheet.open{display:flex}.account-card{width:min(430px,100%);max-height:90vh;overflow:auto;background:#080e1d;border:1px solid #1d2b49;border-radius:20px;padding:20px;box-shadow:0 20px 80px #000}.account-card h2{margin:0 0 4px}.account-muted{color:#8495b1;font-size:11px;margin-bottom:16px}.account-input{width:100%;padding:11px;border:1px solid #1d2b49;border-radius:10px;background:#0b1428;outline:0;margin:5px 0 8px}.account-btn{width:100%;padding:11px;border:1px solid #236078;border-radius:10px;background:#0b2030;color:#00eaff;margin:5px 0;font-weight:700}.account-btn.google{border-color:#603052;color:#ff69b8;background:#190e1b}.account-btn.secondary{background:#0b1428;color:#f3f8ff;border-color:#1d2b49}.account-msg{min-height:18px;color:#8495b1;font-size:10px;margin-top:8px}.account-section-title{color:#20f6ff;font-size:8px;letter-spacing:1.5px;margin:15px 0 5px}.account-label{display:block;color:#8495b1;font-size:10px;margin-top:8px}.account-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.account-textarea{min-height:90px;resize:vertical}.account-divider{display:flex;align-items:center;gap:8px;color:#607390;font-size:9px;margin:12px 0}.account-divider:before,.account-divider:after{content:'';height:1px;background:#1d2b49;flex:1}.voice-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.voice-row{padding:10px;border:1px solid #1d2b49;border-radius:10px;background:#0b1428}.voice-row label{display:block;color:#8495b1;font-size:10px;margin-bottom:5px}.voice-row select{width:100%;background:#080e1d;color:#f3f8ff;border:1px solid #1d2b49;border-radius:8px;padding:8px}.profile{padding:12px;border:1px solid #1d2b49;border-radius:12px;background:#0b1428;margin-bottom:10px}.profile b{display:block}.profile span{color:#8495b1;font-size:10px}.account-close{float:right;width:34px;height:34px;border:1px solid #1d2b49;border-radius:9px;background:#0c162a;color:#fff}`;document.head.appendChild(style);
  const sheet=document.createElement('div');sheet.className='account-sheet';sheet.innerHTML=`<div class="account-card"><button class="account-close" id="accClose">×</button><h2 id="accTitle">Acerola Account</h2><div class="account-muted" id="accSub">Sign in to keep your chats and memories across devices.</div><div id="accBody"></div></div>`;document.body.appendChild(sheet);
  const body=$('#accBody'),title=$('#accTitle'),sub=$('#accSub');
  function open(){sheet.classList.add('open');render()}function close(){sheet.classList.remove('open')}$('#accClose').onclick=close;sheet.onclick=e=>{if(e.target===sheet)close()};
  function oauthRedirect(){return new URL('./',location.href).href}
  function form(){body.innerHTML=`<button class="account-btn google" id="google">Continue with Google</button><div class="account-divider">OR EMAIL</div><input class="account-input" id="email" type="email" placeholder="Email address" autocomplete="email"><input class="account-input" id="pass" type="password" placeholder="Password (8+ characters)" autocomplete="current-password"><button class="account-btn" id="login">Log in</button><button class="account-btn secondary" id="signup">Create account</button><div class="account-msg" id="accMsg"></div>`;
    $('#google').onclick=async()=>{const {data:{session}}=await db.auth.getSession();const method=session?.user?.is_anonymous?'linkIdentity':'signInWithOAuth';const r=method==='linkIdentity'?await db.auth.linkIdentity({provider:'google'}):await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('./',location.href).href}});if(r?.error)$('#accMsg').textContent=r.error.message};
    $('#login').onclick=()=>emailAuth(false);$('#signup').onclick=()=>emailAuth(true)}
  async function emailAuth(signup){const email=$('#email').value.trim(),password=$('#pass').value;if(!email||password.length<8){$('#accMsg').textContent='Enter a valid email and an 8+ character password.';return}$('#accMsg').textContent='Connecting…';const {data:{session}}=await db.auth.getSession();let r;if(signup&&session?.user?.is_anonymous){const u=await db.auth.updateUser({email,data:{name:email.split('@')[0]}});r=u;if(!u.error){const p=await db.auth.updateUser({password});r=p}}else r=signup?await db.auth.signUp({email,password,options:{data:{name:email.split('@')[0]}}}):await db.auth.signInWithPassword({email,password});if(r.error){$('#accMsg').textContent=r.error.message;return}$('#accMsg').textContent=signup?'Check your email to verify your account, then sign in.':'Signed in. Syncing Acerola…';setTimeout(()=>location.reload(),500)}
  function voices(){return speechSynthesis?.getVoices?.()||[]}
  function voiceOptions(selected){const vs=voices();return vs.map((v,i)=>`<option value="${i}" ${String(i)===String(selected)?'selected':''}>${esc(v.name)} — ${esc(v.lang)}</option>`).join('')||'<option value="">Browser voices unavailable</option>'}
  function calcAge(birthDate){if(!birthDate)return '';const d=new Date(birthDate+'T00:00:00');if(Number.isNaN(d.getTime()))return '';const now=new Date();let age=now.getFullYear()-d.getFullYear();const before=(now.getMonth()<d.getMonth())||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate());if(before)age--;return age>=0&&age<130?String(age):''}
  async function render(){
    const {data:{session}}=await db.auth.getSession();
    if(!session){title.textContent='Acerola Account';sub.textContent='Sign in to keep your chats and memories across devices.';form();return}
    let {data:p}=await db.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
    if(!p){await db.from('profiles').upsert({id:session.user.id,display_name:session.user.user_metadata?.name||session.user.email?.split('@')[0]||'Acerola user',updated_at:new Date().toISOString()},{onConflict:'id'});const q=await db.from('profiles').select('*').eq('id',session.user.id).maybeSingle();p=q.data||{}}
    const age=calcAge(p?.birth_date);
    title.textContent=p?.display_name||p?.preferred_name||session.user.email?.split('@')[0]||'Acerola user';
    sub.textContent='Your Acerola profile and personalization';
    body.innerHTML=`<div class="profile"><b>${esc(p?.display_name||'Acerola user')}</b><span>${esc(session.user.email||'')}</span>${age?'<span>Age: '+esc(age)+'</span>':''}</div>
      <div class="account-section-title">PROFILE</div>
      <label class="account-label">Display name<input class="account-input" id="displayName" value="${esc(p?.display_name||'')}" maxlength="80" placeholder="Your name"></label>
      <label class="account-label">Username<input class="account-input" id="username" value="${esc(p?.username||'')}" maxlength="30" placeholder="e.g. acerolaorion"></label>
      <label class="account-label">What should Acerola call you?<input class="account-input" id="preferredName" value="${esc(p?.preferred_name||'')}" maxlength="50" placeholder="Preferred name"></label>
      <div class="account-two">
        <label class="account-label">Birthday<input class="account-input" id="birthDate" type="date" value="${esc(p?.birth_date||'')}" max="${new Date().toISOString().slice(0,10)}"></label>
        <label class="account-label">Country<input class="account-input" id="country" value="${esc(p?.country||'')}" maxlength="80" placeholder="Country"></label>
      </div>
      <label class="account-label">Language<select class="account-input" id="language"><option value="en" ${p?.language==='en'?'selected':''}>English</option><option value="en-NG" ${p?.language==='en-NG'?'selected':''}>Nigerian English</option}</select></label>
      <label class="account-label">About me<textarea class="account-input account-textarea" id="aboutMe" maxlength="1000" placeholder="Tell Acerola about yourself, your interests, goals, or how you like to work.">${esc(p?.about_me||'')}</textarea></label>
      <div class="account-section-title">VOICE</div>
      <div class="voice-grid"><div class="voice-row"><label>Voice profile</label><select id="voice">${voiceOptions(p?.voice_id||'')}</select></div><div class="voice-row"><label>Speech</label><button class="account-btn secondary" id="testVoice">Test voice</button></div></div>
      <button class="account-btn" id="saveProfile">Save profile</button>
      <button class="account-btn secondary" id="sync">Sync chats & memories</button>
      <button class="account-btn secondary" id="logout">Log out</button>
      <div class="account-msg" id="accMsg">Your profile is private to your account. Acerola can use these details for personalization.</div>`;
    const save=async()=>{
      const payload={id:session.user.id,display_name:$('#displayName').value.trim(),username:$('#username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,''),preferred_name:$('#preferredName').value.trim(),birth_date:$('#birthDate').value||null,country:$('#country').value.trim(),language:$('#language').value,about_me:$('#aboutMe').value.trim(),voice_id:$('#voice').value||'',updated_at:new Date().toISOString()};
      const r=await db.from('profiles').upsert(payload,{onConflict:'id'});const x=$('#accMsg');if(r.error){x.textContent='Could not save profile: '+r.error.message;return}localStorage.setItem('acerola-voice-id',payload.voice_id);x.textContent='Profile saved. Acerola will use it for personalization.';setTimeout(render,450)
    };
    $('#saveProfile').onclick=save;
    speechSynthesis?.addEventListener?.('voiceschanged',()=>{const v=$('#voice');if(v)v.innerHTML=voiceOptions(p?.voice_id||'')},{once:true});
    $('#voice').onchange=()=>localStorage.setItem('acerola-voice-id',$('#voice').value);
    $('#testVoice').onclick=()=>{const vs=voices(),v=vs[Number($('#voice').value)];const u=new SpeechSynthesisUtterance('Hello. I am Acerola.');if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u)};
    $('#sync').onclick=()=>sync(true);
    $('#logout').onclick=async()=>{await db.auth.signOut();location.reload()}
  }
  async function sync(show){const {data:{session}}=await db.auth.getSession();if(!session)return;const uid=session.user.id;let local=[];try{local=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]')}catch{};for(const c of local){let {data:remote}=await db.from('conversations').select('id').eq('id',c.id).eq('user_id',uid).maybeSingle();if(!remote){await db.from('conversations').insert({id:c.id,user_id:uid,title:String(c.title||'New chat').slice(0,100),created_at:new Date(c.updatedAt||Date.now()).toISOString(),updated_at:new Date(c.updatedAt||Date.now()).toISOString()});}else await db.from('conversations').update({title:String(c.title||'New chat').slice(0,100),updated_at:new Date(c.updatedAt||Date.now()).toISOString()}).eq('id',c.id).eq('user_id',uid);for(const m of c.messages||[]){const stamp=Number(m.at||c.updatedAt||Date.now());const exists=await db.from('messages').select('id').eq('conversation_id',c.id).eq('user_id',uid).eq('role',m.role).eq('content',String(m.content||'')).limit(1);if(!exists.data?.length)await db.from('messages').insert({conversation_id:c.id,user_id:uid,role:m.role,content:String(m.content||'').slice(0,20000),created_at:new Date(stamp).toISOString()})}}
    if(show){const x=$('#accMsg');if(x)x.textContent='Sync complete.'}
  }
  // Persistent memory is owned by Agent Core -> gateway -> service-role path.\n  // Browser code must never write directly to acerola_memory.\n  const b=document.createElement('button');b.id='accountBtn';b.textContent='👤';b.title='Acerola Account';b.onclick=open;$('.top')?.insertBefore(b,$('#about'));
  db.auth.onAuthStateChange((_event,session)=>{if(session){window.dispatchEvent(new CustomEvent('acerola:account-ready',{detail:{userId:session.user.id}}));sync(false)}});
  setTimeout(()=>db.auth.getSession().then(({data:{session}})=>{if(session){sync(false);const p=location.pathname;if(p&&location.hash.includes('access_token'))setTimeout(()=>location.reload(),300)}}),300);
})();