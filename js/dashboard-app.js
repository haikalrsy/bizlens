/* ============================================================
   BizLens · Dashboard App — Data-Aware Version
   Membaca data dari localStorage (?id=...) atau fallback ke data demo.
   ============================================================ */
(function () {
  'use strict';
  
  var BC = window.BizCore;

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var byId = function (id) { return document.getElementById(id); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INK = '#1F2937', ACC = '#0F4C75';
  var SAGE = '#5E9F6E', AMBER = '#D9A441', CLAY = '#D96C6C';
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
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

  if(window.lucide) lucide.createIcons();

  var analysisData = null;
  var params = new URLSearchParams(window.location.search);
  var analisisId = params.get('id');

  if (analisisId) {
    try {
      var saved = JSON.parse(localStorage.getItem('bizlens_analyses') || '[]');
      for (var i = 0; i < saved.length; i++) {
        if (String(saved[i].id) === String(analisisId)) { analysisData = saved[i]; break; }
      }
    } catch (e) { /* fallback ke empty */ }
  }

  var state = BC.stateFromData(analysisData);
  /* DEBUG: hapus setelah fix */
  console.log('[BizLens DEBUG] raw data:', analysisData);
  console.log('[BizLens DEBUG] state:', state);
  var _dbgM = BC.compute(state);
  console.log('[BizLens DEBUG] price:', state.price, '| cost:', state.cost, '| contrib:', state.price - state.cost, '| ops:', state.ops, '| bep:', _dbgM.bep);


  BC.buildSidebar('dashboard', analysisData);
  BC.buildTopbar(analysisData, 'Dashboard');

  /* Update ekstra metadata spesifik dashboard */
  if (analysisData) {
    var greet = byId('greetName');
    if (greet) greet.textContent = analysisData.namaOwner || 'Anda';
    
    var srcTxt = document.querySelector('.src__txt');
    if (srcTxt) {
      var dateStr = new Date(analysisData.createdAt || Date.now()).toLocaleDateString('id-ID', {day:'numeric',month:'short', year:'numeric'});
      srcTxt.innerHTML = '<b>Data terhubung</b> &middot; Wizard Analisis &middot; ' + escHtml(dateStr) + ' &middot; Data Tersimpan';
    }
    
    var btnEdit = byId('btnEditData');
    if (btnEdit && analisisId) {
      btnEdit.href = 'wizard.html?edit=' + analisisId;
    }
  }

  var compute = BC.compute;

  /* ── Grafik ──────────────────────────────────────────────── */
  var MONTHS = ['Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'];
  var PROJ_LABELS = ['Sep+', 'Okt+', 'Nov+'];
  var mainChart, simChart;
  var currentRange = 12;

  function seriesOf(hist, proj, labels) {
    var out = hist.map(function (v, i) { return { label: labels[i], v: v }; });
    proj.forEach(function (v, i) { out.push({ label: PROJ_LABELS[i], v: v, proj: true }); });
    return out;
  }

  function buildMain(m, months) {
    var node = byId('mainChart');
    if (!node) return;
    var labels = MONTHS.slice(12 - months);
    var hist = m.history.slice(12 - months);
    var cColor = m.net >= 0 ? ACC : CLAY;
    if (!mainChart || mainChart.opts.color !== cColor) {
      mainChart = new BizCharts.Line(node, { color: cColor, projColor: AMBER, fmt: rupiah, axis: ringkas });
    }
    mainChart.render(seriesOf(hist, m.proj, labels), true);
  }

  function buildSim(m, draw) {
    var node = byId('simChart');
    if (!node) return;
    var cColor = m.net >= 0 ? ACC : CLAY;
    if (!simChart || simChart.opts.color !== cColor) {
      simChart = new BizCharts.Line(node, {
        color: cColor, projColor: AMBER, fmt: rupiah, axis: ringkas,
        pad: { t: 12, r: 12, b: 24, l: 46 }, grid: 3
      });
    }
    simChart.render(seriesOf(m.history.slice(6), m.proj, MONTHS.slice(6)), draw !== false);
  }

  function buildSpark() {
    var sparkEl = byId('sparkProfit');
    if (!sparkEl || !window.BizCharts) return;
    var m = compute(state);
    /* Gunakan seed deterministik dari ID analisis agar sparkline konsisten */
    var seed = analisisId ? parseInt(analisisId.slice(-6), 10) || 1 : 1;
    var sparkData = m.history.map(function (v, i) {
      var pseudo = Math.sin(seed * 9301 + i * 49297 + 233995) * 0.5 + 0.5;
      return v * (0.14 + pseudo * 0.09);
    });
    sparkEl.innerHTML = '';
    var color = m.net >= 0 ? ACC : CLAY;
    BizCharts.spark(sparkEl, sparkData, color);
  }

  /* ── Donut ───────────────────────────────────────────────── */
  function buildDonut(m) {
    var node = byId('donut');
    if (!node || !window.BizCharts) return;
    /* Biaya Variabel=biru, Ops=amber, Laba=hijau. Jika rugi, ganti laba dgn merah */
    var variable = Math.max(m.variable, 0);
    var fixed    = Math.max(m.fixed, 0);
    var net      = m.net;
    var COLORS, labels, vals;
    if (net >= 0) {
      vals   = [variable, fixed, net];
      COLORS = [ACC, AMBER, SAGE];
      labels = ['Biaya Variabel', 'Biaya Tetap', 'Laba Bersih'];
    } else {
      /* Bisnis rugi: tampilkan biaya + kekurangan */
      vals   = [variable, fixed, Math.abs(net)];
      COLORS = [ACC, AMBER, CLAY];
      labels = ['Biaya Variabel', 'Biaya Tetap', 'Kerugian'];
    }
    var total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
    BizCharts.donut(node, vals.map(function (v, i) { return { v: v, color: COLORS[i], share: v / total }; }));
    var dv = byId('donutVal');
    if (dv) dv.textContent = Math.round((variable + fixed) / total * 100) + '%';
    var dl = byId('donutLegend');
    if (dl) {
      dl.innerHTML = vals.map(function (v, i) {
        return '<li><i style="background:' + COLORS[i] + '"></i>' + labels[i] + '<b>' + ringkas(v) + '</b></li>';
      }).join('');
    }
  }

  /* ── Health Ring ─────────────────────────────────────────── */
  function renderScore(m) {
    var el = byId('heroScore') || byId('ringValue');
    var ring = byId('ringValue');
    var status = byId('heroStatus');
    var sideScore = byId('sideScore');
    var sideBar = byId('sideBar');

    if (ring) {
      var offset = Math.round(578 * (1 - m.score / 100));
      ring.style.strokeDashoffset = offset;
      ring.style.stroke = m.score >= 70 ? SAGE : m.score >= 45 ? AMBER : CLAY;
    }
    var scoreEl = byId('heroScore');
    if (scoreEl) {
      var cur = parseInt(scoreEl.textContent) || 0;
      var target = m.score;
      var step = function () {
        cur = Math.min(target, cur + Math.ceil((target - cur) / 6) + 1);
        scoreEl.textContent = cur;
        if (cur < target) requestAnimationFrame(step);
      };
      if (!reduced) requestAnimationFrame(step);
      else scoreEl.textContent = target;
    }
    if (status) {
      status.textContent = m.score >= 70 ? 'Sehat' : m.score >= 45 ? 'Perlu Perhatian' : 'Kritis';
      status.style.color = m.score >= 70 ? SAGE : m.score >= 45 ? AMBER : CLAY;
    }
    if (sideScore) sideScore.textContent = m.score;
    if (sideBar) sideBar.style.width = m.score + '%';

    var legMargin = byId('legMargin');
    var legFlow = byId('legFlow');
    var legBep = byId('legBep');
    if (legMargin) legMargin.textContent = (m.margin * 100).toFixed(1) + '%';
    if (legFlow) legFlow.textContent = rupiah(m.net);
    if (legBep) {
      var bepPct = isFinite(m.bep) ? Math.round((state.units - m.bep) / state.units * 100) : 0;
      legBep.textContent = bepPct + '%';
    }

    /* ── Hero text dinamis ──────────────────────────────────── */
    var heroPara = byId('heroParagraph');
    var heroDate = byId('heroDate');
    var pillBepText = byId('pillBepText');
    var pillRiskText = byId('pillRiskText');

    if (heroDate) {
      var now = new Date();
      var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      var months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      heroDate.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    }

    if (heroPara) {
      var pct = (m.margin * 100).toFixed(1).replace('.', ',');
      if (m.score >= 70) {
        heroPara.textContent = 'Bisnis Anda sehat! Margin bersih ' + pct + '% dan penjualan berada ' + Math.round((m.bepRatio - 1) * 100) + '% di atas titik impas. Ini momentum untuk berekspansi.';
      } else if (m.score >= 45) {
        heroPara.textContent = 'Bisnis Anda stabil dengan margin ' + pct + '%. Namun ada beberapa area yang bisa diperkuat — lihat rekomendasi di bawah atau coba What-If Simulator.';
      } else {
        heroPara.textContent = 'Perhatian! Margin bisnis Anda hanya ' + pct + '%. Gunakan What-If Simulator di bawah untuk mensimulasikan perbaikan harga atau efisiensi biaya.';
      }
    }

    if (pillBepText) {
      if (isFinite(m.bep)) {
        var daysToBreak = Math.ceil(m.bep / (state.units / 30));
        pillBepText.textContent = state.units >= m.bep ? 'BEP tercapai di hari ke-' + daysToBreak : 'Belum capai BEP (' + m.bep.toLocaleString('id-ID') + ' unit)';
      } else { pillBepText.textContent = 'BEP tidak terhitung'; }
    }

    if (pillRiskText) {
      pillRiskText.textContent = m.score >= 70 ? 'Risiko Rendah' : m.score >= 45 ? 'Risiko Sedang' : 'Risiko Tinggi';
    }

    /* ── Alert banner ───────────────────────────────────────── */
    var banner = byId('alertBanner');
    if (banner) {
      if (m.score < 45) {
        banner.className = 'alert-banner alert-banner--critical is-show';
        var at = byId('alertTitle'); if (at) at.textContent = m.score < 30 ? 'Bisnis dalam kondisi kritis — perlu tindakan segera!' : 'Waspada: margin bisnis Anda menipis';
        var ad = byId('alertDesc');
        if (ad) ad.textContent = m.net < 0
          ? 'Bisnis merugi Rp' + Math.round(Math.abs(m.net)).toLocaleString('id-ID') + '/bulan. Naikkan harga jual atau pangkas biaya via simulator di bawah.'
          : 'Margin bersih hanya ' + (m.margin * 100).toFixed(1) + '%. Coba simulasi kenaikan harga 5–10% di bawah.';
        var ab = byId('alertSimBtn'); if (ab) ab.className = 'btn btn--sm btn--critical';
      } else if (m.score < 70) {
        banner.className = 'alert-banner alert-banner--warn is-show';
        var at2 = byId('alertTitle'); if (at2) at2.textContent = 'Ada ruang untuk meningkatkan kesehatan bisnis';
        var ad2 = byId('alertDesc'); if (ad2) ad2.textContent = 'Margin ' + (m.margin * 100).toFixed(1) + '% masih bisa dioptimalkan. Simulasikan skenario di bawah.';
        var ab2 = byId('alertSimBtn'); if (ab2) ab2.className = 'btn btn--sm btn--warn-fill';
      } else {
        banner.className = 'alert-banner';
      }
    }
    var dismissBtn = byId('alertDismiss');
    if (dismissBtn && !dismissBtn.__bound) {
      dismissBtn.__bound = true;
      dismissBtn.addEventListener('click', function () {
        var b = byId('alertBanner'); if (b) b.className = 'alert-banner';
      });
    }
  }

  /* ── KPI numerik ─────────────────────────────────────────── */
  function renderKPI(m) {
    function animNum(el, target, fmt) {
      if (!el) return;
      var cur = 0, dur = 700, t0 = performance.now();
      var run = function (now) {
        var p = Math.min((now - t0) / dur, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var v = Math.round(target * e);
        el.textContent = fmt ? v.toLocaleString('id-ID') : v.toLocaleString('id-ID');
        if (p < 1) requestAnimationFrame(run);
      };
      if (!reduced) requestAnimationFrame(run);
      else el.textContent = Math.round(target).toLocaleString('id-ID');
    }

    /* Profit */
    var kpiProfit = byId('kpiProfit');
    if (kpiProfit) animNum(kpiProfit, Math.abs(m.net), true);
    var tagProfit = byId('tagProfit');
    if (tagProfit) {
      if (m.net >= 0) {
        tagProfit.className = 'tag tag--up';
        tagProfit.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>' + (m.margin * 100).toFixed(1) + '%';
      } else {
        tagProfit.className = 'tag tag--dn';
        tagProfit.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l10 10M17 17H7M17 17V7"/></svg>Rugi';
      }
    }
    /* Update prefix warna */
    var profitEl = kpiProfit ? kpiProfit.parentElement : null;
    if (profitEl) profitEl.style.color = m.net >= 0 ? '#384B70' : CLAY;

    /* ROI */
    var kpiRoi = byId('kpiRoi');
    if (kpiRoi) animNum(kpiRoi, Math.round(m.roi));

    /* Cash Flow — gunakan revenue sebagai proxy */
    var kpiFlow = byId('kpiFlow');
    if (kpiFlow) animNum(kpiFlow, Math.abs(m.revenue), true);
    var flowNote = byId('flowNote');
    if (flowNote) flowNote.textContent = m.net >= 0 ? 'Delapan minggu terakhir · net positif' : 'Delapan minggu terakhir · net negatif';

    /* BEP */
    var kpiBep = byId('kpiBep');
    if (kpiBep) {
      if (isFinite(m.bep)) {
        animNum(kpiBep, m.bep);
        if(kpiBep.nextElementSibling) kpiBep.nextElementSibling.style.display = 'inline';
      } else {
        kpiBep.textContent = '-';
        if(kpiBep.nextElementSibling) kpiBep.nextElementSibling.style.display = 'none';
      }
    }

    var revSum = byId('revSum');
    if (revSum) revSum.textContent = ringkas(m.revenue);

    var pScore = byId('pScore');
    if (pScore) pScore.textContent = m.score;
    var pProfit = byId('pProfit');
    if (pProfit) pProfit.textContent = rupiah(m.net);
    var pBep = byId('pBep');
    if (pBep) pBep.textContent = isFinite(m.bep) ? m.bep.toLocaleString('id-ID') : '-';

    var flowBars = byId('flowBars');
    if (flowBars) {
      var baseH = Math.max(...m.history) || 1;
      var bars = '';
      m.history.slice(-8).forEach(function (v, idx) {
        bars += '<i style="--h:' + Math.round(v / baseH * 92) + '%;' + (idx === 7 ? '--flow-color:' + (m.net >= 0 ? SAGE : CLAY) + ';' : '') + '"></i>';
      });
      flowBars.innerHTML = bars;
    }
  }

  /* ── AI / Cermin Bisnis ──────────────────────────────────── */
  function renderAI(m) {
    var thread = byId('aiThread');
    var conf = byId('aiConf');
    var risk = byId('aiRisk');
    var opp = byId('aiOpp');

    var analysis, riskText, oppText, confidence;
    if (m.score >= 70) {
      analysis = 'Bisnis Anda dalam kondisi sehat. Margin ' + (m.margin * 100).toFixed(1) + '% berada di atas rata-rata UMKM dan ROI ' + m.roi.toFixed(1) + '% menunjukkan efisiensi modal yang baik.';
      riskText = 'Rendah'; oppText = 'Ekspansi pasar'; confidence = 92;
    } else if (m.score >= 45) {
      analysis = 'Bisnis Anda memerlukan perhatian. Margin ' + (m.margin * 100).toFixed(1) + '% masih di bawah target 20%. Fokus pada efisiensi biaya operasional untuk meningkatkan profitabilitas.';
      riskText = 'Sedang'; oppText = 'Optimasi harga'; confidence = 85;
    } else {
      analysis = 'Kondisi bisnis memerlukan intervensi segera. Dengan margin ' + (m.margin * 100).toFixed(1) + '% dan BEP di ' + (isFinite(m.bep) ? m.bep.toLocaleString('id-ID') + ' unit' : 'tidak tercapai') + ', bisnis belum mencapai titik impas yang diperlukan.';
      riskText = 'Tinggi'; oppText = 'Restrukturisasi biaya'; confidence = 78;
    }

    var recs = m.net < 0
      ? ['Kurangi biaya operasional minimal 15%', 'Naikkan harga jual 5-8% secara bertahap', 'Fokus pada produk dengan margin tertinggi']
      : m.score < 70
      ? ['Tingkatkan volume penjualan 10-15%', 'Review struktur biaya produksi', 'Pertimbangkan diversifikasi produk']
      : ['Pertahankan efisiensi operasional', 'Ekspansi ke segmen pasar baru', 'Reinvestasi 30% profit untuk pertumbuhan'];

    if (thread) {
      thread.innerHTML = '<div class="bubble bubble--ai">' + analysis + '</div>' +
        recs.map(function (r) { return '<div class="bubble bubble--rec">' + r + '</div>'; }).join('');
      setTimeout(function () {
        thread.querySelectorAll('.bubble').forEach(function (b, i) {
          setTimeout(function () { b.classList.add('is-in'); }, i * 120);
        });
      }, 100);
    }
    if (conf) conf.textContent = 'Confidence ' + confidence + '%';
    if (risk) risk.textContent = riskText;
    if (opp) opp.textContent = oppText;
  }

  /* ── Business Health Radar ───────────────────────────────── */
  function renderRadar(m) {
    var canvas = byId('radarCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 24;

    var axes = [
      { label: 'Margin', val: clamp(m.margin / 0.38, 0, 1) },
      { label: 'ROI', val: clamp(m.roi / 70, 0, 1) },
      { label: 'BEP', val: clamp(m.bepRatio / 2.6, 0, 1) },
      { label: 'Revenue', val: clamp(m.revenue / (m.revenue * 1.3), 0, 1) },
      { label: 'Net Profit', val: clamp((m.net / m.revenue + 0.1) / 0.5, 0, 1) }
    ];
    var n = axes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Grid rings */
    [0.25, 0.5, 0.75, 1].forEach(function (level) {
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        var x = cx + r * level * Math.cos(angle);
        var y = cy + r * level * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(230,235,242,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    /* Axis lines */
    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      ctx.strokeStyle = 'rgba(230,235,242,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* Data polygon */
    ctx.beginPath();
    axes.forEach(function (axis, i) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      var x = cx + r * axis.val * Math.cos(angle);
      var y = cy + r * axis.val * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    var fillColor = m.score >= 70 ? 'rgba(94,159,110,0.2)' : m.score >= 45 ? 'rgba(217,164,65,0.2)' : 'rgba(217,108,108,0.2)';
    var strokeColor = m.score >= 70 ? '#5E9F6E' : m.score >= 45 ? '#D9A441' : '#D96C6C';
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Labels */
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    axes.forEach(function (axis, i) {
      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      var x = cx + (r + 18) * Math.cos(angle);
      var y = cy + (r + 18) * Math.sin(angle) + 4;
      ctx.fillText(axis.label, x, y);
    });
  }

  /* ── Rekomendasi section ─────────────────────────────────── */
  function renderRekomendasi(m) {
    var el = byId('rekomendasiList');
    if (!el) return;
    var items = [];
    if (m.margin < 0.15) items.push({ icon: 'trending-up', text: 'Naikkan harga jual ' + Math.round((0.15 - m.margin) * 100) + '% untuk mencapai margin target 15%', color: '#D96C6C' });
    if (m.bep > m.units * 0.85) items.push({ icon: 'target', text: 'Volume penjualan hanya ' + Math.round(m.bepRatio * 100) + '% di atas BEP — perlebar jarak aman', color: '#D9A441' });
    if (m.roi < 20) items.push({ icon: 'bar-chart-2', text: 'ROI ' + m.roi.toFixed(1) + '% masih di bawah 20% — evaluasi efisiensi modal', color: '#D9A441' });
    if (m.net > 0 && m.score > 60) items.push({ icon: 'zap', text: 'Profit stabil — pertimbangkan ekspansi atau diversifikasi produk', color: '#5E9F6E' });
    items.push({ icon: 'book-open', text: 'Pantau arus kas mingguan dan bandingkan dengan proyeksi', color: '#0F4C75' });

    el.innerHTML = items.map(function (item, i) {
      return '<li class="rek-item" style="animation-delay:' + (i * 80) + 'ms">' +
        '<span class="rek-icon" style="background:' + item.color + '20;color:' + item.color + '">' +
        '<i data-lucide="' + item.icon + '"></i></span>' +
        '<span>' + item.text + '</span></li>';
    }).join('');
    if(window.lucide) lucide.createIcons();
    setTimeout(function () {
      el.querySelectorAll('.rek-item').forEach(function (li) { li.classList.add('is-in'); });
    }, 50);
  }

  /* ── Simulator (dashboard.html) ────────────────────────── */
  var simState = Object.assign({}, state), simDebounce;

  function syncLabels() {
    var f = function (id, val) { var e = byId(id); if (e) e.textContent = val; };
    f('vPrice', rupiah(simState.price));
    f('vCost', rupiah(simState.cost));
    f('vUnits', simState.units.toLocaleString('id-ID') + ' unit');
    f('vOps', rupiah(simState.ops));
  }

  function setupSliders() {
    /* Set dynamic min/max based on actual data from wizard */
    var sPrice = byId('sPrice');
    var sCost  = byId('sCost');
    var sUnits = byId('sUnits');
    var sOps   = byId('sOps');

    function setRange(el, val, factor) {
      if (!el) return;
      el.min  = Math.max(1,   Math.round(val * (1 - factor)));
      el.max  = Math.round(val * (1 + factor));
      el.value = val;
    }
    setRange(sPrice, state.price, 1.5);   /* ±150% harga */
    setRange(sCost,  state.cost,  1.5);
    setRange(sUnits, state.units, 2);     /* ±200% unit */
    setRange(sOps,   state.ops,   2);

    var sliders = [
      { id: 'sPrice', key: 'price' }, { id: 'sCost', key: 'cost' },
      { id: 'sUnits', key: 'units' }, { id: 'sOps', key: 'ops' }
    ];
    sliders.forEach(function (s) {
      var el = byId(s.id);
      if (!el) return;
      el.value = simState[s.key] || 0;
      el.addEventListener('input', function () {
        simState[s.key] = +this.value;
        syncLabels();
        var m = compute(simState);
        buildSim(m);
        var pScore = byId('pScore'); if (pScore) {
          pScore.textContent = m.score;
          pScore.style.color = m.score >= 70 ? SAGE : m.score >= 45 ? AMBER : CLAY;
        }
        var pProfit = byId('pProfit'); if (pProfit) pProfit.textContent = rupiah(m.net);
        var pBep = byId('pBep'); if (pBep) pBep.textContent = isFinite(m.bep) ? m.bep.toLocaleString('id-ID') : '-';
        var pNote = byId('pNote');
        var changed = simState.price !== state.price || simState.cost !== state.cost || simState.units !== state.units || simState.ops !== state.ops;
        var diff = m.net - compute(state).net;
        var diffStr = (diff >= 0 ? '+' : '') + rupiah(diff) + '/bln dibanding data asli';
        if (pNote) pNote.textContent = m.net >= 0
          ? '✓ Profit ' + rupiah(m.net) + '/bln · ' + (changed ? diffStr : 'Ini data asli Anda')
          : '⚠ Merugi ' + rupiah(Math.abs(m.net)) + '/bln · ' + (changed ? diffStr : '');
        pNote && (pNote.style.color = m.net >= 0 ? SAGE : CLAY);
      });
    });

    var resetBtn = byId('simReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        simState = Object.assign({}, state);
        sliders.forEach(function (s) { var e = byId(s.id); if (e) e.value = simState[s.key] || 0; });
        syncLabels();
        var m = compute(simState); buildSim(m);
        var pNote = byId('pNote'); if (pNote) { pNote.textContent = 'Reset ke data asli.'; pNote.style.color = INK; }
      });
    }

    /* ── Simpan skenario sebagai analisis baru ─────────────── */
    var saveBtn = byId('simSave');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var m = compute(simState);
        var analyses = JSON.parse(localStorage.getItem('bizlens_analyses') || '[]');
        var base = analysisData || {};
        var newEntry = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          namaUsaha: (base.namaUsaha || 'Bisnis') + ' (Simulasi)',
          jenisUsaha: base.jenisUsaha || 'Simulasi',
          namaOwner: base.namaOwner || '',
          price: simState.price, cost: simState.cost,
          units: simState.units, ops: simState.ops,
          modal: base.modal || 0,
          targetUnits: base.targetUnits || 0,
          targetMargin: base.targetMargin || 0,
          targetBep: base.targetBep || 0,
          targetRoi: base.targetRoi || 0
        };
        analyses.push(newEntry);
        localStorage.setItem('bizlens_analyses', JSON.stringify(analyses));

        saveBtn.textContent = '✓ Tersimpan!';
        saveBtn.style.background = SAGE;
        setTimeout(function () {
          if (confirm('Skenario disimpan. Buka dashboard analisis simulasi sekarang?')) {
            window.location.href = 'dashboard.html?id=' + newEntry.id;
          } else {
            saveBtn.innerHTML = '<i data-lucide="save"></i> Simpan sebagai Data Baru';
            saveBtn.style.background = '';
            if(window.lucide) lucide.createIcons();
          }
        }, 600);
      });
    }
  }

  /* ── Range segmented ─────────────────────────────────────── */
  function setupRangeToggle(m) {
    var btns = $$('.seg__btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('is-on'); });
        this.classList.add('is-on');
        currentRange = parseInt(this.dataset.range, 10) || 12;
        buildMain(compute(state), currentRange);
      });
    });
  }

  /* ── Section reveal ──────────────────────────────────────── */
  function setupReveal() {
    if (typeof IntersectionObserver === 'undefined') {
      $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ── Cursor glow ─────────────────────────────────────────── */
  function setupGlow() {
    var glow = byId('cursorGlow'); if (!glow || reduced) return;
    var gx = 0, gy = 0, tx = 0, ty = 0, on = false;
    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; glow.classList.add('is-on'); }
    }, { passive: true });
    (function loop() {
      gx += (tx - gx) * .12; gy += (ty - gy) * .12;
      var moved = Math.abs(tx - gx) > 0.3 || Math.abs(ty - gy) > 0.3;
      if (moved) glow.style.transform = 'translate3d(' + (gx - 210) + 'px,' + (gy - 210) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ── Data import panel ──────────────────────────────────── */
  function setupDataFlow() {
    var panel = byId('importPanel'), empty = byId('emptyState');
    if (!panel) return;
    function openImport(on) { panel.hidden = !on; }
    var oi = byId('openImport'); if (oi) oi.addEventListener('click', function () { openImport(panel.hidden); });
    var ci = byId('closeImport'); if (ci) ci.addEventListener('click', function () { openImport(false); });
    var de = byId('demoEmpty');
    if (de && empty) de.addEventListener('click', function () {
      empty.hidden = !empty.hidden;
      openImport(false);
    });
    var eb = byId('emptyBack'); if (eb && empty) eb.addEventListener('click', function () { empty.hidden = true; });
    var ei = byId('emptyImport'); if (ei) ei.addEventListener('click', function () { empty.hidden = true; openImport(true); });
    var pickFile = byId('pickFile'); if (pickFile) pickFile.addEventListener('click', function () { byId('fileInput') && byId('fileInput').click(); });
  }

  /* ── Print ───────────────────────────────────────────────── */
  function setupPrint() {
    var btn = byId('printBtn');
    if (btn) btn.addEventListener('click', function () { window.print(); });
  }

  /* ── Kembali ke Workspace ────────────────────────────────── */
  function setupBack() {
    var btn = byId('backToWorkspace');
    if (btn) btn.addEventListener('click', function () { window.location.href = 'workspace.html'; });
  }

  /* ── AI again ────────────────────────────────────────────── */
  function setupAIAgain(m) {
    var btn = byId('aiAgain');
    if (btn) btn.addEventListener('click', function () {
      var thread = byId('aiThread');
      if (thread) { thread.querySelectorAll('.bubble').forEach(function (b) { b.classList.remove('is-in'); }); }
      setTimeout(function () { renderAI(compute(state)); }, 300);
    });
  }

  /* ── Stepper +/- ──────────────────────────────────────────── */
  function setupSteppers() {
    $$('.slider').forEach(function (label) {
      var input = label.querySelector('input[type=range]');
      if (!input) return;
      var row = document.createElement('div');
      row.className = 'slider__row';
      input.parentNode.insertBefore(row, input);
      var minus = document.createElement('button');
      minus.type = 'button'; minus.className = 'step'; minus.textContent = '−';
      var plus = minus.cloneNode(false);
      plus.textContent = '+';
      row.appendChild(minus); row.appendChild(input); row.appendChild(plus);
      function nudge(dir) {
        var s = parseFloat(input.step) || 1;
        input.value = String(Math.min(+input.max, Math.max(+input.min, +input.value + dir * s)));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      minus.addEventListener('click', function () { nudge(-1); });
      plus.addEventListener('click', function () { nudge(1); });
    });
  }

  /* ── Live ticker ────────────────────────────────────────── */
  function setupTicker() {
    var list = $('.live-ticker__list');
    if (!list) return;
    var items = list.querySelectorAll('li'), cur = 0;
    setInterval(function () {
      items[cur].classList.remove('is-on');
      cur = (cur + 1) % items.length;
      items[cur].classList.add('is-on');
    }, 3200);
  }

  /* ── Last sync ───────────────────────────────────────────── */
  function setupSync() {
    var el = byId('lastSync'); if (!el) return;
    var t0 = Date.now();
    setInterval(function () {
      var s = Math.round((Date.now() - t0) / 1000);
      el.textContent = s < 45 ? 'baru saja' : s < 120 ? '1 menit lalu' : Math.round(s / 60) + ' menit lalu';
    }, 15000);
  }

  /* ── Sidebar Scrollspy ───────────────────────────────────── */
  function setupScrollspy() {
    var links = $$('.side__nav a[href^="#"]');
    if (!links.length) return;

    /* Smooth scroll */
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = this.getAttribute('href');
        if (targetId === '#overview') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          var targetEl = document.querySelector(targetId);
          if (targetEl) {
            var top = targetEl.getBoundingClientRect().top + window.scrollY - 80; /* offset topbar */
            window.scrollTo({ top: top, behavior: 'smooth' });
          }
        }
      });
    });

    var targets = links.map(function(link) {
      var id = link.getAttribute('href');
      return { link: link, el: id === '#overview' ? null : document.querySelector(id) };
    });

    /* Active state on scroll */
    function onScroll() {
      var scrollPos = window.scrollY + 100;
      var activeLink = links[0];
      
      for (var i = 1; i < targets.length; i++) {
        var target = targets[i];
        if (target.el && target.el.offsetTop <= scrollPos) {
          activeLink = target.link;
        }
      }

      links.forEach(function (link) { link.classList.remove('is-active'); });
      if (activeLink) activeLink.classList.add('is-active');
    }
    
    var scrollTicking = false;
    window.addEventListener('scroll', function() {
      if (!scrollTicking) {
        window.requestAnimationFrame(function() {
          onScroll();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
    onScroll();
  }


  /* ── Business Timeline ───────────────────────────────────── */
  function renderTimeline(m) {
    var tlItems = document.querySelector('.tl__items');
    if (!tlItems) return;
    
    var baseDate = analysisData && analysisData.createdAt ? new Date(analysisData.createdAt) : new Date();
    function formatD(d) { return d.toLocaleDateString('id-ID', {day:'2-digit', month:'short'}); }
    
    var events = [];
    events.push({ date: baseDate, name: 'Data bisnis berhasil dianalisis', done: true });
    
    var d2 = new Date(baseDate); d2.setDate(d2.getDate() + 2);
    events.push({ date: d2, name: 'Sistem menemukan ' + (m.net >= 0 ? 'margin positif' : 'celah kerugian'), done: true });
    
    var d3 = new Date(baseDate); d3.setDate(d3.getDate() + 7);
    events.push({ date: d3, name: 'Proyeksi BEP: ' + m.bep + ' unit', done: true });
    
    var d4 = new Date();
    events.push({ date: d4, name: 'Rekomendasi Cerdas memberikan saran', now: true });
    
    var d5 = new Date(); d5.setDate(d5.getDate() + 30);
    events.push({ date: d5, name: 'Jadwal evaluasi bulan depan', done: false });
    
    var html = '';
    events.forEach(function(e) {
      var cls = e.now ? 'is-now' : e.done ? 'is-done' : '';
      html += '<li class="tl__item ' + cls + '"><span class="tl__dot"></span><p class="tl__date">' + formatD(e.date) + '</p><p class="tl__name">' + e.name + '</p></li>';
    });
    
    tlItems.innerHTML = html;
  }

  /* ── Recent Analysis ─────────────────────────────────────── */
  function renderRecent() {
    var list = document.querySelector('.feed__list');
    if (!list) return;
    
    var analyses = JSON.parse(localStorage.getItem('bizlens_analyses') || '[]');
    if (analyses.length === 0) {
      list.innerHTML = '<p class="card__foot">Belum ada analisis lain.</p>';
      return;
    }
    
    analyses.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    var top = analyses.slice(0, 4);
    var html = '';
    
    top.forEach(function(a) {
      var d = new Date(a.createdAt);
      var timeStr = d.toLocaleDateString('id-ID', {day:'2-digit', month:'short'}) + ', ' + d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
      var namaEsc = escHtml(a.namaUsaha || 'Analisis');
      var isSim = a.namaUsaha && a.namaUsaha.includes('Simulasi');
      var isActive = (String(a.id) === String(analisisId)) ? '<span class="tag tag--up">Aktif</span>' : '<span class="tag">Buka</span>';
      
      var icon = isSim ? '<span class="feed__ico feed__ico--sage"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg></span>' : '<span class="feed__ico feed__ico--iris"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></span>';
      
      html += '<a class="feed__item card glass" href="dashboard.html?id=' + escHtml(String(a.id)) + '">' +
              icon +
              '<div><p class="feed__name">' + namaEsc + '</p><p class="card__foot">' + timeStr + '</p></div>' +
              isActive + '</a>';
    });
    
    list.innerHTML = html;
  }

  /* ── Boot ────────────────────────────────────────────────── */
  var m0 = compute(state);
  buildMain(m0, currentRange);
  buildSim(m0);
  buildSpark();
  buildDonut(m0);
  renderScore(m0);
  renderKPI(m0);
  renderAI(m0);
  renderRadar(m0);
  renderRekomendasi(m0);
  syncLabels();
  setupSliders();
  setupRangeToggle(m0);
  setupReveal();
  setupGlow();
  setupDataFlow();
  setupPrint();
  setupBack();
  setupAIAgain(m0);
  setupSteppers();
  setupTicker();
  setupSync();
  setupScrollspy();
  renderTimeline(m0);
  renderRecent();

  addEventListener('resize', function () {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(function () {
      var m = compute(state);
      buildMain(m, currentRange);
      buildSim(m);
      buildSpark();
      renderRadar(m);
    }, 200);
  });
})();
