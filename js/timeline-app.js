/* ============================================================
   BizLens · timeline-app.js
   Memuat data dari localStorage (?id=...) atau analisis terbaru.
   ============================================================ */
(function () {
  'use strict';

  var BC = window.BizCore;
  if (!BC) { console.error('BizCore not loaded'); return; }

  /* ── Load data: prioritaskan ?id=, fallback ke terbaru ─── */
  var data = BC.loadAnalysis();
  if (!data) {
    var all = BC.getAllAnalyses() || [];
    all.sort(function (a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    data = all[0] || null;
  }

  /* ── Jika belum ada data sama sekali ─────────────────── */
  if (!data) {
    var emptyEl = document.getElementById('tlList');
    if (emptyEl) {
      emptyEl.innerHTML = '<div style="text-align:center;padding:40px;color:#64748B">' +
        '<p>Belum ada analisis tersimpan.</p>' +
        '<a href="workspace.html" style="color:#0F4C75;font-weight:600">+ Buat Analisis Pertama</a></div>';
    }
    BC.buildSidebar('timeline', null);
    if (window.BizIcons) BizIcons.paint();
    return;
  }

  var state = BC.stateFromData(data);
  var m     = BC.compute(state);

  /* Pastikan URL punya ?id agar link antar halaman konsisten */
  if (data.id && !new URLSearchParams(window.location.search).get('id')) {
    history.replaceState(null, '', window.location.pathname + '?id=' + data.id);
  }

  BC.buildSidebar('timeline', data);
  BC.buildTopbar(data, 'Business Timeline');
  BC.setupReveal();
  BC.setupGlow();

  /* ── Info bisnis ──────────────────────────────────────── */
  setText('bizTitle', data.namaUsaha || 'Bisnis Anda');
  setText('bizOwner', data.namaOwner || data.namaPengusaha || 'Pemilik');
  setText('bizType',  data.jenisUsaha || 'Lainnya');
  setText('bizDate',  data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})
    : new Date().toLocaleDateString('id-ID'));

  /* ── Score ring ───────────────────────────────────────── */
  setText('tl_score', Math.round(m.score));
  var statusText = 'Perlu Perhatian';
  if (m.score >= 80) statusText = 'Sangat Sehat';
  else if (m.score >= 60) statusText = 'Sehat';
  else if (m.score >= 40) statusText = 'Cukup';
  setText('tl_status', statusText);

  setTimeout(function () {
    var ring = document.getElementById('tl_ringValue');
    if (ring) ring.style.strokeDashoffset = String(578 * (1 - m.score / 100));
  }, 120);

  renderTimeline(m, data, state);
  renderProgress(m, state);
  renderAchievements(m, state);

  /* ── Helpers ──────────────────────────────────────────── */
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fmt(n) {
    if (!isFinite(n)) return '-';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'M';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'jt';
    if (n >= 1e3) return Math.round(n / 1e3) + 'rb';
    return String(Math.round(n));
  }

  /* ── Timeline events ──────────────────────────────────── */
  function renderTimeline(m, data, state) {
    var list = document.getElementById('tlList');
    if (!list) return;

    var now     = new Date();
    var created = data.createdAt ? new Date(data.createdAt) : new Date(now.getTime() - 7 * 864e5);
    var fd      = function (d) { return d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}); };
    var qp      = data.id ? '?id=' + data.id : '';

    var events = [
      {
        status: 'is-done',
        date:   fd(created),
        title:  'Data bisnis dianalisis',
        detail: (data.namaUsaha || 'Bisnis') + ' terdaftar di BizLens'
      },
      {
        status: 'is-done',
        date:   fd(new Date(created.getTime() + 2 * 864e5)),
        title:  'Margin ' + (m.net >= 0 ? 'positif' : 'negatif') + ' terdeteksi',
        detail: 'Margin Keuntungan: ' + (m.margin * 100).toFixed(1) + '%'
      },
      {
        status: 'is-done',
        date:   fd(new Date(created.getTime() + 7 * 864e5)),
        title:  'Proyeksi BEP: ' + fmt(m.bep) + ' unit',
        detail: isFinite(m.bepRatio) ? 'Diproyeksikan di hari ke-' + Math.ceil(m.bepRatio * 30) : 'BEP belum tercapai'
      },
      {
        status: 'is-now',
        date:   fd(now),
        title:  'Cermin Bisnis AI memberikan rekomendasi',
        detail: 'Skor Kesehatan Bisnis: ' + Math.round(m.score) + '/100'
      },
      {
        status: 'is-future',
        date:   fd(new Date(now.getTime() + 30 * 864e5)),
        title:  'Target penjualan ' + (state.targetUnits || '—') + ' unit/bulan',
        detail: 'Evaluasi pencapaian target bulanan'
      },
      {
        status: 'is-future',
        date:   fd(new Date(now.getTime() + 90 * 864e5)),
        title:  'Evaluasi kuartal',
        detail: 'Tinjauan komprehensif performa 3 bulan'
      }
    ];

    list.innerHTML = events.map(function (ev) {
      return '<div class="tl-item ' + ev.status + '">' +
               '<div class="tl-dot"></div>' +
               '<p class="tl-date">' + ev.date + '</p>' +
               '<p class="tl-title">' + ev.title + '</p>' +
               '<p class="tl-detail">' + ev.detail + '</p>' +
             '</div>';
    }).join('');
  }

  /* ── Progress bars ────────────────────────────────────── */
  function renderProgress(m, state) {
    var tUnits  = state.targetUnits || (state.units * 1.5) || 1;
    var tMargin = state.targetMargin ? state.targetMargin / 100 : 0.3;
    var tRoi    = state.targetRoi || 30;

    var pUnits  = Math.min(100, Math.max(0, (state.units / tUnits)   * 100));
    var pMargin = Math.min(100, Math.max(0, (m.margin   / tMargin)   * 100));
    var pRoi    = Math.min(100, Math.max(0, (m.roi      / tRoi)      * 100));

    setTimeout(function () {
      setBar('progUnits',  pUnits);
      setBar('progMargin', pMargin);
      setBar('progRoi',    pRoi);
    }, 120);

    animNum('progUnitsVal',  pUnits,  1, '%');
    animNum('progMarginVal', pMargin, 1, '%');
    animNum('progRoiVal',    pRoi,    1, '%');
  }

  function setBar(id, pct) {
    var el = document.getElementById(id);
    if (el) el.style.width = pct + '%';
  }

  function animNum(id, to, dec, suffix) {
    var el = document.getElementById(id);
    if (!el) return;
    var from = 0, dur = 900, start = null;
    function step(ts) {
      if (!start) start = ts;
      var prog = Math.min(1, (ts - start) / dur);
      el.textContent = (from + (to - from) * prog).toFixed(dec) + (suffix || '');
      if (prog < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── Achievements ─────────────────────────────────────── */
  function renderAchievements(m, state) {
    var grid = document.getElementById('achieveGrid');
    if (!grid) return;

    var tUnits = state.targetUnits || Infinity;
    var achievements = [
      { title: 'Analisis Pertama',  desc: 'Selesai melakukan input data',          icon: 'zap',          cond: true },
      { title: 'BEP Tercapai',      desc: 'Penjualan melampaui Titik Impas',       icon: 'trending-up',  cond: state.units >= m.bep },
      { title: 'Margin Sehat',      desc: 'Margin Keuntungan ≥ 20%',               icon: 'pie-chart',    cond: m.margin >= 0.2 },
      { title: 'ROI Bagus',         desc: 'Return on Investment ≥ 20%',            icon: 'percent',      cond: m.roi >= 20 },
      { title: 'Skor Tinggi',       desc: 'Kesehatan Bisnis ≥ 70',                 icon: 'award',        cond: m.score >= 70 },
      { title: 'Target Terpenuhi',  desc: 'Mencapai target penjualan',             icon: 'target',       cond: state.units >= tUnits }
    ];

    grid.innerHTML = achievements.map(function (a) {
      var color = a.cond ? '#5E9F6E' : '#64748B';
      var bg    = a.cond ? 'rgba(94,159,110,.15)' : '#E6EBF2';
      var cls   = a.cond ? 'is-unlocked' : 'is-locked';
      return '<div class="achieve-badge ' + cls + '">' +
               '<div class="achieve-icon" style="background:' + bg + ';color:' + color + '">' +
                 '<i data-lucide="' + a.icon + '"></i>' +
               '</div>' +
               '<div>' +
                 '<p class="achieve-title">' + a.title + '</p>' +
                 '<p class="achieve-desc">'  + a.desc  + '</p>' +
               '</div>' +
             '</div>';
    }).join('');

    if (window.BizIcons) BizIcons.paint();
    else if (window.lucide) lucide.createIcons();
  }

})();
