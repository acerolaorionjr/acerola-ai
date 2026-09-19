/* Acerola Engine Runtime v0.2.0
 * Standalone orchestration facade over Agent Core.
 */
(function (global) {
  'use strict';

  class AcerolaEngine {
    constructor(options = {}) {
      if (!global.AcerolaAI?.AgentCore) throw new Error('Acerola Agent Core is not loaded.');
      this.core = options.core || new global.AcerolaAI.AgentCore(options);
      this.version = '0.2.0';
      this.ready = false;
    }

    async initialize() {
      if (!this.ready) {
        await this.core.initialize();
        this.ready = true;
      }
      return this.status();
    }

    async run(message, context = {}, options = {}) {
      const input = String(message || '').trim();
      if (!input) return { ok: false, error: 'Message is required.' };
      if (!this.ready) await this.initialize();

      const prepared = await this.core.process(input, context);
      if (prepared.type !== 'model_request') return prepared;

      if (Array.isArray(context.attachments) && context.attachments.length) {
        prepared.payload.attachments = context.attachments;
      }

      return this.core.runAgent(prepared.payload, {
        maxSteps: Math.min(8, Math.max(1, Number(options.maxSteps) || 6))
      });
    }

    capabilities() {
      return this.core.tools.list();
    }

    async status() {
      return {
        ready: this.ready,
        version: this.version,
        coreVersion: this.core.version,
        memoryCount: this.core.memory.all().length,
        conversationTurns: this.core.conversation.count(),
        remoteMemory: !!this.core.remoteMemory,
        capabilities: this.capabilities()
      };
    }

    get gateway() {
      return this.core.gateway;
    }

    recordAssistant(text) {
      return this.core.recordAssistant?.(text);
    }
  }

  global.AcerolaEngine = AcerolaEngine;
})(window);
