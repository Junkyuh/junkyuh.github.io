

const ABACUS_BASE = 'https://abacus.jasoncameron.dev';

const NS = atob('c3ViMDBrLXMyYWszcA==');

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
