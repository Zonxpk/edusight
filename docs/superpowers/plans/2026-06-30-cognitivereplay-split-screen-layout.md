# CognitiveReplay Split-Screen Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate teacher/parent views with one split-screen replay page: student code replay on the left, teacher/parent guidance in tabs on the right, with hover preview only.

**Architecture:** Add one canonical dashboard page and keep the replay logic in a small pure model layer so the UI stays thin. The left pane owns playback and timeline state; the right pane only interprets the current session and can preview-related code regions without changing the playhead. Keep the existing diagnostic engine intact and reuse it for anomaly and badge signals.

**Tech Stack:** HTML5, Tailwind CDN, vanilla JavaScript ES modules, Node.js `assert` for model tests, existing `js/engine.js`.

---

## File Structure

- `data/sessions/demo.json` - one seeded demo session with enough events to show timeline markers, teacher anomalies, and parent positives.
- `js/dashboard-model.js` - pure helpers that turn a session into replay frames, timeline markers, and teacher/parent insight items.
- `js/dashboard-model.test.js` - Node test coverage for frame building and hover-target mapping.
- `dashboard.html` - canonical split-screen page with left replay pane and right tab rail.
- `js/dashboard.js` - DOM controller for playback, scrubber, markers, tabs, hover preview, and empty/error states.
- `css/brand.css` - extended layout and interaction styles for the split view.
- `index.html` - landing page links updated to point at the new split-screen entry points.
- `teacher.html` - redirect or alias to the dashboard with the Teacher tab selected.
- `parent.html` - redirect or alias to the dashboard with the Parent tab selected.
- `package.json` - test script updated to run both the engine and dashboard-model tests.

## Global Constraints

- Keep `js/engine.js` unchanged unless a model test reveals a real mismatch with the new layout.
- Do not add a framework or bundler.
- Do not let hover preview change playback position.
- Keep the replay pane dominant on desktop widths.
- Use the same session data shape already used by the engine: `{ sessionId, studentId, classId, timestamp, events[] }`.

---

### Task 1: Add the pure dashboard model and its tests

**Files:**
- Create: `data/sessions/demo.json`
- Create: `js/dashboard-model.js`
- Create: `js/dashboard-model.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing model test**

Create `js/dashboard-model.test.js`:

```js
import assert from 'node:assert/strict';
import { buildDashboardModel } from './dashboard-model.js';

const session = {
  sessionId: 'demo-session',
  studentId: 'Demo',
  classId: 'class-101',
  timestamp: 1,
  events: [
    {
      timestamp: 10,
      type: 'text_change',
      action: 'insert',
      delta: 'print(a + b)',
      cursorPosition: 12,
      timeSpentMs: 1200,
    },
    {
      timestamp: 20,
      type: 'execution',
      status: 'failed',
      error: 'NameError: name "a" is not defined',
      codeSnapshot: 'print(a + b)',
    },
    {
      timestamp: 21,
      type: 'text_change',
      action: 'delete_cascade',
      delta: 'print(a + b)',
      cursorPosition: 0,
      timeSpentMs: 500,
    },
  ],
};

const model = buildDashboardModel(session);

