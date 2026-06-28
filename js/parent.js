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
