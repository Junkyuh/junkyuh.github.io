import { METRICS, metricKey, koreaDate, knownRate } from '../insights/metrics.js?v=1';
import { readCounter } from './stats.js?v=2';

export function createBehaviorPanel(getNamespace) {
  const el = id => document.getElementById(id);
  let request = null, data = null, nextLoad = 0;
  const text = item => item?.state === 'ok' ? `${item.value.toLocaleString('ko-KR')}회` : item?.state === 'missing' ? '기록 없음' : '조회 실패';
  const element = (tag, value) => { const n = document.createElement(tag); if (value !== undefined) n.textContent = value; return n; };
  const reset = () => {
    request?.abort(); request = null; data = null;
    el('behavior-export').disabled = true;
    el('behavior-body').replaceChildren();
    el('behavior-summary').textContent = '새 행동 기록은 2026년 9월 4일 적용 이후부터 쌓입니다.';
    el('behavior-status').textContent = '날짜를 고르고 행동 통계를 확인하세요.';
    el('behavior-load').disabled = false;
    el('behavior-date').disabled = false;
  };
  function render(values, date) {
    const base = values.entry;
    el('behavior-summary').textContent = base.state === 'ok' ? `행동 집계가 시작된 방문 ${text(base)} · 버튼·구간마다 같은 탭의 하루 중복은 한 번만 셉니다.` : '행동 집계 기준 방문을 확인할 수 없습니다. 기존 방문 횟수와 별도 집계이며, 기록 없음은 0회가 아닙니다.';
    const groups = [['click', '어디를 많이 눌렀나요?', '여러 번 누른 횟수가 아니라, 한 번 이상 누른 방문입니다. 예약 사이트 이동은 예약 완료가 아닙니다.'], ['time', '얼마나 오래 봤나요?', '화면이 보이고 활성화된 시간을 합산합니다. 60초 넘게 조작이 없으면 일시 정지하며, 5분 이상에는 3분·1분도 포함됩니다.'], ['section', '어떤 내용을 봤나요?', '각 구간이 화면에 1초 이상 나타난 방문입니다. 내용을 모두 읽었다는 뜻은 아닙니다.'], ['source', '어디에서 들어왔나요?', '알려진 사이트 종류만 분류합니다. 검색어·전체 주소는 저장하지 않으며, 앱에서 온 방문은 확인되지 않을 수 있습니다.']];
    const cards = groups.map(([group, title, note]) => {
      const card = element('article'); card.className = 'behavior-card';
      const heading = element('h3', title);
      const table = element('table');
      const caption = element('caption', `${date} · ${note}`); caption.className = 'small muted';
      const head = element('thead'), tr = element('tr');
      ['항목', '방문', '비율'].forEach(label => { const th = element('th', label); th.scope = 'col'; tr.append(th); }); head.append(tr);
      const body = element('tbody');
      let items = METRICS.filter(([, , category]) => category === group);
      if (group === 'click') items = [...items].sort((a, b) => (values[b[0]].value ?? -1) - (values[a[0]].value ?? -1));
      for (const [id, label] of items) {
        const row = element('tr'); const rate = knownRate(values[id], base);
        row.append(element('td', label), element('td', text(values[id])), element('td', rate === null ? '—' : `${rate}%`)); body.append(row);
      }
      table.append(caption, head, body); card.append(heading, table); return card;
    });
    el('behavior-body').replaceChildren(...cards);
    const errors = Object.values(values).filter(v => v.state === 'error').length;
    el('behavior-status').textContent = `${date} 조회 ${errors ? `· ${errors}개 항목 실패, 다시 조회해 주세요.` : '완료'} · ${new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })} 한국 시간`;
    el('behavior-export').disabled = !Object.values(values).some(v => v.state === 'ok');
  }
  async function load() {
    const namespace = getNamespace();
    if (!namespace || request) return;
    if (Date.now() < nextLoad) { el('behavior-status').textContent = '연속 조회를 잠시 쉬고 있습니다. 약 15초 뒤 다시 눌러 주세요.'; return; }
    const date = el('behavior-date').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2026-09-04' || date > koreaDate()) { el('behavior-status').textContent = '2026년 9월 4일부터 오늘 사이의 날짜를 선택해 주세요.'; return; }
    const controller = new AbortController(); request = controller; data = null;
    el('behavior-load').disabled = true; el('behavior-date').disabled = true; el('behavior-export').disabled = true;
    el('behavior-body').replaceChildren(); el('behavior-summary').textContent = '기록을 천천히 확인하고 있습니다. 약 15~30초 걸릴 수 있습니다.';
    const values = {};
    try {
      for (const [id] of METRICS) {
        if (controller.signal.aborted) return;
        el('behavior-status').textContent = `행동 기록 확인 중 ${Object.keys(values).length + 1}/${METRICS.length}`;
        values[id] = await readCounter('https://abacus.jasoncameron.dev', namespace, metricKey(date, id), controller.signal);
        // Pace requests alongside the existing visitor summary (30 requests/10s service limit).
        await new Promise(resolve => {
          const done = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', done); resolve(); };
          const timer = setTimeout(done, 700);
          if (controller.signal.aborted) done(); else controller.signal.addEventListener('abort', done, { once: true });
        });
      }
      if (request !== controller || !getNamespace() || controller.signal.aborted) return;
      data = { date, values }; render(values, date);
    } catch {
      if (request === controller) { el('behavior-status').textContent = '행동 기록을 불러오지 못했습니다. 다시 시도해 주세요.'; el('behavior-summary').textContent = '실패한 조회를 0회로 표시하지 않습니다.'; }
    } finally {
      if (request === controller) { request = null; nextLoad = Date.now() + 15_000; el('behavior-load').disabled = false; el('behavior-date').disabled = false; }
    }
  }
  el('behavior-date').min = '2026-09-04'; el('behavior-date').max = koreaDate(); el('behavior-date').value = koreaDate();
  el('behavior-load').addEventListener('click', load);
  el('behavior-date').addEventListener('focus', () => { el('behavior-date').max = koreaDate(); });
  el('behavior-date').addEventListener('change', () => { data = null; el('behavior-export').disabled = true; el('behavior-body').replaceChildren(); el('behavior-summary').textContent = '선택한 날짜의 행동 통계 보기를 눌러 주세요.'; });
  el('behavior-export').addEventListener('click', () => {
    if (!data || !getNamespace()) return;
    const rows = [['날짜', '항목', '한 번 이상 행동한 방문', '상태'], ...METRICS.map(([id, label]) => [data.date, label, data.values[id].state === 'ok' ? data.values[id].value : '', data.values[id].state === 'ok' ? '확인됨' : text(data.values[id])])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = element('a'); link.href = url; link.download = `subook-interest-${data.date}.csv`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  try { el('exclude-owner').checked = localStorage.getItem('subook-insights-exclude') === '1'; } catch { /* Optional preference. */ }
  el('exclude-owner').addEventListener('change', () => {
    try { localStorage.setItem('subook-insights-exclude', el('exclude-owner').checked ? '1' : '0'); el('exclude-note').textContent = '이 브라우저의 새 행동 집계에 적용됩니다. 이미 열려 있는 홈페이지는 새로고침해 주세요. 기존 방문 횟수 집계는 그대로입니다.'; }
    catch { el('exclude-owner').checked = false; el('exclude-note').textContent = '브라우저가 설정 저장을 막고 있어 적용하지 못했습니다.'; }
  });
  return { reset, load };
}
