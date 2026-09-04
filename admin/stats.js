export function dateKeys(now = new Date(), count = 7) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => parts.find(p => p.type === type).value;
  const day = new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(day.getTime() - (count - 1 - i) * 86400000).toISOString().slice(0, 10);
    return { date, key: `d-${date.replaceAll('-', '')}` };
  });
}
export async function readCounter(base, namespace, key, signal, fetcher = fetch, timeout = 8000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetcher(`${base}/get/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`, { signal: controller.signal, cache: 'no-store' });
    const data = await response.json();
    if (response.status === 404 && data.error === 'Key not found') return { state: 'missing', value: null };
    if (!response.ok || !Number.isSafeInteger(data.value) || data.value < 0) throw new Error('Invalid counter response');
    return { state: 'ok', value: data.value };
  } catch { return { state: 'error', value: null }; }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export async function loadSnapshot(base, namespace, signal, now = new Date(), fetcher = fetch) {
  const days = dateKeys(now);
  const monthKey = `m-${days.at(-1).date.slice(0, 7).replace('-', '')}`;
  const keys = [...days.map(d => d.key), monthKey, 'total'];
  const results = {};
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < keys.length && !signal?.aborted) {
      const key = keys[cursor++];
      results[key] = await readCounter(base, namespace, key, signal, fetcher);
    }
  }));
  if (signal?.aborted) return null;
  return { days: days.map(d => ({ ...d, ...results[d.key] })), month: results[monthKey], total: results.total, checkedAt: new Date() };
}
export function displayCount(item) {
  return item.state === 'ok' ? `${item.value.toLocaleString('ko-KR')}회` : item.state === 'missing' ? '기록 없음' : '조회 실패';
}
export function summarize(days) {
  const known = days.filter(d => d.state === 'ok');
  if (!known.length) return '아직 비교할 수 있는 방문 기록이 없습니다. 기록 없음과 조회 실패는 0회가 아닙니다.';
  const total = known.reduce((sum, d) => sum + d.value, 0);
  const prefix = known.length === days.length ? '최근 7일 합계' : `확인된 ${known.length}일의 부분 합계`;
  return `${prefix} ${total.toLocaleString('ko-KR')}회 · 오늘은 집계 중입니다. 광고나 검색의 효과를 단정하는 숫자는 아닙니다.`;
}
export function makeCsv(snapshot) {
  const rows = [['날짜(한국 시간 조회)', '방문 횟수(예약 아님)', '조회 상태', '비고'], ...snapshot.days.map(d => [d.date, d.state === 'ok' ? d.value : '', d.state === 'ok' ? '확인됨' : d.state === 'missing' ? '기록 없음' : '조회 실패', d === snapshot.days.at(-1) ? '집계 중' : ''])];
  return '\uFEFF' + rows.map(row => row.join(',')).join('\r\n');
}
