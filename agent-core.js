/* Acerola AI — Agent Core v0.9
 * Browser-safe orchestration layer. Provider secrets stay server-side.
 */
(function (global) {
  'use strict';

  const VERSION = '0.9.0';
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

  class ModelGateway {
    constructor({ endpoint = DEFAULT_GATEWAY, apiKey = SUPABASE_PUBLISHABLE_KEY } = {}) { this.endpoint = endpoint; this.apiKey = apiKey; this.accessToken = ''; }
    setAccessToken(token) { this.accessToken = token || ''; }
    async request(body) {
      const headers = { 'Content-Type': 'application/json', 'apikey': this.apiKey };
      if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
      const response = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!response.ok) { let detail = ''; try { detail = (await response.json()).error || ''; } catch (_) {} throw new Error(detail || `Gateway returned ${response.status}`); }
      return response.json();
    }
    async complete(payload) { return this.request(payload); }
    async memory(action, payload = {}) { return this.request({ memory_action: action, ...payload }); }
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
        .register('ui.open_module', ({ module }) => this.openModule(module), 'Open a module in the Acerola AI interface')
        .register('ui.notify', ({ message }) => this.notify(message), 'Show a safe notification in the Acerola AI interface');
    }

    async initialize() {
      try {
        if (!global.supabase?.createClient) return { authenticated: false, reason: 'Supabase client unavailable' };
        this.auth = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        let { data: { session } } = await this.auth.auth.getSession();
        if (!session) { const result = await this.auth.auth.signInAnonymously(); if (result.error) throw result.error; session = result.data.session; }
        if (!session?.access_token) throw new Error('No Supabase access token');
        this.gateway.setAccessToken(session.access_token);
        const remote = await this.gateway.memory('load');
        if (remote.ok && Array.isArray(remote.memories)) this.memory.replace(remote.memories.map(item => item.memory_value));
        this.remoteMemory = true;
        return { authenticated: true, anonymous: !!session.user?.is_anonymous, memoryCount: this.memory.all().length };
      } catch (error) { this.remoteMemory = false; return { authenticated: false, reason: error?.message || 'Authentication unavailable' }; }
    }

    async remember(text) { const value = String(text || '').trim(); if (!value) return false; this.memory.add(value); if (this.remoteMemory) { try { await this.gateway.memory('add', { memory: { key: global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, value, type: 'fact' } }); } catch (_) {} } return true; }
    async forget(query) { const removed = this.memory.remove(query); if (this.remoteMemory) { try { await this.gateway.memory('remove', { query: String(query || '') }); } catch (_) {} } return removed; }
    async clearMemory() { this.memory.clear(); if (this.remoteMemory) { try { await this.gateway.memory('clear'); } catch (_) {} } }
    recordUser(text) { return this.conversation.add('user', text); }
    recordAssistant(text) { return this.conversation.add('assistant', text); }
    clearConversation() { this.conversation.clear(); }
    openModule(module) { const allowed = new Set(['chat', 'memory', 'actions', 'system']); const value = String(module || '').toLowerCase().trim(); if (!allowed.has(value)) throw new Error('Unknown UI module'); global.dispatchEvent(new CustomEvent('acerola:open-module', { detail: { module: value } })); return { module: value, opened: true }; }
    notify(message) { const text = String(message || '').trim(); if (!text || text.length > 300) throw new Error('Invalid notification'); global.dispatchEvent(new CustomEvent('acerola:notify', { detail: { message: text } })); return { notified: true, message: text }; }
    async executePlannedAction(plan) { if (!plan || plan.type !== 'tool_call') return null; const name = String(plan.tool || '').trim(); if (!name || !this.tools.has(name)) return { ok: false, error: `Action not allowed: ${name || 'missing tool'}` }; const result = await this.actions.execute(name, plan.arguments && typeof plan.arguments === 'object' ? plan.arguments : {}); return { ok: true, tool: name, result }; }

    async process(input, context = {}) {
      const text = String(input || '').trim(); if (!text) return { type: 'empty', text: '' };
      this.recordUser(text);
      const remember = text.match(/^remember\s+(.+)/i); if (remember) { await this.remember(remember[1]); return { type: 'memory', action: 'add', text: 'Stored in persistent memory.' }; }
      const forget = text.match(/^forget\s+(.+)/i); if (forget) { const removed = await this.forget(forget[1]); return { type: 'memory', action: 'remove', removed, text: removed ? 'Matching memory removed.' : 'No matching memory found.' }; }
      if (/^clear memory$/i.test(text)) { await this.clearMemory(); return { type: 'memory', action: 'clear', text: 'Persistent memory cleared.' }; }
      if (/^clear (?:chat|conversation|conversation history)$/i.test(text)) { this.clearConversation(); return { type: 'action', action: 'conversation.clear', result: 'Conversation context cleared.' }; }
      if (/^(what(?:'s| is)\s+)?the\s+(current\s+)?time\??$/i.test(text) || /^time\??$/i.test(text)) return { type: 'action', action: 'system.time', result: await this.actions.execute('system.time') };
      if (/^(what(?:'s| is)\s+)?(?:today'?s\s+)?date\??$/i.test(text) || /^date\??$/i.test(text)) return { type: 'action', action: 'system.date', result: await this.actions.execute('system.date') };
      const math = text.match(/^(?:calculate|calc|compute)\s+(.+)$/i); if (math) return { type: 'action', action: 'calculator.calculate', result: await this.actions.execute('calculator.calculate', { expression: math[1] }) };
      const moduleMatch = text.match(/^(?:open|show|go to)\s+(chat|memory|actions|system)(?:\s+module)?$/i); if (moduleMatch) return { type: 'action', action: 'ui.open_module', result: await this.actions.execute('ui.open_module', { module: moduleMatch[1] }) };
      const notify = text.match(/^(?:notify|notification)\s*:\s*(.+)$/i); if (notify) return { type: 'action', action: 'ui.notify', result: await this.actions.execute('ui.notify', { message: notify[1] }) };
      if (/^status$/i.test(text)) return { type: 'status', version: this.version, memoryCount: this.memory.all().length, conversationTurns: this.conversation.count(), tools: this.tools.list(), remoteMemory: this.remoteMemory };
      return { type: 'model_request', payload: { message: text, memories: this.memory.recent(10), context: { ...context, conversation: this.conversation.recent(12) }, available_tools: this.tools.list(), agent_mode: true } };
    }
  }

  global.AcerolaAI = Object.freeze({ VERSION, MemoryManager, ConversationManager, ToolRouter, ActionEngine, ModelGateway, AgentCore });
})(window);
