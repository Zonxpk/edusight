# CognitiveReplay Split-Screen Layout Design

**Date:** 2026-06-30  
**Scope:** Revise the prototype layout so the student replay is always on the left, while teacher and parent guidance live in a tabbed panel on the right.

## Goal

Make the replay the primary surface and the teacher/parent insights a secondary interpretation layer. The left side should feel like a live replay workspace with timeline controls and event markers. The right side should switch between teacher and parent views without disturbing playback.

## Non-Goals

- No new anomaly detection logic.
- No click-to-jump interactions from suggestion cards.
- No multi-session comparison.
- No backend or data model changes.
- No mobile-specific redesign beyond basic responsive fallback.

## Layout Decision

Use a single desktop-first split screen:

- Left pane: student replay
- Right pane: tabbed insight rail

The split should stay fixed in structure. The right rail changes content through tabs, but the replay stays visible at all times.

### Recommended Proportions

- Default: roughly 50/50
- If the replay needs more breathing room, bias slightly left to 55/45

Avoid making the right side so wide that the replay stops feeling dominant.

## Left Pane: Student Replay

The left pane is the authoritative source of replay state.

### Required content

- Playback controls: play/pause
- Timeline scrubber
- Event markers
- Code viewport

### Behavior

- Scrubbing the timeline updates the visible code state.
- Playback advances the current playhead.
- Event markers indicate notable moments in the session.
- Hovering a marker may preview the related state, but it must not rewrite the session or open a new view.

### Visual priority

The code viewport should remain readable and uncluttered. Timeline markers belong on the timeline rather than embedded heavily inside the code area.

## Right Pane: Tabbed Insight Rail

The right pane contains two tabs:

- Teacher
- Parent

Only one tab is visible at a time.

### Teacher Tab

The Teacher tab shows:

- anomaly cards
- severity or urgency labels
- short intervention language

### Parent Tab

The Parent tab shows:

- mastery or progress badges
- supportive explanations
- growth-oriented summaries

### Tab rules

- Switching tabs must not change the left playhead.
- Switching tabs must not reset replay progress.
- Tabs are for interpretation, not navigation.

## Hover Preview Behavior

Hovering a teacher or parent suggestion should preview the related code region on the left.

### Hover rules

- Highlight only
- No playhead jump
- No timeline scrub
- No tab change
- No permanent state change

### Highlight rules

- The preview should be obvious but temporary.
- If the hovered suggestion maps to the current replay frame, keep the highlight lighter rather than duplicating the active state.
- If the suggestion does not map to an exact frame, highlight the nearest meaningful code region instead of doing nothing.
- If multiple suggestions point to the same region, merge them into one visible preview state.

## Responsive Behavior

The layout is desktop-first.

### Wide screens

- Show the split screen in one row
- Keep the replay dominant

### Narrow screens

- Collapse the right rail below the replay if needed
- Preserve reading order: replay first, insights second
- Do not squeeze the code until it becomes unreadable

## Error Handling

- If session data is missing or malformed, show a compact error state in the replay pane and disable the right rail.
- If a suggestion has no exact code target, fall back to the nearest replay frame.
- If hover and playback conflict, playback remains visually authoritative and hover becomes a softer overlay.
- If a tab has no content for the current session, show an empty state rather than hiding the tab.

## Testing

Confirm the following behaviors:

- Left pane replay still works after switching tabs.
- Timeline scrubbing updates the code viewport correctly.
- Hovering a teacher or parent suggestion highlights the left code region without moving playback.
- Hover out clears the preview cleanly.
- Tabs switch without losing the current playback position.
- Narrow widths keep the replay readable and the overall order sensible.

## Acceptance Criteria

This revision is complete when:

- the left side consistently presents the student replay
- the right side is tabbed between teacher and parent views
- hover on suggestion cards previews the related code region only
- hover does not scrub or jump playback
- the layout remains understandable at desktop widths and degrades cleanly on smaller widths

