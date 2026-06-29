# CognitiveReplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure-HTML prototype with two on-brand dashboards (Teacher Panel, Parent Portal) driven by a real, testable diagnostic engine that detects three coding-behavior anomalies from pre-recorded telemetry sessions.

**Architecture:** No build step. Tailwind via Play CDN. The diagnostic engine is a DOM-free ES module of pure functions, unit-tested with Node's `assert`. Dashboards `fetch` seeded JSON sessions, run the engine, and render. Replay is a scripted frame animation.

**Tech Stack:** HTML5, Tailwind (Play CDN), vanilla JavaScript (ES modules), Node (for running engine tests only). No framework, no bundler, no backend.

## Global Constraints

- No build step and no runtime dependencies in the browser — Tailwind loads via Play CDN `<script>`.
- Diagnostic engine (`js/engine.js`) must contain **zero DOM access** — pure functions only, importable by both the browser and Node.
- Detection thresholds are fixed by the spec, copied verbatim: Paste Shockwave = delta length > 40 chars && timeSpentMs < 10; Backspace Cascade = `delete_cascade` within 3000ms after a `failed` execution; Infinite Loop = 3 executions within 60000ms with snapshot Levenshtein distance < 3.
- Sessions follow the telemetry contract in `spec.md`: `{ sessionId, studentId, classId, timestamp, events[] }`.
- Brand (per `styles.md`): light beige/off-white background, Deep Blue primary, Cyan + Yellow accents.
- The app must be served over HTTP for `fetch` and ES modules to work (`python3 -m http.server`). It will not run from `file://`.

---

### Task 1: Project scaffold, brand tokens, landing page

**Files:**
- Create: `package.json`
- Create: `css/brand.css`
- Create: `index.html`

**Interfaces:**
- Consumes: nothing.
- Produces: brand CSS classes/tokens reused by all pages; `package.json` with `"type": "module"` so Node parses `js/*.js` as ES modules.

- [ ] **Step 1: Initialize git and package.json**

Run:
```bash
cd /Users/pakawat/Projects/labs/edusight
git init
```

Create `package.json`:
```json
{
  "name": "cognitivereplay",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node js/engine.test.js",
    "serve": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 2: Create brand token stylesheet**

Create `css/brand.css`:
```css
:root {
  --bg: #f7f4ec;          /* light beige / off-white */
  --primary: #14306b;     /* deep blue */
  --accent-cyan: #22c3e6;
  --accent-yellow: #ffd23f;
  --danger: #e2483a;
  --ink: #1c2433;
  --muted: #6b7280;
}
body { background: var(--bg); color: var(--ink); font-family: system-ui, sans-serif; }
.brand-title { color: var(--primary); }

