import { METRIC_IDS, TIME_STEPS, koreaDate, metricKey, sourceCategory, activeDelta } from './metrics.js?v=1';

export function startInsights(w = window, d = document) {
  if (!['sub00k.com', 'www.sub00k.com'].includes(w.location.hostname) || w.location.pathname !== '/' || /bot|crawl|spider|slurp|headless/i.test(w.navigator.userAgent) || w.navigator.globalPrivacyControl || w.navigator.doNotTrack === '1') return null;
  try { if (w.localStorage.getItem('subook-insights-exclude') === '1') return null; } catch { /* Device preferences may be unavailable. */ }
  const namespace = atob('c3ViMDBrLXMyYWszcA==');
  const storageKey = 'subook-insights-v1';
  const nowDate = () => koreaDate(new Date());
  let state;
  const fresh = () => ({ date: nowDate(), sent: [], activeMs: 0, source: sourceCategory(d.referrer) });
  try {
    const stored = JSON.parse(w.sessionStorage.getItem(storageKey));
    state = stored?.date === nowDate() && Array.isArray(stored.sent) && Number.isFinite(stored.activeMs) && stored.activeMs >= 0 && ['naver', 'google', 'instagram', 'direct', 'other'].includes(stored.source) ? { ...stored, sent: stored.sent.filter(id => METRIC_IDS.has(id)), activeMs: Math.min(stored.activeMs, 300_000) } : fresh();
  } catch { state = fresh(); }
  const save = () => { try { w.sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* In-memory deduplication still works. */ } };
  const queue = [];
  let sending = false;
  let stopped = false;
  let nextSend = 0;
  const drain = () => {
    if (sending || !queue.length || stopped) return;
    const delay = nextSend - Date.now();
    if (delay > 0) { w.setTimeout(drain, delay); return; }
    const key = queue.shift();
    sending = true;
    nextSend = Date.now() + 700;
    const controller = new AbortController();
    const timer = w.setTimeout(() => controller.abort(), 5000);
    // Fixed categories only; no URLs, input content, identifiers or referrer headers.
    // No automatic retry: an uncertain response may already have incremented.
    Promise.resolve().then(() => w.fetch(`https://abacus.jasoncameron.dev/hit/${namespace}/${key}`, { mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true, signal: controller.signal })).catch(() => {}).finally(() => {
      w.clearTimeout(timer); sending = false; drain();
    });
  };
  const emit = id => {
    if (!METRIC_IDS.has(id) || stopped) return;
    if (state.date !== nowDate()) { state = fresh(); syncSections(true); emit('entry'); emit(`from-${state.source}`); }
    if (state.sent.includes(id)) return;
    state.sent.push(id); save();
    queue.push(metricKey(state.date, id)); drain();
  };
  const begin = () => { emit('entry'); emit(`from-${state.source}`); };
  let previous = w.performance.now();
  let interaction = previous;
  let foreground = !d.hidden && d.hasFocus();
  let suspended = false;
  // Intersection callbacks need not repeat when focus or the Korean date changes.
  const visibleSections = new Set();
  const sectionTimers = new Map();
  const cancelSections = () => { sectionTimers.forEach(timer => w.clearTimeout(timer)); sectionTimers.clear(); };
  const syncSections = (reset = false) => {
    if (reset || stopped || d.hidden || suspended || !d.hasFocus()) cancelSections();
    if (stopped || d.hidden || suspended || !d.hasFocus()) return;
    visibleSections.forEach(id => {
      if (sectionTimers.has(id) || state.sent.includes(`view-${id}`)) return;
      const date = state.date;
      sectionTimers.set(id, w.setTimeout(() => {
        sectionTimers.delete(id);
        // A dwell started yesterday cannot qualify today's view.
        if (date !== nowDate()) { tick(); return; }
        if (!stopped && !d.hidden && !suspended && d.hasFocus()) emit(`view-${id}`);
      }, 1000));
    });
  };
  let ticks = 0;
  const tick = () => {
    const now = w.performance.now();
    if (state.date !== nowDate()) { state = fresh(); previous = now; syncSections(true); if (!d.hidden) begin(); }
    const eligible = foreground && !suspended;
    state.activeMs = Math.min(300_000, state.activeMs + activeDelta(previous, now, eligible, interaction));
    previous = now;
    if (eligible) TIME_STEPS.forEach(seconds => { if (state.activeMs >= seconds * 1000) emit(`active-${seconds}`); });
    if (++ticks % 5 === 0) save();
  };
  const interact = () => { tick(); interaction = w.performance.now(); };
  const visibility = () => {
    tick(); foreground = !d.hidden && d.hasFocus(); previous = w.performance.now();
    if (foreground) { interaction = previous; begin(); }
    syncSections();
    save();
  };
  const click = event => {
    if (!event.isTrusted) return;
    const target = event.target.closest?.('[data-insight]');
    if (target) emit(target.dataset.insight);
  };
  const observer = typeof w.IntersectionObserver === 'function' ? new w.IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.id;
      w.clearTimeout(sectionTimers.get(id)); sectionTimers.delete(id);
      if (entry.isIntersecting && entry.intersectionRect.height >= Math.min(100, entry.boundingClientRect.height / 2)) {
        visibleSections.add(id);
      } else visibleSections.delete(id);
    });
    syncSections();
  }, { threshold: [0, 0.05, 0.1, 0.25, 0.5, 1] }) : null;
  ['spaces', 'information', 'gallery', 'nearby', 'booking'].forEach(id => { const el = d.getElementById(id); if (el) observer?.observe(el); });
  d.addEventListener('click', click, true);
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(name => d.addEventListener(name, interact, { passive: true }));
  d.addEventListener('visibilitychange', visibility);
  w.addEventListener('focus', visibility); w.addEventListener('blur', visibility);
  w.addEventListener('pagehide', () => { tick(); suspended = true; cancelSections(); save(); });
  w.addEventListener('pageshow', () => { suspended = false; previous = w.performance.now(); visibility(); });
  w.addEventListener('storage', event => { if (event.key === 'subook-insights-exclude' && event.newValue === '1') { stopped = true; queue.length = 0; cancelSections(); visibleSections.clear(); observer?.disconnect(); } });
  if (!d.hidden) begin();
  const interval = w.setInterval(tick, 1000);
  return { stop() { stopped = true; queue.length = 0; cancelSections(); visibleSections.clear(); observer?.disconnect(); w.clearInterval(interval); save(); } };
}

if (typeof window !== 'undefined') startInsights();
