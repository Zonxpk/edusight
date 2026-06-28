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
