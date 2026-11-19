import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "agent-core.js"
INDEX = ROOT / "index.html"
GATEWAY = ROOT / "supabase" / "functions" / "acerola-ai-gateway" / "index.ts"


def test_memory_is_opt_in_and_exact_controls_sync_safely():
    harness = r"""
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(process.argv[1], 'utf8');
const store = new Map();
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  document: { readyState: 'loading', addEventListener() {} },
  localStorage: {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); }
  }
};
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'agent-core.js' });

(async () => {
  const calls = [];
  const gateway = {
    accessToken: null,
    setAccessToken(value) { this.accessToken = value; },
    async memory(action, payload = {}) {
      calls.push({ action, payload });
      if (action === 'remove_exact') return { ok: true, removed: 1 };
      if (action === 'update_exact') return { ok: true, updated: 1 };
      return { ok: true };
    }
  };
  const core = new sandbox.AcerolaAI.AgentCore({ gateway });

  await core.process('I like anime.');
  await core.process('My name is Michael.');
  assert.deepStrictEqual(Array.from(core.memory.all()), [], 'ordinary personal statements must not be saved');

  await core.process('Remember that I like anime.');
  assert.deepStrictEqual(Array.from(core.memory.all()), ['I like anime'], 'an explicit request must save the requested fact');

  const denied = await core.remember('My password is example-only');
  assert.strictEqual(denied.ok, false, 'credential-like details must not be stored');
  assert.deepStrictEqual(Array.from(core.memory.all()), ['I like anime'], 'rejected credentials must not enter local memory');

  core.remoteMemory = true;
  const forgotten = await core.forgetExact('I like anime');
  assert.strictEqual(forgotten.ok, true);
  assert.strictEqual(forgotten.persistent, true);
  assert.deepStrictEqual(Array.from(core.memory.all()), [], 'exact forget removes the selected local fact');

  core.memory.add('I like manga');
  const edited = await core.updateMemoryExact('I like manga', 'I enjoy manga');
  assert.strictEqual(edited.ok, true);
  assert.strictEqual(edited.persistent, true);
  assert.deepStrictEqual(Array.from(core.memory.all()), ['I enjoy manga'], 'exact edit updates the selected local fact');

  const deniedEdit = await core.updateMemoryExact('I enjoy manga', 'My API key is example-only');
  assert.strictEqual(deniedEdit.ok, false, 'credential-like edits must also be blocked');
  assert.deepStrictEqual(Array.from(core.memory.all()), ['I enjoy manga'], 'blocked credential edits must leave memory unchanged');

  assert.deepStrictEqual(calls.map(call => call.action), ['remove_exact', 'update_exact']);
  assert.strictEqual(calls[0].payload.query, 'I like anime');
  assert.strictEqual(calls[1].payload.old_value, 'I like manga');
  assert.strictEqual(calls[1].payload.new_value, 'I enjoy manga');

  const failingGateway = {
    setAccessToken() {},
    async memory() { return { ok: false, error: 'temporary outage' }; }
  };
  const offline = new sandbox.AcerolaAI.AgentCore({ gateway: failingGateway });
  offline.remoteMemory = true;
  offline.memory.add('Original fact');
  const failedEdit = await offline.updateMemoryExact('Original fact', 'Changed fact');
  assert.strictEqual(failedEdit.ok, false, 'failed cloud edits must report failure');
  assert.deepStrictEqual(Array.from(offline.memory.all()), ['Original fact'], 'failed cloud edits must not silently diverge local memory');

  console.log(JSON.stringify({
    ordinaryCaptureDisabled: true,
    explicitSaveWorks: true,
    credentialSaveBlocked: true,
    exactForgetWorks: true,
    exactEditWorks: true,
    failedCloudEditPreservesLocalFact: true
  }));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
"""
    result = subprocess.run(
        ["node", "-e", harness, str(CORE)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    assert result.returncode == 0, (
        "Memory control harness failed.\\nSTDOUT:\\n"
        + result.stdout
        + "\\nSTDERR:\\n"
        + result.stderr
    )
    report = json.loads(result.stdout.strip().splitlines()[-1])
    assert report == {
        "ordinaryCaptureDisabled": True,
        "explicitSaveWorks": True,
        "credentialSaveBlocked": True,
        "exactForgetWorks": True,
        "exactEditWorks": True,
        "failedCloudEditPreservesLocalFact": True,
    }


def test_memory_workspace_exposes_review_edit_and_forget_controls():
    page = INDEX.read_text(encoding="utf-8")
    assert "Memory is opt-in" in page
    assert "data-memory-edit" in page
    assert "data-memory-forget" in page
    assert 'role="status" aria-live="polite"' in page
    assert "Cloud memory connected" in page
    assert "Device-only memory" in page


def test_gateway_uses_exact_scoped_memory_mutations():
    gateway = GATEWAY.read_text(encoding="utf-8")
    assert 'action==="remove_exact"' in gateway
    assert 'action==="update_exact"' in gateway
    assert 'memory_value=${encodeURIComponent(filter)}' in gateway
    assert 'method:"PATCH"' in gateway
    assert 'user_id=eq.${encodeURIComponent(user.id)}' in gateway
