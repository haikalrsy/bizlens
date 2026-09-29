(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dash = document.getElementById('dash');
  var stage = document.querySelector('.stage__inner');
  var film = document.getElementById('film');
  var dock = document.getElementById('dashDock');
  var dockRing = document.getElementById('dockRing');
  var dockNum = document.getElementById('dockNum');
  var BL = window.BizLens;

  var CAM = {
    1: { side: 0,  scale: 1.32, op: 0,   blur: 5, tiltX: 20,  tiltY: -26, tiltZ: 34, focus: '' },
    2: { side: -1, scale: 1,    op: 1,   blur: 0, tiltX: 0,   tiltY: -2,  tiltZ: 0,  focus: '' },
    3: { side: 0,  scale: 1.58, op: .20, blur: 4, tiltX: 16,  tiltY: -20, tiltZ: 30, focus: '' },
    4: { side: 1,  scale: 1.04, op: 1,   blur: 0, tiltX: 0,   tiltY: 2,   tiltZ: 0,  focus: '' },
    5: { side: -1, scale: .98,  op: 1,   blur: 0, tiltX: 0,   tiltY: -1.4,tiltZ: 0,  focus: '' },
    6: { side: 1,  scale: 1.05, op: 1,   blur: 0, tiltX: 0,   tiltY: 1.6, tiltZ: 0,  focus: 'ai' },
    7: { side: -1, scale: 1,    op: 1,   blur: 0, tiltX: 0,   tiltY: -1.6,tiltZ: 0,  focus: 'score' }
  };

  var STORY = {
    2: { price: 25000, units: 1800, cost: 11000, ops: 14000000 },
    3: { price: 19000, units: 1100, cost: 13500, ops: 16000000 },
    4: { price: 27000, units: 2100, cost: 10500, ops: 13500000 },
    7: { price: 29000, units: 2450, cost: 10000, ops: 13000000 }
  };

  var panels = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var track = 0;
  var active = 0;
  var mobile = false;

  function measure() {
    mobile = innerWidth <= 1080;
    if (!stage || !dash) return;
    var avail = stage.clientWidth - parseFloat(getComputedStyle(stage).paddingLeft) * 2;
    track = Math.max(0, (avail - dash.offsetWidth) / 2);
  }

  function box(panel) {
    var el = panel.querySelector('.scene__box') || panel;
    var r = el.getBoundingClientRect();
    var top = r.top + scrollY, bottom = r.bottom + scrollY;
    return { top: top, bottom: bottom, mid: (top + bottom) / 2 };
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function cameraAt(centerY) {
    var first = panels[0], last = panels[panels.length - 1];
    var fRect = first.getBoundingClientRect();
    var fMid = fRect.top + scrollY + fRect.height / 2;

    if (centerY <= fMid) {
      var heroSpan = Math.max(1, fMid - (film.getBoundingClientRect().top + scrollY - innerHeight * .35));
      var t = ease(Math.min(1, Math.max(0, 1 - (fMid - centerY) / heroSpan)));
      return { cam: blend(CAM[1], CAM[2], t), index: 2, pastEnd: false };
    }

    for (var i = 0; i < panels.length - 1; i++) {
      var a = panels[i], b = panels[i + 1];
      var ba = box(a), bb = box(b);
      var ma = ba.mid, mb = bb.mid;
      if (centerY >= ma && centerY <= mb) {
        var gapStart = Math.max(ba.bottom - innerHeight * .30, ma);
        var gapEnd = Math.min(bb.top - innerHeight * .45, mb);
        if (gapEnd - gapStart < 60) {
          gapStart = ma + (mb - ma) * .15;
          gapEnd = ma + (mb - ma) * .55;
        }
        var t2 = ease(Math.min(1, Math.max(0, (centerY - gapStart) / Math.max(1, gapEnd - gapStart))));
        return {
          cam: blend(CAM[+a.dataset.scene], CAM[+b.dataset.scene], t2),
          index: t2 < .5 ? +a.dataset.scene : +b.dataset.scene,
          pastEnd: false
        };
      }
    }

    var lBox = box(last);
    if (centerY > lBox.mid) {
      var exitSpan = Math.max(1, lBox.bottom - lBox.mid);
      var tExit = Math.min(1, Math.max(0, (centerY - lBox.mid) / exitSpan));
      var endCam = {
        side: CAM[7].side, scale: CAM[7].scale,
        op: lerp(CAM[7].op, 0, tExit),
        blur: CAM[7].blur, tiltX: CAM[7].tiltX,
        tiltY: CAM[7].tiltY, tiltZ: CAM[7].tiltZ,
        focus: CAM[7].focus
      };
      return { cam: endCam, index: +last.dataset.scene, pastEnd: centerY > lBox.bottom };
    }

    return { cam: CAM[+last.dataset.scene], index: +last.dataset.scene, pastEnd: false };
  }

  function blend(a, b, t) {
    return {
      side: lerp(a.side, b.side, t),
      scale: lerp(a.scale, b.scale, t),
      op: lerp(a.op, b.op, t),
      blur: lerp(a.blur, b.blur, t),
      tiltX: lerp(a.tiltX, b.tiltX, t),
      tiltY: lerp(a.tiltY, b.tiltY, t),
      tiltZ: lerp(a.tiltZ, b.tiltZ, t),
      focus: t < .5 ? a.focus : b.focus
    };
  }

  /* ── state kamera terpisah dari target, dihaluskan tiap frame ── */
  var cur = { side: 0, scale: .95, op: 0, blur: 6, tiltX: 0, tiltY: 0, tiltZ: 0 };
  var target = { side: 0, scale: .95, op: 0, blur: 6, tiltX: 0, tiltY: 0, tiltZ: 0 };
  var curFocus = '';

  function apply() {
    var side = cur.side * track;
    dash.style.transform =
      'translate3d(' + side.toFixed(1) + 'px,0,0) ' +
      'scale(' + cur.scale.toFixed(3) + ') ' +
      'rotateX(' + cur.tiltX.toFixed(2) + 'deg) ' +
      'rotateY(' + cur.tiltY.toFixed(2) + 'deg) ' +
      'rotateZ(' + cur.tiltZ.toFixed(2) + 'deg)';
    dash.style.opacity = cur.op.toFixed(3);
    dash.style.filter = cur.blur > .05 ? 'blur(' + cur.blur.toFixed(2) + 'px)' : 'none';
    dash.style.pointerEvents = cur.op < 0.15 ? 'none' : 'auto';
    dash.classList.toggle('is-tilted', cur.blur > .3);
    if (dash.getAttribute('data-focus') !== curFocus) dash.setAttribute('data-focus', curFocus);
  }

  function setScene(n) {
    if (n === active) return;
    active = n;
    if (STORY[n]) BL.set(STORY[n], { draw: n === 2 || n === 4, type: n === 6 || n === 2 });
    if (n === 6) BL.render({ type: true });
  }

  /* ── loop kontinu: melunakkan cur → target setiap frame ────── */
  var lastT = null;
  function loop(now) {
    requestAnimationFrame(loop);
    if (mobile) return;
    if (lastT === null) lastT = now;
    var dt = Math.min(48, now - lastT);
    lastT = now;
    var k = 1 - Math.pow(0.0022, dt / 16.6); /* pelunakan lembut, tak bergantung frame-rate */

    cur.side  = lerp(cur.side, target.side, k);
    cur.scale = lerp(cur.scale, target.scale, k);
    cur.op    = lerp(cur.op, target.op, k);
    cur.blur  = lerp(cur.blur, target.blur, k);
    cur.tiltX = lerp(cur.tiltX, target.tiltX, k);
    cur.tiltY = lerp(cur.tiltY, target.tiltY, k);
    cur.tiltZ = lerp(cur.tiltZ, target.tiltZ, k);
    apply();
  }

  var filmStage = document.querySelector('.film__stage');

  function frame() {
    if (mobile) return;
    dash.style.transformStyle = 'preserve-3d';
    stage.style.perspective = '1400px';
    var r = film.getBoundingClientRect();
    var withinFilm = !(r.bottom < 0 || r.top > innerHeight);
    if (filmStage) {
      filmStage.classList.toggle('is-hidden', !withinFilm);
    }
    if (withinFilm) {
      var res = cameraAt(scrollY + innerHeight / 2);
      target.side = res.cam.side; target.scale = res.cam.scale;
      target.op = res.cam.op; target.blur = res.cam.blur;
      target.tiltX = res.cam.tiltX; target.tiltY = res.cam.tiltY; target.tiltZ = res.cam.tiltZ;
      curFocus = res.cam.focus;
      setScene(res.index);
      dockState(false);
    } else if (r.bottom < 0) {
      dockState(true);
    } else {
      dockState(false);
    }
  }

  var docked = false;
  function dockState(on) {
    if (on === docked) return;
    docked = on;
    dock.classList.toggle('is-visible', on);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; frame(); });
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function (e) {
      dash.classList.toggle('is-narrow', e[0].contentRect.width < 760);
    }).observe(dash);
  }

  /* ── Widget mini mengambang: live score, klik untuk kembali ── */
  addEventListener('bizlens:score', function (e) {
    var v = clampScore(e.detail);
    dockNum.textContent = v;
    dockRing.style.strokeDashoffset = String(100.5 - (100.5 * v) / 100);
  });
  function clampScore(v) { return Math.max(0, Math.min(100, v || 0)); }
  document.getElementById('dashDockCard').addEventListener('click', function () {
    document.getElementById('hero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ── Scene 05 · What-if Simulator ─────────────────────── */
  var rp = document.getElementById('rPrice'), ru = document.getElementById('rUnits'),
      rc = document.getElementById('rCost'),  ro = document.getElementById('rOps');
  var vp = document.getElementById('valPrice'), vu = document.getElementById('valUnits'),
      vc = document.getElementById('valCost'),  vo = document.getElementById('valOps');

  function syncLabels() {
    vp.textContent = BL.format.rupiah(+rp.value);
    vu.textContent = (+ru.value).toLocaleString('id-ID') + ' unit';
    vc.textContent = BL.format.rupiah(+rc.value);
    vo.textContent = BL.format.rupiah(+ro.value);
  }
  var pending = false;
  function onInput() {
    syncLabels();
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      BL.set({ price: +rp.value, units: +ru.value, cost: +rc.value, ops: +ro.value });
    });
  }
  [rp, ru, rc, ro].forEach(function (el) { el.addEventListener('input', onInput); });

  var simIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      rp.value = BL.state.price; ru.value = BL.state.units;
      rc.value = BL.state.cost;  ro.value = BL.state.ops;
      syncLabels();
    });
  }, { threshold: .5 });
  simIO.observe(document.getElementById('simulator'));

  /* ── Boot ─────────────────────────────────────────────── */
  measure();
  syncLabels();
  BL.render({ draw: true, type: false });

  if (reduced || mobile) {
    dash.style.opacity = 1;
    dash.style.transform = 'none';
    setScene(2);
  } else {
    cur.side = target.side = CAM[1].side; cur.scale = target.scale = CAM[1].scale;
    cur.op = target.op = CAM[1].op; cur.blur = target.blur = CAM[1].blur;
    cur.tiltX = target.tiltX = CAM[1].tiltX;
    cur.tiltY = target.tiltY = CAM[1].tiltY;
    cur.tiltZ = target.tiltZ = CAM[1].tiltZ;
    apply();
    frame();
    requestAnimationFrame(loop);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () {
    clearTimeout(window.__sceneRz);
    window.__sceneRz = setTimeout(function () { measure(); frame(); }, 150);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });
})();