assert.equal(model.frames.length, 3);
assert.equal(model.frames[1].kind, 'execution');
assert.equal(model.teacherItems.some(item => item.kind === 'backspace-cascade'), true);
assert.equal(model.parentItems.some(item => item.kind === 'resilient-debugger'), false);
assert.equal(model.parentItems.some(item => item.kind === 'architectural-thinker'), false);
console.log('dashboard-model tests passed');
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node js/dashboard-model.test.js`

Expected: module resolution failure because `js/dashboard-model.js` does not exist yet.

- [ ] **Step 3: Add the seeded demo session**

Create `data/sessions/demo.json`:

```json
{
  "sessionId": "demo_split_screen_01",
  "studentId": "Demo",
  "classId": "class-101",
  "timestamp": 1782693000000,
  "events": [
    {
      "timestamp": 1782693001000,
      "type": "text_change",
      "action": "insert",
      "delta": "def solve(n):",
      "cursorPosition": 13,
      "timeSpentMs": 1500
    },
    {
      "timestamp": 1782693003000,
      "type": "text_change",
      "action": "insert",
      "delta": "\n    return fib(n)",
      "cursorPosition": 31,
      "timeSpentMs": 1400
    },
    {
      "timestamp": 1782693007000,
      "type": "execution",
      "status": "failed",
      "error": "NameError: name 'fib' is not defined",
      "codeSnapshot": "def solve(n):\n    return fib(n)"
    },
    {
      "timestamp": 1782693020000,
      "type": "execution",
      "status": "failed",
      "error": "NameError: name 'fib' is not defined",
      "codeSnapshot": "def solve(n):\n    return fib(n + 1)"
    },
    {
      "timestamp": 1782693031000,
      "type": "execution",
      "status": "failed",
      "error": "NameError: name 'fib' is not defined",
      "codeSnapshot": "def solve(n):\n    return fib(n + 2)"
    },
    {
      "timestamp": 1782693040000,
      "type": "text_change",
      "action": "insert",
      "delta": "\nhelper = build_cache()",
      "cursorPosition": 54,
      "timeSpentMs": 3600
    }
  ]
}
```

- [ ] **Step 4: Implement the minimal pure model**

Create `js/dashboard-model.js`:

```js
import {
  detectPasteShockwave,
  detectBackspaceCascade,
  detectInfiniteLoop,
  earnsResilientDebugger,
  earnsArchitecturalThinker,
} from './engine.js';

export function buildReplayFrames(events) {
  const frames = [];
  let buffer = '';

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];

    if (event.type === 'text_change' && event.action === 'insert') {
      buffer += event.delta || '';
      frames.push({
        kind: 'insert',
        eventIndex: index,
        timestamp: event.timestamp,
        text: buffer,
      });
      continue;
    }

    if (event.type === 'text_change' && event.action === 'delete_cascade') {
      buffer = '';
      frames.push({
        kind: 'delete_cascade',
        eventIndex: index,
        timestamp: event.timestamp,
        text: buffer,
      });
      continue;
    }

    if (event.type === 'execution' && event.codeSnapshot != null) {
      buffer = event.codeSnapshot;
      frames.push({
        kind: event.status === 'failed' ? 'execution-failed' : 'execution-success',
        eventIndex: index,
        timestamp: event.timestamp,
        text: buffer,
      });
    }
  }

  return frames.length ? frames : [{ kind: 'empty', eventIndex: -1, timestamp: 0, text: '(no code recorded)' }];
}

function withPreviewFrameIndex(items, frames, predicate) {
  return items.map(item => ({
    ...item,
    previewFrameIndex: clampFrameIndex(predicate(item, frames), frames.length),
  }));
}

function clampFrameIndex(index, frameCount) {
  if (frameCount === 0) return 0;
  if (index < 0) return 0;
  if (index >= frameCount) return frameCount - 1;
  return index;
}

