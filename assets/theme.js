(function(){
  var MOON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SUN  = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-toggle').forEach(function(btn) {
      btn.innerHTML = t === 'dark' ? SUN : MOON;
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }

  window.toggleCWTheme = function() {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cw-theme', next);
    applyTheme(next);
  };

  // Apply on load (icons render after DOM ready)
  document.addEventListener('DOMContentLoaded', function() {
    var saved = localStorage.getItem('cw-theme') || 'light';
    applyTheme(saved);
  });
})();

/* ===== SCROLL REVEAL + SKILL BARS + COUNT-UP ===== */
(function(){
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    var decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals'), 10) : 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1400;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = target * eased;
      el.textContent = (decimals ? current.toFixed(decimals) : Math.round(current)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function revealEntry(el) {
    el.classList.add('is-visible');
    if (el.hasAttribute('data-count-to')) animateCount(el);
    if (el.classList.contains('skill-bar')) {
      var fill = el.querySelector('.skill-bar-fill');
      var pct = el.getAttribute('data-pct');
      if (fill && pct) {
        requestAnimationFrame(function() { fill.style.width = pct + '%'; });
      }
    }
  }

  function initScrollFX() {
    var targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .skill-bar, [data-count-to]');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      targets.forEach(revealEntry);
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          revealEntry(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });
    targets.forEach(function(el) { io.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', initScrollFX);
})();
