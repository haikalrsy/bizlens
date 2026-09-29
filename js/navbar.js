/* ============================================================
   BizLens · navbar.js — Floating Icon Rail Sidebar (Auto Dark/Light Logo)
   ============================================================ */
(function () {
  'use strict';

  var PAGES = [
    { id: 'dashboard',  label: 'Dashboard',          icon: 'layout-dashboard',      href: 'dashboard.html'  },
    { id: 'analytics',  label: 'Analytic',           icon: 'bar-chart-2',           href: 'analytics.html'  },
    { id: 'simulator',  label: 'What-if Simulator',  icon: 'sliders-horizontal',    href: 'simulator.html'  },
    { id: 'ai',         label: 'Rekomendasi Cerdas', icon: 'sparkles',              href: 'ai.html'         },
    { id: 'financial',  label: 'Financial Insight',  icon: 'wallet',                href: 'financial.html'  },
    { id: 'recent',     label: 'Recent Analysis',    icon: 'history',               href: 'recent.html'     },
    { id: 'timeline',   label: 'Business Timeline',  icon: 'git-commit-horizontal', href: 'timeline.html'   },
    { id: 'report',     label: 'Business Report',    icon: 'file-down',             href: 'report.html'     }
  ];

  var WORKSPACE_PAGES = [
    { id: 'workspace', label: 'Workspace', icon: 'home', href: 'workspace.html' }
  ];

  /* ── Helpers ─────────────────────────────────────────────── */
  function getLatestAnalysis() {
    try {
      var params = new URLSearchParams(window.location.search);
      var id = params.get('id');
      var arr = JSON.parse(localStorage.getItem('bizlens_analyses') || '[]');
      if (!Array.isArray(arr) || arr.length === 0) return null;
      if (id) {
        for (var i = 0; i < arr.length; i++) {
          if (String(arr[i].id) === String(id)) return arr[i];
        }
      }
      arr.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
      return arr[0] || null;
    } catch (e) { return null; }
  }

  function hitungSkor(data) {
    if (!data) return 0;
    if (window.BizCore && window.BizCore.compute) {
      var st = window.BizCore.stateFromData(data);
      return window.BizCore.compute(st).score || 0;
    }
    var price = Number(data.price) || 0, cost = Number(data.cost) || 0;
    var units = Number(data.units) || 0, ops = Number(data.ops) || 0, mkt = Number(data.mkt) || 0;
    var fixed = ops + mkt, contrib = price - cost;
    var revenue = price * units, net = revenue - cost * units - fixed;
    var margin = revenue ? net / revenue : 0;
    var bep = contrib > 0 ? Math.ceil(fixed / contrib) : Infinity;
    var bepR = isFinite(bep) && bep > 0 ? units / bep : 0;
    var roi = (fixed + cost * units) ? (net / (fixed + cost * units)) * 100 : 0;
    var sc = Math.min(99, Math.max(3, Math.round(
      Math.min(margin / 0.38, 1) * 44 + Math.min(bepR / 2.6, 1) * 32 + Math.min(roi / 70, 1) * 24
    )));
    return isNaN(sc) ? 0 : sc;
  }

  function scoreColor(s) {
    return s >= 70 ? '#5E9F6E' : s >= 45 ? '#D9A441' : '#D96C6C';
  }

  /* ── CSS ─────────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('biz-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'biz-nav-css';
    s.textContent = `
      .side { display: none !important; }
      .shell { display: flex; min-height: 100vh; }

      .biz-sidebar {
        position: fixed; top: 0; left: 0; bottom: 0;
        width: 80px; z-index: 250;
        display: flex; flex-direction: column;
        align-items: center;
        gap: 0;
        padding: 0;
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(20px) saturate(1.5);
        border-right: 1px solid rgba(226,232,240,0.8);
        box-shadow: 2px 0 20px rgba(15,76,117,0.06);
      }

      .biz-brand {
        display: flex; align-items: center; justify-content: center;
        width: 100%; padding: 20px 0 16px;
        text-decoration: none; flex: none;
      }
      
      .biz-brand__mark {
        width: 42px; height: 42px; flex: none;
        display: flex; align-items: center; justify-content: center;
        transition: transform 200ms;
      }
      .biz-brand__img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
      }
      .biz-brand__mark:hover {
        transform: translateY(-2px);
      }

      /* Tampilan Default (Light Mode) */
      .biz-logo-light { display: block; }
      .biz-logo-dark { display: none; }

      .biz-brand__name { display: none; }

      .biz-sidebar-divider {
        width: 40px; height: 1px;
        background: rgba(226,232,240,0.9);
        margin: 0 auto 12px;
        flex: none;
      }

      .biz-nav-group {
        display: flex; flex-direction: column; gap: 6px;
        align-items: center;
        padding: 0 12px;
        flex: none;
      }

      .biz-nav-spacer { flex: 1; }

      .biz-util-group {
        display: flex; flex-direction: column; gap: 6px;
        align-items: center;
        padding: 0 12px 16px;
        flex: none;
      }

      .biz-icon-btn {
        position: relative;
        width: 44px; height: 44px;
        border-radius: 13px;
        display: flex; align-items: center; justify-content: center;
        text-decoration: none; color: #94A3B8;
        background: transparent;
        border: 1px solid transparent;
        transition: background 200ms, color 200ms, transform 200ms, box-shadow 200ms, border-color 200ms;
        cursor: pointer;
      }
      .biz-icon-btn svg, .biz-icon-btn i {
        width: 20px; height: 20px; flex: none;
      }
      .biz-icon-btn:hover {
        background: rgba(15,76,117,0.08);
        color: #0F4C75;
        border-color: rgba(15,76,117,0.12);
      }
      .biz-icon-btn.is-active {
        background: linear-gradient(145deg, #0F4C75, #384B70);
        color: #fff; border-color: transparent;
        box-shadow: 0 4px 14px rgba(15,76,117,0.28);
      }
      .biz-icon-btn.is-active:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(15,76,117,0.36);
      }

      .biz-tooltip {
        position: absolute;
        left: calc(100% + 14px); top: 50%;
        transform: translateY(-50%) translateX(-6px);
        background: #1E293B; color: #F8FAFC;
        font-family: 'Inter', sans-serif;
        font-size: 12.5px; font-weight: 500;
        padding: 6px 13px; border-radius: 9px;
        white-space: nowrap; pointer-events: none; opacity: 0;
        transition: opacity 180ms ease, transform 180ms ease;
        box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        z-index: 400;
      }
      .biz-tooltip::before {
        content: '';
        position: absolute; right: 100%; top: 50%;
        transform: translateY(-50%);
        border: 5px solid transparent;
        border-right-color: #1E293B;
      }
      .biz-icon-btn:hover .biz-tooltip {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }

      .biz-health {
        display: flex; flex-direction: column; align-items: center;
        padding: 10px 12px;
        margin: 0 12px 8px;
        background: rgba(15,76,117,0.06);
        border: 1px solid rgba(15,76,117,0.10);
        border-radius: 12px;
        min-width: 44px;
        flex: none;
      }
      .biz-health__lbl {
        font-size: 9px; letter-spacing: .08em;
        text-transform: uppercase; color: #94A3B8;
        font-weight: 600; margin: 0 0 4px;
        text-align: center;
      }
      .biz-health__score {
        font-family: 'Inter Tight', sans-serif;
        font-weight: 700; font-size: 18px; color: #1E293B;
        line-height: 1; margin: 0; letter-spacing: -0.03em;
        text-align: center;
      }
      .biz-health__score span {
        font-size: 10px; font-weight: 400;
        color: #94A3B8; font-family: 'Inter', sans-serif;
      }
      .biz-health__bar {
        height: 3px; background: #E2E8F0; border-radius: 9999px;
        overflow: hidden; margin-top: 6px; width: 36px;
      }
      .biz-health__bar i {
        display: block; height: 100%; border-radius: 9999px;
        transition: width 900ms cubic-bezier(.4,0,.2,1);
      }

      html[data-theme="dark"] .biz-sidebar {
        background: rgba(15,23,42,0.94);
        border-right-color: rgba(42,49,64,0.8);
        box-shadow: 2px 0 20px rgba(0,0,0,0.25);
      }
      
      /* Toggle Logo saat Dark Mode aktif */
      html[data-theme="dark"] .biz-logo-light { display: none; }
      html[data-theme="dark"] .biz-logo-dark { display: block; }

      html[data-theme="dark"] .biz-sidebar-divider {
        background: rgba(42,49,64,0.9);
      }
      html[data-theme="dark"] .biz-icon-btn { color: #64748B; }
      html[data-theme="dark"] .biz-icon-btn:hover {
        background: rgba(111,168,220,0.12); color: #6FA8DC; border-color: rgba(111,168,220,0.15);
      }
      html[data-theme="dark"] .biz-icon-btn.is-active { background: linear-gradient(145deg, #0F4C75, #1a3a5c); color: #fff; }
      html[data-theme="dark"] .biz-health { background: rgba(15,76,117,0.12); border-color: rgba(15,76,117,0.20); }
      html[data-theme="dark"] .biz-health__score { color: #E2E8F0; }
      html[data-theme="dark"] .biz-health__bar { background: #2A3140; }

      @media (max-width: 820px) {
        body { padding-left: 0; padding-bottom: 56px; }
        .biz-sidebar {
          width: 100%; height: 60px;
          bottom: 0; top: auto; left: 0;
          flex-direction: row; justify-content: space-around;
          padding: 0 10px; border-right: none;
          border-top: 1px solid rgba(15,76,117,0.12);
        }
        .biz-sidebar-divider, .biz-nav-spacer, .biz-health, .biz-util-group { display: none; }
        .biz-nav-group { flex-direction: row; gap: 4px; }
        .biz-icon-btn { margin: 0; }
        .biz-tooltip { display: none !important; }
      }
    `;
    document.head.appendChild(s);
  }

  function makeBtn(icon, label, href, active) {
    var a = document.createElement(href ? 'a' : 'button');
    if (href) a.href = href;
    a.className = 'biz-icon-btn' + (active ? ' is-active' : '');
    a.setAttribute('aria-label', label);
    a.innerHTML =
      '<i data-lucide="' + icon + '"></i>' +
      '<span class="biz-tooltip">' + label + '</span>';
    return a;
  }

  function buildNav() {
    injectCSS();

    var sideEl     = document.getElementById('side');
    var activePage = sideEl ? (sideEl.getAttribute('data-page') || '') : '';
    var data       = getLatestAnalysis();
    var score      = hitungSkor(data);
    var qp         = data ? '?id=' + data.id : '';

    if (sideEl) sideEl.style.display = 'none';
    if (document.querySelector('.biz-sidebar')) return;

    var isWorkspace = activePage === 'workspace';

    var sidebar = document.createElement('aside');
    sidebar.className = 'biz-sidebar';

    /* --- Struktur Logo dengan 2 Gambar --- */
    var brand = document.createElement('a');
    brand.className = 'biz-brand';
    brand.href = 'workspace.html';
    brand.setAttribute('aria-label', 'BizLens Home');
    brand.innerHTML =
      '<span class="biz-brand__mark">' +
      '  <img src=logo.png alt="Logo" class="biz-brand__img biz-logo-light">' +
      '  <img src=logoblackmode.png alt="Logo Dark" class="biz-brand__img biz-logo-dark">' +
      '</span>' +
      '<span class="biz-brand__name">BizLens</span>';
    sidebar.appendChild(brand);
    /* ----------------------------------- */

    var divider = document.createElement('div');
    divider.className = 'biz-sidebar-divider';
    sidebar.appendChild(divider);

    var navGroup = document.createElement('div');
    navGroup.className = 'biz-nav-group';

    var pages = isWorkspace ? WORKSPACE_PAGES : PAGES;
    pages.forEach(function (p) {
      var href = p.href + (p.id !== 'workspace' ? qp : '');
      navGroup.appendChild(makeBtn(p.icon, p.label, href, p.id === activePage));
    });
    sidebar.appendChild(navGroup);

    var spacer = document.createElement('div');
    spacer.className = 'biz-nav-spacer';
    sidebar.appendChild(spacer);

    if (!isWorkspace) {
      var barColor = scoreColor(score);
      var health = document.createElement('div');
      health.className = 'biz-health';
      health.innerHTML =
        '<p class="biz-health__lbl">Score</p>' +
        '<p class="biz-health__score">' + (data ? score : '—') + '<span>/100</span></p>' +
        '<div class="biz-health__bar">' +
          '<i id="sideBar" style="width:' + (data ? score : 0) + '%;background:' + barColor + '"></i>' +
        '</div>';
      sidebar.appendChild(health);
    }

    var utilGroup = document.createElement('div');
    utilGroup.className = 'biz-util-group';
    var settingsBtn = makeBtn('settings', 'Pengaturan', 'javascript:void(0)', false);
    settingsBtn.addEventListener('click', function() { alert('Fitur Pengaturan sedang dalam pengembangan.'); });
    utilGroup.appendChild(settingsBtn);
    sidebar.appendChild(utilGroup);

    document.body.appendChild(sidebar);

    if (window.BizIcons && typeof window.BizIcons.paint === 'function') {
      window.BizIcons.paint();
    } else if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons({ attrs: { 'stroke-width': '1.75' } });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNav);
  } else {
    buildNav();
  }

  window.BizNavbar = { build: buildNav };

})();