import assert from 'node:assert';
import { detectPasteShockwave } from './engine.js';

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

console.log('engine.test.js: all assertions passed');
