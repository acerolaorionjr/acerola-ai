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
assert.deepStrictEqual(Array.from(legacy.recent(0)), [], 'zero memory limit returns no items');
assert.deepStrictEqual(Array.from(legacy.recent(-1)), [], 'negative memory limit must not return all items');
assert.deepStrictEqual(Array.from(legacy.recent(2)), ['item-3', 'item-4'], 'positive memory limits remain newest-first');

const ConversationManager = sandbox.AcerolaAI?.ConversationManager;
assert.strictEqual(typeof ConversationManager, 'function', 'ConversationManager must be exported');
const history = new ConversationManager('history', 3);
history.add('user', 'one');
history.add('assistant', 'two');
history.add('user', 'three');
assert.deepStrictEqual(Array.from(history.recent(0)), [], 'zero conversation limit returns no items');
assert.deepStrictEqual(Array.from(history.recent(-1)), [], 'negative conversation limit must not return all items');
assert.deepStrictEqual(Array.from(history.recent(2), item => item.content), ['two', 'three'], 'positive conversation limits remain newest-first');

legacy.add('x'.repeat(2500));
assert.strictEqual(legacy.all().at(-1).length, 2000);
assert.ok(legacy.all().length <= 3);

const quota = new MemoryManager('quota', 2);
sandbox.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
assert.doesNotThrow(() => quota.add('kept in this session'));
assert.deepStrictEqual(Array.from(quota.all()), ['kept in this session']);
assert.strictEqual(quota.recent(1)[0], 'kept in this session');
console.log(JSON.stringify({ bounded: true, deduplicated: true, entryCapped: true, quotaSafe: true, limitBoundaries: true }));
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
        "limitBoundaries": True,
    }
