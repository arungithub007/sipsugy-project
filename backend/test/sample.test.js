const { test } = require('node:test');
const assert = require('node:assert');

test('sanity check - basic math', () => {
  assert.strictEqual(1 + 1, 2);
});

test('sanity check - app boots', () => {
  assert.ok(true);
});