export function buildDashboardModel(session) {
  const frames = buildReplayFrames(session.events);
  const paste = detectPasteShockwave(session.events);
  const cascade = detectBackspaceCascade(session.events);
  const loop = detectInfiniteLoop(session.events);

  const teacherItems = withPreviewFrameIndex(
    [
      paste.triggered ? {
        id: 'paste-shockwave',
        kind: 'paste-shockwave',
        title: 'Paste Shockwave',
        description: `${session.studentId} pasted ${paste.charCount} chars in ${paste.timeSpentMs}ms.`,
      } : null,
      cascade.triggered ? {
        id: 'backspace-cascade',
        kind: 'backspace-cascade',
        title: 'Backspace Cascade',
        description: `${session.studentId} hit a failed run and then cleared the workspace quickly.`,
      } : null,
      loop.triggered ? {
        id: 'infinite-loop',
        kind: 'infinite-loop',
        title: 'Infinite Execution Loop',
        description: `${session.studentId} repeated near-identical executions within a short window.`,
      } : null,
    ].filter(Boolean),
    frames,
    (item, frameList) => {
      if (item.kind === 'paste-shockwave') return frameList.findIndex(frame => frame.kind === 'insert');
      if (item.kind === 'backspace-cascade') return frameList.findIndex(frame => frame.kind === 'delete_cascade');
      return frameList.findIndex(frame => frame.kind === 'execution-failed');
    }
  );

  const parentItems = withPreviewFrameIndex(
    [
      earnsResilientDebugger(session.events) ? {
        id: 'resilient-debugger',
        kind: 'resilient-debugger',
        title: 'Resilient Debugger',
        description: 'They corrected a failed attempt with a thoughtful follow-up edit instead of wiping everything.',
      } : null,
      earnsArchitecturalThinker(session.events) ? {
        id: 'architectural-thinker',
        kind: 'architectural-thinker',
        title: 'Architectural Thinker',
        description: 'Their typing cadence stayed steady and they avoided a paste-heavy shortcut.',
      } : null,
    ].filter(Boolean),
    frames,
    (item, frameList) => {
      if (item.kind === 'resilient-debugger') return frameList.findIndex(frame => frame.kind === 'execution-failed');
      return 0;
    }
  );

  return { frames, teacherItems, parentItems };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node js/dashboard-model.test.js`

Expected: `dashboard-model tests passed`

- [ ] **Step 5: Update the package test script**

Update `package.json`:

```json
{
  "name": "cognitivereplay",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node js/engine.test.js && node js/dashboard-model.test.js",
    "serve": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 6: Commit the model layer**

Run:

```bash
git add package.json js/dashboard-model.js js/dashboard-model.test.js
git commit -m "feat: add split-screen dashboard model"
```

---

### Task 2: Build the split-screen page shell and brand styles

**Files:**
- Create: `dashboard.html`
- Modify: `css/brand.css`

- [ ] **Step 1: Write the page shell**

Create `dashboard.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CognitiveReplay — Split View</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="css/brand.css" />
</head>
<body class="min-h-screen">
  <main class="dashboard-shell">
    <header class="dashboard-header">
      <a href="index.html" class="text-sm brand-muted">← Home</a>
      <div>
        <h1 class="brand-title text-3xl font-bold">CognitiveReplay</h1>
        <p class="brand-muted text-sm">Student replay on the left, teacher and parent insight on the right.</p>
      </div>
    </header>

    <section class="split-grid">
      <article class="replay-panel">
        <div class="panel-heading">
          <h2 class="panel-title">Student Replay</h2>
          <div class="replay-meta" id="replay-meta">Frame 1 of 1</div>
        </div>
        <div class="replay-controls">
          <button id="play-toggle" class="primary-chip">Play</button>
          <input id="timeline" class="timeline" type="range" min="0" max="0" value="0" step="1" />
        </div>
        <div id="timeline-markers" class="timeline-markers" aria-label="Replay events"></div>
        <div id="code-shell" class="code-shell">
          <pre id="code-view" class="code-view">(loading)</pre>
        </div>
      </article>

      <aside class="insight-panel">
        <div class="tablist" role="tablist" aria-label="Insight views">
          <button id="tab-teacher" role="tab" aria-selected="true" class="tab-button">Teacher</button>
          <button id="tab-parent" role="tab" aria-selected="false" class="tab-button">Parent</button>
        </div>
        <div id="insight-rail" class="insight-rail"></div>
      </aside>
    </section>
  </main>
  <script type="module" src="js/dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Extend the brand stylesheet**

Update `css/brand.css` with the split-screen styles:

```css
:root {
  --bg: #f7f4ec;
  --primary: #14306b;
  --accent-cyan: #22c3e6;
  --accent-yellow: #ffd23f;
  --danger: #e2483a;
  --ink: #1c2433;
  --muted: #6b7280;
  --panel: #ffffff;
  --panel-border: #e6e0d5;
  --preview: rgba(34, 195, 230, 0.16);
}

body {
  background: linear-gradient(180deg, #fbfaf6 0%, var(--bg) 100%);
  color: var(--ink);
  font-family: system-ui, sans-serif;
}

.brand-title { color: var(--primary); }
.brand-muted { color: var(--muted); }

.dashboard-shell {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
}

.dashboard-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.split-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.95fr);
  align-items: start;
}

.replay-panel,
.insight-panel {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(20, 48, 107, 0.08);
}

.replay-panel { padding: 18px; min-height: 78vh; }
.insight-panel { padding: 16px; min-height: 78vh; }

.panel-heading,
.replay-controls,
.tablist {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--primary);
}

