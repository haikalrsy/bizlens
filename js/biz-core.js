/* ============================================================
   BizLens · biz-core.js — Shared Engine
   Digunakan oleh semua halaman dashboard BizLens.
   ============================================================ */
(function (w) {
  'use strict';

  /* ── Utils ─────────────────────────────────────────────────── */
  var rupiah = function (n) { return 'Rp' + Math.round(n).toLocaleString('id-ID'); };
  var ringkas = function (n) {
    var a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(1).replace('.', ',') + 'T';
    if (a >= 1e9)  return (n / 1e9).toFixed(1).replace('.', ',') + 'M';
    if (a >= 1e6)  return (n / 1e6).toFixed(1).replace('.', ',') + 'jt';
    if (a >= 1e3)  return Math.round(n / 1e3) + 'rb';
    return String(Math.round(n));
  };
  var escHtml = function (s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var byId  = function (id) { return document.getElementById(id); };

  /* ── Load Analysis dari localStorage ──────────────────────── */
  function loadAnalysis() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    if (!id) return null;
    try {
      var arr = JSON.parse(localStorage.getItem('bizlens_analyses') || '[]');
      for (var i = 0; i < arr.length; i++) {
        if (String(arr[i].id) === String(id)) return arr[i];
      }
    } catch (e) {}
    return null;
  }

  function getAllAnalyses() {
    try { return JSON.parse(localStorage.getItem('bizlens_analyses') || '[]'); }
    catch (e) { return []; }
  }

  /* ── Default demo state ────────────────────────────────────── */
  var DEFAULTS = {
    price: 0, cost: 0, units: 0, ops: 0, mkt: 0,
    namaUsaha: '', jenisUsaha: '', namaOwner: '',
    modal: 0, targetUnits: 0, targetMargin: 0, targetBep: 0, targetRoi: 0
  };

  function stateFromData(data) {
    if (!data) return Object.assign({}, DEFAULTS);
    return {
      price:  Number(data.price)  || DEFAULTS.price,
      cost:   Number(data.cost)   || DEFAULTS.cost,
      units:  Number(data.units)  || DEFAULTS.units,
      ops:    Number(data.ops)    || DEFAULTS.ops,
      mkt:    Number(data.mkt)    || 0,
      namaUsaha:  data.namaUsaha  || DEFAULTS.namaUsaha,
      jenisUsaha: data.jenisUsaha || DEFAULTS.jenisUsaha,
      namaOwner:  data.namaOwner  || DEFAULTS.namaOwner,
      modal:       Number(data.modal)       || DEFAULTS.modal,
      targetUnits: Number(data.targetUnits) || DEFAULTS.targetUnits,
      targetMargin:Number(data.targetMargin)|| DEFAULTS.targetMargin,
      targetBep:   Number(data.targetBep)   || DEFAULTS.targetBep,
      targetRoi:   Number(data.targetRoi)   || DEFAULTS.targetRoi
    };
  }

  /* ── Compute engine ────────────────────────────────────────── */
  function compute(s) {
    var revenue  = s.price * s.units;
    var variable = s.cost * s.units;
    var fixed    = (s.ops || 0) + (s.mkt || 0);
    var net      = revenue - variable - fixed;
    var margin   = revenue ? net / revenue : 0;
    var contrib  = s.price - s.cost;
    var bep      = contrib > 0 ? Math.ceil(fixed / contrib) : Infinity;
    var bepRatio = bep === 0 ? Infinity : (isFinite(bep) && bep > 0 ? s.units / bep : 0);
    var roi      = (fixed + variable) ? (net / (fixed + variable)) * 100 : 0;
    var score    = clamp(Math.round(
      clamp(margin / 0.38, 0, 1) * 44 +
      clamp(bepRatio / 2.6, 0, 1) * 32 +
      clamp(roi / 70, 0, 1) * 24), 3, 99);

    /* 12 bulan history simulasi */
    var history = [], base = revenue * 0.72;
    for (var i = 0; i < 12; i++) {
      history.push(Math.max(revenue * 0.3,
        base + (revenue - base) * (i / 11) + Math.sin(i * 1.2) * revenue * 0.04));
    }
    var g = margin > 0.2 ? 0.055 : margin > 0.08 ? 0.03 : -0.02;
    var proj = [
      history[11] * (1 + g),
      history[11] * Math.pow(1 + g, 2),
      history[11] * Math.pow(1 + g, 3)
    ];

    /* Breakdown biaya per kategori */
    var biayaProduksi  = variable;
    var biayaOperasional = s.ops || 0;
    var biayaMarketing   = s.mkt || 0;

    /* ROI terhadap modal */
    var roiModal = s.modal ? (net * 12 / s.modal) * 100 : 0;

    /* BEP dalam hari */
    var bepHari = isFinite(bep) && s.units > 0 ? Math.ceil(bep / (s.units / 30)) : null;

    /* Jarak ke target */
    var gapMargin = s.targetMargin ? (s.targetMargin / 100 - margin) : null;
    var gapUnits  = s.targetUnits  ? (s.targetUnits - s.units) : null;

    return {
      revenue, variable, fixed, net, margin, bep, bepRatio, roi, score,
      history, proj, biayaProduksi, biayaOperasional, biayaMarketing,
      roiModal, bepHari, gapMargin, gapUnits,
      contrib, price: s.price, cost: s.cost, units: s.units, ops: s.ops
    };
  }

  /* ── Sidebar builder ───────────────────────────────────────── */
  var PAGES = [
    { id: 'dashboard', label: 'Dashboard',         icon: 'layout-dashboard',     href: 'dashboard.html' },
    { id: 'analytics', label: 'Analytics',          icon: 'bar-chart-2',           href: 'analytics.html' },
    { id: 'simulator', label: 'What-if Simulator',  icon: 'sliders-horizontal',   href: 'simulator.html' },
    { id: 'ai',        label: 'Rekomendasi Cerdas', icon: 'sparkles',             href: 'ai.html'        },
    { id: 'financial', label: 'Financial Insight',  icon: 'wallet',               href: 'financial.html' },
    { id: 'recent',    label: 'Recent Analysis',    icon: 'history',              href: 'recent.html'    },
    { id: 'timeline',  label: 'Business Timeline',  icon: 'git-commit-horizontal',href: 'timeline.html'  },
    { id: 'report',    label: 'Business Report',    icon: 'file-down',            href: 'report.html'    }
  ];

  function buildSidebar(activePage, data) {
    /* Dengan desain baru, sidebar dibangun oleh navbar.js sebagai floating icon rail.
       Fungsi ini hanya menyimpan data state agar navbar.js bisa membacanya,
       dan memperbarui skor di widget health jika sudah dirender. */

    var side = document.querySelector('.side') || document.getElementById('side');
    if (side) {
      if (activePage) side.setAttribute('data-page', activePage);
    }

    /* Hitung skor */
    var score = 0;
    var barColor = '#D96C6C';
    if (data) {
      var st = stateFromData(data);
      var m  = compute(st);
      score  = m.score;
      barColor = score >= 70 ? '#5E9F6E' : score >= 45 ? '#D9A441' : '#D96C6C';
    }

    /* Update widget health jika sudah ada di DOM */
    var sideScore = byId('sideScore');
    var sideBar   = byId('sideBar');
    if (sideScore) sideScore.textContent = data ? score : '—';
    if (sideBar) {
      sideBar.style.width      = (data ? score : 0) + '%';
      sideBar.style.background = barColor;
    }

    /* Jika navbar.js belum jalan (belum ada .biz-rail), jalankan buildNav via navbar.js */
    if (!document.querySelector('.biz-rail') && window.BizNavbar && window.BizNavbar.build) {
      window.BizNavbar.build();
    }

    if (window.BizIcons && typeof window.BizIcons.paint === 'function') {
      window.BizIcons.paint();
    } else if (window.lucide) {
      lucide.createIcons();
    }
  }

  /* ── Topbar builder ────────────────────────────────────────── */
  function buildTopbar(data, pageName) {
    var qp = data ? '?id=' + data.id : '';
    var bizName = data ? (data.namaUsaha || 'Analisis') : 'Demo';
    var crumb = document.querySelector('.crumb');
    if (crumb) {
      crumb.textContent = '';
      var prefix = document.createTextNode('Workspace ');
      var sep = document.createElement('span');
      sep.textContent = '/';
      var suffix = document.createTextNode(' ' + bizName);
      crumb.appendChild(prefix);
      crumb.appendChild(sep);
      crumb.appendChild(suffix);
    }
    var h1 = document.querySelector('h1');
    if (h1) h1.textContent = pageName || bizName;
    var footName = byId('dashBizName');
    if (footName) footName.textContent = bizName;
    var qpHref = document.querySelectorAll('[data-qp]');
    qpHref.forEach(function(el){ el.href = (el.dataset.qp || '') + qp; });
  }

  /* ── Format helpers ────────────────────────────────────────── */
  var MONTHS = ['Sep','Okt','Nov','Des','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu'];
  var SAGE = '#5E9F6E', AMBER = '#D9A441', CLAY = '#D96C6C', ACC = '#0F4C75';
  var reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

  function animNum(el, from, to, dur, decimals, prefix) {
    /* Calling conventions:
       animNum(el_or_id, target)                      — 0→target, 700ms, no fmt
       animNum(el_or_id, from, to, dur)               — full range
       animNum(el_or_id, from, to, dur, dec, prefix)  — with formatting */
    var node = (typeof el === 'string') ? document.getElementById(el) : el;
    if (!node) return;
    var start, end, ms, dec, pre;
    if (arguments.length <= 2) {
      start = 0; end = from; ms = 700; dec = 0; pre = '';
    } else {
      start = from; end = to; ms = dur || 700;
      dec = (decimals !== undefined && decimals !== null) ? decimals : 0;
      pre = prefix || '';
    }
    if (reduced) {
      node.textContent = pre + end.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return;
    }
    var t0 = performance.now();
    (function run(now) {
      var p = Math.min((now - t0) / ms, 1);
      var e = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
      var val = start + (end - start) * e;
      node.textContent = pre + val.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (p < 1) requestAnimationFrame(run);
    })(performance.now());
  }

  function setupReveal() {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('is-in'); });
      return;
    }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(function(el){ obs.observe(el); });
  }

  function setupGlow() {
    var glow = byId('cursorGlow');
    if (!glow || reduced) return;
    document.addEventListener('mousemove', function(e){
      glow.style.transform = 'translate3d(' + (e.clientX - 210) + 'px,' + (e.clientY - 210) + 'px,0)';
      glow.classList.add('is-on');
    });
  }

  function scoreColor(s) { return s >= 70 ? SAGE : s >= 45 ? AMBER : CLAY; }
  function statusText(s) { return s >= 70 ? 'Sehat' : s >= 45 ? 'Perlu Perhatian' : 'Kritis'; }

  /* ── Expose ──────────────────────────────────────────────────  */
  w.BizCore = {
    loadAnalysis, getAllAnalyses, stateFromData, compute,
    buildSidebar, buildTopbar,
    rupiah, ringkas, clamp, byId, animNum,
    setupReveal, setupGlow, scoreColor, statusText,
    MONTHS, SAGE, AMBER, CLAY, ACC, reduced,
    DEFAULTS
  };

})(window);

