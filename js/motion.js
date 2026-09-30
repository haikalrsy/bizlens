/* ============================================================
   BizLens · Motion primitives
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── Section reveal ───────────────────────────────────── */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .line').forEach(function (el) { revealIO.observe(el); });

  /* ── Counters ─────────────────────────────────────────── */
  function runCounter(el) {
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var t0 = performance.now(), dur = 700;
    (function step(now) {
      var p = Math.min((now - t0) / dur, 1);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      el.textContent = Math.round(target * e).toLocaleString('id-ID') + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      reduced ? (e.target.textContent = parseFloat(e.target.dataset.count).toLocaleString('id-ID') + (e.target.dataset.suffix || ''))
              : runCounter(e.target);
      countIO.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { countIO.observe(el); });

  /* ── Navbar: dynamic island ────────────────────────────── */
  var nav = document.getElementById('nav');
  var island = document.getElementById('island');
  var toggle = document.getElementById('islandToggle');
  var links = $$('.island__links a');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    island.classList.toggle('is-stuck', y > 40);
    ticking = false;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  toggle.addEventListener('click', function (ev) {
    ev.stopPropagation();
    island.classList.toggle('is-open');
  });
  document.addEventListener('click', function (ev) {
    if (island.classList.contains('is-open') && !island.contains(ev.target)) {
      island.classList.remove('is-open');
    }
  });
  links.forEach(function (a) { a.addEventListener('click', function () { island.classList.remove('is-open'); }); });

  var sectionIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { threshold: 0.25 });
  ['problem', 'solution', 'simulator', 'features', 'story'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) sectionIO.observe(el);
  });

  /* ── Button ripple ────────────────────────────────────── */
  document.addEventListener('pointerdown', function (ev) {
    var host = ev.target.closest('[data-ripple]');
    if (!host || reduced) return;
    var r = host.getBoundingClientRect(), size = Math.max(r.width, r.height);
    var s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' +
      (ev.clientX - r.left - size / 2) + 'px;top:' + (ev.clientY - r.top - size / 2) + 'px';
    host.appendChild(s);
    setTimeout(function () { s.remove(); }, 520);
  });

  /* ── Cursor-follow glow (warna primary #384B70) ───────── */
  var glow = document.getElementById('cursorGlow');
  if (glow && !reduced && matchMedia('(pointer:fine)').matches) {
    var gx = -999, gy = -999, cx = -999, cy = -999;
    addEventListener('pointermove', function (e) { gx = e.clientX; gy = e.clientY; }, { passive: true });
    (function glowLoop() {
      cx += (gx - cx) * 0.14; cy += (gy - cy) * 0.14;
      glow.style.transform = 'translate3d(' + (cx - 260) + 'px,' + (cy - 260) + 'px,0)';
      requestAnimationFrame(glowLoop);
    })();
  }

  if (reduced) return;

  /* ── Card tilt + glass reflection ─────────────────────── */
  $$('[data-tilt]').forEach(function (card) {
    card.addEventListener('pointermove', function (ev) {
      var r = card.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width - 0.5;
      var py = (ev.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(900px) rotateX(' + (-py * 2.4).toFixed(2) +
        'deg) rotateY(' + (px * 2.4).toFixed(2) + 'deg) translateZ(0)';
      card.style.background =
        'radial-gradient(520px circle at ' + (px + 0.5) * 100 + '% ' + (py + 0.5) * 100 +
        '%, rgba(56,75,112,.07), rgba(248,245,236,.92) 58%)';
    });
    card.addEventListener('pointerleave', function () {
      card.style.transform = '';
      card.style.background = '';
    });
  });

  /* ── Parallax aura mengikuti scroll + mouse ───────────── */
  var auraA = document.querySelector('.aura__a');
  var auraB = document.querySelector('.aura__b');
  var mx = 0, my = 0, sy = 0;
  addEventListener('pointermove', function (e) {
    mx = (e.clientX / innerWidth - 0.5);
    my = (e.clientY / innerHeight - 0.5);
  }, { passive: true });
  (function loop() {
    sy = window.scrollY;
    if (auraA) auraA.style.transform = 'translate3d(' + (mx * 26) + 'px,' + (my * 20 - sy * 0.05) + 'px,0)';
    if (auraB) auraB.style.transform = 'translate3d(' + (-mx * 32) + 'px,' + (-my * 24 - sy * 0.03) + 'px,0)';
    requestAnimationFrame(loop);
  })();

  /* ── Scene 10 · Card stack (drag / swipe / klik) ──────── */
  (function cardStack() {
    var stack = document.getElementById('stack');
    if (!stack) return;
    var cards = $$('.card', stack);
    var order = cards.map(function (_, i) { return i; }); /* order[0] = kartu paling depan */

    /* Di layar ≤820px (iPad & HP), biarkan CSS grid 2 kolom yang handle */
    function isMobileStack() { return window.innerWidth <= 820; }

    function layout(animateAll) {
      /* Skip JS layout di mobile — CSS override handle */
      if (isMobileStack()) {
        cards.forEach(function(el) {
          el.style.transform = '';
          el.style.opacity = '';
          el.style.zIndex = '';
          el.style.position = '';
        });
        return;
      }
      order.forEach(function (cardIdx, pos) {
        var el = cards[cardIdx];
        el.style.zIndex = String(cards.length - pos);
        if (pos === 0) {
          el.style.transform = 'translateY(0) scale(1) rotate(0deg)';
          el.style.opacity = '1';
        } else if (pos === 1) {
          el.style.transform = 'translateY(16px) scale(.94) rotate(-2.2deg)';
          el.style.opacity = '.78';
        } else if (pos === 2) {
          el.style.transform = 'translateY(30px) scale(.88) rotate(2.4deg)';
          el.style.opacity = '.5';
        } else {
          el.style.transform = 'translateY(40px) scale(.82) rotate(0deg)';
          el.style.opacity = '0';
        }
      });
    }
    layout();

    /* Re-layout saat resize (masuk/keluar mode mobile) */
    window.addEventListener('resize', function() { layout(); });

    function advance() {
      if (isMobileStack()) return;
      order.push(order.shift());
      layout();
    }

    var dragging = null, startX = 0, curX = 0, active = false;

    function onDown(ev) {
      if (isMobileStack()) return;
      var el = cards[order[0]];
      if (ev.target.closest('.card') !== el) return;
      dragging = el;
      active = true;
      startX = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      curX = 0;
      el.classList.add('dragging');
      el.setPointerCapture && ev.pointerId != null && el.setPointerCapture(ev.pointerId);
    }
    function onMove(ev) {
      if (!active || !dragging) return;
      var x = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      curX = x - startX;
      var rot = curX * 0.04;
      dragging.style.transform = 'translateX(' + curX + 'px) translateY(0) rotate(' + rot + 'deg) scale(1)';
      dragging.style.opacity = String(1 - Math.min(0.4, Math.abs(curX) / 600));
    }
    function onUp() {
      if (!active || !dragging) return;
      active = false;
      dragging.classList.remove('dragging');
      var el = dragging; dragging = null;
      if (Math.abs(curX) > 90) {
        var dir = curX > 0 ? 1 : -1;
        el.style.transition = 'transform 420ms var(--ease-soft), opacity 420ms var(--ease-soft)';
        el.style.transform = 'translateX(' + (dir * 620) + 'px) rotate(' + (dir * 18) + 'deg) scale(.9)';
        el.style.opacity = '0';
        setTimeout(function () {
          el.style.transition = '';
          advance();
        }, 260);
      } else {
        layout();
      }
      curX = 0;
    }

    stack.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    stack.addEventListener('click', function (ev) {
      if (isMobileStack()) return;
      if (Math.abs(curX) > 6) return; /* itu drag, bukan klik */
      var el = cards[order[0]];
      if (ev.target.closest('.card') === el) advance();
    });
  })();
})();