// Improved page loader utility
// Hides the loader immediately when DOM is ready with a short fade-out.
(function(){
  const loader = document.getElementById('page-loader');
  if (!loader) return;

  function hideLoader(){
    // add fade-out class; remove element after transition
    loader.classList.add('fade-out');
    loader.addEventListener('transitionend', () => {
      if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    }, { once: true });
  }

  // If document already interactive/complete, hide immediately
  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    // small timeout to allow paint
    requestAnimationFrame(() => hideLoader());
  } else {
    document.addEventListener('DOMContentLoaded', hideLoader);
  }

  // Show loader on navigation (link clicks) — but ignore anchors and external targets
  document.body.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || a.target === '_blank') return;
    // if loader was removed, recreate a lightweight loader quickly
    if (!document.getElementById('page-loader')){
      const el = document.createElement('div');
      el.id = 'page-loader';
      el.className = 'page-loader';
      el.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat…</span></div>';
      document.body.appendChild(el);
    }
  });
})();