.primary-chip,
.tab-button {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 10px 14px;
  font-weight: 600;
}

.primary-chip {
  background: var(--accent-yellow);
  color: var(--primary);
}

.tab-button {
  background: #f4f7fb;
  color: var(--primary);
}

.tab-button[aria-selected="true"] {
  background: var(--primary);
  color: white;
}

.timeline {
  width: 100%;
  accent-color: var(--accent-cyan);
}

.timeline-markers {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 14px 0;
}

.marker-pill {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.82rem;
  border: 1px solid var(--panel-border);
  background: #fbfbfd;
}

.marker-paste { border-color: #d9b31f; }
.marker-cascade { border-color: var(--danger); }
.marker-loop { border-color: #8b5cf6; }
.marker-positive { border-color: var(--accent-cyan); }

.code-shell {
  border-radius: 16px;
  border: 1px solid var(--panel-border);
  background: linear-gradient(180deg, #0f172a 0%, #111b33 100%);
  padding: 16px;
  min-height: 54vh;
}

.code-view {
  margin: 0;
  color: #e5edf9;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  line-height: 1.6;
}

.code-shell.is-preview {
  box-shadow: 0 0 0 2px var(--preview), 0 0 0 8px rgba(34, 195, 230, 0.08);
}

.insight-rail {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.insight-card {
  border-radius: 16px;
  padding: 14px;
  border: 1px solid var(--panel-border);
  background: #fffdf8;
}

.insight-card:hover {
  border-color: var(--accent-cyan);
  box-shadow: 0 10px 24px rgba(34, 195, 230, 0.14);
}

.insight-kicker {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.is-highlighted {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 2px var(--preview);
}

@media (max-width: 1024px) {
  .split-grid { grid-template-columns: 1fr; }
  .replay-panel,
  .insight-panel { min-height: auto; }
}
```

- [ ] **Step 3: Verify the shell is valid**

Run: `python3 -m http.server 8000`

Open `http://localhost:8000/dashboard.html`

Expected: page chrome renders with a left replay card and a right tab rail, even before the JS is wired.

- [ ] **Step 4: Commit the shell**

Run:

```bash
git add dashboard.html css/brand.css
git commit -m "feat: add split-screen dashboard shell"
```

---

### Task 3: Implement the left replay pane

**Files:**
- Create: `js/dashboard.js`

- [ ] **Step 1: Write the failing replay interaction test by exercising the model output in the browser controller**

Create `js/dashboard.js` with the replay state skeleton and a helper that the browser can call:

```js
import { buildDashboardModel } from './dashboard-model.js';

const params = new URLSearchParams(location.search);
const activeTab = params.get('tab') === 'parent' ? 'parent' : 'teacher';

const state = {
  session: null,
  model: null,
  playhead: 0,
  previewFrameIndex: null,
  playing: false,
  timer: null,
  activeTab,
};

function renderReplay() {}
function setPlayhead(index) {}
function togglePlayback() {}
function stopPlayback() {}

// The first browser run should fail on missing DOM wiring, which is expected.
```

- [ ] **Step 2: Run the page and confirm the DOM is still inert**

Run: `python3 -m http.server 8000`

Open `http://localhost:8000/dashboard.html`

Expected: page loads but the replay area still says `(loading)` because the DOM logic is not wired yet.

- [ ] **Step 3: Implement the replay controller**

Fill out `js/dashboard.js` so it:

- fetches one demo session
- builds the model with `buildDashboardModel(session)`
- renders the current frame into `#code-view`
- binds `#timeline` to the playhead
- advances the playhead on a timer when Play is active
- shows event markers in `#timeline-markers`
- updates `#replay-meta` with `Frame X of Y`
- pauses cleanly when the end is reached
- shows a compact error state if the session fetch fails

Use this controller shape:

```js
async function loadSession() {
  const response = await fetch('./data/sessions/demo.json');
  if (!response.ok) throw new Error(`Failed to load demo session: ${response.status}`);
  return response.json();
}

function renderFrame() {
  const frame = state.model.frames[state.playhead];
  document.getElementById('code-view').textContent = frame.text;
  document.getElementById('timeline').value = String(state.playhead);
  document.getElementById('replay-meta').textContent = `Frame ${state.playhead + 1} of ${state.model.frames.length}`;
}
```

- [ ] **Step 4: Verify the replay works**

Run: `python3 -m http.server 8000`

Open `http://localhost:8000/dashboard.html`

Expected:

- Play advances the code view through the session frames.
- Dragging the timeline updates the code view immediately.
- Event markers appear above the replay area.
- The left pane remains the primary visible surface.

- [ ] **Step 5: Commit the replay pane**

Run:

```bash
git add js/dashboard.js
git commit -m "feat: wire replay controls for split-screen dashboard"
```

---

### Task 4: Implement the teacher/parent tabs and hover preview

**Files:**
- Modify: `js/dashboard.js`

- [ ] **Step 1: Add the insight rendering and hover contract**

Extend `js/dashboard.js` so the controller renders two tab contents from `buildDashboardModel(session)`:

```js
function renderTeacherTab() {
  const rail = document.getElementById('insight-rail');
  rail.innerHTML = state.model.teacherItems.length
    ? state.model.teacherItems.map(item => `
    <button class="insight-card" data-preview="${item.previewFrameIndex}" data-kind="${item.kind}">
      <div class="insight-kicker">Teacher</div>
      <div class="font-semibold">${item.title}</div>
      <div class="text-sm brand-muted mt-1">${item.description}</div>
    </button>
  `).join('')
    : '<p class="brand-muted text-sm">No teacher signals for this session.</p>';
}

function renderParentTab() {
  const rail = document.getElementById('insight-rail');
  rail.innerHTML = state.model.parentItems.length
    ? state.model.parentItems.map(item => `
    <button class="insight-card" data-preview="${item.previewFrameIndex}" data-kind="${item.kind}">
      <div class="insight-kicker">Parent</div>
      <div class="font-semibold">${item.title}</div>
      <div class="text-sm brand-muted mt-1">${item.description}</div>
    </button>
  `).join('')
    : '<p class="brand-muted text-sm">No parent badges yet for this session.</p>';
}
```

- [ ] **Step 2: Wire hover preview without scrubbing**

Add this hover behavior:

```js
function applyPreview(index) {
  state.previewFrameIndex = index;
  const previewFrame = state.model.frames[index];
  document.getElementById('code-view').textContent = previewFrame.text;
  document.getElementById('code-shell').classList.add('is-preview');
}

function clearPreview() {
  state.previewFrameIndex = null;
  document.getElementById('code-shell').classList.remove('is-preview');
  renderFrame();
}
```

Hover handlers must:

- set `previewFrameIndex`
- update the code highlight surface
- leave `state.playhead` untouched

Click handlers remain unused for now.

- [ ] **Step 3: Bind the tab switcher**

Use the two tab buttons to swap only the right rail:

```js
function setActiveTab(tabName) {
  state.activeTab = tabName;
  document.getElementById('tab-teacher').setAttribute('aria-selected', String(tabName === 'teacher'));
  document.getElementById('tab-parent').setAttribute('aria-selected', String(tabName === 'parent'));
  if (tabName === 'teacher') renderTeacherTab();
  if (tabName === 'parent') renderParentTab();
}
```

The tab switch must not change:

- the playhead
- the current frame
- the replay timer

- [ ] **Step 4: Verify the hover contract in the browser**

Run: `python3 -m http.server 8000`

Open `http://localhost:8000/dashboard.html?tab=teacher`

Expected:

- Hovering a teacher card highlights the replay pane without moving the playhead.
- Hovering out clears the preview and returns to the active frame.
- Switching to Parent swaps only the right rail content.
- The left pane does not jump when hovering or tabbing.

- [ ] **Step 5: Commit the interaction layer**

Run:

```bash
git add js/dashboard.js
git commit -m "feat: add teacher and parent insight tabs"
```

---

### Task 5: Repoint the app entry points to the split-screen view

**Files:**
- Modify: `index.html`
- Modify: `teacher.html`
- Modify: `parent.html`

- [ ] **Step 1: Update the landing page links**

Change `index.html` so the two cards open the split-screen page with a role default:

```html
<a href="dashboard.html?tab=teacher" class="block bg-white rounded-xl p-6 shadow hover:shadow-lg transition">
  <h2 class="text-xl font-semibold brand-title">Teacher Split View →</h2>
  <p class="mt-2" style="color: var(--muted)">Replay on the left, interventions on the right.</p>
</a>
<a href="dashboard.html?tab=parent" class="block bg-white rounded-xl p-6 shadow hover:shadow-lg transition">
  <h2 class="text-xl font-semibold brand-title">Parent Split View →</h2>
  <p class="mt-2" style="color: var(--muted)">Replay on the left, progress context on the right.</p>
</a>
```

- [ ] **Step 2: Convert the old role pages into aliases**

Replace `teacher.html` and `parent.html` with redirects so existing entry points still land on the canonical split-screen page:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CognitiveReplay</title>
</head>
<body>
  <script>
    const tab = location.pathname.includes('teacher') ? 'teacher' : 'parent';
    location.replace(`dashboard.html?tab=${tab}`);
  </script>
</body>
</html>
```

- [ ] **Step 3: Verify no stale entry point breaks**

Run: `python3 -m http.server 8000`

Open:

- `http://localhost:8000/`
- `http://localhost:8000/teacher.html`
- `http://localhost:8000/parent.html`

Expected:

- `index.html` routes into the split-screen experience.
- `teacher.html` and `parent.html` both resolve to `dashboard.html`.

- [ ] **Step 4: Commit the routing cleanup**

Run:

```bash
git add index.html teacher.html parent.html
git commit -m "feat: route entry points to split-screen dashboard"
```

---

### Task 6: Verify the whole flow end to end

**Files:**
- No new files

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected:

- `node js/engine.test.js` passes
- `node js/dashboard-model.test.js` passes

- [ ] **Step 2: Run the browser smoke check**

Run: `python3 -m http.server 8000`

Open `http://localhost:8000/dashboard.html`

Check these interactions:

- left pane shows replay controls, timeline markers, and the active code frame
- right pane swaps between Teacher and Parent tabs
- hovering a suggestion card only previews the related code region
- the playhead stays where it was during hover
- the layout collapses into a readable vertical stack below desktop width

- [ ] **Step 3: Commit the finished layout revision**

Run:

```bash
git status --short
git add dashboard.html css/brand.css js/dashboard.js js/dashboard-model.js js/dashboard-model.test.js index.html teacher.html parent.html package.json data/sessions/demo.json
git commit -m "feat: revise cognitive replay into split-screen layout"
```

---

## Spec Coverage Check

- Left student replay with timeline controls and event markers -> Tasks 2, 3
- Right teacher/parent tabs -> Tasks 2, 4, 5
- Hover preview only, no playhead jump -> Task 4
- Desktop-first split layout with sensible mobile fallback -> Task 2
- Error handling for missing session data and empty states -> Task 3
- Testing for model behavior and browser smoke checks -> Tasks 1, 6
