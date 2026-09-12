/* Acerola AI — Agent Core v0.6
 * Browser-safe orchestration layer. Provider secrets stay server-side.
 */
(function (global) {
  'use strict';

  const VERSION = '0.6.0';
  const MEMORY_KEY = 'acerola-ai-memory-v1';
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
    all() { return [...this.items]; }
    replace(items) { this.items = Array.isArray(items) ? items.map(String) : []; this._save(); }
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
    async execute(name, input = {}) {
      if (!this.tools.has(name)) throw new Error(`Unknown action: ${name}`);
      return this.tools.execute(name, input);
    }
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

  class AgentCore {
    constructor(options = {}) {
      this.version = VERSION;
      this.memory = options.memory || new MemoryManager();
      this.tools = options.tools || new ToolRouter();
      this.actions = new ActionEngine(this.tools);
      this.gateway = options.gateway || new ModelGateway(options.gatewayOptions || {});
      this.auth = null;
      this.remoteMemory = false;
      this.tools
        .register('memory.recent', ({ limit = 5 }) => this.memory.recent(limit), 'Read recent memories')
        .register('memory.add', ({ text }) => this.remember(text), 'Store a persistent memory')
        .register('memory.remove', ({ query }) => this.forget(query), 'Remove matching memories')
        .register('memory.clear', () => this.clearMemory(), 'Clear persistent memory')
        .register('system.time', () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }), 'Get the current local time')
        .register('system.date', () => new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 'Get the current local date')
        .register('system.status', () => ({ version: this.version, memoryCount: this.memory.all().length, remoteMemory: this.remoteMemory, tools: this.tools.list().length }), 'Get Agent Core status');
    }

    async initialize() {
      try {
        if (!global.supabase?.createClient) return { authenticated: false, reason: 'Supabase client unavailable' };
        this.auth = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        let { data: { session } } = await this.auth.auth.getSession();
        if (!session) {
          const result = await this.auth.auth.signInAnonymously();
          if (result.error) throw result.error;
          session = result.data.session;
        }
        if (!session?.access_token) throw new Error('No Supabase access token');
        this.gateway.setAccessToken(session.access_token);
        const remote = await this.gateway.memory('load');
        if (remote.ok && Array.isArray(remote.memories)) this.memory.replace(remote.memories.map(item => item.memory_value));
        this.remoteMemory = true;
        return { authenticated: true, anonymous: !!session.user?.is_anonymous, memoryCount: this.memory.all().length };
      } catch (error) {
        this.remoteMemory = false;
        return { authenticated: false, reason: error?.message || 'Authentication unavailable' };
      }
    }

    async remember(text) {
      const value = String(text || '').trim(); if (!value) return false;
      this.memory.add(value);
      if (this.remoteMemory) { try { await this.gateway.memory('add', { memory: { key: global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, value, type: 'fact' } }); } catch (_) {} }
      return true;
    }

    async forget(query) {
      const removed = this.memory.remove(query);
      if (this.remoteMemory) { try { await this.gateway.memory('remove', { query: String(query || '') }); } catch (_) {} }
      return removed;
    }

    async clearMemory() {
      this.memory.clear();
      if (this.remoteMemory) { try { await this.gateway.memory('clear'); } catch (_) {} }
    }

    async executePlannedAction(plan) {
      if (!plan || plan.type !== 'tool_call') return null;
      const name = String(plan.tool || '').trim();
      if (!name || !this.tools.has(name)) return { ok: false, error: `Action not allowed: ${name || 'missing tool'}` };
      const result = await this.actions.execute(name, plan.arguments && typeof plan.arguments === 'object' ? plan.arguments : {});
      return { ok: true, tool: name, result };
    }

    async process(input, context = {}) {
      const text = String(input || '').trim();
      if (!text) return { type: 'empty', text: '' };
      const remember = text.match(/^remember\s+(.+)/i);
      if (remember) { await this.remember(remember[1]); return { type: 'memory', action: 'add', text: 'Stored in persistent memory.' }; }
      const forget = text.match(/^forget\s+(.+)/i);
      if (forget) { const removed = await this.forget(forget[1]); return { type: 'memory', action: 'remove', removed, text: removed ? 'Matching memory removed.' : 'No matching memory found.' }; }
      if (/^clear memory$/i.test(text)) { await this.clearMemory(); return { type: 'memory', action: 'clear', text: 'Persistent memory cleared.' }; }
      if (/^(what(?:'s| is)\s+)?the\s+(current\s+)?time\??$/i.test(text) || /^time\??$/i.test(text)) return { type: 'action', action: 'system.time', result: await this.actions.execute('system.time') };
      if (/^(what(?:'s| is)\s+)?(?:today'?s\s+)?date\??$/i.test(text) || /^date\??$/i.test(text)) return { type: 'action', action: 'system.date', result: await this.actions.execute('system.date') };
      if (/^status$/i.test(text)) return { type: 'status', version: this.version, memoryCount: this.memory.all().length, tools: this.tools.list(), remoteMemory: this.remoteMemory };
      return { type: 'model_request', payload: { message: text, memories: this.memory.recent(10), context, available_tools: this.tools.list(), agent_mode: true } };
    }
  }

  global.AcerolaAI = Object.freeze({ VERSION, MemoryManager, ToolRouter, ActionEngine, ModelGateway, AgentCore });
})(window);
