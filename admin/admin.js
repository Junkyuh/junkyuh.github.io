

const HASH = '04db848e5cb0b0abdf9bd411c0dc207782d49617002a476dac6b0378c2105761';
import { loadSnapshot, displayCount, summarize, makeCsv } from './stats.js?v=2';
const ABACUS_BASE = 'https://abacus.jasoncameron.dev';

const el = (id) => document.getElementById(id);
let NS = null;
let activeRequest = null;
let snapshot = null;
let nextRefresh = 0;
let loginPending = false;
let cooldownTimer = null;

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login() {
  if (loginPending) return;
  const pw = el('pw').value.trim();
  if (!pw) return;
  loginPending = true;
  el('login-btn').disabled = true;
  el('login-error').textContent = '';
  try {
    const h = await sha256(pw);
    el('pw').value = '';
    if (h !== HASH) {
      el('login-error').textContent = '암호가 틀렸습니다. 다시 입력해 주세요.';
      el('pw').focus();
      return;
    }
    unlock();
  } catch {
    el('login-error').textContent = '암호 확인을 실행할 수 없습니다. HTTPS 주소에서 다시 열어 주세요.';
  } finally {
    el('pw').value = '';
    loginPending = false;
    el('login-btn').disabled = false;
  }
}

function unlock() {

  NS = atob('c3ViMDBrLXMyYWszcA==');
  el('gate').hidden = true;
  el('dash').hidden = false;
  el('dashboard-title').focus();
  refresh();
  if (Date.now() < nextRefresh) setTimeout(() => { if (NS && !snapshot) refresh(); }, nextRefresh - Date.now() + 30);
}

function clearView() {
  snapshot = null;
  for (const id of ['today', 'yesterday', 'month', 'total']) el(id).textContent = '—';
  el('chart').replaceChildren();
  el('daily-rows').replaceChildren();
  el('download').disabled = true;
  el('insight').textContent = '방문 기록을 불러오는 중입니다.';
  el('range').textContent = '오늘을 포함한 일별 방문 횟수';
  el('updated').textContent = '아직 조회하지 않았습니다.';
  el('yesterday-note').textContent = '하루 전체 기록';
  el('month-note').textContent = '월초부터 현재까지';
}

