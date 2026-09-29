(function(){
  'use strict';
  var BC = BizCore;
  var rupiah = BC.rupiah, ringkas = BC.ringkas;
  var SAGE=BC.SAGE,AMBER=BC.AMBER,CLAY=BC.CLAY,ACC=BC.ACC;
  
  var allData = BC.getAllAnalyses() || [];
  
  // Sort descending by date initially
  allData.sort(function(a,b){
    var da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    var db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  // Calculate metrics for all items
  var mappedData = allData.map(function(d){
    var state = BC.stateFromData(d);
    var m = BC.compute(state);
    return { data: d, m: m };
  });

  // Topbar init
  var qp = mappedData.length > 0 ? '?id=' + mappedData[0].data.id : '';
  document.querySelectorAll('.side__nav a').forEach(function(a){
    if(qp && a.href.indexOf('?')===-1) a.href+=qp;
  });
  var btnD=document.getElementById('btnDashboard');
  if(btnD) btnD.href='dashboard.html'+qp;
  
  var latest = mappedData[0] || null;
  var crumb=document.getElementById('bizNameCrumb');
  if(crumb) crumb.textContent = latest ? (latest.data.namaUsaha||'Analisis') : 'Pilih Analisis';
  
  var ss=document.getElementById('sideScore');
  var sb=document.getElementById('sideBar');
  if(latest) {
    if(ss) ss.textContent=latest.m.score;
    if(sb){sb.style.width=latest.m.score+'%';sb.style.background=BC.scoreColor(latest.m.score);}
  } else {
    if(ss) ss.textContent = '--';
  }

  // Header stats
  document.getElementById('totalCount').textContent = mappedData.length;
  if(latest) {
    document.getElementById('latestName').textContent = latest.data.namaUsaha || 'Analisis Tanpa Nama';
    if(latest.data.createdAt) {
      document.getElementById('latestDate').textContent = new Date(latest.data.createdAt).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    }
  }

  function renderGrid() {
    var grid = document.getElementById('analysisGrid');
    var empty = document.getElementById('emptyState');
    var q = (document.getElementById('searchInput').value || '').toLowerCase();
    var fType = document.getElementById('filterType').value;
    var sType = document.getElementById('sortType').value;

    var filtered = mappedData.filter(function(item){
      var n = (item.data.namaUsaha || '').toLowerCase();
      if(q && n.indexOf(q) === -1) return false;
      var isSim = n.indexOf('simulasi') !== -1;
      if(fType === 'asli' && isSim) return false;
      if(fType === 'simulasi' && !isSim) return false;
      return true;
    });

    filtered.sort(function(a,b){
      if(sType === 'score') return b.m.score - a.m.score;
      var ta = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
      var tb = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
      return sType === 'oldest' ? (ta - tb) : (tb - ta);
    });

    document.getElementById('filteredCount').textContent = filtered.length;

    if(filtered.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'block';
    } else {
      grid.style.display = 'grid';
      empty.style.display = 'none';
      grid.innerHTML = filtered.map(function(item){
        var d = item.data;
        var m = item.m;
        var isSim = (d.namaUsaha||'').toLowerCase().indexOf('simulasi') !== -1;
        var dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}) : '';
        
        return `
          <div class="analysis-card">
            <div class="flex justify-between items-start gap-2">
              <div>
                <h4 class="font-bold text-slate-800 m-0 truncate w-40" title="${d.namaUsaha||''}">${d.namaUsaha||'Analisis'}</h4>
                <p class="text-[10px] text-slate-500 m-0 mt-1">${dateStr}</p>
              </div>
              <span class="tag ${isSim?'tag--warn':'tag--up'} flex-none">${isSim?'Simulasi':'Asli'}</span>
            </div>
            
            <div class="mt-1 mb-2">
              <div class="flex justify-between items-end mb-1">
                <span class="text-xs font-medium text-slate-600">Health Score</span>
                <span class="font-bold text-lg" style="color:${BC.scoreColor(m.score)}">${m.score}</span>
              </div>
              <div class="score-bar"><i style="width:${m.score}%;background:${BC.scoreColor(m.score)}"></i></div>
            </div>

            <div class="analysis-metrics">
              <div class="analysis-metric">
                <p class="analysis-metric-label">Revenue</p>
                <p class="analysis-metric-val">${ringkas(m.revenue)}</p>
              </div>
              <div class="analysis-metric">
                <p class="analysis-metric-label">Profit</p>
                <p class="analysis-metric-val text-[${m.net>=0?SAGE:CLAY}]">${ringkas(m.net)}</p>
              </div>
              <div class="analysis-metric">
                <p class="analysis-metric-label">Margin</p>
                <p class="analysis-metric-val">${(m.margin * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div class="analysis-actions mt-auto pt-2">
              <a href="dashboard.html?id=${d.id}" class="btn btn--sm flex-1 justify-center">Buka</a>
              <button class="btn btn--ghost btn--sm btn-delete" data-id="${d.id}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
        `;
      }).join('');
      if(window.lucide) lucide.createIcons();
    }
  }

  function renderGlobalStats() {
    var wr = document.getElementById('globalStatsWrap');
    if(!wr) return;
    if(mappedData.length < 2) {
      wr.style.display = 'none';
      return;
    }
    wr.style.display = 'block';
    
    var sumRev = 0, sumScore = 0, maxScore = 0, bestName = '';
    mappedData.forEach(function(item){
      sumRev += item.m.revenue;
      sumScore += item.m.score;
      if(item.m.score > maxScore) {
        maxScore = item.m.score;
        bestName = item.data.namaUsaha || 'Analisis';
      }
    });
    var avg = (sumScore / mappedData.length).toFixed(0);

    document.getElementById('globalStats').innerHTML = `
      <div class="card p-5 bg-white/60 border-slate-200">
        <p class="card__label mb-2">Rata-rata Score</p>
        <p class="text-2xl font-bold text-slate-800 m-0">${avg}</p>
      </div>
      <div class="card p-5 bg-white/60 border-slate-200">
        <p class="card__label mb-2">Score Tertinggi</p>
        <p class="text-2xl font-bold text-slate-800 m-0">${maxScore}</p>
        <p class="text-xs text-slate-500 m-0 mt-1 truncate">${bestName}</p>
      </div>
      <div class="card p-5 bg-white/60 border-slate-200">
        <p class="card__label mb-2">Total Akumulasi Revenue</p>
        <p class="text-2xl font-bold text-slate-800 m-0">${rupiah(sumRev)}</p>
      </div>
    `;
  }

  renderGrid();
  renderGlobalStats();

  document.getElementById('searchInput').addEventListener('input', renderGrid);
  document.getElementById('filterType').addEventListener('change', renderGrid);
  document.getElementById('sortType').addEventListener('change', renderGrid);

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-delete');
    if(btn) {
      var id = btn.getAttribute('data-id');
      if(confirm('Hapus analisis ini?')) {
        var idx = allData.findIndex(function(d){ return d.id === id; });
        if(idx > -1) {
          allData.splice(idx, 1);
          localStorage.setItem('bizlens_analyses', JSON.stringify(allData));
          
          var midx = mappedData.findIndex(function(m){ return m.data.id === id; });
          if(midx > -1) mappedData.splice(midx, 1);
          
          document.getElementById('totalCount').textContent = mappedData.length;
          renderGrid();
          renderGlobalStats();
        }
      }
    }
  });

  BC.setupReveal();
  BC.setupGlow();
  if(window.lucide) lucide.createIcons();
})();

