# CognitiveReplay — Design

**Date:** 2026-06-29
**Context:** Portfolio/interview prototype for a Forward Deployed Engineer role at Beyond Code Academy. The goal is to *demonstrate* sharp engineering judgment and on-brand UX, not to ship production EdTech.

## Decisions that frame everything

| Fork | Decision | Why |
|------|----------|-----|
| Center of gravity | **The two dashboards (UX)** | Visual craft is what lands in the demo. Detection is a supporting layer. |
| Backend | **None — pure static** | Pre-recorded sessions; nothing to fake; deploys to any static host. |
| Framework | **Pure structured HTML prototype** | Tailwind via CDN, no build step, a little vanilla JS. |
| Fidelity | **Hybrid — real engine, scripted replay** | Detection actually computes from JSON (defensible). Replay is a scripted animation (cheap, looks great). |

## 1. Shape & file layout

No build step. Tailwind via Play CDN with brand tokens configured inline. Plain ES modules.

```
index.html            landing — title + two cards → the dashboards
teacher.html          Teacher Panel
parent.html           Parent Portal
css/brand.css         small custom layer over Tailwind (brand tokens)
js/engine.js          diagnostic engine — pure functions, zero DOM
js/teacher.js         loads sessions → runs engine → renders alerts + matrix
js/parent.js          replay player + mastery badges
data/sessions/*.json  4–5 seeded sessions
```

The diagnostic engine lives in pure functions with **no DOM access**, so it stays real, testable, and reviewable independent of the UI. It carries a tiny `assert`-based self-check runnable via `node js/engine.js`, so detection logic can't silently rot.

## 2. Seeded sessions (the demo cast)

Each session is crafted to clearly exhibit one behavior; these double as the demo script.

- **Alice** → Paste Shockwave (85 chars pasted in 2ms)
- **Kevin** → Backspace Cascade (4 failed runs, `delete_cascade` after each)
- **Mia** → Infinite Execution Loop (3 runs within 60s, snapshot Levenshtein < 3)
- **Sam** → clean session; earns *Resilient Debugger* + *Architectural Thinker* (the parent-portal positives)

Sessions follow the telemetry contract in `spec.md` (sessionId, studentId, classId, timestamp, events[]).

## 3. Diagnostic engine (`engine.js`)

Implements exactly the three metrics from `spec.md`:

- `detectPasteShockwave(events)` — an insert/paste where `delta.length > 40` && `timeSpentMs < 10`.
- `detectBackspaceCascade(events)` — a `delete_cascade` (or high-volume backspaces) within 3s following a failed `execution` event.
- `detectInfiniteLoop(events)` — 3 `execution` events within 60s whose `codeSnapshot`s differ by Levenshtein distance < 3 (tiny inline Levenshtein helper).
- `computeScores(session)` → `{ typingVelocity, logicalStability }`
  - **typingVelocity** = inserted characters / active seconds.
  - **logicalStability** = 100 minus a penalty per detected anomaly, clamped 0–100.

Positive-signal checks (for parent badges) also live here:
- *Resilient Debugger* — student spent meaningful time on a failed `execution` and corrected the offending variable rather than wiping the file.
- *Architectural Thinker* — steady typing cadence (low variance), no Paste Shockwave.

## 4. Teacher Panel (`teacher.html`)

High-density, minimalist cards (per `styles.md`).

- **Alert Queue** — engine output rendered as warning cards (⚠️ Kevin / 🛑 Alice), each with its cognitive-diagnostic sentence.
- **Class Matrix** — scatter of Typing Velocity (x) vs Logical Stability (y). Bottom-right quadrant (high velocity + low stability) shaded as the danger zone; dots there highlighted for teacher support.

## 5. Parent Portal (`parent.html`)

Warmer, gamified tone.

- **Timeline Replay** — a Play button scrubs through a session's `codeSnapshot`s, scripted animation typing the code into a read-only pane.
- **Mastery Badges** — 🧠 Resilient Debugger / 🏗️ Architectural Thinker, awarded by the positive-signal checks in the engine.

## 6. Brand (`styles.md`)

- Light beige/off-white background, **Deep Blue** primary, **Cyan + Yellow** accents.
- Teacher view: crisp, IDE-like density.
- Parent view: whimsical, blocky warmth.

## Out of scope (deliberately)

Live keystroke capture, Monaco editor, real code execution / Pyodide, any server, auth, persistence. Add only if the interview explicitly asks for live capture.
