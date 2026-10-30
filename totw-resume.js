/* Tune of the Week: keep playing across pages.
   Loaded in <head> on every page, before the page's own player script. It remembers the
   song, position and play state in sessionStorage, and on the next page resumes from the
   same spot. Works with both players: the <audio id="totw-audio"> on custom pages and the
   script-built `new Audio('/audio/…')` on the older Wix pages. Mix players (Wix-hosted
   audio) are left alone. */
(function () {
  var KEY = 'totw-state';
  var MAX_AGE = 30 * 60 * 1000; // ignore saved state older than 30 minutes

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function save(state) {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function isTotw(el) {
    var src = el.getAttribute('src') || el.src || '';
    return /\/audio\/[^/]+\.mp3/.test(src) && src.indexOf('wixstatic') === -1;
  }
  function songOf(el) {
    return (el.getAttribute('src') || el.src || '').replace(/^https?:\/\/[^/]+/, '');
  }

  function attach(el) {
    if (el.__totwResume || !isTotw(el)) return;
    el.__totwResume = true;
    var song = songOf(el);

    function record() {
      save({ song: song, time: el.currentTime || 0, playing: !el.paused && !el.ended, at: Date.now() });
    }
    el.addEventListener('timeupdate', function () { if (!el.paused) record(); });
    el.addEventListener('play', record);
    el.addEventListener('pause', record);
    el.addEventListener('ended', function () { save(null); });
    window.addEventListener('pagehide', function () { if (el.currentTime) record(); });

    var s = load();
    if (!s || s.song !== song || Date.now() - s.at > MAX_AGE || !s.time) return;

    el.preload = 'auto';
    function resume() {
      try { el.currentTime = s.time; } catch (e) {}
      if (s.playing) {
        // Press the player's own button so its icon and internal on/off state stay in sync
        // (some older players only track state through button clicks). Browsers allow this
        // once the visitor has pressed play on the site. If one refuses (Safari can), the
        // player sits paused at the right spot for one tap.
        var btn = document.getElementById('totw-btn') || document.querySelector('#totw-player button');
        if (btn) {
          btn.click();
          setTimeout(function () {
            // Play was refused but a click-tracked player now shows "pause": click again so it
            // shows "play" and its state matches the paused audio.
            if (el.paused && /<rect/.test(btn.innerHTML)) btn.click();
          }, 800);
        } else {
          var p = el.play();
          if (p && p.catch) p.catch(function () { record(); });
        }
      }
    }
    if (el.readyState >= 1) resume();
    else el.addEventListener('loadedmetadata', resume, { once: true });
    if (el.readyState === 0 && el.load) el.load();
  }

  // Older Wix pages build their player with `new Audio(...)`; catch those as they're made.
  var NativeAudio = window.Audio;
  if (NativeAudio) {
    var Wrapped = function (src) {
      var a = arguments.length ? new NativeAudio(src) : new NativeAudio();
      setTimeout(function () { attach(a); }, 0);
      return a;
    };
    Wrapped.prototype = NativeAudio.prototype;
    window.Audio = Wrapped;
  }

  // Custom pages have <audio id="totw-audio"> in the markup.
  function attachMarkup() {
    var el = document.getElementById('totw-audio');
    if (el) attach(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachMarkup);
  else attachMarkup();

  // Song title: scrolls in a loop under the progress bar, as wide as the player, in the same
  // type as the "¡TUNE OF THE WEEK!" label. Change it here when the tune changes.
  var TITLE = 'Puli x Apiento - To Live And Cry In L.A.';

  function addTitle() {
    if (document.getElementById('totw-title')) return true;
    var row = document.querySelector('.totw-block .totw-player') ||
              document.querySelector('#totw-player > div:last-child');
    var lbl = document.querySelector('.totw-label') || document.querySelector('#totw-player > span');
    if (!row || !lbl || !row.offsetWidth) return false;

    if (!document.getElementById('totw-title-style')) {
      var st = document.createElement('style');
      st.id = 'totw-title-style';
      st.textContent =
        '#totw-title{overflow:hidden;white-space:nowrap;margin-top:5px;margin-left:auto;text-align:left;}' +
        '#totw-title>span{display:inline-block;animation:totw-scroll linear infinite;}' +
        '#totw-title>span>span{padding-right:3em;}' +
        '@keyframes totw-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
        '@media (prefers-reduced-motion:reduce){#totw-title>span{animation:none}}';
      document.head.appendChild(st);
    }

    var cs = getComputedStyle(lbl);
    var box = document.createElement('div');
    box.id = 'totw-title';
    box.setAttribute('aria-label', TITLE);
    box.style.width = row.offsetWidth + 'px';
    box.style.fontFamily = cs.fontFamily;
    box.style.fontSize = cs.fontSize;
    box.style.fontWeight = cs.fontWeight;
    box.style.fontStyle = cs.fontStyle;
    box.style.letterSpacing = cs.letterSpacing;
    box.style.textTransform = cs.textTransform;
    box.style.lineHeight = cs.lineHeight;

    // Two copies side by side, shifted by one copy's width, so the loop has no seam.
    var reel = document.createElement('span');
    reel.setAttribute('aria-hidden', 'true');
    reel.innerHTML = '<span></span><span></span>';
    reel.firstChild.textContent = reel.lastChild.textContent = TITLE;
    box.appendChild(reel);
    row.parentNode.insertBefore(box, row.nextSibling);
    reel.style.animationDuration = (reel.offsetWidth / 2 / 30) + 's'; // about 30px a second
    return true;
  }
  function tryTitle() {
    if (addTitle()) return;
    // Older Wix pages build their player late, after the header is on the page.
    var tries = 0;
    var t = setInterval(function () { if (addTitle() || ++tries > 40) clearInterval(t); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryTitle);
  else tryTitle();
})();
