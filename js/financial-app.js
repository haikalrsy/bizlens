(function(){
  'use strict';
  var BC = BizCore;
  var rupiah = BC.rupiah, ringkas = BC.ringkas;
  var SAGE=BC.SAGE,AMBER=BC.AMBER,CLAY=BC.CLAY,ACC=BC.ACC;
  var data = BC.loadAnalysis();
  var state = BC.stateFromData(data);
  var m = BC.compute(state);
  var qp = data ? '?id=' + data.id : '';

  /* ── Sidebar + Topbar ──────────────────────────────────────── */
  document.querySelectorAll('.side__nav a').forEach(function(a){
    if(data && a.href.indexOf('?')===-1) a.href+=qp;
  });
  var btnD=document.getElementById('btnDashboard');
  if(btnD) btnD.href='dashboard.html'+qp;
  var av=document.getElementById('avatarEl');
  if(av&&data&&data.namaOwner) av.textContent=data.namaOwner.slice(0,2).toUpperCase();
  var crumb=document.getElementById('bizNameCrumb');
  if(crumb) crumb.textContent=data?(data.namaUsaha||'Analisis'):'Pilih Analisis';
  var ss=document.getElementById('sideScore');
  if(ss) ss.textContent=m.score;
  var sb=document.getElementById('sideBar');
  if(sb){sb.style.width=m.score+'%';sb.style.background=BC.scoreColor(m.score);}

  /* ── Canonical computed aliases ──────────────────────────────── */
  var totalCost  = m.variable + m.fixed;   /* pengganti m.totalCost */
  var netProfit  = m.net;                  /* pengganti m.netProfit */
  var marginPct  = m.margin * 100;         /* pengganti m.marginPct */

  /* ── KPI row ─────────────────────────────────────────────────── */
  BC.animNum('finRevenue', 0, m.revenue, 1000);
  BC.animNum('finBiaya', 0, totalCost, 1000);

  var fProfit = document.getElementById('finProfit');
  if(fProfit) {
    BC.animNum('finProfit', 0, netProfit, 1000);
    fProfit.style.color = netProfit >= 0 ? SAGE : CLAY;
  }
  var ft = document.getElementById('finProfitTag');
  if(ft) {
    ft.textContent = netProfit >= 0 ? 'Profit Positif' : 'Masih Rugi';
    ft.className = 'tag mt-3 ' + (netProfit >= 0 ? 'tag--up' : 'tag--dn');
  }

  var cTotal = document.getElementById('finBiaya');
  if(cTotal && totalCost > m.revenue * 0.7) cTotal.style.color = CLAY;

  /* ── Donut chart ─────────────────────────────────────────────── */
  function renderDonut(m) {
    var vC = m.variable;
    var oC = state.ops || 0;
    var mC = state.mkt || 0;
    var sumC = vC + oC + mC;

    BizCharts.donut(document.getElementById('donut'), [
      {label: 'Produksi', value: vC || 0.01, color: ACC},
      {label: 'Operasional', value: oC || 0.01, color: AMBER},
      {label: 'Marketing', value: mC || 0.01, color: SAGE}
    ]);

    var dv = document.getElementById('donutVal');
    if(dv) dv.textContent = (m.revenue > 0 ? Math.round(sumC/m.revenue*100) : 0) + '%';

    var leg = document.getElementById('donutLegend');
    if(leg) {
      leg.innerHTML =
        '<li style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:8px"><i style="background:'+ACC+';display:inline-block;width:10px;height:10px;border-radius:50%"></i>Produksi</div><b>'+ringkas(vC)+'</b></li>' +
        '<li style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:8px"><i style="background:'+AMBER+';display:inline-block;width:10px;height:10px;border-radius:50%"></i>Operasional</div><b>'+ringkas(oC)+'</b></li>' +
        '<li style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:8px"><i style="background:'+SAGE+';display:inline-block;width:10px;height:10px;border-radius:50%"></i>Marketing</div><b>'+ringkas(mC)+'</b></li>';
    }
  }

  /* ── Tabel breakdown biaya ───────────────────────────────────── */
  function renderTable(m) {
    var tb = document.getElementById('finTable');
    if(!tb) return;

    var vC = m.variable;
    var oC = state.ops || 0;
    var mC = state.mkt || 0;
    var tot = vC + oC + mC;
    var pRev = m.revenue > 0 ? 100 / m.revenue : 0;

    tb.innerHTML =
      '<tr><td>Biaya Produksi / Variabel</td><td>'+rupiah(vC)+'</td><td>'+(vC*pRev).toFixed(1)+'%</td></tr>' +
      '<tr><td>Biaya Operasional Tetap</td><td>'+rupiah(oC)+'</td><td>'+(oC*pRev).toFixed(1)+'%</td></tr>' +
      '<tr><td>Biaya Marketing &amp; Lainnya</td><td>'+rupiah(mC)+'</td><td>'+(mC*pRev).toFixed(1)+'%</td></tr>' +
      '<tr style="font-weight:600"><td>Total Biaya</td><td>'+rupiah(tot)+'</td><td>'+(tot*pRev).toFixed(1)+'%</td></tr>' +
      '<tr><td colspan="3" style="padding:0;border:none;height:4px"></td></tr>' +
      '<tr style="font-weight:600"><td>Total Revenue</td><td>'+rupiah(m.revenue)+'</td><td>100%</td></tr>' +
      '<tr style="font-weight:700;color:'+(m.net>=0?SAGE:CLAY)+'"><td>Net Profit</td><td>'+rupiah(m.net)+'</td><td>'+(m.margin*100).toFixed(1)+'%</td></tr>';
  }

  /* ── Grafik cost vs revenue ──────────────────────────────────── */
  function renderCostChart(months) {
    var hist = m.history;
    if(!hist || hist.length === 0) return;
    var start = Math.max(0, hist.length - months);
    var ds = hist.slice(start);
    var MONTHS = BC.MONTHS || ['Sep','Okt','Nov','Des','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu'];
    var labels = MONTHS.slice(12 - ds.length);

    /* Revenue series */
    var revSeries = ds.map(function(v,i){ return {label: labels[i]||String(i+1), v: v}; });
    /* Estimasi biaya ~ totalCost/revenue * v per bulan */
    var costRatio = m.revenue > 0 ? totalCost / m.revenue : 0.7;
    var costSeries = ds.map(function(v,i){ return {label: labels[i]||String(i+1), v: v * costRatio}; });

    var node = document.getElementById('costChart');
    if(!node || !window.BizCharts) return;

    var chart = new BizCharts.Line(node, {color: ACC, projColor: AMBER, fmt: rupiah, axis: ringkas});
    chart.render(revSeries, false);
  }

  /* ── Rasio keuangan ──────────────────────────────────────────── */
  function renderRatios(m) {
    var rGross = m.revenue > 0 ? ((m.revenue - m.variable) / m.revenue) * 100 : 0;
    var elRG = document.getElementById('ratioGross');
    if(elRG) elRG.textContent = rGross.toFixed(1) + '%';
    var bg = document.getElementById('barGross');
    if(bg) { bg.style.width = Math.min(100, (rGross/30)*100) + '%'; bg.style.background = rGross > 30 ? SAGE : AMBER; }

    var mPct = m.margin * 100;
    var elRN = document.getElementById('ratioNet');
    if(elRN) elRN.textContent = mPct.toFixed(1) + '%';
    var bn = document.getElementById('barNet');
    if(bn) { bn.style.width = Math.min(100, (mPct/20)*100) + '%'; bn.style.background = mPct > 20 ? SAGE : AMBER; }

    var rCost = m.revenue > 0 ? (totalCost / m.revenue) * 100 : 100;
    var elRC = document.getElementById('ratioCost');
    if(elRC) elRC.textContent = rCost.toFixed(1) + '%';
    var bco = document.getElementById('barCost');
    if(bco) { bco.style.width = Math.min(100, 100-rCost) + '%'; bco.style.background = rCost < 80 ? SAGE : CLAY; }

    var elRR = document.getElementById('ratioRoi');
    if(elRR) elRR.textContent = m.roi.toFixed(1) + '%';
    var br = document.getElementById('barRoi');
    if(br) { br.style.width = Math.min(100, (m.roi/20)*100) + '%'; br.style.background = m.roi > 20 ? SAGE : AMBER; }
  }

  /* ── Efisiensi suggestions ───────────────────────────────────── */
  function renderEfisiensi(m) {
    var list = document.getElementById('efisiensiList');
    if(!list) return;

    var items = [];
    if(m.variable > m.revenue * 0.5) {
      items.push('Biaya variabel melebihi 50% revenue. Negosiasi ulang dengan supplier atau cari bahan alternatif.');
    }
    if((state.ops||0) > m.revenue * 0.3) {
      items.push('Biaya operasional cukup tinggi. Tinjau ulang beban sewa atau utilitas bulanan.');
    }
    if((state.mkt||0) < m.revenue * 0.05 && m.margin > 0.2) {
      items.push('Anggaran marketing rendah meski margin sehat. Tingkatkan ad-spend untuk mendorong volume penjualan.');
    }
    if(items.length < 3) {
      items.push('Terapkan bundle pricing untuk meningkatkan Average Order Value.');
      items.push('Review beban gaji bulanan seiring dengan pertumbuhan unit terjual.');
    }

    list.innerHTML = items.slice(0,3).map(function(txt, i){
      return '<div class="efisiensi-item"><div class="efisiensi-num">'+(i+1)+'</div><p style="font-size:13px;color:#1F2937;margin:0;padding-top:4px">'+txt+'</p></div>';
    }).join('');
  }

  renderDonut(m);
  renderTable(m);
  renderRatios(m);
  renderEfisiensi(m);

  setTimeout(function(){ renderCostChart(12); }, 300);

  document.querySelectorAll('.seg__btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.seg__btn').forEach(function(b){ b.classList.remove('is-on'); });
      this.classList.add('is-on');
      renderCostChart(parseInt(this.getAttribute('data-val')||'12', 10));
    });
  });

  BC.setupReveal();
  BC.setupGlow();
  if(window.lucide) lucide.createIcons();
})();

