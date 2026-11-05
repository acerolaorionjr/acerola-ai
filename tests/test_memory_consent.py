import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "agent-core.js"
UI = ROOT / "ui-enhancements.js"


def test_personal_context_is_saved_only_after_an_explicit_request():
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
  const core = new sandbox.AcerolaAI.AgentCore({
    gateway: { memory: async () => ({ ok: true }), setAccessToken() {} }
  });

  await core.process('I like anime.');
  await core.process('My name is Michael.');
  await core.process('I use an Infinix phone.');
  assert.deepStrictEqual(
    Array.from(core.memory.all()),
    [],
    'ordinary personal statements must not be saved without consent'
  );

  await core.process('Remember that I like anime.');
  assert.deepStrictEqual(
    Array.from(core.memory.all()),
    ['I like anime'],
    'an explicit remember request must save the requested fact'
  );

  await core.process('Forget I like anime.');
  assert.deepStrictEqual(
    Array.from(core.memory.all()),
    [],
    'the existing forget command must remove the saved fact'
  );

  console.log(JSON.stringify({
    automaticCaptureDisabled: true,
    explicitSaveWorks: true,
    explicitForgetWorks: true
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
        check=True,
    )
    report = json.loads(result.stdout.strip().splitlines()[-1])
    assert report == {
        "automaticCaptureDisabled": True,
        "explicitSaveWorks": True,
        "explicitForgetWorks": True,
    }


def test_memory_panel_explains_opt_in_controls():
    page = UI.read_text(encoding="utf-8")
    assert "Memory is opt-in." in page
    assert "Remember that" in page
    assert "Forget" in page
    assert "Clear memory" in page
