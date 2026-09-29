/* ============================================================
   BizLens · report-app.js
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
    var content = document.querySelector('.content');
    if (content) {
      content.innerHTML = '<div class="card glass p-6 reveal" style="text-align:center;padding:40px">' +
        '<p style="color:#64748B;margin-bottom:16px">Belum ada analisis tersimpan.</p>' +
        '<a href="workspace.html" class="btn">+ Buat Analisis Pertama</a></div>';
    }
    BC.buildSidebar('report', null);
    if (window.BizIcons) BizIcons.paint();
    return;
  }

  var state = BC.stateFromData(data);
  var m     = BC.compute(state);

  /* Pastikan URL punya ?id agar link antar halaman konsisten */
  if (data.id && !new URLSearchParams(window.location.search).get('id')) {
    history.replaceState(null, '', window.location.pathname + '?id=' + data.id);
  }

  BC.buildSidebar('report', data);
  BC.buildTopbar(data, 'Business Report');
  BC.setupReveal();
  BC.setupGlow();

  /* ── Header Info ──────────────────────────────────────── */
  setText('rptBizName',  data.namaUsaha || 'Bisnis Anda');
  setText('rptOwner',    data.namaOwner || data.namaPengusaha || 'Pemilik');
  setText('rptType',     data.jenisUsaha || 'Lainnya');
  setText('rptDate',     data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})
    : '-');
  setText('rptGenDate',  new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}));

  /* Update breadcrumb */
  var crumb = document.querySelector('.crumb');
  if (crumb) crumb.innerHTML = 'Workspace <span>/</span> ' + (data.namaUsaha || 'Bisnis Anda');

  /* Update avatar */
  var avatarEl = document.getElementById('avatarInitial');
  if (avatarEl && data.namaUsaha) {
    avatarEl.textContent = data.namaUsaha.slice(0, 2).toUpperCase();
  }

  /* ── Score ring ───────────────────────────────────────── */
  setText('rpt_score', Math.round(m.score));
  var statusText = 'Perlu Perhatian';
  if (m.score >= 80) statusText = 'Sangat Sehat';
  else if (m.score >= 60) statusText = 'Sehat';
  else if (m.score >= 40) statusText = 'Cukup';
  setText('rpt_status', statusText);

  setTimeout(function () {
    var ring = document.getElementById('rpt_ringValue');
    if (ring) ring.style.strokeDashoffset = String(578 * (1 - m.score / 100));
  }, 120);

  /* ── Score Breakdown Bars ─────────────────────────────── */
  var marginScore = Math.max(0, Math.min(1, m.margin / 0.38)) * 44;
  var bepScore    = Math.max(0, Math.min(1, isFinite(m.bepRatio) && m.bepRatio > 0 ? (1.5 / m.bepRatio) : 0)) * 32;
  var roiScore    = Math.max(0, Math.min(1, m.roi / 70)) * 24;

  setTimeout(function () {
    setBar('brMarginBar', marginScore / 44 * 100);
    setBar('brBepBar',    bepScore    / 32 * 100);
    setBar('brRoiBar',    roiScore    / 24 * 100);
  }, 300);

  /* Update label teks bar dengan nilai aktual */
  setText('brMarginVal', Math.round(marginScore) + ' / 44');
  setText('brBepVal',    Math.round(bepScore)    + ' / 32');
  setText('brRoiVal',    Math.round(roiScore)    + ' / 24');

  /* Update label lebar % bar di samping heading */
  var brMarginHead = document.querySelector('[for-bar="margin"]');
  var brBepHead    = document.querySelector('[for-bar="bep"]');
  var brRoiHead    = document.querySelector('[for-bar="roi"]');
  if (brMarginHead) brMarginHead.textContent = 'Margin (' + Math.round(m.margin * 100) + '%)';
  if (brBepHead)    brBepHead.textContent    = 'BEP Score';
  if (brRoiHead)    brRoiHead.textContent    = 'ROI (' + m.roi.toFixed(1) + '%)';

  /* ── KPI Summary (animasi counter) ───────────────────── */
  animNum('rptRevenue', m.revenue, 0, '', 'Rp ');
  animNum('rptProfit',  m.net,     0, '', 'Rp ');
  animNum('rptMargin',  m.margin * 100, 1, '%');
  animNum('rptRoi',     m.roi,     1, '%');
  if (isFinite(m.bep)) {
    animNum('rptBep', m.bep, 0);
    var bepTag = document.getElementById('rptBepTag'); if(bepTag) bepTag.style.display = 'inline-flex';
  } else { 
    var el = document.getElementById('rptBep'); if(el) el.textContent = '-'; 
    var bepTag = document.getElementById('rptBepTag'); if(bepTag) bepTag.style.display = 'none';
  }
  animNum('rptScore2',  m.score,   0);

  /* Tag warna profit & margin */
  var profitTag = document.getElementById('rptProfitTag');
  if (profitTag && m.net < 0) {
    profitTag.className = 'tag tag--dn';
    profitTag.textContent = 'Rugi';
  }
  var marginTag = document.getElementById('rptMarginTag');
  if (marginTag) {
    if (m.margin >= 0.2) { marginTag.className = 'tag tag--up'; marginTag.textContent = 'Sangat Baik'; }
    else if (m.margin < 0.1) { marginTag.className = 'tag tag--dn'; marginTag.textContent = 'Rendah'; }
  }

  /* ── Render Analisis Lists ────────────────────────────── */
  renderKekuatan(m);
  renderPerbaikan(m);
  renderRekomendasi(m, state);

  /* ── Export Actions ───────────────────────────────────── */
  var printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', function () { window.print(); });
  }

  var shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: 'BizLens Report – ' + (data.namaUsaha || ''), url: window.location.href }).catch(console.error);
      } else {
        navigator.clipboard.writeText(window.location.href).then(function () {
          alert('Tautan disalin ke clipboard!');
        });
      }
    });
  }

  /* Update link Dashboard & Analisis Baru dengan ?id */
  if (data.id) {
    var qp = '?id=' + data.id;
    var dashBtn = document.getElementById('dashBtn');
    if (dashBtn) dashBtn.href = 'dashboard.html' + qp;
    var dashTopBtn = document.querySelector('[data-qp="dashboard.html"]');
    if (dashTopBtn) dashTopBtn.href = 'dashboard.html' + qp;
  }

  if (window.BizIcons) BizIcons.paint();
  else if (window.lucide) lucide.createIcons();

  /* ── Helper Functions ─────────────────────────────────── */
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setBar(id, pct) {
    var el = document.getElementById(id);
    if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  function animNum(id, to, dec, suffix, prefix) {
    var el = document.getElementById(id);
    if (!el) return;
    var from = 0, dur = 900, start = null;
    var pre  = prefix || '';
    var suf  = suffix || '';
    function step(ts) {
      if (!start) start = ts;
      var prog = Math.min(1, (ts - start) / dur);
      var val  = from + (to - from) * prog;
      el.textContent = pre + val.toFixed(dec) + suf;
      if (prog < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── Kekuatan, Perbaikan, Rekomendasi ─────────────────── */
  function renderKekuatan(m) {
    var list = [];
    if (m.margin >= 0.2) list.push('Margin keuntungan sangat sehat di atas 20%, menunjukkan efisiensi harga jual.');
    if (m.score >= 70)   list.push('Skor kesehatan bisnis secara keseluruhan menunjukkan ketahanan yang baik.');
    if (m.roi >= 20)     list.push('Return on Investment (ROI) cukup cepat, investasi memberikan imbal hasil optimal.');
    if (m.net > 0)       list.push('Arus kas operasional positif, mampu menutupi seluruh biaya variabel dan tetap.');
    if (isFinite(m.bepRatio) && m.bepRatio <= 1.5) list.push('Titik impas (BEP) mudah dicapai dengan volume penjualan saat ini.');
    if (list.length === 0) list.push('Belum ada area kekuatan yang menonjol. Terus optimalkan penjualan.');
    renderList('kekuatanList', list.slice(0, 5), 'li');
  }

  function renderPerbaikan(m) {
    var list = [];
    if (m.margin < 0.2) list.push('Margin keuntungan masih di bawah 20%, perlu evaluasi struktur biaya variabel.');
    if (m.roi < 15)     list.push('ROI cenderung rendah. Pertimbangkan efisiensi modal awal atau tingkatkan margin.');
    if (m.net < 0)      list.push('Bisnis mengalami kerugian. Target penjualan saat ini belum menutupi total biaya operasional.');
    if (isFinite(m.bepRatio) && m.bepRatio > 2) list.push('Volume penjualan yang dibutuhkan untuk BEP tergolong tinggi. Risiko likuiditas meningkat.');
    if (list.length === 0) list.push('Performa bisnis sangat baik. Pertahankan efisiensi operasional saat ini.');
    renderList('perbaikanList', list.slice(0, 4), 'li');
  }

  function renderRekomendasi(m, state) {
    var fmtBep = isFinite(m.bep) ? Math.round(m.bep).toLocaleString('id-ID') : '—';
    var list = [];
    if (m.net < 0) {
      list.push('Fokus utama adalah mencapai target BEP ' + fmtBep + ' unit dengan meningkatkan aktivitas pemasaran.');
      list.push('Tinjau ulang biaya tetap, kurangi pengeluaran yang tidak krusial untuk operasional bulan ini.');
    } else {
      list.push('Pertahankan momentum penjualan saat ini dan mulai sisihkan sebagian keuntungan untuk dana cadangan.');
      if (m.margin < 0.25) list.push('Eksplorasi pemasok bahan baku alternatif untuk menekan biaya variabel per unit.');
    }
    list.push('Gunakan What-if Simulator untuk menguji skenario perubahan harga jual terhadap volume permintaan pelanggan.');
    renderList('rekStrategisList', list, 'li');
  }

  function renderList(id, items, tag) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(function (t) { return '<' + tag + '>' + t + '</' + tag + '>'; }).join('');
  }

})();
