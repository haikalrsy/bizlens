/* analytics-app.js — BizLens Analytics Page */
(function () {
  'use strict';
  var BC = BizCore;
  var rupiah = BC.rupiah, ringkas = BC.ringkas, byId = BC.byId;
  var SAGE = BC.SAGE, AMBER = BC.AMBER, CLAY = BC.CLAY, ACC = BC.ACC;
  var reduced = BC.reduced;
  var MONTHS = BC.MONTHS;
  var PROJ_LABELS = ['Sep+','Okt+','Nov+'];

  /* ── Load data ────────────────────────────────────────────── */
  var data  = BC.loadAnalysis();
  var state = BC.stateFromData(data);
  var m     = BC.compute(state);
  var qp    = data ? '?id=' + data.id : '';
  var currentRange = 12;
  var mainChart;

  /* ── Sidebar & topbar ─────────────────────────────────────── */
  /* Update all sidebar hrefs to preserve ?id= */
  document.querySelectorAll('.side__nav a').forEach(function(a){
    if (data && a.href.indexOf('?') === -1) a.href = a.href + qp;
  });
  byId('btnDashboard') && (byId('btnDashboard').href = 'dashboard.html' + qp);
  byId('footBizName') && (byId('footBizName').textContent = data ? (data.namaUsaha || 'Analisis') : 'Pilih Analisis');
  byId('bizNameCrumb') && (byId('bizNameCrumb').textContent = data ? (data.namaUsaha || 'Analisis') : 'Pilih Analisis');

  /* Avatar */
  var av = byId('avatarEl');
  if (av && data && data.namaOwner) av.textContent = data.namaOwner.slice(0,2).toUpperCase();

  /* Sidebar score */
  var ss = byId('sideScore'); if (ss) ss.textContent = m.score;
  var sb = byId('sideBar');
  if (sb) { sb.style.width = m.score + '%'; sb.style.background = BC.scoreColor(m.score); }

  /* ── Stat row ─────────────────────────────────────────────── */
  function fillStat(id, val) { var el = byId(id); if (!el) return; BC.animNum(el, Math.abs(val)); }
  fillStat('statRevenue', m.revenue);
  byId('statMargin') && BC.animNum(byId('statMargin'), Math.round(m.margin * 1000) / 10);
  fillStat('statProfit', Math.abs(m.net));
  byId('statRoi') && BC.animNum(byId('statRoi'), Math.round(m.roi));

  var revDelta = byId('statRevDelta');
  if (revDelta) { revDelta.textContent = 'Rp' + ringkas(m.revenue) + '/bln'; revDelta.className = 'stat-delta tag tag--up'; }

  var marginTag = byId('statMarginTag');
  if (marginTag) {
    if (m.margin >= 0.2) { marginTag.textContent = 'Di atas target'; marginTag.className = 'stat-delta tag tag--up'; }
    else if (m.margin >= 0.1) { marginTag.textContent = 'Mendekati target'; marginTag.className = 'stat-delta tag tag--warn'; }
    else { marginTag.textContent = 'Di bawah target'; marginTag.className = 'stat-delta tag tag--dn'; }
  }
  var profitTag = byId('statProfitTag');
  if (profitTag) {
    profitTag.textContent = m.net >= 0 ? 'Profit ' + (m.margin * 100).toFixed(1) + '%' : 'Rugi';
    profitTag.className = 'stat-delta tag ' + (m.net >= 0 ? 'tag--up' : 'tag--dn');
  }
  var roiTag = byId('statRoiTag');
  if (roiTag) {
    roiTag.textContent = m.roi >= 20 ? 'ROI Bagus' : m.roi >= 10 ? 'Perlu Ditingkatkan' : 'Rendah';
    roiTag.className = 'stat-delta tag ' + (m.roi >= 20 ? 'tag--up' : m.roi >= 10 ? 'tag--warn' : 'tag--dn');
  }

  /* ── Main chart ───────────────────────────────────────────── */
  function seriesOf(hist, proj, labels) {
    var out = hist.map(function(v,i){ return {label:labels[i], v:v}; });
    proj.forEach(function(v,i){ out.push({label:PROJ_LABELS[i], v:v, proj:true}); });
    return out;
  }
  function buildMain(months) {
    var node = byId('mainChart'); if (!node) return;
    var labels = MONTHS.slice(12 - months);
    var hist   = m.history.slice(12 - months);
    var cColor = m.net >= 0 ? ACC : CLAY;
    if (!mainChart || mainChart.opts.color !== cColor) {
      mainChart = new BizCharts.Line(node, { color: cColor, projColor: AMBER, fmt: rupiah, axis: ringkas });
    }
    mainChart.render(seriesOf(hist, m.proj, labels), true);
    var total = m.history.reduce(function(a,b){return a+b;},0) + m.proj.reduce(function(a,b){return a+b;},0);
    byId('revTotal') && BC.animNum(byId('revTotal'), total);
    var g = m.margin > 0.2 ? '+5.5' : m.margin > 0.08 ? '+3.0' : '-2.0';
    var pn = byId('projNote');
    if (pn) pn.textContent = 'Proyeksi 3 bulan ke depan: tren ' + g + '% per bulan berdasarkan margin saat ini (' + (m.margin*100).toFixed(1) + '%)';
  }
  buildMain(currentRange);

  /* Period toggle */
  document.querySelectorAll('#rangeToggle .seg__btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('#rangeToggle .seg__btn').forEach(function(b){b.classList.remove('is-on');});
      this.classList.add('is-on');
      currentRange = +this.dataset.m;
      buildMain(currentRange);
    });
  });

  /* ── Radar ────────────────────────────────────────────────── */
  function renderRadar() {
    var canvas = byId('radarCanvas'); if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var cx = canvas.width/2, cy = canvas.height/2, r = Math.min(cx,cy) - 28;
    var clamp = BC.clamp;
    var axes = [
      {label:'Margin',     val: clamp(m.margin/0.38, 0, 1)},
      {label:'ROI',        val: clamp(m.roi/70, 0, 1)},
      {label:'BEP',        val: clamp(m.bepRatio/2.6, 0, 1)},
      {label:'Revenue',    val: 0.77},
      {label:'Net Profit', val: clamp((m.net/m.revenue + 0.1)/0.5, 0, 1)}
    ];
    var n = axes.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    [0.25,0.5,0.75,1].forEach(function(level){
      ctx.beginPath();
      for (var i=0;i<n;i++){
        var angle = (Math.PI*2*i/n) - Math.PI/2;
        var x = cx + r*level*Math.cos(angle), y = cy + r*level*Math.sin(angle);
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.closePath(); ctx.strokeStyle = 'rgba(230,235,242,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    });
    for (var i=0;i<n;i++){
      var angle = (Math.PI*2*i/n) - Math.PI/2;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.lineTo(cx+r*Math.cos(angle), cy+r*Math.sin(angle));
      ctx.strokeStyle = 'rgba(230,235,242,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.beginPath();
    axes.forEach(function(axis,i){
      var angle = (Math.PI*2*i/n) - Math.PI/2;
      var x = cx + r*axis.val*Math.cos(angle), y = cy + r*axis.val*Math.sin(angle);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle = m.score>=70 ? 'rgba(94,159,110,0.2)' : m.score>=45 ? 'rgba(217,164,65,0.2)' : 'rgba(217,108,108,0.2)';
    ctx.fill();
    ctx.strokeStyle = BC.scoreColor(m.score); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#64748B'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    axes.forEach(function(axis,i){
      var angle = (Math.PI*2*i/n) - Math.PI/2;
      ctx.fillText(axis.label, cx+(r+20)*Math.cos(angle), cy+(r+20)*Math.sin(angle)+4);
    });
    var tag = byId('radarScoreTag');
    if (tag) { tag.textContent = 'Skor ' + m.score; tag.style.color = BC.scoreColor(m.score); }
  }
  renderRadar();

  /* ── Donut ────────────────────────────────────────────────── */
 /* ── Donut ────────────────────────────────────────────────── */
function renderDonut() {
  var node = byId('donut');
  if (!node || !window.BizCharts) return;

  var variable = Math.max(m.variable, 0);
  var fixed    = Math.max(m.fixed, 0);
  var net      = m.net;
  var revenue  = Math.max(m.revenue, 1);

  var vals, COLORS, labels;

  if (net >= 0) {
    vals = [variable, fixed, net];
    COLORS = [ACC, AMBER, SAGE];
    labels = ['Biaya Variabel', 'Biaya Tetap', 'Laba Bersih'];
  } else {
    vals = [variable, fixed, Math.abs(net)];
    COLORS = [ACC, AMBER, CLAY];
    labels = ['Biaya Variabel', 'Biaya Tetap', 'Kerugian'];
  }

  /* Donut berdasarkan proporsi terhadap pendapatan */
  BizCharts.donut(node, [
    {
      v: variable,
      color: COLORS[0],
      share: variable / revenue
    },
    {
      v: fixed,
      color: COLORS[1],
      share: fixed / revenue
    },
    {
      v: Math.max(net, 0),
      color: COLORS[2],
      share: Math.max(net, 0) / revenue
    }
  ]);

  /* Persentase biaya terhadap pendapatan */
  var costRatio = ((variable + fixed) / revenue) * 100;

  var dv = byId('donutVal');
  if (dv) {
    dv.textContent = costRatio.toFixed(1) + '%';
  }

  var costTag = byId('costRatioTag');
  if (costTag) {
    costTag.textContent = 'Biaya ' + costRatio.toFixed(1) + '%';

    if (costRatio < 70) {
      costTag.className = 'tag tag--up';
    } else if (costRatio < 85) {
      costTag.className = 'tag tag--warn';
    } else {
      costTag.className = 'tag tag--dn';
    }
  }

  var dl = byId('donutLegend');
  if (dl) {
    dl.innerHTML = vals.map(function (v, i) {
      var percent = (v / revenue * 100).toFixed(1);

      return (
        '<li>' +
          '<span style="display:flex;align-items:center;gap:8px;">' +
            '<i style="background:' + COLORS[i] + ';display:inline-block;width:10px;height:10px;border-radius:50%;"></i>' +
            labels[i] +
          '</span>' +
          '<b>' +
            percent + '% (' + ringkas(v) + ')' +
          '</b>' +
        '</li>'
      );
    }).join('');
  }
}

renderDonut();

  /* ── Metric table ─────────────────────────────────────────── */
  function renderTable() {
    var tb = byId('metricBody'); if (!tb) return;
    var rows = [
      { name:'Margin Bersih', val: (m.margin*100).toFixed(1)+'%', target:'20%',
        ok: m.margin>=0.2, warn: m.margin>=0.1, note: m.margin>=0.2?'Margin sehat':'Tingkatkan efisiensi biaya' },
      { name:'ROI', val: m.roi.toFixed(1)+'%', target:'20%',
        ok: m.roi>=20, warn: m.roi>=10, note: m.roi>=20?'Return modal baik':'Optimalkan penggunaan modal' },
      { name:'BEP (unit)', val: isFinite(m.bep)?m.bep.toLocaleString('id-ID'):'-', target: state.targetUnits||'—',
        ok: isFinite(m.bep)&&m.bep<=state.units*0.8, warn: isFinite(m.bep)&&m.bep<=state.units,
        note: isFinite(m.bep)?('BEP di hari ke-'+(m.bepHari||'?')):'Harga perlu > biaya' },
      { name:'Revenue Bulanan', val: rupiah(m.revenue), target: state.targetUnits ? rupiah(state.targetUnits*state.price) : '—',
        ok: m.revenue>0, warn: true, note: ringkas(m.revenue*12)+'/tahun' },
      { name:'Net Profit', val: rupiah(m.net), target:'Positif',
        ok: m.net>0, warn: m.net>=-m.revenue*0.05, note: m.net>=0?'Profit bersih positif':'Bisnis dalam kondisi merugi' },
      { name:'Biaya / Revenue', val: Math.round((m.variable+m.fixed)/m.revenue*100)+'%', target:'<80%',
        ok:(m.variable+m.fixed)/m.revenue<0.8, warn:(m.variable+m.fixed)/m.revenue<0.9, note:'Rasio efisiensi operasional' }
    ];
    tb.innerHTML = rows.map(function(r){
      var color = r.ok ? SAGE : r.warn ? AMBER : CLAY;
      var label = r.ok ? 'Tercapai' : r.warn ? 'Perlu Perhatian' : 'Kritis';
      var tagCls = r.ok ? 'tag--up' : r.warn ? 'tag--warn' : 'tag--dn';
      return '<tr>' +
        '<td><span class="metric-name">' + r.name + '</span></td>' +
        '<td><span class="metric-val">' + r.val + '</span></td>' +
        '<td style="color:#64748B">' + r.target + '</td>' +
        '<td><span class="tag ' + tagCls + '" style="font-size:11px">' + label + '</span></td>' +
        '<td style="color:#64748B;font-size:13px">' + r.note + '</td>' +
        '</tr>';
    }).join('');
  }
  renderTable();

  /* ── Benchmark UMKM ───────────────────────────────────────── */
  function renderBenchmark() {
    var row = byId('benchRow'); if (!row) return;
    var UMKM_MARGIN = 15, UMKM_ROI = 20, UMKM_BEP = 0.6;
    var benchmarks = [
      { label: 'Margin Bersih', you: (m.margin*100).toFixed(1), avg: UMKM_MARGIN, unit:'%',
        barYou: Math.min(100, m.margin*100/0.38), barAvg: Math.min(100, UMKM_MARGIN/0.38) },
      { label: 'ROI', you: m.roi.toFixed(1), avg: UMKM_ROI, unit:'%',
        barYou: Math.min(100, m.roi/70*100), barAvg: Math.min(100, UMKM_ROI/70*100) },
      { label: 'Jarak ke BEP', you: isFinite(m.bep)?(m.bepRatio*100).toFixed(0):'-', avg: Math.round(UMKM_BEP*100), unit:'%',
        barYou: Math.min(100, m.bepRatio/2.6*100), barAvg: Math.min(100, UMKM_BEP/2.6*100) }
    ];
    row.innerHTML = benchmarks.map(function(b){
      var youNum = parseFloat(b.you);
      var avgNum = b.avg;
      var delta = isFinite(youNum) ? youNum - avgNum : null;
      var deltaStr = delta !== null ? (delta >= 0 ? '+' : '') + delta.toFixed(1) + b.unit + ' vs rata-rata' : '—';
      var deltaColor = delta !== null && delta >= 0 ? SAGE : CLAY;
      var barColor = BC.scoreColor(m.score);
      return '<div class="bench-card card glass">' +
        '<p class="card__label">' + b.label + '</p>' +
        '<p class="bench-you" style="color:' + barColor + '">' + b.you + b.unit + '</p>' +
        '<p class="bench-avg">Rata-rata UMKM: ' + b.avg + b.unit + '</p>' +
        '<div class="bench-bar"><i style="width:' + b.barYou.toFixed(0) + '%;background:' + barColor + '"></i></div>' +
        '<p class="bench-delta" style="color:' + deltaColor + '">' + deltaStr + '</p>' +
        '</div>';
    }).join('');
  }
  renderBenchmark();

  /* ── Reveal + Glow ────────────────────────────────────────── */
  BC.setupReveal();
  BC.setupGlow();

  if(window.lucide) lucide.createIcons();
  else if (window.lucide) lucide.createIcons();

})();

