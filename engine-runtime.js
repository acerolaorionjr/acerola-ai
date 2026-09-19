/* Acerola Engine Runtime v0.1.0
 * Reusable runtime facade over Agent Core. Keeps the UI client separate from the engine.
 */
(function (global) {
  'use strict';

  class AcerolaEngine {
    constructor(options = {}) {
      if (!global.AcerolaAI?.AgentCore) throw new Error('Acerola Agent Core is not loaded.');
      this.core = options.core || new global.AcerolaAI.AgentCore(options);
      this.version = '0.1.0';
    }

    async initialize() {
      return this.core.initialize();
    }

    async run(message, context = {}, options = {}) {
      const input = String(message || '').trim();
      if (!input) return { ok: false, error: 'Message is required.' };

      const prepared = await this.core.process(input, context);
      if (prepared.type !== 'model_request') return prepared;

      const result = await this.core.runAgent(prepared.payload, {
        maxSteps: Math.min(8, Math.max(1, Number(options.maxSteps) || 6))
      });

      return result;
    }

    capabilities() {
      return this.core.tools.list();
    }

    status() {
      return this.core.tools.execute('system.status');
    }
  }

  global.AcerolaEngine = AcerolaEngine;
})(window);
