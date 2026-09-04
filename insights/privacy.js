const choice = document.getElementById('privacy-exclude');
const message = document.getElementById('privacy-status');
try { choice.checked = localStorage.getItem('subook-insights-exclude') === '1'; } catch { message.textContent = '이 브라우저에서는 설정을 저장할 수 없습니다.'; }
choice.addEventListener('change', () => {
  try { localStorage.setItem('subook-insights-exclude', choice.checked ? '1' : '0'); message.textContent = choice.checked ? '새 행동 통계에서 제외하도록 저장했습니다.' : '새 행동 통계를 허용하도록 저장했습니다.'; }
  catch { choice.checked = false; message.textContent = '설정을 저장하지 못했습니다.'; }
});
