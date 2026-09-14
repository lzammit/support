/* FamilyQuest site — the working model of the TV screen, plus small page behaviour.
   No dependencies. Everything degrades: without JS the hero still shows a
   43 % week with Monday–Wednesday logged. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mobile nav ---- */
  var menu = document.querySelector('.menu');
  var mobile = document.getElementById('mobile-nav');
  if (menu && mobile) {
    menu.addEventListener('click', function () {
      var open = mobile.classList.toggle('open');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---- scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
    // Safety net: anything on screen that the observer has not reported yet is
    // shown anyway, on a timer after load and on every scroll. Content must
    // never depend on an animation trigger to be readable.
    var showVisible = function () {
      reveals.forEach(function (el) {
        if (el.classList.contains('in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.96 && r.bottom > 0) el.classList.add('in');
      });
    };
    setTimeout(showVisible, 1200);
    var pending = false;
    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; showVisible(); });
    }, { passive: true });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- the week demo ---- */
  var demo = document.getElementById('demo');
  if (!demo) return;
  var trail = document.getElementById('trail');
  var walker = document.getElementById('walker');
  var finish = document.getElementById('finish');
  var crown = document.getElementById('crown');
  var startFlag = document.getElementById('start-flag');
  var pct = document.getElementById('pct');
  var bar = document.getElementById('bar');
  var reward = document.getElementById('reward');
  var hint = document.getElementById('hint');
  var mapEl = demo.querySelector('.map');
  var days = Array.prototype.slice.call(demo.querySelectorAll('.day'));
  var TOTAL = days.length;              // 7
  var FINISH = Math.round(TOTAL * 5 / 7);  // the reward: five good days
  var total = trail.getTotalLength();
  var shown = 0;                        // fraction currently drawn
  var target = 0;
  var raf = null;
  var crowned = false;

  function pointAt(f) { return trail.getPointAtLength(Math.max(0, Math.min(1, f)) * total); }
  function place(el, f, dy) {
    var p = pointAt(f);
    el.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + (p.y + (dy || 0)).toFixed(1) + ')');
  }
  // fixed markers sit on the trail itself, so they always agree with the walker
  place(startFlag, 0, 0);
  place(finish, FINISH / TOTAL, 0);
  place(crown, 1, 0);

  function count() { return days.filter(function (d) { return d.getAttribute('aria-pressed') === 'true'; }).length; }

  function draw(f) {
    shown = f;
    place(walker, f, 0);
  }
  function animateTo(f) {
    target = f;
    if (reduce) { draw(f); return; }
    if (raf) cancelAnimationFrame(raf);
    var from = shown, t0 = null, dur = 650 + Math.abs(f - from) * 500;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      draw(from + (target - from) * e);
      if (k < 1) raf = requestAnimationFrame(step); else raf = null;
    }
    raf = requestAnimationFrame(step);
  }

  function confetti() {
    if (reduce || !mapEl) return;
    var colors = ['#e5645c', '#ee9038', '#e2c231', '#4fc46a', '#3f86a6', '#8c74d4', '#ffd54a'];
    var r = mapEl.getBoundingClientRect();
    var p = pointAt(1);
    var vb = trail.ownerSVGElement.viewBox.baseVal;
    var x = p.x / vb.width * r.width, y = p.y / vb.height * r.height;
    for (var i = 0; i < 18; i++) {
      var s = document.createElement('span');
      s.className = 'confetti';
      var a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      s.style.setProperty('--x', x + 'px');
      s.style.setProperty('--y', y + 'px');
      s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
      s.style.setProperty('--dy', (Math.sin(a) * d + 40).toFixed(0) + 'px');
      s.style.setProperty('--rot', (Math.random() * 540 - 270).toFixed(0) + 'deg');
      s.style.setProperty('--c', colors[i % colors.length]);
      mapEl.appendChild(s);
      s.addEventListener('animationend', function () { this.remove(); });
    }
  }

  function render(animate) {
    var n = count();
    var f = n / TOTAL;
    var percent = Math.round(f * 100);
    pct.textContent = percent + ' %';
    bar.style.width = percent + '%';
    bar.classList.toggle('full', n === TOTAL);
    days.forEach(function (d) {
      var name = d.parentNode.querySelector('.day-name');
      if (name) name.classList.toggle('on', d.getAttribute('aria-pressed') === 'true');
    });
    reward.classList.toggle('earned', n >= FINISH);
    finish.classList.toggle('lit', n >= FINISH);
    crown.classList.toggle('lit', n === TOTAL);
    if (n === TOTAL && !crowned) { crowned = true; confetti(); }
    if (n < TOTAL) crowned = false;
    if (animate) animateTo(f); else draw(f);
  }

  days.forEach(function (d) {
    d.addEventListener('click', function () {
      var on = d.getAttribute('aria-pressed') === 'true';
      d.setAttribute('aria-pressed', on ? 'false' : 'true');
      if (hint) hint.classList.add('gone');
      render(true);
    });
  });

  // Intro: the week fills in from Monday, the way it does on the TV on a Thursday.
  var preset = days.filter(function (d) { return d.getAttribute('aria-pressed') === 'true'; });
  if (reduce || preset.length === 0) {
    render(false);
  } else {
    preset.forEach(function (d) { d.setAttribute('aria-pressed', 'false'); });
    render(false);
    preset.forEach(function (d, i) {
      setTimeout(function () { d.setAttribute('aria-pressed', 'true'); render(true); }, 700 + i * 420);
    });
  }
})();
