/* Acerola — Agent Core v1.1.0
 * Browser-safe orchestration layer. Provider secrets stay server-side.
 */
(function (global) {
  'use strict';

  const VERSION = '1.3.0';
  const MEMORY_KEY = 'acerola-ai-memory-v1';
  const HISTORY_KEY = 'acerola-ai-history-v1';
  const DEFAULT_GATEWAY = 'https://djumpimcwzhjujysznox.supabase.co/functions/v1/acerola-ai-gateway';
  const SUPABASE_URL = 'https://djumpimcwzhjujysznox.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_c34TkPz6oG437WYMSPAKww_T5mFZPy7';

  class MemoryManager {
    constructor(key = MEMORY_KEY) { this.key = key; this.items = this._load(); }
    _load() { try { const value = global.localStorage?.getItem(this.key); const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; } }
    _save() { try { global.localStorage?.setItem(this.key, JSON.stringify(this.items)); } catch (_) {} }
    add(text) { const value = String(text || '').trim(); if (!value) return false; this.items.push(value); this._save(); return true; }
    remove(query) { const q = String(query || '').toLowerCase().trim(); if (!q) return 0; const before = this.items.length; this.items = this.items.filter(item => !item.toLowerCase().includes(q)); this._save(); return before - this.items.length; }
    clear() { this.items = []; this._save(); }
    recent(limit = 5) { return this.items.slice(-Math.max(0, Number(limit) || 5)).reverse(); }
    search(query, limit = 8) { const q = String(query || '').toLowerCase().trim(); if (!q) return []; const terms = q.split(/\s+/).filter(Boolean); return this.items.map((text, index) => ({ text, index, score: terms.reduce((score, term) => score + (text.toLowerCase().includes(term) ? 1 : 0), 0) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || b.index - a.index).slice(0, Math.max(0, Number(limit) || 8)).map(item => item.text); }
    all() { return [...this.items]; }
    replace(items) { this.items = Array.isArray(items) ? items.map(String) : []; this._save(); }
  }

  class ConversationManager {
    constructor(key = HISTORY_KEY, limit = 12) { this.key = key; this.limit = limit; this.items = this._load(); }
    _load() { try { const value = global.localStorage?.getItem(this.key); const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; } }
    _save() { try { global.localStorage?.setItem(this.key, JSON.stringify(this.items)); } catch (_) {} }
    add(role, content) { const r = role === 'assistant' ? 'assistant' : 'user'; const text = String(content || '').trim(); if (!text) return false; const last = this.items[this.items.length - 1]; if (last?.role === r && last?.content === text) return true; this.items.push({ role: r, content: text, at: Date.now() }); if (this.items.length > this.limit) this.items = this.items.slice(-this.limit); this._save(); return true; }
    recent(limit = this.limit) { return this.items.slice(-Math.max(0, Number(limit) || this.limit)).map(({ role, content }) => ({ role, content })); }
    clear() { this.items = []; this._save(); }
    count() { return this.items.length; }
  }

  class ToolRouter {
    constructor() { this.tools = new Map(); }
    register(name, handler, description = '') { if (!name || typeof handler !== 'function') throw new TypeError('Invalid tool'); this.tools.set(name, { handler, description }); return this; }
    has(name) { return this.tools.has(name); }
    list() { return [...this.tools.entries()].map(([name, tool]) => ({ name, description: tool.description })); }
    async execute(name, input = {}) { const tool = this.tools.get(name); if (!tool) throw new Error(`Unknown tool: ${name}`); return tool.handler(input); }
  }

  class ActionEngine {
    constructor(tools) { this.tools = tools; }
    async execute(name, input = {}) { if (!this.tools.has(name)) throw new Error(`Unknown action: ${name}`); return this.tools.execute(name, input); }
    list() { return this.tools.list(); }
  }

  function normalizeGatewayResponse(result) {
    if (!result || typeof result !== 'object') return result;
    const raw = typeof result.reply === 'string' ? result.reply.trim() : '';
    if (result.plan?.message && raw.startsWith('{')) return { ...result, reply: String(result.plan.message) };
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') return { ...result, reply: parsed.message, plan: result.plan || parsed };
      } catch (_) {}
    }
    return result;
  }

  class ModelGateway {
    constructor({ endpoint = DEFAULT_GATEWAY, apiKey = SUPABASE_PUBLISHABLE_KEY } = {}) { this.endpoint = endpoint; this.apiKey = apiKey; this.accessToken = ''; }
    setAccessToken(token) { this.accessToken = token || ''; }
    async request(body) {
      const headers = { 'Content-Type': 'application/json', 'apikey': this.apiKey };
      if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
      let response;
      try {
        response = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      } catch (error) {
        throw new Error(`Gateway network error: ${error?.message || 'Unable to reach Acerola backend'}`);
      }
      if (!response.ok) {
        let detail = {};
        try { detail = await response.json(); } catch (_) {}
        const code = detail?.code ? ` [${detail.code}]` : '';
        const requestId = detail?.request_id ? ` (request ${detail.request_id})` : '';
        throw new Error(`${detail?.error || `Gateway returned ${response.status}`}${code}${requestId}`);
      }
      return response.json();
    }
    async complete(payload) { return normalizeGatewayResponse(await this.request(payload)); }
    async memory(action, payload = {}) { return this.request({ memory_action: action, ...payload }); }
  }

  function detectMediaIntent(text) {
    const source = String(text || '').trim();
    if (!source) return null;
    const imageVerb = /\b(create|make|generate|draw|design|render|produce|paint|illustrate)\b/i.test(source);
    const imageNoun = /\b(image|picture|photo|artwork|illustration|wallpaper|logo|poster|portrait|drawing)\b/i.test(source);
    const videoVerb = /\b(create|make|generate|render|produce)\b/i.test(source);
    const videoNoun = /\b(video|short|clip|animation)\b/i.test(source);
    if (imageVerb && imageNoun) return { kind: 'image', prompt: source };
    if (videoVerb && videoNoun) return { kind: 'video', prompt: source };
    return null;
  }

  function extractMemoryRequest(text) {
    const source = String(text || '').trim();
    if (!source) return null;
    const direct = source.match(/^(?:please\s+)?remember\s+(?:that\s+)?(?!about\b|when\b|how\b|what\b)(.+)$/i);
    if (direct) return direct[1].trim().replace(/[.!?]+$/, '');
    const forget = source.match(/^(?:please\s+)?(?:don't|do not)\s+forget\s+(?:that\s+)?(.+)$/i);
    if (forget) return forget[1].trim().replace(/[.!?]+$/, '');
    const save = source.match(/^(?:please\s+)?(?:save|store)\s+(?:this|that)\s*:?[\s]*(.+)$/i);
    if (save) return save[1].trim().replace(/[.!?]+$/, '');
    const trailing = source.match(/^(.+?)\s+(?:and\s+(?:it|you)\s+should\s+)?remember\s+(?:that)?$/i);
    if (trailing) return trailing[1].trim().replace(/[.!?]+$/, '');
    return null;
  }

  async function safeRemoteMemoryError(error) {
    return error?.message || 'Persistent memory service is unavailable.';
  }

  function calculate(expression) {
    const source = String(expression || '').replace(/,/g, '').trim();
    if (!source || source.length > 200) throw new Error('Invalid calculation');
    const tokens = source.match(/\d*\.?\d+|[()+\-*/%]/g);
    if (!tokens || tokens.join('') !== source.replace(/\s+/g, '')) throw new Error('Only numbers, parentheses, +, -, *, / and % are allowed');
    let i = 0; const peek = () => tokens[i]; const take = () => tokens[i++];
    function primary() { if (peek() === '(') { take(); const value = additive(); if (take() !== ')') throw new Error('Missing closing parenthesis'); return value; } if (peek() === '+' || peek() === '-') { const sign = take() === '-' ? -1 : 1; return sign * primary(); } const value = Number(take()); if (!Number.isFinite(value)) throw new Error('Invalid number'); return value; }
    function multiplicative() { let value = primary(); while (peek() === '*' || peek() === '/' || peek() === '%') { const op = take(); const right = primary(); if ((op === '/' || op === '%') && right === 0) throw new Error('Cannot divide by zero'); value = op === '*' ? value * right : op === '/' ? value / right : value % right; } return value; }
    function additive() { let value = multiplicative(); while (peek() === '+' || peek() === '-') { const op = take(); const right = multiplicative(); value = op === '+' ? value + right : value - right; } return value; }
    const result = additive(); if (i !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid calculation'); return Number(result.toFixed(12));
  }

  class AgentCore {
    constructor(options = {}) {
      this.version = VERSION;
      this.memory = options.memory || new MemoryManager();
      this.conversation = options.conversation || new ConversationManager();
      this.tools = options.tools || new ToolRouter();
      this.actions = new ActionEngine(this.tools);
      this.gateway = options.gateway || new ModelGateway(options.gatewayOptions || {});
      this.auth = null; this.remoteMemory = false;
      this.tools
        .register('memory.recent', ({ limit = 5 }) => this.memory.recent(limit), 'Read recent memories')
        .register('memory.search', ({ query, limit = 8 }) => this.memory.search(query, limit), 'Search saved memories by keywords')
        .register('memory.add', ({ text }) => this.remember(text), 'Store a persistent memory')
        .register('memory.remove', ({ query }) => this.forget(query), 'Remove matching memories')
        .register('memory.clear', () => this.clearMemory(), 'Clear persistent memory')
        .register('conversation.recent', ({ limit = 12 }) => this.conversation.recent(limit), 'Read recent conversation context')
        .register('conversation.clear', () => this.conversation.clear(), 'Clear local conversation context')
        .register('system.time', () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }), 'Get the current local time')
        .register('system.date', () => new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 'Get the current local date')
        .register('system.status', () => ({ version: this.version, memoryCount: this.memory.all().length, conversationTurns: this.conversation.count(), remoteMemory: this.remoteMemory, tools: this.tools.list().length }), 'Get Agent Core status')
        .register('system.capabilities', () => this.tools.list(), 'List available Agent Core capabilities')
        .register('calculator.calculate', ({ expression }) => ({ expression: String(expression || '').trim(), result: calculate(expression) }), 'Safely calculate an arithmetic expression')
        .register('ui.open_module', ({ module }) => this.openModule(module), 'Open a module in the Acerola interface')
        .register('ui.notify', ({ message }) => this.notify(message), 'Show a safe notification in the Acerola interface')
        .register('media.generate_image', async ({ prompt, size = '1024x1024', quality = 'auto', output_format = 'png' } = {}) => {
          if (!this.gateway.accessToken) throw new Error('Acerola authentication is not ready.');
          const response = await fetch(`${SUPABASE_URL}/functions/v1/acerola-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_PUBLISHABLE_KEY, 'Authorization': `Bearer ${this.gateway.accessToken}` },
            body: JSON.stringify({ prompt: String(prompt || '').slice(0, 5000), size, quality, output_format })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data?.image) throw new Error(data?.error || `Image generation failed (${response.status})`);
          return { image: data.image, size: data.size || size, quality: data.quality || quality, format: data.format || output_format };
        }, 'Generate an actual image from a natural-language description')
        .register('media.generate_short', async ({ prompt, aspect_ratio = '9:16' } = {}) => {
          if (!this.gateway.accessToken) throw new Error('Acerola authentication is not ready.');
          const response = await fetch(`${SUPABASE_URL}/functions/v1/acerola-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_PUBLISHABLE_KEY, 'Authorization': `Bearer ${this.gateway.accessToken}` },
            body: JSON.stringify({ prompt: String(prompt || '').slice(0, 5000), aspect_ratio })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data?.operation) throw new Error(data?.error || `Video generation failed (${response.status})`);
          return { operation: data.operation, aspect_ratio: data.aspect_ratio || aspect_ratio };
        }, 'Generate a short video and return its background operation');
    }

    async initialize() {
      try {
        if (!global.supabase?.createClient) return { authenticated: false, reason: 'Supabase client unavailable' };
        this.auth = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        let { data: { session } } = await this.auth.auth.getSession();
        if (!session) { const result = await this.auth.auth.signInAnonymously(); if (result.error) throw result.error; session = result.data.session; }
        if (!session?.access_token) throw new Error('No Supabase access token');
        this.gateway.setAccessToken(session.access_token);
        try {
          const remote = await this.gateway.memory('load');
          if (remote.ok && Array.isArray(remote.memories)) this.memory.replace(remote.memories.map(item => item.memory_value));
          this.remoteMemory = true;
        } catch (_) { this.remoteMemory = false; }
        return { authenticated: true, anonymous: !!session.user?.is_anonymous, memoryCount: this.memory.all().length };
      } catch (error) { this.remoteMemory = false; return { authenticated: false, reason: error?.message || 'Authentication unavailable' }; }
    }

    async remember(text) {
      const value = String(text || '').trim();
      if (!value) return false;
      const localSaved = this.memory.add(value);
      if (!this.remoteMemory) return { ok: false, persistent: false, local: localSaved, error: 'Persistent memory backend is not connected.' };
      try {
        const result = await this.gateway.memory('add', {
          memory: {
            key: global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
            value,
            type: 'fact'
          }
        });
        if (!result?.ok) throw new Error(result?.error || 'Persistent memory save failed.');
        return { ok: true, persistent: true, local: localSaved, memory: result.memory || null };
      } catch (error) {
        return { ok: false, persistent: false, local: localSaved, error: await safeRemoteMemoryError(error) };
      }
    }
    async forget(query) { const removed = this.memory.remove(query); if (this.remoteMemory) { try { await this.gateway.memory('remove', { query: String(query || '') }); } catch (_) {} } return removed; }
    async clearMemory() { this.memory.clear(); if (this.remoteMemory) { try { await this.gateway.memory('clear'); } catch (_) {} } }
    recordUser(text) { return this.conversation.add('user', text); }
    recordAssistant(text) { return this.conversation.add('assistant', text); }
    clearConversation() { this.conversation.clear(); }
    openModule(module) { const allowed = new Set(['chat', 'memory', 'actions', 'system']); const value = String(module || '').toLowerCase().trim(); if (!allowed.has(value)) throw new Error('Unknown UI module'); global.dispatchEvent(new CustomEvent('acerola:open-module', { detail: { module: value } })); return { module: value, opened: true }; }
    notify(message) { const text = String(message || '').trim(); if (!text || text.length > 300) throw new Error('Invalid notification'); global.dispatchEvent(new CustomEvent('acerola:notify', { detail: { message: text } })); return { notified: true, message: text }; }
    async executePlannedAction(plan) {
      if (!plan || plan.type !== 'tool_call') return null;
      const name = String(plan.tool || '').trim();
      if (!name || !this.tools.has(name)) return { ok: false, error: `Action not allowed: ${name || 'missing tool'}` };
      try {
        const args = plan.arguments && typeof plan.arguments === 'object' ? plan.arguments : {};
        const result = await this.actions.execute(name, args);
        return { ok: true, tool: name, arguments: args, result };
      } catch (error) {
        return { ok: false, tool: name, error: error?.message || 'Tool execution failed' };
      }
    }

    async runAgent(payload, options = {}) {
      const maxSteps = Math.min(8, Math.max(1, Number(options.maxSteps) || 6));
      let request = { ...payload, agent_mode: true };
      const trace = [];
      for (let step = 0; step < maxSteps; step++) {
        const output = await this.gateway.complete(request);
        const plan = output?.plan && typeof output.plan === 'object'
          ? output.plan
          : (typeof output?.reply === 'string' ? (() => {
              const s = output.reply.trim();
              if (!s.startsWith('{') || !s.endsWith('}')) return null;
              try { return JSON.parse(s); } catch (_) { return null; }
            })() : null);

        if (plan?.type === 'tool_call') {
          const action = await this.executePlannedAction(plan);
          trace.push({ step: step + 1, type: 'tool_call', tool: plan.tool, result: action });

          // Media tools produce results that the chat UI must render directly.
          if (action?.ok && plan.tool === 'media.generate_image' && action.result?.image) {
            return {
              ok: true,
              type: 'media_result',
              media: {
                kind: 'image',
                image: action.result.image,
                size: action.result.size || null,
                quality: action.result.quality || null,
                format: action.result.format || null
              },
              trace,
              steps: step + 1,
              final: true
            };
          }

          if (action?.ok && plan.tool === 'media.generate_short' && action.result?.operation) {
            return {
              ok: true,
              type: 'media_result',
              media: {
                kind: 'video',
                operation: action.result.operation,
                aspect_ratio: action.result.aspect_ratio || '9:16'
              },
              trace,
              steps: step + 1,
              final: true
            };
          }

          request = {
            ...payload,
            agent_mode: true,
            tool_results: trace.map(item => ({
              step: item.step,
              tool: item.tool,
              ok: item.result?.ok !== false,
              result: item.result?.result ?? null,
              error: item.result?.error ?? null
            })),
            previous_reply: output?.reply || plan.message || ''
          };
          continue;
        }

        return { ...output, trace, steps: step + 1, final: true };
      }
      return {
        ok: false,
        reply: 'I reached the maximum number of actions for this request. Please continue with the next step.',
        trace,
        steps: maxSteps,
        final: true
      };
    }

    async process(input, context = {}) {
      const text = String(input || '').trim(); if (!text) return { type: 'empty', text: '' };
      this.recordUser(text);
      const memoryRequest = extractMemoryRequest(text);
      if (memoryRequest) {
        const saved = await this.remember(memoryRequest);
        if (saved?.persistent) return { type: 'memory', action: 'add', text: 'Stored in persistent memory.', persistent: true };
        return { type: 'memory', action: 'add', text: saved?.error || 'I could not save that to persistent memory.', persistent: false, local: !!saved?.local };
      }
      const forget = text.match(/^forget\s+(.+)/i); if (forget) { const removed = await this.forget(forget[1]); return { type: 'memory', action: 'remove', removed, text: removed ? 'Matching memory removed.' : 'No matching memory found.' }; }
      if (/^clear memory$/i.test(text)) { await this.clearMemory(); return { type: 'memory', action: 'clear', text: 'Persistent memory cleared.' }; }
      if (/^clear (?:chat|conversation|conversation history)$/i.test(text)) { this.clearConversation(); return { type: 'action', action: 'conversation.clear', result: 'Conversation context cleared.' }; }
      if (/^(what(?:'s|\s+is)\s+)?the\s+(current\s+)?time\??$/i.test(text) || /^time\??$/i.test(text)) return { type: 'action', action: 'system.time', result: await this.actions.execute('system.time') };
      if (/^(what(?:'s|\s+is)\s+)?(?:today'?s\s+)?date\??$/i.test(text) || /^date\??$/i.test(text)) return { type: 'action', action: 'system.date', result: await this.actions.execute('system.date') };
      const math = text.match(/^(?:calculate|calc|compute)\s+(.+)$/i); if (math) return { type: 'action', action: 'calculator.calculate', result: await this.actions.execute('calculator.calculate', { expression: math[1] }) };
      const moduleMatch = text.match(/^(?:open|show|go to)\s+(chat|memory|actions|system)(?:\s+module)?$/i); if (moduleMatch) return { type: 'action', action: 'ui.open_module', result: await this.actions.execute('ui.open_module', { module: moduleMatch[1] }) };
      const notify = text.match(/^(?:notify|notification)\s*:\s*(.+)$/i); if (notify) return { type: 'action', action: 'ui.notify', result: await this.actions.execute('ui.notify', { message: notify[1] }) };
      if (/^status$/i.test(text)) return { type: 'status', version: this.version, memoryCount: this.memory.all().length, conversationTurns: this.conversation.count(), tools: this.tools.list(), remoteMemory: this.remoteMemory };
      // Let the model choose capabilities from the real tool catalog instead of
      // forcing natural-language requests through brittle keyword/regex routing.
      return { type: 'model_request', payload: { message: text, memories: this.memory.recent(10), context: { ...context, conversation: this.conversation.recent(12) }, available_tools: this.tools.list(), agent_mode: true } };
    }
  }

  function installMobileRuntime() {
    if (!global.document) return;
    const style = document.createElement('style');
    style.id = 'acerola-agent-runtime-fixes';
    style.textContent = '#app{position:relative}.chat{position:relative}.composer-area{position:absolute!important;left:0;right:0;bottom:0}.messages{min-height:0}.inner{scroll-padding-bottom:20px}';
    document.head.appendChild(style);
    const syncViewport = () => {
      const vv = global.visualViewport;
      const height = vv?.height || global.innerHeight || document.documentElement.clientHeight;
      document.documentElement.style.setProperty('--vh', `${Math.max(1, Math.round(height))}px`);
      const composer = document.querySelector('.composer-area');
      const inner = document.querySelector('.inner');
      if (composer && inner) inner.style.paddingBottom = `${Math.max(155, composer.offsetHeight + 24)}px`;
    };
    syncViewport();
    global.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
    global.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });
    global.addEventListener('resize', syncViewport, { passive: true });
    const composer = document.querySelector('.composer-area');
    if (composer && global.ResizeObserver) new ResizeObserver(syncViewport).observe(composer);
  }


  global.AcerolaAI = { VERSION, MemoryManager, ConversationManager, ToolRouter, ActionEngine, ModelGateway, AgentCore };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installMobileRuntime, { once: true });
  } else {
    installMobileRuntime();
  }
})(window);
