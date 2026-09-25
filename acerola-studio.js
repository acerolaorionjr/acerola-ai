/* Acerola Studio v1.0.0
 * Creative media, research, custom assistants and agent workflow workspace.
 * Provider keys stay server-side; this file only calls authenticated Acerola functions.
 */
(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://djumpimcwzhjujysznox.supabase.co';
  const MUSIC_URL = SUPABASE_URL + '/functions/v1/acerola-music';
  const MEDIA_URL = SUPABASE_URL + '/functions/v1/acerola-media';
  const IMAGE_URL = SUPABASE_URL + '/functions/v1/acerola-image';
  const GATEWAY_URL = SUPABASE_URL + '/functions/v1/acerola-ai-gateway';
  const GEM_KEY = 'acerola-gems-v1';
  const WORKFLOW_KEY = 'acerola-workflows-v1';

  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const load = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch (_) { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };

  let engine = null;
  let activeVideo = null;

  async function auth() {
    if (!engine) {
      engine = new global.AcerolaEngine();
      await engine.initialize();
    }
    const token = engine.gateway?.accessToken;
    if (!token) throw new Error('Acerola authentication is not ready.');
    return { token, key: engine.gateway.apiKey };
  }

  async function post(url, body) {
    const {token, key} = await auth();
    const r = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json', apikey:key, Authorization:'Bearer '+token},
      body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Acerola service request failed.');
    return data;
  }

  function mount() {
    if (document.getElementById('acerolaStudio')) return;
    const style = document.createElement('style');
    style.textContent = `
      #acerolaStudio{position:fixed;inset:0;background:#000c;z-index:150;display:none;padding:12px;overflow:auto}
      #acerolaStudio.open{display:flex;align-items:center;justify-content:center}
      .as-card{width:min(820px,100%);max-height:94dvh;overflow:auto;background:#080b12;border:1px solid #202a3c;border-radius:24px;box-shadow:0 24px 100px #000;padding:18px}
      .as-head{display:flex;align-items:center;gap:10px}.as-head h2{margin:0;flex:1;font-size:20px}.as-close,.as-back{border:1px solid #243148;background:#101522;color:#fff;border-radius:10px;width:38px;height:38px}
      .as-sub{color:#7f8da5;font-size:11px;line-height:1.55;margin:6px 0 16px}.as-tabs{display:flex;gap:7px;overflow:auto;margin-bottom:14px}.as-tab{white-space:nowrap;border:1px solid #202b3e;background:#0d121d;color:#b8c5d8;padding:9px 12px;border-radius:12px}.as-tab.on{color:#00eaff;border-color:#17566b;background:#0b1821}
      .as-pane{display:none}.as-pane.on{display:block}.as-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.as-cardbox{border:1px solid #202b3e;background:#0d121b;border-radius:16px;padding:14px}.as-cardbox h3{font-size:13px;margin:0 0 6px}.as-cardbox p{font-size:10px;color:#7f8da5;line-height:1.55;margin:0 0 10px}
      .as-input,.as-select{width:100%;box-sizing:border-box;background:#080d16;border:1px solid #243148;color:#f5f8ff;border-radius:11px;padding:10px;outline:none;margin:5px 0 8px}.as-input{min-height:90px;resize:vertical}.as-btn{border:1px solid #1c6074;background:#0b202a;color:#00eaff;border-radius:10px;padding:10px 12px;font-weight:700}.as-btn.secondary{color:#d9e1ed;background:#101522;border-color:#28344a}.as-row{display:flex;gap:7px;flex-wrap:wrap}.as-status{font-size:10px;color:#8190a8;margin-top:8px;white-space:pre-wrap}.as-result{margin-top:12px;border:1px solid #202b3e;border-radius:14px;padding:12px;background:#090e17}.as-result img,.as-result video{width:100%;max-height:420px;object-fit:contain;border-radius:10px;background:#000}.as-result audio{width:100%}.as-list{display:grid;gap:8px}.as-item{border:1px solid #202b3e;border-radius:12px;padding:10px;background:#0c111a}.as-item b{display:block;font-size:11px}.as-item small{display:block;color:#7f8da5;line-height:1.5;margin-top:3px}.as-danger{color:#ff8ba5}
      @media(max-width:560px){.as-grid{grid-template-columns:1fr}.as-card{padding:14px;border-radius:20px}}
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'acerolaStudio';
    root.innerHTML = `
      <section class="as-card">
        <div class="as-head"><button class="as-back" id="asBack">←</button><h2>Acerola Studio</h2><button class="as-close" id="asClose">×</button></div>
        <div class="as-sub">Creative generation, research, custom assistants and multi-step workflows — built into Acerola.</div>
        <div class="as-tabs">
          <button class="as-tab on" data-pane="creative">Creative</button>
          <button class="as-tab" data-pane="research">Deep Research</button>
          <button class="as-tab" data-pane="gems">Gems</button>
          <button class="as-tab" data-pane="workflows">Workflows</button>
        </div>
        <div class="as-pane on" id="as-creative">
          <div class="as-grid">
            <div class="as-cardbox"><h3>🎬 AI Video</h3><p>Generate a short vertical or widescreen clip with Veo through Acerola's protected media function.</p><textarea class="as-input" id="asVideoPrompt" placeholder="Example: A cinematic cyberpunk city waking up at night..."></textarea><select class="as-select" id="asVideoRatio"><option value="9:16">9:16 vertical</option><option value="16:9">16:9 landscape</option></select><button class="as-btn" id="asVideo">Generate video</button><div class="as-status" id="asVideoStatus"></div></div>
            <div class="as-cardbox"><h3>🎵 AI Music</h3><p>Create an original instrumental or vocal track with Lyria 3.5. The music service keeps the API key off the phone.</p><textarea class="as-input" id="asMusicPrompt" placeholder="Example: energetic Afrobeats-inspired instrumental, warm bass, bright guitars, 90 seconds..."></textarea><button class="as-btn" id="asMusic">Generate music</button><div class="as-status" id="asMusicStatus"></div></div>
            <div class="as-cardbox"><h3>🧑‍🎨 Fictional Avatar</h3><p>Create a fictional character/avatar image. Personal-avatar features can have separate age or product restrictions, so this stays character-focused.</p><textarea class="as-input" id="asAvatarPrompt" placeholder="Example: original futuristic AI companion, silver jacket, neon city, friendly expression..."></textarea><button class="as-btn" id="asAvatar">Create avatar</button><div class="as-status" id="asAvatarStatus"></div></div>
            <div class="as-cardbox"><h3>🧩 Creative pipeline</h3><p>Turn one idea into a video prompt, music brief, avatar description and posting plan with one agent run.</p><textarea class="as-input" id="asPipelinePrompt" placeholder="Describe the project..."></textarea><button class="as-btn" id="asPipeline">Run creative pipeline</button><div class="as-status" id="asPipelineStatus"></div></div>
          </div>
          <div id="asCreativeResult"></div>
        </div>
        <div class="as-pane" id="as-research">
          <div class="as-cardbox"><h3>◎ Research Ace</h3><p>Acerola asks the web-enabled gateway for current evidence, compares sources, states uncertainty, and returns a structured report. This is an Acerola workflow, not a claim that Google Gemini Deep Research itself is embedded.</p><textarea class="as-input" id="asResearchPrompt" placeholder="Research a topic..."></textarea><div class="as-row"><button class="as-btn" id="asResearch">Start research</button><button class="as-btn secondary" id="asResearchSchool">Study mode</button></div><div class="as-status" id="asResearchStatus"></div><div class="as-result" id="asResearchResult" style="display:none"></div></div>
        </div>
        <div class="as-pane" id="as-gems">
          <div class="as-cardbox"><h3>✦ Custom Acerola assistants</h3><p>Create reusable instruction sets like Study Ace, Coding Ace or Creative Ace. They are saved to this browser account and run through the normal Acerola gateway.</p><input class="as-input" id="asGemName" style="min-height:0" placeholder="Assistant name"><textarea class="as-input" id="asGemInstructions" placeholder="Instructions: role, tone, what it should do, what it should avoid..."></textarea><div class="as-row"><button class="as-btn" id="asGemSave">Save assistant</button><button class="as-btn secondary" id="asGemSeed">Add starter assistants</button></div><div class="as-status" id="asGemStatus"></div><div class="as-list" id="asGemList"></div></div>
        </div>
        <div class="as-pane" id="as-workflows">
          <div class="as-grid">
            <div class="as-cardbox"><h3>◇ Agent workflows</h3><p>Run bounded multi-step jobs: research → synthesis → action plan, study → quiz → revision plan, or idea → creative brief → production checklist.</p><select class="as-select" id="asWorkflowType"><option value="research">Research → synthesis → action plan</option><option value="study">Study → explanation → revision plan</option><option value="creative">Idea → creative brief → production plan</option></select><textarea class="as-input" id="asWorkflowPrompt" placeholder="Goal for the workflow..."></textarea><button class="as-btn" id="asWorkflow">Run workflow</button><div class="as-status" id="asWorkflowStatus"></div></div>
            <div class="as-cardbox"><h3>🔗 Connected actions</h3><p>Safe browser-level connections are available without exposing provider secrets: clipboard, speech, share sheet, notifications and repository inspection.</p><div class="as-list"><div class="as-item"><b>Browser tools</b><small>Ready through Agent Core, permission-controlled.</small></div><div class="as-item"><b>External app connectors</b><small>Not claimed as connected until a real OAuth/API integration is configured.</small></div><div class="as-item"><b>Google Drive</b><small>Can be added later as a real connector; this build does not fake the connection.</small></div></div></div>
          </div>
          <div class="as-result" id="asWorkflowResult" style="display:none"></div>
        </div>
      </section>`;
    document.body.appendChild(root);

    const close = () => root.classList.remove('open');
    document.getElementById('asClose').onclick = close;
    document.getElementById('asBack').onclick = close;
    root.onclick = e => { if (e.target === root) close(); };
    root.querySelectorAll('.as-tab').forEach(tab => tab.onclick = () => {
      root.querySelectorAll('.as-tab').forEach(x => x.classList.remove('on'));
      root.querySelectorAll('.as-pane').forEach(x => x.classList.remove('on'));
      tab.classList.add('on');
      document.getElementById('as-'+tab.dataset.pane).classList.add('on');
      if (tab.dataset.pane === 'gems') renderGems();
    });

    document.getElementById('asVideo').onclick = generateVideo;
    document.getElementById('asMusic').onclick = generateMusic;
    document.getElementById('asAvatar').onclick = generateAvatar;
    document.getElementById('asResearch').onclick = () => research(false);
    document.getElementById('asResearchSchool').onclick = () => research(true);
    document.getElementById('asGemSave').onclick = saveGem;
    document.getElementById('asGemSeed').onclick = seedGems;
    document.getElementById('asWorkflow').onclick = runWorkflow;
    document.getElementById('asPipeline').onclick = runPipeline;
    renderGems();

    const drawer = document.getElementById('drawer');
    if (drawer && !document.getElementById('asOpen')) {
      const b = document.createElement('button');
      b.id = 'asOpen';
      b.className = 'acerola-core-btn';
      b.textContent = '✦ Acerola Studio';
      b.onclick = () => root.classList.add('open');
      const box = document.createElement('div');
      box.className = 'acerola-core-links';
      box.innerHTML = '<div class="acerola-core-title">CREATE + RESEARCH</div>';
      box.appendChild(b);
      drawer.insertBefore(box, drawer.querySelector('.drawer-foot') || null);
    }
  }

  async function generateVideo() {
    const prompt = document.getElementById('asVideoPrompt').value.trim();
    const status = document.getElementById('asVideoStatus');
    const result = document.getElementById('asCreativeResult');
    if (!prompt) { status.textContent = 'Describe the video first.'; return; }
    status.textContent = 'Starting Veo…';
    try {
      const ratio = document.getElementById('asVideoRatio').value;
      const data = await post(MEDIA_URL, {prompt, aspect_ratio: ratio, model:'veo-3.1-fast-generate-preview'});
      if (!data.operation) throw new Error('Veo did not return an operation.');
      activeVideo = {operation:data.operation, cancelled:false};
      status.textContent = 'Rendering… you can keep using Acerola.';
      let state = null;
      for (let i=0;i<48;i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (activeVideo?.cancelled) throw new Error('Video generation cancelled.');
        const {token,key} = await auth();
        const q = await fetch(MEDIA_URL+'?operation='+encodeURIComponent(data.operation), {headers:{apikey:key,Authorization:'Bearer '+token}});
        state = await q.json().catch(() => ({}));
        if (state.error) throw new Error(state.error);
        if (state.done) break;
        status.textContent = 'Rendering… '+((i+1)*5)+'s';
      }
      if (!state?.done) throw new Error('Video generation timed out on the client. The job may still finish upstream.');
      const {token,key} = await auth();
      const dl = await fetch(MEDIA_URL+'?operation='+encodeURIComponent(data.operation)+'&download=1', {headers:{apikey:key,Authorization:'Bearer '+token}});
      if (!dl.ok) throw new Error('Generated video could not be downloaded.');
      const blob = await dl.blob();
      const url = URL.createObjectURL(blob);
      result.innerHTML = '<div class="as-result"><video controls playsinline src="'+url+'"></video><div class="as-status">Video ready.</div></div>';
      status.textContent = 'Complete.';
    } catch (e) { status.textContent = 'Video: '+(e.message || e); }
  }

  async function generateMusic() {
    const prompt = document.getElementById('asMusicPrompt').value.trim();
    const status = document.getElementById('asMusicStatus');
    const result = document.getElementById('asCreativeResult');
    if (!prompt) { status.textContent = 'Describe the music first.'; return; }
    status.textContent = 'Generating with Lyria 3.5…';
    try {
      const data = await post(MUSIC_URL, {prompt});
      result.innerHTML = '<div class="as-result"><audio controls src="'+esc(data.audio)+'"></audio>'+(data.lyrics?'<div class="as-status">'+esc(data.lyrics)+'</div>':'')+'</div>';
      status.textContent = 'Music ready.';
    } catch (e) { status.textContent = 'Music: '+(e.message || e); }
  }

  async function generateAvatar() {
    const prompt = document.getElementById('asAvatarPrompt').value.trim();
    const status = document.getElementById('asAvatarStatus');
    const result = document.getElementById('asCreativeResult');
    if (!prompt) { status.textContent = 'Describe the fictional character first.'; return; }
    status.textContent = 'Creating character…';
    try {
      const data = await post(IMAGE_URL, {prompt:'Original fictional character/avatar. '+prompt, size:'1024x1024', quality:'auto', output_format:'png'});
      result.innerHTML = '<div class="as-result"><img alt="Generated fictional avatar" src="'+esc(data.image)+'"><div class="as-status">Fictional avatar ready.</div></div>';
      status.textContent = 'Complete.';
    } catch (e) { status.textContent = 'Avatar: '+(e.message || e); }
  }

  async function gateway(message, extra = {}) {
    const data = await post(GATEWAY_URL, {message, context:{studio:true,...extra}, available_tools:[]});
    return data.reply || '';
  }

  async function research(study) {
    const prompt = document.getElementById('asResearchPrompt').value.trim();
    const status = document.getElementById('asResearchStatus');
    const result = document.getElementById('asResearchResult');
    if (!prompt) { status.textContent = 'Enter a research question first.'; return; }
    status.textContent = 'Searching and synthesizing…';
    result.style.display = 'none';
    try {
      const instruction = study
        ? 'Research this as a student study brief. Use current web sources where useful. Explain key concepts, define terms, separate established facts from uncertainty, and finish with 5 revision questions.'
        : 'Perform a deep research workflow. Use web search for current evidence. Compare multiple reliable sources, identify disagreements or uncertainty, synthesize the evidence, and finish with a source list containing the URLs/titles you actually relied on. Do not invent citations.';
      const reply = await gateway(instruction+'\n\nTOPIC:\n'+prompt, {mode:'research'});
      result.textContent = reply;
      result.style.display = 'block';
      status.textContent = 'Research complete.';
    } catch (e) { status.textContent = 'Research: '+(e.message || e); }
  }

  function renderGems() {
    const list = document.getElementById('asGemList'); if (!list) return;
    const gems = load(GEM_KEY, []);
    list.innerHTML = gems.length ? gems.map((g,i) => '<div class="as-item"><b>'+esc(g.name)+'</b><small>'+esc(g.instructions)+'</small><div class="as-row" style="margin-top:7px"><button class="as-btn" data-run-gem="'+i+'">Run</button><button class="as-btn secondary" data-del-gem="'+i+'">Delete</button></div></div>').join('') : '<div class="as-item"><b>No custom assistants yet.</b><small>Use Add starter assistants to create Study Ace, Coding Ace and Creative Ace.</small></div>';
    list.querySelectorAll('[data-run-gem]').forEach(b => b.onclick = async () => {
      const g = gems[Number(b.dataset.runGem)];
      const task = prompt('What should '+g.name+' do?');
      if (!task) return;
      try { const reply = await gateway(g.instructions+'\n\nUSER TASK:\n'+task,{mode:'gem',gem:g.name}); alert(reply.slice(0,6000)); }
      catch(e) { alert('Assistant failed: '+(e.message||e)); }
    });
    list.querySelectorAll('[data-del-gem]').forEach(b => b.onclick = () => { gems.splice(Number(b.dataset.delGem),1); save(GEM_KEY,gems); renderGems(); });
  }

  function saveGem() {
    const name = document.getElementById('asGemName').value.trim();
    const instructions = document.getElementById('asGemInstructions').value.trim();
    const status = document.getElementById('asGemStatus');
    if (!name || !instructions) { status.textContent = 'Add a name and instructions.'; return; }
    const gems = load(GEM_KEY, []);
    gems.push({id:Date.now().toString(36),name:name.slice(0,60),instructions:instructions.slice(0,4000)});
    save(GEM_KEY,gems);
    document.getElementById('asGemName').value = '';
    document.getElementById('asGemInstructions').value = '';
    status.textContent = 'Assistant saved.';
    renderGems();
  }

  function seedGems() {
    const starter = [
      {name:'Study Ace',instructions:'Act as a patient school study assistant. Explain concepts clearly, use exam-style structure when appropriate, and help me understand rather than just giving unexplained answers.'},
      {name:'Coding Ace',instructions:'Act as a production-minded coding assistant. Inspect context, propose the smallest robust change, explain important tradeoffs, and never claim code was deployed unless it actually was.'},
      {name:'Creative Ace',instructions:'Act as a creative director for videos, images, music and stories. Turn rough ideas into practical production briefs, prompts, shot lists and checklists.'}
    ];
    const gems = load(GEM_KEY, []);
    starter.forEach(s => { if (!gems.some(g => g.name===s.name)) gems.push({...s,id:Date.now().toString(36)+'-'+s.name}); });
    save(GEM_KEY,gems); document.getElementById('asGemStatus').textContent='Starter assistants added.'; renderGems();
  }

  async function runPipeline() {
    const prompt = document.getElementById('asPipelinePrompt').value.trim();
    const status = document.getElementById('asPipelineStatus');
    if (!prompt) { status.textContent='Describe the project first.'; return; }
    status.textContent='Planning creative pipeline…';
    try {
      const reply = await gateway('Create a production-ready creative pipeline for this project. Return four sections: VIDEO PROMPT, MUSIC BRIEF, FICTIONAL AVATAR BRIEF, and PRODUCTION CHECKLIST. Keep it practical.\n\nPROJECT:\n'+prompt,{mode:'creative_pipeline'});
      document.getElementById('asCreativeResult').innerHTML='<div class="as-result">'+esc(reply)+'</div>';
      status.textContent='Pipeline ready.';
    } catch(e) { status.textContent='Pipeline: '+(e.message||e); }
  }

  async function runWorkflow() {
    const type = document.getElementById('asWorkflowType').value;
    const prompt = document.getElementById('asWorkflowPrompt').value.trim();
    const status = document.getElementById('asWorkflowStatus');
    const result = document.getElementById('asWorkflowResult');
    if (!prompt) { status.textContent='Give the workflow a goal first.'; return; }
    const steps = {
      research:['Research the goal using current web evidence.','Synthesize the evidence and note uncertainty.','Produce a concise action plan with next steps.'],
      study:['Explain the topic at the student’s level.','Create a worked example or application.','Finish with a short revision plan.'],
      creative:['Turn the idea into a creative brief.','Create production prompts and a shot/asset list.','Finish with a practical production checklist.']
    }[type];
    status.textContent='Agent running step 1/3…';
    try {
      let context = prompt, outputs = [];
      for (let i=0;i<steps.length;i++) {
        status.textContent='Agent running step '+(i+1)+'/3…';
        const reply = await gateway(steps[i]+'\n\nGOAL:\n'+prompt+'\n\nPREVIOUS STEP OUTPUT:\n'+context,{mode:'agent_workflow',step:i+1});
        outputs.push(reply);
        context = reply;
      }
      result.innerHTML = outputs.map((x,i)=>'<div class="as-item"><b>Step '+(i+1)+'</b><small>'+esc(x)+'</small></div>').join('');
      result.style.display='block';
      status.textContent='Workflow complete.';
    } catch(e) { status.textContent='Workflow: '+(e.message||e); }
  }

  global.AcerolaStudio = {open:() => { mount(); document.getElementById('acerolaStudio').classList.add('open'); }};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})(window);
