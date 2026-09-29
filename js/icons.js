/* ============================================================
   BizLens · icons.js
   Menggunakan official Lucide library agar semua ikon ter-render 
   dengan sempurna sebagai SVG inline dan mendukung CSS styling.
   ============================================================ */
(function () {
  'use strict';

  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({
        attrs: {
          'stroke-width': '1.75'
        }
      });
    }
  }

  window.BizIcons = { paint: initIcons };

  /* Muat library Lucide secara dinamis jika belum ada */
  if (window.lucide) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initIcons);
    } else {
      initIcons();
    }
  } else {
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js';
    script.onload = function () {
      initIcons();
    };
    document.head.appendChild(script);
  }
})();
