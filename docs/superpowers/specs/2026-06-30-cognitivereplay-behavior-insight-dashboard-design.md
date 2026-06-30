# CognitiveReplay Behavior Insight Dashboard Design

**Date:** 2026-06-30  
**Scope:** Evolve the right-hand teacher/parent area in `index.html` into a post-session behavior insight dashboard that prioritizes recommendations first, then the evidence behind them.

## Goal

The dashboard should help a teacher or parent understand how a student is improving by reading behavior patterns from a completed session.

The core question it should answer is:

- What does this behavior suggest?
- Why does it matter?
- What should we try next?

This is not a live-session monitoring view. It is a reflection and improvement view built from replayed behavior evidence.

## Non-Goals

- No live monitoring or real-time intervention tooling.
- No backend or persistence changes.
- No new anomaly detection algorithms.
- No multi-session comparison or cohort analytics.
- No redesign of the replay player beyond the data it exposes to the insight panel.

## Product Shape

Keep the existing split-screen structure:

- Left: student replay
- Right: insight dashboard

The left replay remains the source of truth. The right side becomes a behavior coach that interprets the session rather than merely labeling it.

## Right-Side Dashboard Structure

The insight panel should use a three-tier layout:

1. Recommended next steps
2. Supporting evidence
3. Compact behavior summary

### 1) Recommended Next Steps

The top of the panel should contain 3 prioritized recommendation cards.

Each recommendation card should include:

- a short action-oriented title
- a one-sentence explanation
- a small evidence count or confidence cue
- a teacher version and a parent version of the copy

Examples of recommendation themes:

- build debugging persistence
- slow down after a failed run
- reduce shortcut-heavy editing

The copy should feel instructional for teachers and supportive for parents, but both views should describe the same underlying behavior signal.

### 2) Supporting Evidence

Below the recommendation cards, the dashboard should show evidence cards that explain why the recommendation exists.

Each evidence card should include:

- the behavior signal name
- a short plain-language summary
- a session reference, such as frame, event, or timestamp
- a visual cue for whether the signal is about progress, risk, or repeated struggle

Evidence should be readable without understanding the raw telemetry schema.

### 3) Compact Behavior Summary

At the bottom, the dashboard should show a compact summary of the session’s behavioral shape.

This can be represented as small chips or metric blocks for:

- debugging persistence
- speed versus thoughtfulness
- edit stability
- recovery after error

The summary is supportive context, not the main event.

## Teacher and Parent Modes

The same session data should drive both modes.

### Teacher Mode

Teacher mode should emphasize:

- precise behavior patterns
- intervention-ready language
- signals that help identify where instruction or coaching is needed

Tone should be direct, clear, and operational.

### Parent Mode

Parent mode should emphasize:

- growth and progress
- encouraging language
- understandable explanations of the same behavior patterns

Tone should be reassuring, practical, and easy to interpret.

### Mode Rules

- Switching between teacher and parent views must not change replay state.
- Switching modes must not change the underlying recommendation ranking.
- Only the wording, framing, and emphasis should change.

## Behavior Signals

The dashboard should prioritize three signal families.

### 1) Debugging Persistence and Recovery

This signal family covers how a student responds after a failed run or confusing result.

Examples:

- repeated failed attempts without a strategy change
- thoughtful follow-up edits after failure
- recovery after error without wiping all progress

### 2) Speed Versus Thoughtfulness

This signal family covers cadence and editing tempo.

Examples:

- rushed edits
- long pauses followed by large changes
- repeated rework in a short span

### 3) Code Quality Habits

This signal family covers editing patterns that suggest shortcuts or unstable structure.

Examples:

- paste shocks
- delete cascades
- repeated reset-and-retry cycles

These signals are enough for the prototype. Do not add extra categories unless they are clearly needed by the existing session data.

## Interaction Rules

The dashboard should support lightweight exploration.

- Hovering a recommendation or evidence card previews the related code region on the left.
- Hovering should not move the playhead.
- Hovering should not scrub the timeline.
- Hovering should not change tabs or create persistent state.
- Clicking is optional for now; hover preview is the only required interaction.

The replay pane remains visually authoritative during hover conflict.

## Responsive Behavior

The desktop split-screen layout remains the primary experience.

On narrower screens:

- keep the replay first
- place the insight dashboard below it if needed
- preserve readable text and card spacing
- avoid compressing the replay code until it becomes hard to read

## Empty and Error States

### Empty State

If a session has no insight data, show a short empty state in the dashboard rather than hiding the panel.

### Error State

If session data is missing or malformed, show a compact error message in the replay area and disable the insight dashboard content.

### Missing Evidence

If a recommendation cannot map to an exact code region, preview the nearest meaningful region instead of doing nothing.

## Data Model Expectations

The current prototype can continue using in-memory session data, but the UI should expect the following concepts:

- session replay frames
- teacher insight items
- parent insight items
- evidence references that point back to a frame, line, or event

The dashboard should not depend on a full analytics backend.

## Testing

Confirm the following behaviors:

- the recommendation cards render before the supporting evidence
- teacher and parent views show different wording for the same behavior signal
- switching modes does not change playback position
- hovering insight cards previews the related code region only
- hover out clears the preview cleanly
- narrow widths preserve readable replay and dashboard content
- empty and error states remain understandable

## Acceptance Criteria

This revision is complete when:

- the right side reads as a post-session insight dashboard rather than a simple tab rail
- recommendations are the first thing users see
- evidence and summary content support the recommendation, not the other way around
- teacher and parent versions share the same data but differ in tone and emphasis
- the replay remains the source of truth and is unaffected by mode switching
