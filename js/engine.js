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
