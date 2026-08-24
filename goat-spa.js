// GoatCounter SPA route tracking for sub00k.com.
// The site is a React SPA: history.pushState changes don't trigger count.js
// automatically, so we hook pushState/replaceState/popstate and re-count.

(function () {
  function count() {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: location.pathname + location.search });
    }
  }
  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    count();
  };
  var replace = history.replaceState;
  history.replaceState = function () {
    replace.apply(this, arguments);
    // replaceState fires on initial load in some setups; guard duplicates
    if (!window.__gcInit) { window.__gcInit = true; return; }
    count();
  };
  window.addEventListener('popstate', count);
})();
