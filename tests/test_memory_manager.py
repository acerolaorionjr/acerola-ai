import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "agent-core.js"


def test_real_memory_manager_is_bounded_deduplicated_and_quota_safe():
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
const MemoryManager = sandbox.AcerolaAI?.MemoryManager;
assert.strictEqual(typeof MemoryManager, 'function', 'MemoryManager must be exported');

const legacy = new MemoryManager('legacy', 3);
for (let i = 0; i < 5; i++) legacy.add('item-' + i);
assert.deepStrictEqual(Array.from(legacy.all()), ['item-2', 'item-3', 'item-4']);
legacy.add('item-3');
assert.deepStrictEqual(Array.from(legacy.all()), ['item-2', 'item-4', 'item-3']);

const exact = new MemoryManager('exact', 8);
exact.add('I like anime');
exact.add('I like anime and manga');
exact.add('I like manga');
assert.strictEqual(exact.removeExact('I like anime'), 1, 'exact removal deletes only the selected fact');
assert.deepStrictEqual(Array.from(exact.all()), ['I like anime and manga', 'I like manga']);
assert.strictEqual(exact.replaceExact('I like manga', 'I enjoy manga'), 1, 'exact edit updates one selected fact');
assert.deepStrictEqual(Array.from(exact.all()), ['I like anime and manga', 'I enjoy manga']);
assert.strictEqual(exact.removeExact('missing fact'), 0, 'missing exact memories are not changed');

legacy.add('x'.repeat(2500));
assert.strictEqual(legacy.all().at(-1).length, 2000);
assert.ok(legacy.all().length <= 3);

const quota = new MemoryManager('quota', 2);
sandbox.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
assert.doesNotThrow(() => quota.add('kept in this session'));
assert.deepStrictEqual(Array.from(quota.all()), ['kept in this session']);
assert.strictEqual(quota.recent(1)[0], 'kept in this session');
console.log(JSON.stringify({ bounded: true, deduplicated: true, entryCapped: true, quotaSafe: true }));
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
        "bounded": True,
        "deduplicated": True,
        "entryCapped": True,
        "quotaSafe": True,
    }
