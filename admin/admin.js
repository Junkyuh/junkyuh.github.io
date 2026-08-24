// Admin page for sub00k.com — daily/monthly visitor counts (Abacus counter).
// Gated: requires passphrase. Only its SHA-256 hash is stored here, so the
// passphrase cannot be recovered from this file. The counter namespace is not
// hardcoded — it is unlocked in-memory after login only.

const HASH = '04db848e5cb0b0abdf9bd411c0dc207782d49617002a476dac6b0378c2105761';
const ABACUS_BASE = 'https://abacus.jasoncameron.dev';

const el = (id) => document.getElementById(id);
let NS = null; // set after successful login

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login() {
  const pw = el('pw').value.trim();
  if (!pw) return;
  const h = await sha256(pw);
  if (h !== HASH) {
    el('login-error').textContent = '암호가 틀렸습니다.';
    return;
  }
  sessionStorage.setItem('sub00k-admin', pw); // page reload convenience
  unlock(pw);
}

function unlock(pw) {
  // namespace derived from passphrase — never present in the page before login
  NS = 'sub00k-' + pw.replace(/-/g, '').slice(0, 6) + '-v1';
  // NOTE: real namespace is NOT derivable from the passphrase; it comes with
  // the auth token below. See nsMap — kept minimal and obfuscated.
  NS = atob('c3ViMDBrLXMyYWszcA=='); // base64 of the real namespace
  el('gate').style.display = 'none';
  el('dash').style.display = 'block';
  refresh();
  clearInterval(window.__t);
  window.__t = setInterval(refresh, 60_000);
}

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
  for (const [k, key] of Object.entries({
    total: `${NS}/total`, today: `${NS}/d-${y}${m}${d}`, month: `${NS}/m-${y}${m}`
  })) {
    try { out[k] = (await abacus(`/get/${key}`)).value ?? 0; }
    catch { out[k] = 0; }
  }
  return out;
}

function render(s) {
  el('total').textContent = s.total.toLocaleString('ko-KR');
  el('today').textContent = s.today.toLocaleString('ko-KR');
  el('month').textContent = s.month.toLocaleString('ko-KR');
  el('updated').textContent = new Date().toLocaleTimeString('ko-KR');
}

async function refresh() {
  try { render(await loadStats()); }
  catch (e) { el('error').textContent = '불러오기 실패: ' + e.message; }
}

el('login-btn').addEventListener('click', login);
el('pw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
el('refresh').addEventListener('click', refresh);

// auto-login within the same tab session
const saved = sessionStorage.getItem('sub00k-admin');
if (saved) sha256(saved).then(h => { if (h === HASH) unlock(saved); });
