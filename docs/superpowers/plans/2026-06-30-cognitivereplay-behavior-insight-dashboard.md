# CognitiveReplay Behavior Insight Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the right side of `index.html` into a post-session behavior insight dashboard that leads with recommendations, then evidence, then compact behavior summaries for teacher and parent views.

**Architecture:** Keep the current single-file prototype and refactor the right-hand insight rail into a recommendation-first dashboard driven by explicit view data for teacher and parent modes. Preserve the left replay as the source of truth, wire hover previews to evidence items, and keep the playhead isolated from mode switching.

**Tech Stack:** Static HTML, Tailwind CDN, vanilla JavaScript, existing `css/brand.css`.

---

### Task 1: Reshape the insight data model

**Files:**
- Modify: `/Users/pakawat/Projects/labs/edusight/index.html`

- [ ] **Step 1: Replace the current flat `teacherItems` / `parentItems` arrays with structured insight objects**

Use a single source of truth with explicit recommendation, evidence, and summary fields:

```js
const insightViews = {
  teacher: {
    title: 'Teacher',
    recommendations: [
      {
        id: 'debug-persistence',
        title: 'Build debugging persistence',
        summary: 'The student keeps re-attempting the same approach after failure.',
        cue: 'High retry count',
        previewLine: 2,
        evidence: [
          { label: 'Repeated failed runs', frame: 5, kind: 'risk' },
          { label: 'Reset after error', frame: 3, kind: 'risk' },
        ],
      },
    ],
    summary: [
      { label: 'Debugging persistence', value: 'Low', tone: 'risk' },
      { label: 'Edit stability', value: 'Mixed', tone: 'neutral' },
    ],
  },
  parent: {
    title: 'Parent',
    recommendations: [
      {
        id: 'debug-persistence',
        title: 'Practice staying with the problem',
        summary: 'The student is still learning how to recover after mistakes without starting over.',
        cue: 'Growth opportunity',
        previewLine: 2,
        evidence: [
          { label: 'Repeated failed runs', frame: 5, kind: 'risk' },
          { label: 'Thoughtful follow-up edit', frame: 6, kind: 'progress' },
        ],
      },
    ],
    summary: [
      { label: 'Recovery after error', value: 'Developing', tone: 'progress' },
      { label: 'Thoughtful pacing', value: 'Inconsistent', tone: 'neutral' },
    ],
  },
};
```

- [ ] **Step 2: Keep replay frames separate and continue deriving them from `session.events`**

Preserve the existing `buildFrames(events)` flow so the left replay remains authoritative:

```js
state.frames = buildFrames(session.events);
```

- [ ] **Step 3: Run a quick syntax sanity check in the browser by loading the page**

Run:

```bash
python3 -m http.server 8000
```

Expected: `index.html` still loads and the existing replay renders before any UI refactor.

---

### Task 2: Rebuild the right-hand dashboard markup

**Files:**
- Modify: `/Users/pakawat/Projects/labs/edusight/index.html`

- [ ] **Step 1: Replace the current tablist-only rail with a three-section dashboard**

Use this structure inside the right panel:

```html
<aside class="panel insight-panel">
  <div class="dashboard-mode-switch" role="tablist" aria-label="Insight views">
    <button id="tab-teacher" role="tab" aria-selected="true" class="tab-button">Teacher</button>
    <button id="tab-parent" role="tab" aria-selected="false" class="tab-button">Parent</button>
  </div>

  <section class="insight-stack">
    <div class="insight-section">
      <div class="section-kicker">Recommended next steps</div>
      <div id="recommendation-rail" class="recommendation-rail"></div>
    </div>

    <div class="insight-section">
      <div class="section-kicker">Supporting evidence</div>
      <div id="evidence-rail" class="evidence-rail"></div>
    </div>

    <div class="insight-section">
      <div class="section-kicker">Behavior summary</div>
      <div id="summary-rail" class="summary-rail"></div>
    </div>
  </section>
</aside>
```

- [ ] **Step 2: Add card-level markup that clearly separates recommendation, evidence, and summary roles**

Recommendations should have title, explanation, and cue. Evidence should show the linked behavior and session reference. Summary should be compact chips or metric blocks.

```html
<button class="recommendation-card" data-preview-line="2" data-recommendation-id="debug-persistence">
  <div class="insight-kicker">Teacher recommendation</div>
  <div class="font-semibold">Build debugging persistence</div>
  <div class="insight-summary">The student keeps re-attempting the same approach after failure.</div>
</button>
```

- [ ] **Step 3: Verify the page still renders all major sections**

Run:

```bash
python3 -m http.server 8000
```

Expected: the replay remains on the left and the right side now contains three visible insight groups instead of only a flat card rail.

---

### Task 3: Rework rendering and hover behavior

**Files:**
- Modify: `/Users/pakawat/Projects/labs/edusight/index.html`

- [ ] **Step 1: Replace `getItemsForTab()` / `renderInsights()` with dashboard renderers for recommendations, evidence, and summary**

Use separate render functions so each dashboard section stays focused:

