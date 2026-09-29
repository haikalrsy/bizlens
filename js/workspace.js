/* ============================================================
   BizLens · Workspace Script
   Mengelola halaman workspace.html:
   - Load, render, dan hapus analisis dari localStorage ('bizlens_analyses')
   - Update skor teratas di sidebar & jumlah tersimpan
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'bizlens_analyses';

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hitungSkor(a) {
    if (!a) return 0;
    var price = Number(a.price);
    var cost = Number(a.cost);
    var units = Number(a.units);
    var ops = Number(a.ops);

    if ((isNaN(price) || isNaN(cost) || isNaN(units) || isNaN(ops)) && (a.skor !== undefined || a.score !== undefined)) {
      return Number(a.skor || a.score) || 0;
    }

    price = price || 0;
    cost = cost || 0;
    units = units || 0;
    ops = ops || 0;

    var mkt = Number(a.mkt) || 0;
    var contrib = price - cost;
    var fixed = ops + mkt;
    var net = contrib * units - fixed;
    var revenue = price * units;
    var margin = revenue ? net / revenue : 0;
    var bep = contrib > 0 ? Math.ceil(fixed / contrib) : Infinity;
    var bepRatio = isFinite(bep) ? units / bep : 0;
    var variable = cost * units;
    var roi = (fixed + variable) ? (net / (fixed + variable)) * 100 : 0;
    var score = Math.min(99, Math.max(3, Math.round(
      Math.min(margin / 0.38, 1) * 44 + Math.min(bepRatio / 2.6, 1) * 32 + Math.min(roi / 70, 1) * 24
    )));

    return isNaN(score) ? (Number(a.skor || a.score) || 0) : score;
  }

  function formatTanggal(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function loadAnalyses() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveAnalyses(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Gagal menyimpan ke localStorage:', e);
    }
  }

  function renderCard(a) {
    if (!a) return '';
    var id = escapeHTML(a.id || '');
    var namaUsaha = escapeHTML(a.namaUsaha || a.nama || a.nama_usaha || 'Usaha Tanpa Nama');
    var jenisUsaha = escapeHTML(a.jenisUsaha || a.jenis || a.jenis_usaha || 'Kelayakan Usaha');
    var tanggal = formatTanggal(a.createdAt || a.updatedAt || a.tanggal);
    var skor = hitungSkor(a);

    return (
      '<a href="dashboard.html?id=' + id + '" class="saved-card glass" style="display:flex;flex-direction:column;min-height:140px;">' +
        '<div class="saved-card__head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<span class="saved-card__ico"><i data-lucide="line-chart"></i></span>' +
          '<button type="button" class="saved-card__del" aria-label="Hapus ' + namaUsaha + '" data-id="' + id + '" title="Hapus">×</button>' +
        '</div>' +
        '<h4 class="saved-card__name">' + namaUsaha + '</h4>' +
        '<p class="saved-card__type">' + jenisUsaha + '</p>' +
        '<div class="saved-card__meta" style="margin-top:auto;">' +
          '<span class="saved-card__score">Skor: ' + skor + '</span>' +
          '<span class="saved-card__date">' + tanggal + '</span>' +
        '</div>' +
      '</a>'
    );
  }

  function updateSidebar(analyses) {
    var sideScore = byId('sideScore');
    var sideBar = byId('sideBar');
    if (!sideScore || !sideBar) return;

    if (!analyses || analyses.length === 0) {
      sideScore.textContent = '—';
      sideBar.style.width = '0%';
      return;
    }

    var validAnalyses = analyses.filter(function(x) { return x !== null && typeof x === 'object'; });
    if (validAnalyses.length === 0) return;

    var sorted = validAnalyses.slice().sort(function (a, b) {
      var tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      var tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });

    var newestScore = hitungSkor(sorted[0]);
    sideScore.textContent = newestScore;
    sideBar.style.width = newestScore + '%';
  }

  function render() {
    try {
      var analyses = loadAnalyses();
      var validAnalyses = analyses.filter(function(x) { return x !== null && typeof x === 'object'; });
      
      var savedGrid = byId('savedGrid');
      var savedEmpty = byId('savedEmpty');
      var savedCount = byId('savedCount');

      if (savedCount) {
        savedCount.textContent = validAnalyses.length + ' analisis';
      }

      if (validAnalyses.length === 0) {
        if (savedGrid) savedGrid.style.display = 'none';
        if (savedEmpty) savedEmpty.style.display = 'grid';
      } else {
        if (savedEmpty) savedEmpty.style.display = 'none';
        if (savedGrid) {
          savedGrid.style.display = 'grid';
          savedGrid.innerHTML = validAnalyses.map(renderCard).join('');

          var delButtons = savedGrid.querySelectorAll('.saved-card__del');
          delButtons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              var targetId = btn.getAttribute('data-id');
              var currentList = loadAnalyses();
              var filtered = currentList.filter(function (item) {
                return item && String(item.id) !== String(targetId);
              });
              saveAnalyses(filtered);
              render();
            });
          });
        }
      }

      if (window.BizIcons && typeof window.BizIcons.paint === 'function') {
        window.BizIcons.paint();
      } else if (window.lucide) {
        lucide.createIcons();
      }

      updateSidebar(validAnalyses);
    } catch (err) {
      console.error("Workspace render error:", err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
