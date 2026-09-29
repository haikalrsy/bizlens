/* ============================================================
   BizLens · Dashboard engine
   Satu model bisnis. Semua sel dashboard adalah turunannya.
   ============================================================ */
(function (global) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rupiah = function (n) { return 'Rp' + Math.round(n).toLocaleString('id-ID'); };
  var ringkas = function (n) {
    if (Math.abs(n) >= 1e9) return 'Rp' + (n / 1e9).toFixed(1).replace('.', ',') + 'M';
    if (Math.abs(n) >= 1e6) return 'Rp' + (n / 1e6).toFixed(1).replace('.', ',') + 'jt';
    return rupiah(n);
  };

  var state = { price: 25000, units: 1800, cost: 11000, ops: 14000000, mkt: 0 };

  function compute(s) {
    var revenue = s.price * s.units;
    var variable = s.cost * s.units;
    var fixed = (s.ops || 0) + (s.mkt || 0);  /* konsisten dgn biz-core.js */
    var net = revenue - variable - fixed;
    var margin = revenue ? net / revenue : 0;
    var contrib = s.price - s.cost;
    var bep = contrib > 0 ? Math.ceil(fixed / contrib) : Infinity;
    var bepRatio = isFinite(bep) ? s.units / bep : 0;
    var roi = (fixed + variable) ? (net / (fixed + variable)) * 100 : 0;

    var score = clamp(
      Math.round(
        clamp(margin / 0.38, 0, 1) * 44 +
        clamp(bepRatio / 2.6, 0, 1) * 32 +
        clamp(roi / 70, 0, 1) * 24
      ), 3, 99
    );

    var history = [];
    var base = revenue * 0.74;
    for (var i = 0; i < 12; i++) {
      var trend = base + (revenue - base) * (i / 11);
      var wave = Math.sin(i * 1.15) * revenue * 0.045 + Math.cos(i * 2.1) * revenue * 0.02;
      history.push(Math.max(revenue * 0.35, trend + wave));
    }
    var growth = margin > 0.18 ? 0.055 : margin > 0.08 ? 0.028 : -0.02;
    var projection = [history[11]];
    for (var j = 1; j <= 3; j++) projection.push(projection[j - 1] * (1 + growth));

    var flow = [];
    for (var k = 0; k < 8; k++) {
      flow.push(net * (0.55 + 0.09 * k) + (k % 3 === 1 ? -net * 0.18 : net * 0.06));
    }

    return {
      revenue: revenue, net: net, margin: margin, roi: roi, bep: bep, bepRatio: bepRatio,
      score: score, history: history, projection: projection, flow: flow,
      delta: ((history[11] / history[0]) - 1) * 100
    };
  }

  function scalePoints(values, x0, x1, min, max) {
    var W = x1 - x0, H = 200, pad = 16;
    var span = (max - min) || 1;
    return values.map(function (v, i) {
      var x = x0 + (values.length === 1 ? 0 : (i / (values.length - 1)) * W);
      var y = H - pad - ((v - min) / span) * (H - pad * 2);
      return [x, y];
    });
  }
  function smooth(pts) {
    if (!pts.length) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i - 1], c = pts[i], mx = (p[0] + c[0]) / 2;
      d += ' C' + mx.toFixed(1) + ' ' + p[1].toFixed(1) + ',' + mx.toFixed(1) + ' ' + c[1].toFixed(1) +
           ',' + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
    }
    return d;
  }

  var els = {};
  var animated = { score: 0, roi: 0, bep: 0 };

  function cacheEls() {
    ['gaugeArc', 'scoreNum', 'scoreLabel', 'chartArea', 'chartLine', 'chartProj', 'chartPin',
     'revDelta', 'roiNum', 'bepNum', 'bars', 'flowNet', 'riskLevel', 'riskFill', 'riskList',
     'aiText', 'aiRecs'].forEach(function (id) { els[id] = $(id); });
  }

  function tween(from, to, ms, cb) {
    var t0 = performance.now();
    function step(now) {
      var p = clamp((now - t0) / ms, 0, 1);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      cb(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderChart(m, animate) {
    var all = m.history.concat(m.projection.slice(1));
    var min = Math.min.apply(null, all) * 0.92;
    var max = Math.max.apply(null, all) * 1.06;
    var histPts = scalePoints(m.history, 4, 380, min, max);
    var projPts = scalePoints(m.projection, 380, 516, min, max);

    var line = smooth(histPts);
    els.chartLine.setAttribute('d', line);
    els.chartArea.setAttribute('d', line + ' L380 200 L4 200 Z');
    els.chartProj.setAttribute('d', smooth(projPts));
    var last = projPts[projPts.length - 1];
    els.chartPin.setAttribute('cx', last[0]);
    els.chartPin.setAttribute('cy', last[1]);
    els.revDelta.textContent = (m.delta >= 0 ? '+' : '') + m.delta.toFixed(1) + '% · ' + ringkas(m.revenue) + '/bln';
    if (animate) {
      els.chartLine.classList.remove('is-drawn');
      void els.chartLine.offsetWidth;
      els.chartLine.classList.add('is-drawn');
    }
  }

  function riskOf(m) {
    if (m.score >= 75) return { label: 'Rendah', pct: 22, notes: ['Margin sehat dan stabil', 'Penjualan jauh di atas BEP'] };
    if (m.score >= 50) return { label: 'Sedang', pct: 52, notes: ['Margin masih bisa ditingkatkan', 'Arus kas sensitif terhadap kenaikan biaya'] };
    if (m.score >= 30) return { label: 'Tinggi', pct: 76, notes: ['Jarak ke titik impas terlalu dekat', 'Biaya operasional menekan laba bersih'] };
    return { label: 'Kritis', pct: 94, notes: ['Bisnis beroperasi di bawah titik impas', 'Setiap unit terjual menambah kerugian'] };
  }

  function narrate(m) {
    var pct = (m.margin * 100).toFixed(1).replace('.', ',');
    if (m.margin <= 0) {
      return 'Setiap bulan bisnis Anda menutup dengan kerugian ' + ringkas(Math.abs(m.net)) +
             '. Harga jual belum menutup biaya, bukan penjualan yang kurang.';
    }
    if (m.score >= 75) {
      return 'Margin bersih Anda ' + pct + '% dan penjualan berada ' +
             Math.round((m.bepRatio - 1) * 100) + '% di atas titik impas. Ini posisi untuk berekspansi, bukan bertahan.';
    }
    if (m.score >= 50) {
      return 'Bisnis Anda sehat dengan margin ' + pct + '%, tetapi laba bersih ' + ringkas(m.net) +
             ' masih rapuh terhadap kenaikan biaya operasional.';
    }
    return 'Margin Anda hanya ' + pct + '% dan titik impas baru tercapai di ' +
           (isFinite(m.bep) ? m.bep.toLocaleString('id-ID') : '—') + ' unit. Perbaiki harga sebelum menambah stok.';
  }

  function recsOf(m) {
    var out = [];
    if (m.margin < 0.18) out.push(['Naikkan harga 5–8%', 'estimasi +' + ringkas(m.revenue * 0.06) + ' laba/bulan']);
    if (m.bepRatio < 1.3) out.push(['Turunkan biaya operasional 10%', 'BEP turun ke ' + Math.round(m.bep * 0.9).toLocaleString('id-ID') + ' unit']);
    if (m.margin >= 0.18) out.push(['Alokasikan 12% laba untuk stok cepat laku', 'proyeksi +' + ringkas(m.revenue * 0.04) + '/bulan']);
    out.push(['Tinjau ulang produk dengan kontribusi terendah', 'dampak margin +2,4 poin']);
    return out.slice(0, 3);
  }

  var typeTimer = null;
  function typeAI(text) {
    var el = els.aiText;
    if (!el) return;
    clearInterval(typeTimer);
    el.classList.remove('is-done');
    el.textContent = '';
    var i = 0, chunk = Math.max(1, Math.round(text.length / 90));
    typeTimer = setInterval(function () {
      i += chunk;
      el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(typeTimer); el.classList.add('is-done'); }
    }, 16);
  }

  function renderRecs(list) {
    els.aiRecs.innerHTML = '';
    list.forEach(function (r, i) {
      var li = document.createElement('li');
      li.style.setProperty('--d', (i * 90) + 'ms');
      li.innerHTML = '<b>' + (i + 1) + '</b><span>' + r[0] + ' — <em style="font-style:normal;color:var(--ink-40)">' + r[1] + '</em></span>';
      els.aiRecs.appendChild(li);
      requestAnimationFrame(function () { requestAnimationFrame(function () { li.classList.add('is-in'); }); });
    });
  }

  var lastNarrative = '';

  function render(opts) {
    opts = opts || {};
    var m = compute(state);

    tween(animated.score, m.score, 500, function (v) {
      animated.score = v;
      els.scoreNum.textContent = Math.round(v);
      els.gaugeArc.style.strokeDashoffset = String(264 - (264 * v) / 100);
      global.dispatchEvent(new CustomEvent('bizlens:score', { detail: Math.round(v) }));
    });
    tween(animated.roi, m.roi, 500, function (v) { animated.roi = v; els.roiNum.textContent = Math.round(v); });
    var bepShown = isFinite(m.bep) ? m.bep : 0;
    tween(animated.bep, bepShown, 500, function (v) {
      animated.bep = v;
      els.bepNum.textContent = isFinite(m.bep) ? Math.round(v).toLocaleString('id-ID') : '-';
    });

    els.scoreLabel.textContent =
      m.score >= 75 ? 'Sehat · siap bertumbuh' :
      m.score >= 50 ? 'Stabil · perlu penguatan margin' :
      m.score >= 30 ? 'Waspada · margin menipis' : 'Kritis · di bawah titik impas';

    renderChart(m, !!opts.draw);
    els.chartArea.classList.add('is-on');
    els.chartProj.classList.add('is-on');
    els.chartPin.classList.add('is-on');

    if (els.bars.children.length !== m.flow.length) {
      els.bars.innerHTML = '';
      m.flow.forEach(function () { els.bars.appendChild(document.createElement('i')); });
    }
    var peak = Math.max.apply(null, m.flow.map(Math.abs)) || 1;
    Array.prototype.forEach.call(els.bars.children, function (bar, i) {
      var v = m.flow[i];
      bar.style.setProperty('--h', clamp((Math.abs(v) / peak) * 100, 6, 100) + '%');
      bar.classList.toggle('is-neg', v < 0);
    });
    els.flowNet.textContent = (m.net >= 0 ? '+' : '−') + ringkas(Math.abs(m.net)) + ' bersih/bln';

    var risk = riskOf(m);
    els.riskLevel.textContent = risk.label;
    els.riskFill.style.width = risk.pct + '%';
    els.riskList.innerHTML = risk.notes.map(function (n) { return '<li>' + n + '</li>'; }).join('');

    var text = narrate(m);
    if (opts.type || text !== lastNarrative) {
      lastNarrative = text;
      if (opts.type) typeAI(text);
      else { clearInterval(typeTimer); els.aiText.textContent = text; els.aiText.classList.add('is-done'); }
      renderRecs(recsOf(m));
    }
    return m;
  }

  cacheEls();

  global.BizLens = {
    state: state,
    compute: compute,
    render: render,
    format: { rupiah: rupiah, ringkas: ringkas },
    set: function (patch, opts) { Object.assign(state, patch); return render(opts); }
  };
})(window);