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
