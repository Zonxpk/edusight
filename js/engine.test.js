import assert from 'node:assert';
import { detectPasteShockwave, detectBackspaceCascade, detectInfiniteLoop, levenshtein, computeScores } from './engine.js';

// Paste Shockwave: > 40 chars in < 10ms
const pasteEvents = [
  { type: 'text_change', action: 'paste', delta: 'x'.repeat(85), timeSpentMs: 2 }
];
const slowEvents = [
  { type: 'text_change', action: 'insert', delta: 'x'.repeat(85), timeSpentMs: 1500 }
];
const shortEvents = [
  { type: 'text_change', action: 'paste', delta: 'short', timeSpentMs: 1 }
];

assert.equal(detectPasteShockwave(pasteEvents).triggered, true, 'fast 85-char paste should trigger');
assert.equal(detectPasteShockwave(pasteEvents).charCount, 85);
assert.equal(detectPasteShockwave(slowEvents).triggered, false, 'slow typing should not trigger');
assert.equal(detectPasteShockwave(shortEvents).triggered, false, 'short paste should not trigger');

const cascadeEvents = [
  { type: 'execution', status: 'failed', error: "NameError: name 'y' is not defined", timestamp: 1000 },
  { type: 'text_change', action: 'delete_cascade', delta: 'x = y + 1', timestamp: 2500 }
];
const lateDeleteEvents = [
  { type: 'execution', status: 'failed', error: 'NameError', timestamp: 1000 },
  { type: 'text_change', action: 'delete_cascade', delta: 'x = y + 1', timestamp: 9000 }
];
const successThenDelete = [
  { type: 'execution', status: 'success', timestamp: 1000 },
  { type: 'text_change', action: 'delete_cascade', delta: 'x', timestamp: 1500 }
];

assert.equal(detectBackspaceCascade(cascadeEvents).triggered, true, 'cascade within 3s of failure triggers');
assert.equal(detectBackspaceCascade(cascadeEvents).afterError, "NameError: name 'y' is not defined");
assert.equal(detectBackspaceCascade(lateDeleteEvents).triggered, false, 'cascade after 3s does not trigger');
assert.equal(detectBackspaceCascade(successThenDelete).triggered, false, 'delete after success does not trigger');

assert.equal(levenshtein('abc', 'abd'), 1, 'one substitution');
assert.equal(levenshtein('print(a + b)', 'print(a - b)'), 1, 'one char diff');

const loopEvents = [
  { type: 'execution', status: 'failed', codeSnapshot: 'print(a + b)', timestamp: 1000 },
  { type: 'execution', status: 'failed', codeSnapshot: 'print(a - b)', timestamp: 20000 },
  { type: 'execution', status: 'failed', codeSnapshot: 'print(a * b)', timestamp: 40000 }
];
const bigChangeEvents = [
  { type: 'execution', status: 'failed', codeSnapshot: 'print(a)', timestamp: 1000 },
  { type: 'execution', status: 'failed', codeSnapshot: 'def f(): return 42', timestamp: 20000 },
  { type: 'execution', status: 'failed', codeSnapshot: 'x = [i for i in range(9)]', timestamp: 40000 }
];

assert.equal(detectInfiniteLoop(loopEvents).triggered, true, 'tiny diffs across 3 runs trigger');
assert.equal(detectInfiniteLoop(loopEvents).executions, 3);
assert.equal(detectInfiniteLoop(bigChangeEvents).triggered, false, 'large diffs do not trigger');

const cleanSession = { events: [
  { type: 'text_change', action: 'insert', delta: 'abcd', timeSpentMs: 1000 }
] };
const pasteSession = { events: [
  { type: 'text_change', action: 'paste', delta: 'x'.repeat(85), timeSpentMs: 2 }
] };

const clean = computeScores(cleanSession);
assert.equal(clean.logicalStability, 100, 'clean session is fully stable');
assert.ok(Math.abs(clean.typingVelocity - 4) < 0.001, '4 chars / 1s = 4 chars/s');

const paste = computeScores(pasteSession);
assert.equal(paste.logicalStability, 60, '100 - 40 for paste shockwave');
assert.ok(paste.typingVelocity > 1000, '85 chars in 2ms is very high velocity');

console.log('engine.test.js: all assertions passed');
