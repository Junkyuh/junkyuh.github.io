// GoatCounter analytics loader for sub00k.com.
// Privacy-friendly, cookieless; not blocked by Safari ITP / tracker lists.
// Dashboard: https://sub00k.goatcounter.com
(function () {
  var s = document.createElement('script');
  s.async = 1;
  s.setAttribute('data-goatcounter', 'https://sub00k.goatcounter.com/count');
  // SPA: count every client-side route change too
  s.setAttribute('data-goatcounter-settings',
    '{"allow_local":false,"no_onload":true}');
  s.src = '//gc.zgo.at/count.js';
  document.head.appendChild(s);
})();
