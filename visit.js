// Visitor counting for sub00k.com — Abacus free counter API.
// Uses a non-guessable namespace. Counts one visit per page load.
// Admin page reads the same namespace after passphrase login.

const ABACUS_BASE = 'https://abacus.jasoncameron.dev';
// base64 of the real namespace — trivially obfuscated so it's not greppable,
// and the admin dashboard uses the same value only after login.
const NS = atob('c3ViMDBrLXMyYWszcA=='); // sub00k-s2ak3p

if (!location.pathname.match(/admin/)) {
  const bot = /bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent);
  if (!bot && navigator.userAgent !== '') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hit = (key) => {
      try { fetch(`${ABACUS_BASE}/hit/${NS}/${key}`, { mode: 'cors', keepalive: true }).catch(() => {}); }
      catch {}
    };
    hit('total');
    hit(`d-${y}${m}${d}`);
    hit(`m-${y}${m}`);
  }
}
