/* simulator-app.js — BizLens What-if Simulator Page */
(function () {
  'use strict';
  var BC = BizCore;
  var rupiah = BC.rupiah, ringkas = BC.ringkas;
  var SAGE = BC.SAGE, AMBER = BC.AMBER, CLAY = BC.CLAY, ACC = BC.ACC;
  var MONTHS = BC.MONTHS;
  var PROJ_LABELS = ['Sep+','Okt+','Nov+'];

  var data  = BC.loadAnalysis();
  var state = BC.stateFromData(data);
  var m0    = BC.compute(state);
  var qp    = data ? '?id=' + data.id : '';
  var simState = Object.assign({}, state);
  var simChart;

  /* ── Sidebar links ─────────────────────────────────────────── */
  document.querySelectorAll('.side__nav a').forEach(function(a){
    if (data && a.href.indexOf('?') === -1) a.href += qp;
  });
  var btnD = document.getElementById('btnDashboard');
  if (btnD) btnD.href = 'dashboard.html' + qp;
  var av = document.getElementById('avatarEl');
  if (av && data && data.namaOwner) av.textContent = data.namaOwner.slice(0,2).toUpperCase();
  var bc = document.getElementById('bizNameCrumb');
  if (bc) bc.textContent = data ? (data.namaUsaha || 'Analisis') : 'Pilih Analisis';
  var fn = document.getElementById('footBizName');
  if (fn) fn.textContent = data ? (data.namaUsaha || 'Analisis') : 'Pilih Analisis';
  var ss = document.getElementById('sideScore'); if (ss) ss.textContent = m0.score;
  var sb = document.getElementById('sideBar');
  if (sb) { sb.style.width = m0.score + '%'; sb.style.background = BC.scoreColor(m0.score); }

  /* ── Helpers ───────────────────────────────────────────────── */
  function fmt(v) { return rupiah(Math.abs(v)); }
  function scoreColor(s) { return s >= 70 ? SAGE : s >= 45 ? AMBER : CLAY; }

  /* ── Fill baseline (data asli) ─────────────────────────────── */
  var op = document.getElementById('origProfit');
  if (op) op.textContent = ringkas(Math.abs(m0.net));
  var ob = document.getElementById('origBep');
  if (ob) ob.textContent = isFinite(m0.bep) ? m0.bep.toLocaleString('id-ID') : '-';
  var osc = document.getElementById('origScore');
  if (osc) { osc.textContent = m0.score; osc.style.color = scoreColor(m0.score); }

  /* ── Set slider ranges ─────────────────────────────────────── */
  function setRange(id, val, factor, minMax) {
    var el = document.getElementById(id); if (!el) return;
    el.min   = 0;
    // Jika val sangat kecil, berikan ruang gerak (minMax) yang masuk akal
    var calcMax = Math.round(val * (1 + factor));
    el.max   = Math.max(calcMax, minMax || 0);
    el.step  = 1;
    el.value = val;
  }
  setRange('sPrice', state.price, 5, 50000);
  setRange('sCost',  state.cost,  5, 25000);
  setRange('sUnits', state.units, 10, 100);
  setRange('sOps',   state.ops,   10, 5000000);

  /* Hint text */
  function hintText(id, el, unit) {
    var h = document.getElementById(id); if (!h) return;
    h.textContent = 'Min: ' + (unit === 'Rp' ? rupiah(+el.min) : el.min + ' unit') + ' — Max: ' + (unit === 'Rp' ? rupiah(+el.max) : el.max + ' unit');
  }
  hintText('hintPrice', document.getElementById('sPrice'), 'Rp');
  hintText('hintCost',  document.getElementById('sCost'),  'Rp');
  hintText('hintUnits', document.getElementById('sUnits'), 'unit');
  hintText('hintOps',   document.getElementById('sOps'),   'Rp');

  /* ── Sync labels ───────────────────────────────────────────── */
  function syncLabels() {
    var vp = document.getElementById('vPrice'); if (vp) vp.textContent = rupiah(simState.price);
    var vc = document.getElementById('vCost');  if (vc) vc.textContent = rupiah(simState.cost);
    var vu = document.getElementById('vUnits'); if (vu) vu.textContent = simState.units.toLocaleString('id-ID') + ' unit';
    var vo = document.getElementById('vOps');   if (vo) vo.textContent = rupiah(simState.ops);
  }
  syncLabels();

  /* ── Build sim chart ───────────────────────────────────────── */
  function buildSim(m) {
    var node = document.getElementById('simChart'); if (!node || !window.BizCharts) return;
    var cColor = m.net >= 0 ? ACC : CLAY;
    if (!simChart || simChart.opts.color !== cColor) {
      simChart = new BizCharts.Line(node, { color: cColor, projColor: AMBER, fmt: rupiah, axis: ringkas, pad:{t:12,r:12,b:24,l:46}, grid:3 });
    }
    var hist = m.history.slice(6);
    var labels = MONTHS.slice(6);
    var series = hist.map(function(v,i){return{label:labels[i],v:v};});
    m.proj.forEach(function(v,i){series.push({label:PROJ_LABELS[i],v:v,proj:true});});
    simChart.render(series, true);
  }
  buildSim(m0);

  /* ── Update preview ────────────────────────────────────────── */
  function updatePreview(m) {
    var sc = document.getElementById('simScore');
    if (sc) { sc.textContent = m.score; sc.style.color = scoreColor(m.score); }
    var sp = document.getElementById('simProfit');
    if (sp) { sp.textContent = (m.net < 0 ? '-' : '') + 'Rp' + ringkas(Math.abs(m.net)); sp.style.color = m.net >= 0 ? '#384B70' : CLAY; }
    var sr = document.getElementById('simRoi');
    if (sr) sr.textContent = m.roi.toFixed(1) + '%';
    var sb2 = document.getElementById('simBep');
    if (sb2) sb2.textContent = isFinite(m.bep) ? m.bep.toLocaleString('id-ID') + ' unit' : '-';

    /* Delta badge */
    var changed = simState.price !== state.price || simState.cost !== state.cost || simState.units !== state.units || simState.ops !== state.ops;
    var delta = document.getElementById('deltaBadge');
    if (delta) {
      if (!changed) { delta.textContent = 'Belum ada perubahan'; delta.className = 'tag'; return; }
      var diff = m.net - m0.net;
      var pct  = m0.net !== 0 ? ((diff / Math.abs(m0.net)) * 100).toFixed(1) : 'n/a';
      delta.textContent = (diff >= 0 ? '+' : '') + rupiah(diff) + '/bln (' + (diff >= 0 ? '+' : '') + pct + '%)';
      delta.className   = 'tag ' + (diff >= 0 ? 'tag--up' : 'tag--dn');
    }

    /* Note */
    var pn = document.getElementById('pNote');
    if (pn) {
      if (!changed) { pn.textContent = 'Geser slider untuk memulai simulasi…'; pn.style.color = '#64748B'; return; }
      pn.textContent = m.net >= 0 ? '✅ Profit Rp' + ringkas(m.net) + '/bln · ' + (m.margin*100).toFixed(1) + '% margin' : '⚠️ Merugi Rp' + ringkas(Math.abs(m.net)) + '/bln';
      pn.style.color = m.net >= 0 ? SAGE : CLAY;
    }
  }

  /* ── Comparison table ──────────────────────────────────────── */
  function updateComparison(m) {
    var tb = document.getElementById('compBody'); if (!tb) return;
    var rows = [
      { name:'Revenue',      orig: rupiah(m0.revenue),              sim: rupiah(m.revenue),                 raw: m.revenue - m0.revenue },
      { name:'Net Profit',   orig: rupiah(m0.net),                  sim: rupiah(m.net),                     raw: m.net - m0.net },
      { name:'Margin Bersih',orig: (m0.margin*100).toFixed(1)+'%',  sim: (m.margin*100).toFixed(1)+'%',    raw: (m.margin - m0.margin)*100 },
      { name:'BEP',          orig: isFinite(m0.bep)?m0.bep+' unit':'-', sim: isFinite(m.bep)?m.bep+' unit':'-', raw: isFinite(m.bep)&&isFinite(m0.bep)?m0.bep-m.bep:null },
      { name:'ROI',          orig: m0.roi.toFixed(1)+'%',           sim: m.roi.toFixed(1)+'%',              raw: m.roi - m0.roi },
      { name:'Health Score', orig: m0.score,                        sim: m.score,                           raw: m.score - m0.score }
    ];
    tb.innerHTML = rows.map(function(r) {
      var d = r.raw;
      var dStr = d === null ? '—' : (d >= 0 ? '+' : '') + (typeof d === 'number' ? (Number.isInteger(d) ? d : d.toFixed(1)) : d);
      if (r.name === 'Revenue' || r.name === 'Net Profit') dStr = d === null ? '—' : (d >= 0 ? '+' : '') + rupiah(d);
      var cls = d === null ? '' : d > 0 ? (r.name === 'BEP' ? 'change-pos' : 'change-pos') : (d < 0 ? 'change-neg' : '');
      if (r.name === 'BEP') cls = d !== null && d > 0 ? 'change-pos' : 'change-neg';
      return '<tr><td style="font-weight:500;color:#1F2937">' + r.name + '</td>' +
        '<td style="color:#64748B">' + r.orig + '</td>' +
        '<td style="font-weight:600;color:#384B70">' + r.sim + '</td>' +
        '<td class="' + cls + '">' + dStr + '</td></tr>';
    }).join('');
  }
  updatePreview(m0);
  updateComparison(m0);

  /* ── Slider input events ───────────────────────────────────── */
  var sliders = [
    { id:'sPrice', key:'price' },
    { id:'sCost',  key:'cost'  },
    { id:'sUnits', key:'units' },
    { id:'sOps',   key:'ops'   }
  ];
  sliders.forEach(function(s) {
    var el = document.getElementById(s.id); if (!el) return;
    el.addEventListener('input', function() {
      simState[s.key] = +this.value;
      syncLabels();
      var m = BC.compute(simState);
      buildSim(m);
      updatePreview(m);
      updateComparison(m);
    });
  });

  /* Step buttons */
  document.querySelectorAll('.step-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = document.getElementById(this.dataset.target);
      if (!target) return;
      var step = +this.dataset.step;
      var newVal = Math.min(+target.max, Math.max(+target.min, +target.value + step));
      target.value = newVal;
      target.dispatchEvent(new Event('input'));
    });
  });

  /* Reset button */
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', function() {
    simState = Object.assign({}, state);
    sliders.forEach(function(s) {
      var el = document.getElementById(s.id);
      if (el) el.value = simState[s.key];
    });
    syncLabels();
    var m = BC.compute(simState);
    buildSim(m);
    updatePreview(m);
    updateComparison(m);
  });

  /* ── Save simulation ───────────────────────────────────────── */
  function showToast(msg) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    setTimeout(function(){ t.classList.remove('is-on'); }, 2500);
  }

  function renderSavedSims() {
    var list = document.getElementById('savedSimList'); if (!list) return;
    var all = BC.getAllAnalyses().filter(function(a){ return a.namaUsaha && a.namaUsaha.includes('Simulasi'); });
    if (all.length === 0) { list.innerHTML = '<p class="card__foot" style="margin-top:4px">Belum ada skenario tersimpan.</p>'; return; }
    all.sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); });
    list.innerHTML = all.slice(0,5).map(function(a) {
      var st = BC.stateFromData(a); var m = BC.compute(st);
      var d = new Date(a.createdAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      return '<a class="saved-sim-card" href="dashboard.html?id=' + a.id + qp.replace('?id='+data?.id,'') + '">' +
        '<div><p style="font-weight:500;font-size:13.5px;color:#1F2937;margin:0">' + (a.namaUsaha||'Simulasi') + '</p>' +
        '<p style="font-size:12px;color:#64748B;margin:2px 0 0">' + d + ' · Profit: ' + rupiah(m.net) + '</p></div>' +
        '<span class="tag ' + (m.net>=0?'tag--up':'tag--dn') + '">Score ' + m.score + '</span></a>';
    }).join('');
  }
  renderSavedSims();

  var saveBtn = document.getElementById('simSaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', function() {
    var nameInput = document.getElementById('simNameInput');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) { showToast('⚠️ Masukkan nama skenario terlebih dahulu'); return; }
    var base = data || {};
    var entry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      namaUsaha: name + ' (Simulasi)',
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
    var all = BC.getAllAnalyses();
    all.push(entry);
    localStorage.setItem('bizlens_analyses', JSON.stringify(all));
    if (nameInput) nameInput.value = '';
    showToast('✅ Skenario "' + name + '" berhasil disimpan!');
    renderSavedSims();
  });

  BC.setupReveal();
  BC.setupGlow();
  if(window.lucide) lucide.createIcons();
  else if (window.lucide) lucide.createIcons();
})();