function lock() {
  NS = null;
  if (activeRequest) nextRefresh = Date.now() + 15_000;
  activeRequest?.abort();
  activeRequest = null;
  clearTimeout(cooldownTimer);
  clearView();
  el('cards').setAttribute('aria-busy', 'false');
  el('auto').checked = false;
  el('error').textContent = '';
  el('dash').hidden = true;
  el('gate').hidden = false;
  el('pw').value = '';
  el('pw').focus();
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function render(s) {
  for (const [id, item] of Object.entries({ today: s.days.at(-1), yesterday: s.days.at(-2), month: s.month, total: s.total })) el(id).textContent = displayCount(item);
  el('yesterday-note').textContent = `${s.days.at(-2).date} 하루 전체 기록`;
  el('month-note').textContent = `${s.days.at(-1).date.slice(0, 7)} 월초부터 현재까지`;
  el('range').textContent = `${s.days[0].date} ~ ${s.days.at(-1).date} · 한국 시간 조회`;
  el('insight').textContent = summarize(s.days);
  const maximum = Math.max(1, ...s.days.filter(d => d.state === 'ok').map(d => d.value));
  const bars = [], rows = [];
  s.days.forEach((d, i) => {
    const column = node('div', undefined, `bar-column${d.state === 'ok' ? '' : ' unavailable'}`);
    const track = node('div', undefined, 'bar-track');
    const bar = node('div', undefined, 'bar');
    bar.style.height = `${d.state === 'ok' ? d.value / maximum * 100 : 0}%`;
    track.append(bar);
    column.append(node('div', displayCount(d), 'bar-number'), track, node('div', i === 6 ? '오늘' : d.date.slice(5).replace('-', '/')));
    bars.push(column);
    const row = node('tr');
    row.append(node('td', d.date), node('td', displayCount(d)), node('td', d.state === 'ok' ? i === 6 ? '집계 중' : '확인됨' : d.state === 'missing' ? '저장 기록 없음' : '다시 조회 필요'));
    rows.push(row);
  });
  el('chart').replaceChildren(...bars);
  el('daily-rows').replaceChildren(...rows);
  const all = [...s.days, s.month, s.total];
  const errors = all.filter(d => d.state === 'error').length;
  const missing = all.filter(d => d.state === 'missing').length;
  el('status').textContent = errors ? errors === all.length ? '방문 기록을 조회하지 못했습니다.' : '일부 기록을 조회하지 못했습니다.' : missing ? '조회 완료 · 저장되지 않은 기록이 있습니다.' : '방문 기록을 확인했습니다.';
  el('error').textContent = errors ? '조회 실패는 0회가 아닙니다. 잠시 후 새로고침해 주세요. 통신 상태나 집계 서비스의 일시적인 제한일 수 있습니다.' : '';
  el('updated').textContent = `마지막 조회 시도: ${s.checkedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간)`;
  el('download').disabled = !all.some(d => d.state === 'ok');
}

async function refresh() {
  if (!NS || activeRequest) return;
  if (Date.now() < nextRefresh) {
    el('status').textContent = '연속 조회를 잠시 쉬고 있습니다. 잠시 후 다시 눌러 주세요.';
    scheduleRefreshButton();
    return;
  }
  const controller = new AbortController();
  activeRequest = controller;
  clearView();
  el('error').textContent = '';
  el('status').textContent = '최근 방문 기록을 불러오는 중입니다…';
  el('refresh').disabled = true;
  el('refresh').textContent = '조회 중…';
  el('cards').setAttribute('aria-busy', 'true');
  try {
    const result = await loadSnapshot(ABACUS_BASE, NS, controller.signal);
    if (!result || activeRequest !== controller || !NS) return;
    snapshot = result;
    render(result);
  } catch {
    if (activeRequest === controller && NS) {
      el('status').textContent = '방문 기록을 조회하지 못했습니다.';
      el('insight').textContent = '잠시 후 다시 조회해 주세요.';
      el('error').textContent = '조회에 실패했습니다. 새로고침으로 다시 시도할 수 있습니다.';
    }
  } finally {
    if (activeRequest === controller) {
      activeRequest = null;
      nextRefresh = Date.now() + 15_000;
      el('cards').setAttribute('aria-busy', 'false');
      scheduleRefreshButton();
    }
  }
}

function scheduleRefreshButton() {
  clearTimeout(cooldownTimer);
  const delay = Math.max(0, nextRefresh - Date.now());
  el('refresh').disabled = delay > 0;
  el('refresh').textContent = delay > 0 ? '잠시 후 새로고침' : '새로고침';
  if (delay > 0) cooldownTimer = setTimeout(scheduleRefreshButton, delay + 20);
}

el('login-form').addEventListener('submit', e => { e.preventDefault(); login(); });
el('refresh').addEventListener('click', refresh);
el('lock').addEventListener('click', lock);
el('download').addEventListener('click', () => {
  if (!NS || !snapshot) return;
  const url = URL.createObjectURL(new Blob([makeCsv(snapshot)], { type: 'text/csv;charset=utf-8' }));
  const link = node('a');
  link.href = url;
  link.download = `subook-visits-${snapshot.days[0].date}-${snapshot.days.at(-1).date}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
setInterval(() => { if (NS && el('auto').checked && !document.hidden) refresh(); }, 300_000);
window.addEventListener('pagehide', lock);

// Clear passwords retained by older versions. Require a fresh entry on reload.
try { sessionStorage.removeItem('sub00k-admin'); } catch { /* Storage may be disabled. */ }
