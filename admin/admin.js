// Admin page for sub00k.com — daily/monthly visitor counts (Abacus counter).
// Standalone HTML, zero build step. Deployed to /admin/index.html on GitHub Pages.
// Access is gated by a passphrase (kept out of the repo via prompt at build/deploy time
// is overkill for this scale — instead the page asks GitHub Actions to inject the hash).

const ABACUS_BASE = 'https://abacus.jasoncameron.dev';
const NS = 'sub00k'; // counter namespace

const el = (id) => document.getElementById(id);

async function abacus(path) {
  const r = await fetch(ABACUS_BASE + path);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function loadStats() {
  const out = {};
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const keys = {
    total: `${NS}/total`,
    today: `${NS}/d-${y}${m}${d}`,
    month: `${NS}/m-${y}${m}`,
  };
  for (const [k, key] of Object.entries(keys)) {
    try {
      const j = await abacus(`/get/${key}`);
      out[k] = j.value ?? 0;
    } catch {
      out[k] = 0; // counter not created yet = zero visits
    }
  }
  return out;
}

function render(stats) {
  el('total').textContent = stats.total.toLocaleString('ko-KR');
  el('today').textContent = stats.today.toLocaleString('ko-KR');
  el('month').textContent = stats.month.toLocaleString('ko-KR');
  el('updated').textContent = new Date().toLocaleTimeString('ko-KR');
  el('cards').classList.remove('opacity-40');
}

async function refresh() {
  try {
    render(await loadStats());
  } catch (e) {
    el('error').textContent = '불러오기 실패: ' + e.message;
  }
}

el('refresh').addEventListener('click', refresh);
refresh();
setInterval(refresh, 60_000); // auto refresh each minute
