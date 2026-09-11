/* Acerola AI — Agent Core v0.2
 * Browser-safe orchestration layer. Provider secrets stay server-side.
 */
(function (global) {
  'use strict';

  const VERSION = '0.2.0';
  const MEMORY_KEY = 'acerola-ai-memory-v1';

  class MemoryManager {
    constructor(key = MEMORY_KEY) {
      this.key = key;
      this.items = this._load();
    }
    _load() {
      try {
        const value = global.localStorage?.getItem(this.key);
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) { return []; }
    }
    _save() {
      try { global.localStorage?.setItem(this.key, JSON.stringify(this.items)); }
      catch (_) {}
    }
    add(text) {
      const value = String(text || '').trim();
      if (!value) return false;
      this.items.push(value);
      this._save();
      return true;
    }
    remove(query) {
      const q = String(query || '').toLowerCase().trim();
      const before = this.items.length;
      this.items = this.items.filter(item => !item.toLowerCase().includes(q));
      this._save();
      return before - this.items.length;
    }
    clear() {
      this.items = [];
      this._save();
    }
    recent(limit = 5) { return this.items.slice(-limit).reverse(); }
    all() { return [...this.items]; }
  }

  class ToolRouter {
    constructor() { this.tools = new Map(); }
    register(name, handler, description = '') {
      if (!name || typeof handler !== 'function') throw new TypeError('Invalid tool');
      this.tools.set(name, { handler, description });
      return this;
    }
    has(name) { return this.tools.has(name); }
    list() {
      return [...this.tools.entries()].map(([name, tool]) => ({ name, description: tool.description }));
    }
    async execute(name, input = {}) {
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      return tool.handler(input);
    }
  }

  class ModelGateway {
    constructor({ endpoint = '/api/chat' } = {}) { this.endpoint = endpoint; }
    async complete(payload) {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Model gateway returned ${response.status}`);
      return response.json();
    }
  }

  class AgentCore {
    constructor(options = {}) {
      this.version = VERSION;
      this.memory = options.memory || new MemoryManager();
      this.tools = options.tools || new ToolRouter();
      this.gateway = options.gateway || new ModelGateway(options.gatewayOptions);
      this.tools
        .register('memory.recent', ({ limit = 5 }) => this.memory.recent(limit), 'Read recent local memories')
        .register('memory.add', ({ text }) => this.memory.add(text), 'Store a local memory')
        .register('memory.remove', ({ query }) => this.memory.remove(query), 'Remove matching local memories');
    }

    async process(input, context = {}) {
      const text = String(input || '').trim();
      if (!text) return { type: 'empty', text: '' };

      const remember = text.match(/^remember\s+(.+)/i);
      if (remember) {
        this.memory.add(remember[1]);
        return { type: 'memory', action: 'add', text: 'Stored locally.' };
      }
      const forget = text.match(/^forget\s+(.+)/i);
      if (forget) {
        const removed = this.memory.remove(forget[1]);
        return { type: 'memory', action: 'remove', removed, text: removed ? 'Matching memory removed.' : 'No matching memory found.' };
      }
      if (/^clear memory$/i.test(text)) {
        this.memory.clear();
        return { type: 'memory', action: 'clear', text: 'Local memory cleared.' };
      }
      if (/^status$/i.test(text)) {
        return { type: 'status', version: this.version, memoryCount: this.memory.all().length, tools: this.tools.list() };
      }

      // Natural-language requests go to the server-side gateway once connected.
      // No provider key is ever accepted or stored by this browser module.
      return {
        type: 'model_request',
        payload: {
          message: text,
          memories: this.memory.recent(10),
          context
        }
      };
    }
  }

  global.AcerolaAI = Object.freeze({
    VERSION,
    MemoryManager,
    ToolRouter,
    ModelGateway,
    AgentCore
  });
})(window);
