/* ============================================================
   BizLens · Theme (gelap/terang) — global, dipakai di semua halaman
   Simpan preferensi di localStorage key 'bizlens_theme'
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'bizlens_theme';

  function getSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Terapkan tema secepat mungkin (juga dijalankan inline di <head>, lihat catatan)
  var saved = getSaved();
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = saved || (prefersDark ? 'dark' : 'light');
  apply(theme);

  window.BizTheme = {
    get: function () {
      return document.documentElement.getAttribute('data-theme') || 'light';
    },
    set: function (t) {
      apply(t);
      try { localStorage.setItem(KEY, t); } catch (e) {}
      document.dispatchEvent(new CustomEvent('bizlens:theme', { detail: t }));
    },
    toggle: function () {
      var next = this.get() === 'dark' ? 'light' : 'dark';
      this.set(next);
      return next;
    }
  };

  function wireToggleButton() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    var icon = btn.querySelector('[data-lucide]');

  function syncIcon() {
  if (!icon) return;

  icon.setAttribute(
    'data-lucide',
    window.BizTheme.get() === 'dark' ? 'moon' : 'sun-medium'
  );

  if (window.BizIcons) {
    window.BizIcons.paint();
  } else if (window.lucide) {
    lucide.createIcons();
  }
} syncIcon();

    btn.addEventListener('click', function () {
      window.BizTheme.toggle();
      syncIcon();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggleButton);
  } else {
    wireToggleButton();
  }
})();
