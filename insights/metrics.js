// Only fixed, anonymous aggregate categories are sent to the counter service.
export const METRICS = [
  ['entry', '행동 집계가 시작된 방문', 'base'],
  ['booking-open', '예약 선택창 열기', 'click'],
  ['naver', '네이버 예약으로 이동', 'click'],
  ['airbnb', '에어비앤비로 이동', 'click'],
  ['liveanywhere', '한 달 살기 예약으로 이동', 'click'],
  ['photo', '사진 확대·더 보기', 'click'],
  ['map', '주변 장소 지도 열기', 'click'],
  ['instagram', '숙소 인스타그램 열기', 'click'],
  ['view-spaces', '공간', 'section'],
  ['view-information', '이용 정보', 'section'],
  ['view-gallery', '사진', 'section'],
  ['view-nearby', '주변 장소', 'section'],
  ['view-booking', '예약 안내', 'section'],
  ['active-30', '30초 이상', 'time'],
  ['active-60', '1분 이상', 'time'],
  ['active-180', '3분 이상', 'time'],
  ['active-300', '5분 이상', 'time'],
  ['from-naver', '네이버', 'source'],
  ['from-google', '구글', 'source'],
  ['from-instagram', '인스타그램', 'source'],
  ['from-direct', '직접 방문·경로 확인 불가', 'source'],
  ['from-other', '기타 외부 사이트', 'source'],
];
export const METRIC_IDS = new Set(METRICS.map(([id]) => id));
export const TIME_STEPS = [30, 60, 180, 300];
export function koreaDate(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function metricKey(date, id) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !METRIC_IDS.has(id)) throw new Error('Unsupported metric');
  return `b1-${date.replaceAll('-', '')}-${id}`;
}
export function sourceCategory(referrer) {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const matches = domain => host === domain || host.endsWith(`.${domain}`);
    if (matches('sub00k.com')) return 'direct';
    if (matches('naver.com')) return 'naver';
    if (matches('google.com') || matches('google.co.kr')) return 'google';
    if (matches('instagram.com')) return 'instagram';
    return 'other';
  } catch { return 'direct'; }
}
export function activeDelta(previous, now, eligible, lastInteraction) {
  if (!eligible) return 0;
  // Do not fill in suspended timers or count prolonged inactivity as engagement.
  return Math.max(0, Math.min(now - previous, 1500, lastInteraction + 60_000 - previous));
}
export function knownRate(numerator, denominator) {
  if (numerator?.state !== 'ok' || denominator?.state !== 'ok' || denominator.value <= 0 || numerator.value > denominator.value) return null;
  return Math.round(numerator.value / denominator.value * 100);
}
