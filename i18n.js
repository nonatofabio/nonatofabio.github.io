// i18n — lightweight client-side translation engine
(function () {
  const SUPPORTED = ['en', 'pt-BR', 'tlh', 'sjn', 'hig'];
  const DEFAULT = 'en';
  const cache = {};

  async function loadLanguage(lang) {
    if (cache[lang]) return cache[lang];
    const res = await fetch(`lang/${lang}.json`);
    cache[lang] = await res.json();
    return cache[lang];
  }

  function applyTranslations(t) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key] == null) return;
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = t[key];
      } else {
        el.textContent = t[key];
      }
    });
    // Update meta
    if (t['meta.title']) document.title = t['meta.title'];
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && t['meta.description']) metaDesc.setAttribute('content', t['meta.description']);
  }

  async function switchLanguage(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    const t = await loadLanguage(lang);
    applyTranslations(t);
    // Update picker display
    const label = document.getElementById('lang-current');
    if (label) label.textContent = lang.toUpperCase();
    // Update active state in dropdown
    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });
    // Expose current lang for date formatting
    window.__currentLang = lang;
  }

  function initPicker() {
    const toggle = document.getElementById('lang-toggle');
    const dropdown = document.getElementById('lang-dropdown');
    if (!toggle || !dropdown) return;

    toggle.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => dropdown.classList.remove('open'));

    dropdown.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        switchLanguage(opt.dataset.lang);
        dropdown.classList.remove('open');
      });
    });
  }

  async function initI18n() {
    const saved = localStorage.getItem('lang') || DEFAULT;
    initPicker();
    await switchLanguage(saved);
  }

  // Expose for external use (e.g. date formatting)
  window.i18n = { switchLanguage, loadLanguage, SUPPORTED, DEFAULT };
  window.__currentLang = localStorage.getItem('lang') || DEFAULT;

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();
