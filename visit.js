// Visitor counting for sub00k.com — Abacus free counter API.
// Counts one visit per page load (per namespace key). Daily/monthly keys roll
// automatically by date, so no backend is needed.

const ABACUS_BASE = 'https://abacus.jasoncameron.dev';
const NS = 'sub00k';

// Skip counting for admin page and bots/prefetch
if (!location.pathname.startsWith('/admin')) {
  const bot = /bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent);
  const prefetch = navigator.userAgent === ''; // some prefetchers send empty UA
  if (!bot && !prefetch) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    // fire-and-forget; failures are silent (counting must never break the site)
    const hit = (key) => {
      try {
        fetch(`${ABACUS_BASE}/hit/${key}`, { mode: 'cors', keepalive: true })
          .catch(() => {});
      } catch {}
    };
    hit(`${NS}/total`);
    hit(`${NS}/d-${y}${m}${d}`);
    hit(`${NS}/m-${y}${m}`);
  }
}
