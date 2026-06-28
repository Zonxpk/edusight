import assert from 'node:assert';
import { detectPasteShockwave, detectBackspaceCascade } from './engine.js';

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

console.log('engine.test.js: all assertions passed');
