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
