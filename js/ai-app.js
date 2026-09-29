(function(){
  'use strict';
  var BC = BizCore;
  var rupiah = BC.rupiah, ringkas = BC.ringkas;
  var SAGE=BC.SAGE,AMBER=BC.AMBER,CLAY=BC.CLAY,ACC=BC.ACC;
  var data = BC.loadAnalysis();
  var state = BC.stateFromData(data);
  var m = BC.compute(state);
  var qp = data ? '?id=' + data.id : '';
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

  function renderScore(m) {
    var ring = document.getElementById('ringValue');
    if(ring) {
      setTimeout(function(){
        ring.style.strokeDashoffset = 578 * (1 - m.score / 100);
        ring.style.stroke = BC.scoreColor(m.score);
      }, 100);
    }
    BC.animNum('heroScore', 0, m.score, 1000);
    
    var stat = document.getElementById('heroStatus');
    if(stat) {
      stat.textContent = m.score >= 80 ? 'EXCELLENT' : (m.score >= 60 ? 'GOOD' : (m.score >= 40 ? 'FAIR' : 'POOR'));
      stat.style.color = BC.scoreColor(m.score);
    }
    
    var lm = document.getElementById('legMargin');
    if(lm) lm.textContent = (m.margin * 100).toFixed(1) + '%';
    var lf = document.getElementById('legFlow');
    if(lf) lf.textContent = rupiah(m.net);
    var lb = document.getElementById('legBep');
    if(lb) lb.textContent = isFinite(m.bep) ? Math.round(m.bep) + ' unit' : '-';
  }

  function renderAI(m) {
    var th = document.getElementById('aiThread');
    if(!th) return;
    th.innerHTML = '';
    
    var aiConf = document.getElementById('aiConf');
    if(aiConf) {
      var conf = Math.min(99, Math.round(70 + (m.score/100)*25));
      aiConf.textContent = 'Confidence: ' + conf + '%';
    }
    
    var risk = 'Tinggi';
    if(m.score > 75) risk = 'Rendah';
    else if(m.score > 50) risk = 'Sedang';
    document.getElementById('aiRisk').textContent = risk;
    
    var opp = 'Efisiensi Biaya';
    if(m.margin * 100 > 30) opp = 'Ekspansi Pasar';
    else if(m.bep < m.units * 0.5) opp = 'Skalabilitas';
    document.getElementById('aiOpp').textContent = opp;
    
    var mainMsg = 'Berdasarkan analisis data, bisnis Anda berada dalam kondisi ' + (m.score >= 60 ? 'sehat' : 'perlu perhatian') + '. ';
    if(m.net > 0) {
      mainMsg += 'Anda telah mencapai keuntungan bersih positif sebesar ' + rupiah(m.net) + ' dengan margin ' + (m.margin * 100).toFixed(1) + '%. ';
    } else {
      mainMsg += 'Saat ini bisnis masih mengalami kerugian sebesar ' + rupiah(Math.abs(m.net)) + '. ';
    }
    mainMsg += 'Berikut beberapa saran prioritas:';
    
    var bubbles = [
      { t: 'ai', txt: mainMsg },
      { t: 'rec', txt: 'Fokus pada peningkatan margin dengan evaluasi harga jual.' },
      { t: 'rec', txt: 'Perhatikan jarak ke BEP untuk memastikan target unit tercapai.' },
      { t: 'rec', txt: 'Pantau biaya operasional tetap agar tidak membebani arus kas.' }
    ];
    
    bubbles.forEach(function(b, i) {
      var div = document.createElement('div');
      div.className = 'bubble bubble--' + b.t;
      div.textContent = b.txt;
      th.appendChild(div);
      setTimeout(function(){ div.classList.add('is-in'); }, i * 300 + 100);
    });
  }

  function renderRekomendasi(m) {
    var grid = document.getElementById('rekGrid');
    if(!grid) return;
    grid.innerHTML = '';
    var recs = [];
    if(m.margin * 100 < 15) {
      recs.push({ i: 'alert-triangle', t: 'Tinjau Harga Jual', d: 'Margin di bawah 15%. Pertimbangkan kenaikan harga atau efisiensi bahan.'});
    }
    if(m.bep > m.units * 0.85) {
      recs.push({ i: 'target', t: 'Risiko BEP Tinggi', d: 'Target penjualan terlalu dekat dengan BEP. Kurangi biaya tetap.'});
    }
    if(m.roi < 20) {
      recs.push({ i: 'trending-down', t: 'ROI Sub-optimal', d: 'Pengembalian modal masih di bawah target 20% tahunan.'});
    }
    if(m.net > 0 && m.score > 60) {
      recs.push({ i: 'dollar-sign', t: 'Peluang Ekspansi', d: 'Kinerja sehat. Pertimbangkan investasi pemasaran untuk scale-up.'});
    }
    if(recs.length < 4) {
      recs.push({ i: 'activity', t: 'Pertahankan Kinerja', d: 'Secara umum indikator stabil, lanjutkan strategi saat ini.'});
      recs.push({ i: 'store', t: 'Diversifikasi Produk', d: 'Pertimbangkan produk baru untuk meningkatkan average order value.'});
    }
    
    recs.slice(0,4).forEach(function(r) {
      grid.innerHTML += `
        <div class="rek-card">
          <div class="flex items-center gap-3">
            <div class="rek-icon" style="background:rgba(15,76,117,.1);color:#0F4C75">
              <i data-lucide="${r.i}"></i>
            </div>
            <h4 class="font-semibold text-sm text-slate-800 m-0">${r.t}</h4>
          </div>
          <p class="text-xs text-slate-500 m-0 leading-relaxed">${r.d}</p>
        </div>
      `;
    });
  }

  function renderInsights(m) {
    var marginPct = m.margin * 100;
    var marginBar = Math.min(100, (marginPct / 38) * 100);
    var mb = document.getElementById('marginBar');
    if(mb) { mb.style.width = marginBar + '%'; mb.style.background = marginPct > 20 ? SAGE : (marginPct > 10 ? AMBER : CLAY); }
    var mt = document.getElementById('marginText');
    if(mt) mt.textContent = 'Saat ini ' + marginPct.toFixed(1) + '%. Target ideal >30%.';

    var bepRatio = m.units > 0 && isFinite(m.bep) ? (m.units / m.bep) : 0;
    var bepBar = Math.min(100, (bepRatio / 2.6) * 100);
    var bb = document.getElementById('bepBar');
    if(bb) { bb.style.width = bepBar + '%'; bb.style.background = bepRatio > 1.5 ? SAGE : (bepRatio > 1 ? AMBER : CLAY); }
    var bt = document.getElementById('bepText');
    if(bt) bt.textContent = 'Penjualan ' + (bepRatio*100).toFixed(0) + '% dari titik impas.';

    var roiBar = Math.min(100, (m.roi / 70) * 100);
    var rb = document.getElementById('roiBar');
    if(rb) { rb.style.width = roiBar + '%'; rb.style.background = m.roi > 20 ? SAGE : (m.roi > 10 ? AMBER : CLAY); }
    var rt = document.getElementById('roiText');
    if(rt) rt.textContent = 'ROI tercatat ' + m.roi.toFixed(1) + '% tahunan.';
  }

  function renderScenarios(m, state) {
    var sA = JSON.parse(JSON.stringify(state));
    sA.price = sA.price * 1.1;
    var mA = BC.compute(sA);
    document.getElementById('scenA_profit').textContent = ringkas(mA.net);
    document.getElementById('scenA_margin').textContent = (mA.margin * 100).toFixed(1) + '%';
    document.getElementById('scenA_score').textContent = mA.score;

    var sB = JSON.parse(JSON.stringify(state));
    sB.cost = sB.cost * 0.85;
    var mB = BC.compute(sB);
    document.getElementById('scenB_profit').textContent = ringkas(mB.net);
    document.getElementById('scenB_margin').textContent = (mB.margin * 100).toFixed(1) + '%';
    document.getElementById('scenB_score').textContent = mB.score;
  }

  renderScore(m);
  renderAI(m);
  renderRekomendasi(m);
  renderInsights(m);
  renderScenarios(m, state);

  var aiAgain = document.getElementById('aiAgain');
  if(aiAgain) aiAgain.addEventListener('click', function(){ renderAI(m); });

  BC.setupReveal();
  BC.setupGlow();
  if(window.lucide) lucide.createIcons();
})();

