(function () {
  'use strict';

  // Re-run page-specific inline scripts from the fetched document,
  // skipping the TOTW player script (already running on this page).
  function runPageScripts(doc) {
    doc.querySelectorAll('body script, main script').forEach(function (s) {
      if (s.id === 'totw-player-init') return;
      if (s.textContent.indexOf("getElementById('totw-audio')") !== -1) return;
      if (s.textContent.indexOf('getElementById("totw-audio")') !== -1) return;
      var ns = document.createElement('script');
      ns.textContent = s.textContent;
      document.body.appendChild(ns);
      document.body.removeChild(ns);
    });
  }

  function navigate(url, push) {
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        // Only pjax to clean pages — those with our <audio id="totw-audio"> in the HTML.
        // Wix / music pages create audio via JS so getElementById returns null here.
        if (!doc.getElementById('totw-audio')) {
          window.location.href = url;
          return;
        }

        var newMain = doc.querySelector('main');
        var curMain = document.querySelector('main');
        if (!newMain || !curMain) { window.location.href = url; return; }

        curMain.innerHTML = newMain.innerHTML;
        document.title = doc.title;
        window.scrollTo(0, 0);

        if (push) history.pushState({ url: url }, '', url);

        runPageScripts(doc);
      })
      .catch(function () { window.location.href = url; });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    if (a.target === '_blank') return;
    var href = a.getAttribute('href');
    if (!href) return;
    // Skip non-navigating links
    if (/^(javascript:|mailto:|tel:|#)/.test(href)) return;
    // Skip external links
    if (/^https?:/.test(href) && href.indexOf('emmettsutherland.com') === -1) return;
    e.preventDefault();
    navigate(href, true);
  });

  window.addEventListener('popstate', function () {
    navigate(window.location.href, false);
  });
}());
