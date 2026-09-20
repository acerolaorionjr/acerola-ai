/* Acerola integrated Support + Pro module. No separate product page required. */
(()=>{
  'use strict';
  const SUPA_URL='https://djumpimcwzhjujysznox.supabase.co';
  const INIT_URL=SUPA_URL+'/functions/v1/paystack-payment';
  const VERIFY_URL=SUPA_URL+'/functions/v1/paystack-verify';
  const $=s=>document.querySelector(s);
  let selected=500,poll=null;
  const style=document.createElement('style');
  style.textContent=`
  .acerola-core-links{padding:10px 12px 4px;border-top:1px solid #1d2b49;margin-top:6px}
  .acerola-core-title{font-size:9px;letter-spacing:1.5px;color:#607390;margin:0 0 7px}
  .acerola-core-btn{width:100%;padding:10px;border:1px solid #203452;border-radius:11px;background:#0b1428;color:#f3f8ff;text-align:left;margin-bottom:6px;font-weight:700}
  .acerola-core-btn:hover{border-color:#00eaff;color:#00eaff}
  .ac-support-bg{position:fixed;inset:0;background:#000b;z-index:100;display:none;padding:12px;overflow:auto}
  .ac-support-bg.open{display:flex;align-items:center;justify-content:center}
  .ac-support{width:min(680px,100%);max-height:94dvh;overflow:auto;background:#080e1d;border:1px solid #203452;border-radius:22px;box-shadow:0 25px 100px #000c;padding:20px}
  .ac-support-head{display:flex;align-items:center;gap:10px}.ac-support-head h2{margin:0;flex:1;font-size:20px}.ac-support-close{width:38px;height:38px;border:1px solid #203452;border-radius:10px;background:#0c162a;color:#fff;font-size:20px}
  .ac-support-sub{color:#8495b1;font-size:12px;margin:4px 0 15px}.ac-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px}.ac-tab{padding:11px;border:1px solid #274568;border-radius:12px;background:#0b172b;color:#8495b1;font-weight:900}.ac-tab.active{border-color:#00eaff;color:#f3f8ff}
  .ac-panel{display:none}.ac-panel.active{display:block}.ac-hero{margin-top:12px;padding:14px;border:1px solid #3d3158;border-radius:15px;background:linear-gradient(135deg,#0d1428,#160d20)}.ac-hero b{display:block}.ac-hero span{display:block;color:#8495b1;font-size:11px;margin-top:4px}
  .ac-amounts{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:10px}.ac-amount{padding:12px;border:1px solid #274568;border-radius:12px;background:#0b172b;color:#f3f8ff;font-weight:900}.ac-amount.active{border-color:#00eaff;background:#0b2035}
  .ac-field{width:100%;padding:12px;margin-top:9px;border:1px solid #274568;border-radius:12px;background:#060c18;color:#f3f8ff;outline:none;box-sizing:border-box}.ac-field:focus{border-color:#00eaff}
  .ac-pay{width:100%;padding:13px;margin-top:10px;border:1px solid #00eaff;border-radius:12px;background:#0b2038;color:#f3f8ff;font-weight:900}.ac-pay.pro{border-color:#ff2b9a;background:#28102c}.ac-pay:disabled{opacity:.5}
  .ac-status{min-height:18px;text-align:center;color:#8495b1;font-size:11px;margin-top:9px}.ac-status.ok{color:#63ffb0}.ac-status.error{color:#ff718f}.ac-success{display:none;margin-top:10px;padding:12px;border:1px solid #236847;border-radius:13px;background:#071b16;color:#63ffb0;font-size:11px}.ac-note{color:#607390;font-size:10px;line-height:1.6;margin-top:10px}`;
  document.head.appendChild(style);
  function mount(){
    if($('#acSupportBg'))return;
    const bg=document.createElement('div');bg.id='acSupportBg';bg.className='ac-support-bg';
    bg.innerHTML=`<section class="ac-support" role="dialog" aria-modal="true" aria-label="Acerola Support and Pro">
      <div class="ac-support-head"><h2>Support Acerola</h2><button class="ac-support-close" id="acSupportClose">×</button></div>
      <div class="ac-support-sub">Everything stays inside Acerola. Support development or unlock Acerola Pro with a one-time payment.</div>
      <div class="ac-tabs"><button class="ac-tab active" data-ac-tab="donate">♡ SUPPORT</button><button class="ac-tab" data-ac-tab="pro">◆ ACEROLA PRO</button></div>
      <div id="acDonate" class="ac-panel active"><div class="ac-hero"><b>Help keep the Core growing</b><span>Choose a preset or enter your own amount.</span></div>
        <div class="ac-amounts"><button class="ac-amount active" data-ac-amount="500">₦500</button><button class="ac-amount" data-ac-amount="1000">₦1,000</button><button class="ac-amount" data-ac-amount="2000">₦2,000</button><button class="ac-amount" data-ac-amount="5000">₦5,000</button></div>
        <input id="acCustom" class="ac-field" type="number" min="100" max="1000000" step="50" inputmode="numeric" placeholder="Custom amount (₦100 minimum)">
        <input id="acEmail" class="ac-field" type="email" autocomplete="email" placeholder="Email for payment receipt"><button id="acDonatePay" class="ac-pay">⚡ SUPPORT ACEROLA</button></div>
      <div id="acPro" class="ac-panel"><div class="ac-hero"><b>Acerola Pro · ₦1,000 one-time</b><span>One-time access to premium Acerola features. Pro purchases are verified server-side.</span></div><div class="ac-note">◆ Pro identity · ⚡ Premium modes · 🎨 Premium UI · ☁ Future cloud-first features</div>
        <input id="acProEmail" class="ac-field" type="email" autocomplete="email" placeholder="Email for payment receipt"><button id="acProPay" class="ac-pay pro">◆ UNLOCK ACEROLA PRO</button></div>
      <div id="acStatus" class="ac-status">Secure Paystack checkout · NGN</div><div id="acSuccess" class="ac-success"></div><div class="ac-note">Payments are initialized and verified by the Acerola server.</div>
    </section>`;
    document.body.appendChild(bg);$('#acSupportClose').onclick=close;bg.addEventListener('click',e=>{if(e.target===bg)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&bg.classList.contains('open'))close()});
    document.querySelectorAll('[data-ac-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.acTab));document.querySelectorAll('[data-ac-amount]').forEach(b=>b.onclick=()=>selectAmount(Number(b.dataset.acAmount)));
    $('#acCustom').oninput=()=>{if($('#acCustom').value)document.querySelectorAll('[data-ac-amount]').forEach(b=>b.classList.remove('active'))};
    $('#acDonatePay').onclick=()=>start({email:$('#acEmail').value.trim(),amount:amount(),product:'donation',button:$('#acDonatePay')});$('#acProPay').onclick=()=>start({email:$('#acProEmail').value.trim(),amount:1000,product:'premium',button:$('#acProPay')});
  }
  function open(){mount();$('#acSupportBg').classList.add('open');document.body.style.overflow='hidden'}function close(){const x=$('#acSupportBg');if(x)x.classList.remove('open');document.body.style.overflow=''}
  function switchTab(tab){document.querySelectorAll('[data-ac-tab]').forEach(b=>b.classList.toggle('active',b.dataset.acTab===tab));$('#acDonate').classList.toggle('active',tab==='donate');$('#acPro').classList.toggle('active',tab==='pro');setStatus('Secure Paystack checkout · NGN')}
  function selectAmount(n){selected=n;$('#acCustom').value='';document.querySelectorAll('[data-ac-amount]').forEach(b=>b.classList.toggle('active',Number(b.dataset.acAmount)===n))}function amount(){const raw=$('#acCustom').value.trim();const n=raw?Number(raw):selected;return Number.isFinite(n)&&n>=100&&n<=1000000?Math.round(n):null}
  function setStatus(t,type=''){const x=$('#acStatus');x.textContent=t;x.className='ac-status'+(type?' '+type:'')}function stop(){if(poll){clearInterval(poll);poll=null}}
  async function post(url,body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:c.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Server request failed');return d}finally{clearTimeout(timer)}}
  async function verify(reference,amt,product){const d=await post(VERIFY_URL,{reference,amount:amt,product});if(!d.verified)throw new Error(d.error||d.reason||'Payment could not be verified');if(product==='premium'&&!d.entitlementGranted){setStatus('Payment verified, but Pro is not linked to an Acerola account yet.','error');throw new Error('Payment verified, but use the same email as your Acerola account to unlock Pro.')}$('#acSuccess').style.display='block';$('#acSuccess').textContent=product==='premium'?'◆ Acerola Pro unlocked and verified.':'✓ Support payment verified. Thank you for helping Acerola grow.';if(product==='premium'){localStorage.setItem('acerola-premium-unlocked','1');window.dispatchEvent(new CustomEvent('acerola:pro-ready',{detail:{reference}}))}setStatus('Payment verified successfully.','ok');return true}
  async function wait(reference,amt,product,buttons){stop();let tries=0;const check=async()=>{tries++;try{const ok=await verify(reference,amt,product);if(ok){stop();buttons.forEach(b=>b.disabled=false);return}}catch(e){if(tries>=60){stop();setStatus('Verification is taking longer than expected. Check your receipt and try again.','error');buttons.forEach(b=>b.disabled=false);return}setStatus('Waiting for Paystack confirmation…')}};await check();if(!poll)poll=setInterval(check,5000)}
  function loadPaystack(){return new Promise((resolve,reject)=>{if(window.PaystackPop)return resolve();const s=document.createElement('script');s.src='https://js.paystack.co/v2/inline.js';s.onload=resolve;s.onerror=()=>reject(new Error('Paystack checkout could not load.'));document.head.appendChild(s)})}
  async function start({email,amount:amt,product,button}){if(product==='premium')amt=1000;if(!amt){setStatus('Enter an amount from ₦100 to ₦1,000,000.','error');return}if(!/^\S+@\S+\.\S+$/.test(email)){setStatus('Enter a valid email for the payment receipt.','error');return}button.disabled=true;const buttons=[$('#acDonatePay'),$('#acProPay')];buttons.forEach(b=>b.disabled=true);setStatus('Preparing secure checkout…');try{await loadPaystack();const init=await post(INIT_URL,{email,amount:amt,product,source:'acerola-core'});if(!init.success||!init.access_code||!init.reference)throw new Error(init.error||'Unable to initialize payment');setStatus('Opening secure Paystack checkout…');const popup=new PaystackPop();popup.resumeTransaction(init.access_code);setStatus('Complete the payment in Paystack…');await wait(init.reference,amt,product,buttons)}catch(e){stop();setStatus(e.name==='AbortError'?'Payment service timed out. Try again.':(e.message||'Unable to start payment.'),'error');buttons.forEach(b=>b.disabled=false)}}
  function addCoreLink(){const drawer=$('#drawer');if(!drawer||$('#acerolaCoreLinks'))return;const box=document.createElement('div');box.id='acerolaCoreLinks';box.className='acerola-core-links';box.innerHTML='<div class="acerola-core-title">ACEROLA CORE</div><button class="acerola-core-btn" id="acSupportOpen">♡ Support / Pro</button>';const foot=drawer.querySelector('.drawer-foot');drawer.insertBefore(box,foot||null);$('#acSupportOpen').onclick=open}
  async function syncProEntitlement(){try{if(!window.supabase?.createClient)return;const db=window.supabase.createClient(SUPA_URL,'sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7');const {data:{session}}=await db.auth.getSession();if(!session)return;const {data,error}=await db.from('acerola_pro_entitlements').select('active').eq('user_id',session.user.id).eq('active',true).maybeSingle();if(!error&&data?.active){localStorage.setItem('acerola-premium-unlocked','1');window.dispatchEvent(new CustomEvent('acerola:pro-ready',{detail:{persistent:true}}))}}catch(_){}
  mount();addCoreLink();syncProEntitlement();const obs=new MutationObserver(addCoreLink);obs.observe(document.body,{childList:true,subtree:true});window.AcerolaSupport={open,close};
  if(new URLSearchParams(location.search).get('support')==='1')setTimeout(open,250);
})();
