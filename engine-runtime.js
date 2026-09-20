/* Acerola Engine Runtime v0.7.0
 * Standalone orchestration engine over Agent Core.
 * Adds persistent run state, planning context, and bounded failure recovery.
 */
(function (global) {
  'use strict';

  const ENGINE_VERSION = '0.7.0';
  const STATE_KEY = 'acerola-engine-state-v2';

  class AcerolaEngine {
    constructor(options = {}) {
      if (!global.AcerolaAI?.AgentCore) throw new Error('Acerola Agent Core is not loaded.');
      this.core = options.core || new global.AcerolaAI.AgentCore(options);
      if (typeof global.AcerolaAI.installTools === 'function') global.AcerolaAI.installTools(this.core);
      this.version = ENGINE_VERSION;
      this.ready = false;
      this.state = this._loadState();
      this.activeRun = null;
    }

    _loadState() {
      try {
        const raw = global.localStorage?.getItem(STATE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return {
          runCount: Number(parsed.runCount) || 0,
          successCount: Number(parsed.successCount) || 0,
          failureCount: Number(parsed.failureCount) || 0,
          lastStatus: parsed.lastStatus || 'idle',
          lastMessage: parsed.lastMessage || '',
          lastError: parsed.lastError || '',
          lastTool: parsed.lastTool || '',
          lastRunAt: Number(parsed.lastRunAt) || 0,
          recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns.slice(-8) : [],
          taskHistory: Array.isArray(parsed.taskHistory) ? parsed.taskHistory.slice(-5) : []
        };
      } catch (_) {
        return {
          runCount: 0, successCount: 0, failureCount: 0, lastStatus: 'idle',
          lastMessage: '', lastError: '', lastTool: '', lastRunAt: 0, recentRuns: [], taskHistory: []
        };
      }
    }

    _saveState() {
      try { global.localStorage?.setItem(STATE_KEY, JSON.stringify(this.state)); } catch (_) {}
    }

    _recordRun(entry) {
      this.state.runCount += 1;
      this.state.lastStatus = entry.status;
      this.state.lastMessage = entry.message || '';
      this.state.lastError = entry.error || '';
      this.state.lastTool = entry.tool || '';
      this.state.lastRunAt = Date.now();
      if (entry.status === 'success') this.state.successCount += 1;
      if (entry.status === 'failure') this.state.failureCount += 1;
      this.state.recentRuns.push({
        at: this.state.lastRunAt,
        status: entry.status,
        message: String(entry.message || '').slice(0, 160),
        tool: entry.tool || '',
        error: String(entry.error || '').slice(0, 240)
      });
      this.state.recentRuns = this.state.recentRuns.slice(-8);
      this._saveState();
    }

    _recordTask(task) {
      this.state.taskHistory.push({
        id: task.id,
        objective: String(task.objective || '').slice(0, 200),
        status: task.status,
        steps: task.steps || 0,
        startedAt: task.startedAt,
        finishedAt: task.finishedAt || Date.now()
      });
      this.state.taskHistory = this.state.taskHistory.slice(-5);
      this._saveState();
    }

    _buildPlanningContext(context = {}) {
      return {
        ...context,
        engine: {
          version: this.version,
          previous_status: this.state.lastStatus,
          previous_tool: this.state.lastTool,
          previous_error: this.state.lastError || null,
          successful_runs: this.state.successCount,
          failed_runs: this.state.failureCount
        }
      };
    }

    _toolExists(tool) {
      return !tool || this.core.tools.has(tool);
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
      const signal = options.signal;
      if (signal?.aborted) return { ok: false, cancelled: true, error: 'Request cancelled.' };
      if (!input) return { ok: false, error: 'Message is required.' };
      if (!this.ready) await this.initialize();

      const task = { id: global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, objective: input, status: 'running', startedAt: Date.now(), steps: 0 };
      this.activeRun = task;
      this._emitTaskEvent('start', task);
      const planningContext = this._buildPlanningContext(context);

      try {
        const prepared = await this.core.process(input, planningContext);
        if (prepared.type !== 'model_request') {
          task.status = 'success'; task.steps = 1; task.finishedAt = Date.now();
          this._recordTask(task); this._emitTaskEvent('complete', task);
          this._recordRun({ status: 'success', message: input });
          return { ...prepared, engine: { version: this.version, taskId: task.id } };
        }

        if (Array.isArray(context.attachments) && context.attachments.length) {
          prepared.payload.attachments = context.attachments;
        }

        const maxSteps = Math.min(8, Math.max(1, Number(options.maxSteps) || 6));
        const retries = Math.min(2, Math.max(0, Number(options.retries) || 1));
        let lastError = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            this._setStep(task, 1, 'thinking', '', 'Planning the request…');
            const result = await this.core.runAgent(prepared.payload, { maxSteps, signal });
            const trace = Array.isArray(result?.trace) ? result.trace : [];
            trace.forEach((item, index) => this._setStep(task, index + 1, item?.result?.ok === false ? 'failed' : 'completed', item?.tool || '', item?.tool ? 'Using ' + item.tool : 'Processing…'));
            const invalidTool = result?.trace?.find(item => item?.tool && !this._toolExists(item.tool));
            if (invalidTool) throw new Error(`Engine rejected unknown tool: ${invalidTool.tool}`);

            task.steps = result?.steps || trace.length || attempt + 1;
            task.status = result?.ok === false ? 'failure' : 'success';
            task.finishedAt = Date.now();
            this._recordTask(task); this._emitTaskEvent(task.status === 'success' ? 'complete' : 'failed', task);
            this._recordRun({
              status: result?.ok === false ? 'failure' : 'success',
              message: input,
              tool: result?.trace?.at?.(-1)?.tool || '',
              error: result?.ok === false ? result.reply || 'Agent run failed' : ''
            });
            return {
              ...result,
              engine: {
                version: this.version,
                attempt: attempt + 1,
                recovered: attempt > 0,
                taskId: task.id,
                taskStatus: task.status
              }
            };
          } catch (error) {
            if (error?.name === 'AbortError' || signal?.aborted) return { ok: false, cancelled: true, error: 'Request cancelled.' };
            lastError = error;
            if (attempt >= retries) break;
            prepared.payload = {
              ...prepared.payload,
              recovery: {
                attempt: attempt + 1,
                error: error?.message || 'Agent execution failed',
                instruction: 'Retry the request using only available tools and a simpler plan.'
              }
            };
          }
        }

        const errorMessage = lastError?.message || 'Agent execution failed';
        task.status = 'failure'; task.finishedAt = Date.now(); this._recordTask(task); this._emitTaskEvent('failed', task);
        this._recordRun({ status: 'failure', message: input, error: errorMessage });
        return {
          ok: false,
          reply: `Acerola Engine could not complete that request after recovery attempts. ${errorMessage}`,
          error: errorMessage,
          engine: { version: this.version, recovered: false, taskId: task.id, taskStatus: task.status }
        };
      } finally {
        this.activeRun = null;
      }
    }

    _emitTaskEvent(type, task) {
      try { global.dispatchEvent(new CustomEvent('acerola:engine-task', { detail: { type, task: { ...task } } })); } catch (_) {}
    }

    _setStep(task, step, status, tool = '', message = '') {
      task.steps = Math.max(task.steps || 0, step);
      task.currentStep = step;
      task.currentTool = tool;
      task.stepStatus = status;
      task.stepMessage = String(message || '').slice(0, 180);
      this._emitTaskEvent('step', task);
    }

    taskHistory() {
      return this.state.taskHistory.slice();
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
        capabilities: this.capabilities(),
        state: {
          runCount: this.state.runCount,
          successCount: this.state.successCount,
          failureCount: this.state.failureCount,
          lastStatus: this.state.lastStatus,
          lastTool: this.state.lastTool,
          lastRunAt: this.state.lastRunAt,
          taskHistory: this.state.taskHistory.slice(-5)
        },
        activeRun: !!this.activeRun
      };
    }

    get gateway() {
      return this.core.gateway;
    }

    recordAssistant(text) {
      return this.core.recordAssistant?.(text);
    }

    resetState() {
      this.state = {
        runCount: 0, successCount: 0, failureCount: 0, lastStatus: 'idle',
        lastMessage: '', lastError: '', lastTool: '', lastRunAt: 0, recentRuns: [], taskHistory: []
      };
      this._saveState();
      return true;
    }
  }

  global.AcerolaEngine = AcerolaEngine;
})(window);