/* Teacher alert cards */
.alert { border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; font-size: 0.95rem; }
.alert-warning { background: #fff7e0; border-left: 5px solid var(--accent-yellow); }
.alert-critical { background: #fdecea; border-left: 5px solid var(--danger); }

/* Class matrix scatter */
.matrix { position: relative; width: 100%; height: 360px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 12px; }
.matrix .danger-zone { position: absolute; right: 0; bottom: 0; width: 50%; height: 50%;
  background: rgba(226,72,58,0.06); border-top: 1px dashed var(--danger);
  border-left: 1px dashed var(--danger); }
.dot { position: absolute; width: 14px; height: 14px; border-radius: 50%;
  background: var(--primary); transform: translate(-50%, 50%); }
.dot-danger { background: var(--danger); box-shadow: 0 0 0 4px rgba(226,72,58,0.2); }

/* Parent portal */
.badge { display: inline-block; background: var(--accent-cyan); color: var(--primary);
  font-weight: 600; padding: 8px 14px; border-radius: 999px; margin: 4px; }
.replay-pane { background: #0f172a; color: #e2e8f0; font-family: ui-monospace, monospace;
  white-space: pre; padding: 16px; border-radius: 10px; min-height: 220px; }
```

- [ ] **Step 3: Create the landing page**

Create `index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CognitiveReplay</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="css/brand.css" />
</head>
<body class="min-h-screen">
  <main class="max-w-3xl mx-auto px-6 py-16">
    <h1 class="brand-title text-4xl font-bold mb-2">CognitiveReplay</h1>
    <p class="text-lg" style="color: var(--muted)">
      IDE Telemetry Sandbox &amp; AI Behavior Diagnostic Engine
    </p>
    <div class="grid sm:grid-cols-2 gap-6 mt-10">
      <a href="teacher.html" class="block bg-white rounded-xl p-6 shadow hover:shadow-lg transition">
        <h2 class="text-xl font-semibold brand-title">Teacher Panel →</h2>
        <p class="mt-2" style="color: var(--muted)">Live anomaly alerts and the class behavior matrix.</p>
      </a>
      <a href="parent.html" class="block bg-white rounded-xl p-6 shadow hover:shadow-lg transition">
        <h2 class="text-xl font-semibold brand-title">Parent Portal →</h2>
        <p class="mt-2" style="color: var(--muted)">Timeline replay and cognitive mastery badges.</p>
      </a>
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 4: Verify it loads**

Run:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000/` — expect the title, subtitle, and two clickable cards. (The dashboard pages 404 for now; that's expected.)

- [ ] **Step 5: Commit**

```bash
git add package.json css/brand.css index.html
git commit -m "feat: scaffold CognitiveReplay landing page and brand tokens"
```

---

### Task 2: Seeded telemetry sessions

**Files:**
- Create: `data/sessions/alice.json`
- Create: `data/sessions/kevin.json`
- Create: `data/sessions/mia.json`
- Create: `data/sessions/sam.json`

**Interfaces:**
- Consumes: nothing.
- Produces: four session objects matching the spec contract, each crafted to exhibit one behavior. Filenames (without `.json`) are referenced by `js/teacher.js` and `js/parent.js` as `['alice','kevin','mia','sam']`.

- [ ] **Step 1: Create Alice — Paste Shockwave**

Create `data/sessions/alice.json`:
```json
{
  "sessionId": "sess_alice_01",
  "studentId": "Alice",
  "classId": "ai_foundations_101",
  "timestamp": 1782693000000,
  "events": [
    { "timestamp": 1782693001000, "type": "text_change", "delta": "def solve():", "action": "insert", "cursorPosition": 12, "timeSpentMs": 1500 },
    { "timestamp": 1782693002000, "type": "text_change", "delta": "\n    result = []\n    for i in range(100):\n        result.append(i * i)\n    return result\n    # Extended AI block generated by copilot dummy", "action": "paste", "cursorPosition": 130, "timeSpentMs": 2 }
  ]
}
```

- [ ] **Step 2: Create Kevin — Backspace Cascade**

Create `data/sessions/kevin.json`:
```json
{
  "sessionId": "sess_kevin_01",
  "studentId": "Kevin",
  "classId": "ai_foundations_101",
  "timestamp": 1782694000000,
  "events": [
    { "timestamp": 1782694001000, "type": "text_change", "delta": "for i in range(10):", "action": "insert", "cursorPosition": 19, "timeSpentMs": 1400 },
    { "timestamp": 1782694002000, "type": "text_change", "delta": "\n    x = y + 1", "action": "insert", "cursorPosition": 33, "timeSpentMs": 900 },
    { "timestamp": 1782694003000, "type": "execution", "status": "failed", "error": "NameError: name 'y' is not defined", "codeSnapshot": "for i in range(10):\n    x = y + 1" },
    { "timestamp": 1782694004500, "type": "text_change", "delta": "for i in range(10):\n    x = y + 1", "action": "delete_cascade", "cursorPosition": 0, "timeSpentMs": 600 }
  ]
}
```

- [ ] **Step 3: Create Mia — Infinite Execution Loop**

Create `data/sessions/mia.json`:
```json
{
  "sessionId": "sess_mia_01",
  "studentId": "Mia",
  "classId": "ai_foundations_101",
  "timestamp": 1782695000000,
  "events": [
    { "timestamp": 1782695001000, "type": "text_change", "delta": "print(a + b)", "action": "insert", "cursorPosition": 12, "timeSpentMs": 1200 },
    { "timestamp": 1782695005000, "type": "execution", "status": "failed", "error": "NameError", "codeSnapshot": "print(a + b)" },
    { "timestamp": 1782695020000, "type": "execution", "status": "failed", "error": "NameError", "codeSnapshot": "print(a - b)" },
    { "timestamp": 1782695040000, "type": "execution", "status": "failed", "error": "NameError", "codeSnapshot": "print(a * b)" }
  ]
}
```

- [ ] **Step 4: Create Sam — clean session (earns both badges)**

Create `data/sessions/sam.json`:
```json
{
  "sessionId": "sess_sam_01",
  "studentId": "Sam",
  "classId": "ai_foundations_101",
  "timestamp": 1782696000000,
  "events": [
    { "timestamp": 1782696001000, "type": "text_change", "delta": "for i in range(10):", "action": "insert", "cursorPosition": 19, "timeSpentMs": 1400 },
    { "timestamp": 1782696002500, "type": "text_change", "delta": "\n    print(i)", "action": "insert", "cursorPosition": 33, "timeSpentMs": 1300 },
    { "timestamp": 1782696004000, "type": "text_change", "delta": "\n    total = total + i", "action": "insert", "cursorPosition": 56, "timeSpentMs": 1500 },
    { "timestamp": 1782696005500, "type": "text_change", "delta": "\n    return total", "action": "insert", "cursorPosition": 73, "timeSpentMs": 1450 },
    { "timestamp": 1782696007000, "type": "execution", "status": "failed", "error": "NameError: name 'total' is not defined", "codeSnapshot": "for i in range(10):\n    print(i)\n    total = total + i\n    return total" },
    { "timestamp": 1782696011000, "type": "text_change", "delta": "total = 0\n", "action": "insert", "cursorPosition": 10, "timeSpentMs": 3500 },
    { "timestamp": 1782696012000, "type": "execution", "status": "success", "codeSnapshot": "total = 0\nfor i in range(10):\n    print(i)\n    total = total + i\nreturn total" }
  ]
}
```

- [ ] **Step 5: Validate JSON parses**

Run:
```bash
node -e "['alice','kevin','mia','sam'].forEach(n => JSON.parse(require('fs').readFileSync('data/sessions/'+n+'.json','utf8'))); console.log('all sessions valid')"
```
Expected: `all sessions valid`

- [ ] **Step 6: Commit**

```bash
git add data/sessions/
git commit -m "feat: add seeded telemetry sessions"
```

---

### Task 3: Engine module + Paste Shockwave detector

**Files:**
- Create: `js/engine.js`
- Create: `js/engine.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `detectPasteShockwave(events) -> { triggered: boolean, charCount?: number, timeSpentMs?: number }`. Establishes the Node test harness run via `node js/engine.test.js`.

- [ ] **Step 1: Write the failing test**

Create `js/engine.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node js/engine.test.js`
Expected: FAIL — `Cannot find module '.../js/engine.js'` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `js/engine.js`:
```js
// Pure diagnostic functions — NO DOM access. Importable by browser and Node.

const PASTE_MIN_CHARS = 40;
const PASTE_MAX_MS = 10;

export function detectPasteShockwave(events) {
  for (const e of events) {
    if (e.type === 'text_change'
        && (e.action === 'insert' || e.action === 'paste')
        && e.delta && e.delta.length > PASTE_MIN_CHARS
        && e.timeSpentMs < PASTE_MAX_MS) {
      return { triggered: true, charCount: e.delta.length, timeSpentMs: e.timeSpentMs };
    }
  }
  return { triggered: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node js/engine.test.js`
Expected: PASS — `engine.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js js/engine.test.js
git commit -m "feat: add diagnostic engine with Paste Shockwave detector"
```

---

### Task 4: Backspace Cascade detector

**Files:**
- Modify: `js/engine.js`
- Modify: `js/engine.test.js`

**Interfaces:**
- Consumes: `detectPasteShockwave`.
- Produces: `detectBackspaceCascade(events) -> { triggered: boolean, afterError?: string, withinMs?: number }`.

- [ ] **Step 1: Write the failing test**

Append to `js/engine.test.js` (before the final `console.log` line):
```js
import { detectBackspaceCascade } from './engine.js';

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
```

Move `import { detectBackspaceCascade } from './engine.js';` to the top with the other imports (combine into the existing import line: `import { detectPasteShockwave, detectBackspaceCascade } from './engine.js';`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node js/engine.test.js`
Expected: FAIL — `detectBackspaceCascade is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `js/engine.js`:
```js
const CASCADE_WINDOW_MS = 3000;

export function detectBackspaceCascade(events) {
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'execution' && e.status === 'failed') {
      for (let j = i + 1; j < events.length; j++) {
        const next = events[j];
        if (next.timestamp - e.timestamp > CASCADE_WINDOW_MS) break;
        if (next.type === 'text_change' && next.action === 'delete_cascade') {
          return { triggered: true, afterError: e.error, withinMs: next.timestamp - e.timestamp };
        }
      }
    }
  }
  return { triggered: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node js/engine.test.js`
Expected: PASS — `engine.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js js/engine.test.js
git commit -m "feat: add Backspace Cascade detector"
```

---

### Task 5: Levenshtein + Infinite Execution Loop detector

**Files:**
- Modify: `js/engine.js`
- Modify: `js/engine.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `levenshtein(a, b) -> number` and `detectInfiniteLoop(events) -> { triggered: boolean, executions?: number, spanMs?: number }`.

- [ ] **Step 1: Write the failing test**

Add `detectInfiniteLoop` and `levenshtein` to the top import line:
`import { detectPasteShockwave, detectBackspaceCascade, detectInfiniteLoop, levenshtein } from './engine.js';`

Append assertions (before the final `console.log`):
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node js/engine.test.js`
Expected: FAIL — `detectInfiniteLoop is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `js/engine.js`:
```js
const LOOP_WINDOW_MS = 60000;
const LOOP_MIN_EXECUTIONS = 3;
const LOOP_MAX_DISTANCE = 3;

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function detectInfiniteLoop(events) {
  const execs = events.filter(e => e.type === 'execution' && e.codeSnapshot != null);
  for (let i = 0; i + LOOP_MIN_EXECUTIONS - 1 < execs.length; i++) {
    const window = execs.slice(i, i + LOOP_MIN_EXECUTIONS);
    const span = window[window.length - 1].timestamp - window[0].timestamp;
    if (span > LOOP_WINDOW_MS) continue;
    let allTiny = true;
    for (let k = 1; k < window.length; k++) {
      if (levenshtein(window[k - 1].codeSnapshot, window[k].codeSnapshot) >= LOOP_MAX_DISTANCE) {
        allTiny = false;
        break;
      }
    }
    if (allTiny) return { triggered: true, executions: window.length, spanMs: span };
  }
  return { triggered: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node js/engine.test.js`
Expected: PASS — `engine.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js js/engine.test.js
git commit -m "feat: add Infinite Execution Loop detector with Levenshtein"
```

---

### Task 6: Scores (typing velocity + logical stability)

**Files:**
- Modify: `js/engine.js`
- Modify: `js/engine.test.js`

**Interfaces:**
- Consumes: `detectPasteShockwave`, `detectBackspaceCascade`, `detectInfiniteLoop`.
- Produces: `computeScores(session) -> { typingVelocity: number, logicalStability: number }`. `typingVelocity` is inserted+pasted chars per active second; `logicalStability` starts at 100, subtracts 40 for paste shockwave and 35 for each of cascade/loop, clamped 0–100.

- [ ] **Step 1: Write the failing test**

Add `computeScores` to the top import line. Append assertions:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node js/engine.test.js`
Expected: FAIL — `computeScores is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `js/engine.js`:
```js
export function computeScores(session) {
  const events = session.events;
  let chars = 0, ms = 0;
  for (const e of events) {
    if (e.type === 'text_change' && (e.action === 'insert' || e.action === 'paste')) {
      chars += e.delta ? e.delta.length : 0;
      ms += e.timeSpentMs || 0;
    }
  }
  const typingVelocity = ms > 0 ? chars / (ms / 1000) : 0;
  let stability = 100;
  if (detectPasteShockwave(events).triggered) stability -= 40;
  if (detectBackspaceCascade(events).triggered) stability -= 35;
  if (detectInfiniteLoop(events).triggered) stability -= 35;
  stability = Math.max(0, Math.min(100, stability));
  return { typingVelocity, logicalStability: stability };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node js/engine.test.js`
Expected: PASS — `engine.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js js/engine.test.js
git commit -m "feat: add typing velocity and logical stability scoring"
```

---

### Task 7: Positive-signal badge checks

**Files:**
- Modify: `js/engine.js`
- Modify: `js/engine.test.js`

**Interfaces:**
- Consumes: `detectPasteShockwave`, `detectBackspaceCascade`.
- Produces: `earnsResilientDebugger(events) -> boolean` and `earnsArchitecturalThinker(events) -> boolean`.

- [ ] **Step 1: Write the failing test**

Add both functions to the top import line. Append a test that loads the real Sam session and asserts both badges, plus negatives:
```js
import { readFileSync } from 'node:fs';

const sam = JSON.parse(readFileSync('data/sessions/sam.json', 'utf8'));
assert.equal(earnsResilientDebugger(sam.events), true, 'Sam read the error and fixed the variable');
assert.equal(earnsArchitecturalThinker(sam.events), true, 'Sam typed at a steady cadence');

const kevin = JSON.parse(readFileSync('data/sessions/kevin.json', 'utf8'));
assert.equal(earnsResilientDebugger(kevin.events), false, 'Kevin wiped his code after the error');

const alice = JSON.parse(readFileSync('data/sessions/alice.json', 'utf8'));
assert.equal(earnsArchitecturalThinker(alice.events), false, 'Alice pasted, not composed');
```

Note: this test reads the seeded files from Task 2, so run it from the project root.

- [ ] **Step 2: Run test to verify it fails**

Run: `node js/engine.test.js`
Expected: FAIL — `earnsResilientDebugger is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `js/engine.js`:
```js
// Resilient Debugger: after a failed run, the student made a thoughtful edit
// (a non-deleting change they spent real time on) instead of wiping the file.
export function earnsResilientDebugger(events) {
  if (detectBackspaceCascade(events).triggered) return false;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'execution' && e.status === 'failed') {
      for (let j = i + 1; j < events.length; j++) {
        const next = events[j];
        if (next.type === 'text_change' && next.action !== 'delete_cascade'
            && (next.timeSpentMs || 0) > 3000) {
          return true;
        }
      }
    }
  }
  return false;
}

// Architectural Thinker: steady typing cadence (low variation), no paste shockwave.
// ponytail: coefficient-of-variation heuristic; tune threshold if cadence model changes.
export function earnsArchitecturalThinker(events) {
  if (detectPasteShockwave(events).triggered) return false;
  const times = events
    .filter(e => e.type === 'text_change' && e.action === 'insert')
    .map(e => e.timeSpentMs || 0);
  if (times.length < 2) return false;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  if (mean === 0) return false;
  const variance = times.reduce((a, t) => a + (t - mean) ** 2, 0) / times.length;
  const cv = Math.sqrt(variance) / mean;
  return cv < 0.6;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node js/engine.test.js`
Expected: PASS — `engine.test.js: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js js/engine.test.js
git commit -m "feat: add Resilient Debugger and Architectural Thinker badge checks"
```

---

### Task 8: Teacher Panel — alert queue + class matrix

**Files:**
- Create: `teacher.html`
- Create: `js/teacher.js`

**Interfaces:**
- Consumes: `detectPasteShockwave`, `detectBackspaceCascade`, `detectInfiniteLoop`, `computeScores` from `js/engine.js`; the four session JSON files.
- Produces: a rendered dashboard (no exports).

- [ ] **Step 1: Create the page markup**

Create `teacher.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CognitiveReplay — Teacher Panel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="css/brand.css" />
</head>
<body class="min-h-screen">
  <main class="max-w-6xl mx-auto px-6 py-10">
    <a href="index.html" class="text-sm" style="color: var(--muted)">← Home</a>
    <h1 class="brand-title text-3xl font-bold mt-2 mb-8">Teacher Panel</h1>
    <div class="grid lg:grid-cols-2 gap-8">
      <section>
        <h2 class="text-xl font-semibold mb-3">Alert Queue</h2>
        <div id="alert-queue"></div>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-3">Class Matrix</h2>
        <p class="text-sm mb-2" style="color: var(--muted)">
          Typing Velocity (→) vs Logical Stability (↑). Bottom-right = needs support.
        </p>
        <div class="matrix" id="matrix">
          <div class="danger-zone"></div>
          <div id="matrix-plot"></div>
        </div>
      </section>
    </div>
  </main>
  <script type="module" src="js/teacher.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the dashboard logic**

Create `js/teacher.js`:
```js
import { detectPasteShockwave, detectBackspaceCascade, detectInfiniteLoop, computeScores } from './engine.js';

const SESSION_FILES = ['alice', 'kevin', 'mia', 'sam'];
const VELOCITY_CAP = 50; // chars/sec mapped to 100% on the x axis

async function loadSessions() {
  const sessions = [];
  for (const name of SESSION_FILES) {
    const res = await fetch(`./data/sessions/${name}.json`);
    sessions.push(await res.json());
  }
  return sessions;
}

function buildAlerts(session) {
  const alerts = [];
  const paste = detectPasteShockwave(session.events);
  if (paste.triggered) {
    alerts.push({ level: 'critical',
      text: `🛑 ${session.studentId} triggered a Paste Shockwave (${paste.charCount} chars in ${paste.timeSpentMs}ms). Intercept the workspace to verify comprehension.` });
  }
  const cascade = detectBackspaceCascade(session.events);
  if (cascade.triggered) {
    alerts.push({ level: 'warning',
      text: `⚠️ ${session.studentId} just detected a Backspace Cascade after "${cascade.afterError}". They are stuck and need conceptual guidance.` });
  }
  const loop = detectInfiniteLoop(session.events);
  if (loop.triggered) {
    alerts.push({ level: 'warning',
      text: `⚠️ ${session.studentId} is in an Infinite Execution Loop (${loop.executions} near-identical runs). Trial-and-error without grasping the data flow.` });
  }
  return alerts;
}

function renderAlerts(sessions) {
  const queue = document.getElementById('alert-queue');
  const alerts = sessions.flatMap(buildAlerts);
  queue.innerHTML = alerts.length
    ? alerts.map(a => `<div class="alert alert-${a.level}">${a.text}</div>`).join('')
    : '<p style="color: var(--muted)">No anomalies detected.</p>';
}

function renderMatrix(sessions) {
  const plot = document.getElementById('matrix-plot');
  plot.innerHTML = sessions.map(s => {
    const { typingVelocity, logicalStability } = computeScores(s);
    const x = Math.min(100, (typingVelocity / VELOCITY_CAP) * 100);
    const y = logicalStability;
    const danger = x > 50 && y < 50;
    return `<div class="dot ${danger ? 'dot-danger' : ''}" style="left:${x}%; bottom:${y}%"
      title="${s.studentId}: velocity ${typingVelocity.toFixed(1)}/s, stability ${y}"></div>`;
  }).join('');
}

(async () => {
  const sessions = await loadSessions();
  renderAlerts(sessions);
  renderMatrix(sessions);
})();
```

- [ ] **Step 3: Verify in the browser**

Run (if not already running): `python3 -m http.server 8000`
Open `http://localhost:8000/teacher.html`. Expect:
- Alert Queue shows a critical 🛑 card for Alice, a warning ⚠️ card for Kevin, and a warning ⚠️ card for Mia (3 alerts; Sam produces none).
- Class Matrix shows 4 dots; Alice (and any other high-velocity/low-stability) appears red in the shaded bottom-right zone; Sam sits top-left.

- [ ] **Step 4: Commit**

```bash
git add teacher.html js/teacher.js
git commit -m "feat: add Teacher Panel with alert queue and class matrix"
```

---

### Task 9: Parent Portal — timeline replay + mastery badges

**Files:**
- Create: `parent.html`
- Create: `js/parent.js`

**Interfaces:**
- Consumes: `earnsResilientDebugger`, `earnsArchitecturalThinker` from `js/engine.js`; session JSON (defaults to Sam, override with `?student=<name>`).
- Produces: a rendered portal with a working Play button and badges (no exports).

- [ ] **Step 1: Create the page markup**

Create `parent.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CognitiveReplay — Parent Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="css/brand.css" />
</head>
<body class="min-h-screen">
  <main class="max-w-3xl mx-auto px-6 py-10">
    <a href="index.html" class="text-sm" style="color: var(--muted)">← Home</a>
    <h1 class="brand-title text-3xl font-bold mt-2 mb-8">Parent Progress Portal</h1>

    <section class="mb-10">
      <h2 class="text-xl font-semibold mb-3">Cognitive Mastery Badges</h2>
      <div id="badges"></div>
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-3">Timeline Replay</h2>
      <button id="play-btn"
        class="mb-3 px-5 py-2 rounded-lg font-semibold"
        style="background: var(--accent-yellow); color: var(--primary)">▶ Play</button>
      <div class="replay-pane" id="replay-pane">Press Play to watch the code assemble…</div>
    </section>
  </main>
  <script type="module" src="js/parent.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the portal logic**

Create `js/parent.js`:
```js
import { earnsResilientDebugger, earnsArchitecturalThinker } from './engine.js';

const params = new URLSearchParams(location.search);
const STUDENT = params.get('student') || 'sam';
const FRAME_MS = 700;

async function loadSession(name) {
  const res = await fetch(`./data/sessions/${name}.json`);
  return res.json();
}

// Scripted replay: cumulative inserts plus any execution snapshots, in order.
function buildFrames(events) {
  const frames = [];
  let buffer = '';
  for (const e of events) {
    if (e.type === 'text_change' && e.action === 'insert') {
      buffer += e.delta || '';
      frames.push(buffer);
    } else if (e.type === 'execution' && e.codeSnapshot != null) {
      frames.push(e.codeSnapshot);
      buffer = e.codeSnapshot;
    }
  }
  return frames.length ? frames : ['(no code recorded)'];
}

function playReplay(frames) {
  const pane = document.getElementById('replay-pane');
  let i = 0;
  pane.textContent = '';
  const timer = setInterval(() => {
    if (i >= frames.length) { clearInterval(timer); return; }
    pane.textContent = frames[i];
    i++;
  }, FRAME_MS);
}

function renderBadges(events) {
  const wrap = document.getElementById('badges');
  const badges = [];
  if (earnsResilientDebugger(events)) badges.push('🧠 Resilient Debugger');
  if (earnsArchitecturalThinker(events)) badges.push('🏗️ Architectural Thinker');
  wrap.innerHTML = badges.length
    ? badges.map(b => `<span class="badge">${b}</span>`).join('')
    : '<p style="color: var(--muted)">Keep practicing to earn your first badge!</p>';
}

(async () => {
  const session = await loadSession(STUDENT);
  const frames = buildFrames(session.events);
  renderBadges(session.events);
  document.getElementById('play-btn').addEventListener('click', () => playReplay(frames));
})();
```

- [ ] **Step 3: Verify in the browser**

Run (if not already running): `python3 -m http.server 8000`
Open `http://localhost:8000/parent.html`. Expect:
- Two badges: 🧠 Resilient Debugger and 🏗️ Architectural Thinker (Sam is the default).
- Clicking ▶ Play animates the code assembling line-by-line in the dark pane, ending at Sam's corrected snapshot.
- Open `http://localhost:8000/parent.html?student=kevin` → no badges ("Keep practicing…"), and the replay shows Kevin's short broken attempt.

- [ ] **Step 4: Commit**

```bash
git add parent.html js/parent.js
git commit -m "feat: add Parent Portal with timeline replay and mastery badges"
```

---

## Self-Review

**Spec coverage:**
- Telemetry contract → Task 2 sessions follow it.
- Metric A Paste Shockwave → Task 3.
- Metric B Backspace Cascade → Task 4.
- Metric C Infinite Execution Loop → Task 5.
- Teacher alert queue (Kevin/Alice copy) → Task 8.
- Teacher class matrix (velocity vs stability, danger quadrant) → Tasks 6 + 8.
- Parent timeline replay (Play button) → Task 9.
- Parent mastery badges (Resilient Debugger, Architectural Thinker) → Tasks 7 + 9.
- Brand (beige/deep-blue/cyan/yellow, IDE-dense teacher vs warm parent) → Task 1 brand.css + page markup.
- Out of scope (live capture, Monaco, execution, server, auth) → not built, per design.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every test step shows assertions and expected output.

**Type consistency:** Detector return shape `{ triggered, ... }` is consistent across Tasks 3–5 and consumed identically in Tasks 6, 8. `computeScores` returns `{ typingVelocity, logicalStability }`, consumed verbatim in Task 8. Badge functions return `boolean`, consumed in Task 9. Session filename list `['alice','kevin','mia','sam']` matches Task 2 files and is used in Tasks 8–9.

No gaps found.