```js
function getInsightView() {
  return insightViews[state.activeTab];
}

function renderRecommendationCard(recommendation) {
  return `
    <button class="recommendation-card previewable-card" data-preview-line="${recommendation.previewLine}" data-kind="recommendation" data-id="${recommendation.id}">
      <div class="insight-kicker">${state.activeTab === 'teacher' ? 'Teacher recommendation' : 'Parent recommendation'}</div>
      <div class="font-semibold">${recommendation.title}</div>
      <div class="insight-summary">${recommendation.summary}</div>
      <div class="card-cue">${recommendation.cue}</div>
    </button>
  `;
}

function renderEvidenceCard(recommendation, evidence) {
  return `
    <button class="evidence-card previewable-card" data-preview-line="${evidence.frame}" data-kind="${evidence.kind}" data-id="${recommendation.id}-${evidence.label}">
      <div class="insight-kicker">${evidence.kind === 'progress' ? 'Progress signal' : 'Behavior evidence'}</div>
      <div class="font-semibold">${evidence.label}</div>
      <div class="insight-summary">Frame ${evidence.frame} · ${recommendation.title}</div>
    </button>
  `;
}

function renderSummaryChip(item) {
  return `
    <div class="summary-chip ${item.tone}">
      <div class="summary-label">${item.label}</div>
      <div class="summary-value">${item.value}</div>
    </div>
  `;
}

function renderRecommendations() {
  const rail = document.getElementById('recommendation-rail');
  const view = getInsightView();
  rail.innerHTML = view.recommendations.map(renderRecommendationCard).join('');
}

function renderEvidence() {
  const rail = document.getElementById('evidence-rail');
  const view = getInsightView();
  rail.innerHTML = view.recommendations
    .flatMap(recommendation => recommendation.evidence.map(evidence => renderEvidenceCard(recommendation, evidence)))
    .join('');
}

function renderSummary() {
  const rail = document.getElementById('summary-rail');
  const view = getInsightView();
  rail.innerHTML = view.summary.map(renderSummaryChip).join('');
}
```

- [ ] **Step 2: Keep hover preview isolated to the left replay**

Make recommendation and evidence hover update only `state.previewLine`:

```js
function previewLine(line) {
  state.previewLine = line;
  renderCode();
}

function clearPreview() {
  state.previewLine = null;
  document.querySelectorAll('.previewable-card').forEach(card => card.classList.remove('is-highlighted'));
  renderCode();
}
```

Hover should never call `setPlayhead()` and should never change `state.activeTab`.

- [ ] **Step 3: Verify switching tabs does not move playback**

Run:

```bash
python3 -m http.server 8000
```

Expected: switching Teacher and Parent leaves the current frame unchanged while the right-hand copy updates.

---

### Task 4: Polish responsive states, empty states, and visual hierarchy

**Files:**
- Modify: `/Users/pakawat/Projects/labs/edusight/index.html`

- [ ] **Step 1: Restyle the right panel so recommendations visually dominate**

Use larger spacing and stronger emphasis for recommendation cards, then de-emphasize summary chips:

```css
.insight-stack { display: grid; gap: 14px; }
.recommendation-rail { display: grid; gap: 12px; }
.evidence-rail { display: grid; gap: 10px; }
.summary-rail { display: flex; flex-wrap: wrap; gap: 8px; }
.recommendation-card { padding: 16px; border-radius: 18px; }
.summary-chip { padding: 8px 10px; border-radius: 999px; }
```

- [ ] **Step 2: Add explicit empty and malformed-data states for the dashboard**

If a view has no recommendations, render a short empty note in the section rather than hiding it:

```js
rail.innerHTML = '<p class="empty-note">No recommendations for this session.</p>';
```

If session data is malformed, keep the replay error compact and leave the dashboard disabled.

- [ ] **Step 3: Verify the responsive collapse keeps the replay readable**

Run:

```bash
python3 -m http.server 8000
```

Expected: below the tablet breakpoint, the dashboard stacks below the replay and the code stays readable without heavy compression.

---

### Task 5: Final verification and cleanup

**Files:**
- Modify: `/Users/pakawat/Projects/labs/edusight/index.html`

- [ ] **Step 1: Confirm all interaction paths**

Check these exact behaviors in the browser:

```text
1. Replay auto-advances and scrubs normally.
2. Teacher/Parent mode switches only the insight copy.
3. Recommendation hover previews the left code region.
4. Evidence hover previews the left code region.
5. Hover out clears the preview cleanly.
6. Empty states remain visible and understandable.
```

- [ ] **Step 2: Remove any dead helper functions left over from the old tab-rail implementation**

Delete obsolete code such as the old `teacherItems`, `parentItems`, `getItemsForTab()`, and `renderInsights()` helpers once the new renderers are in place.

- [ ] **Step 3: Commit the implementation**

Run:

```bash
git add index.html
git commit -m "feat: upgrade behavior insight dashboard"
```

Expected: the implementation commit contains the dashboard redesign and no unrelated file changes.
