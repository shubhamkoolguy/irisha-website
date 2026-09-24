/* Apply appearance before paint; storage may be unavailable in private contexts. */
(() => {
  'use strict';
  const key = 'irisha-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  let mode = saved === 'dark' || saved === 'light' ? saved : 'system';
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0614' : '#faf8fc');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const next = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
      const label = mode === 'system' ? 'System' : mode === 'light' ? 'Light mode' : 'Dark mode';
      const action = next === 'system' ? 'Use browser appearance' : 'Switch to ' + next + ' mode';
      button.setAttribute('aria-label', 'Appearance: ' + label + '. ' + action);
      button.setAttribute('title', 'Appearance: ' + label + '. ' + action);
      button.querySelector('.theme-label').textContent = label;
      button.querySelector('.theme-symbol').textContent = mode === 'system' ? '◐' : mode === 'light' ? '☼' : '☾';
    });
  }
  apply(mode === 'system' ? (system.matches ? 'dark' : 'light') : mode);
  document.addEventListener('DOMContentLoaded', () => {
    apply(document.documentElement.dataset.theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
      mode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
      try { localStorage.setItem(key, mode); } catch {}
      apply(mode === 'system' ? (system.matches ? 'dark' : 'light') : mode);
    }));
  });
  system.addEventListener('change', event => { if (mode === 'system') apply(event.matches ? 'dark' : 'light'); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    mode = event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : 'system';
    apply(mode === 'system' ? (system.matches ? 'dark' : 'light') : mode);
  });
})();
