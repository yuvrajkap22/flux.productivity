(function () {
  // Pomodoro service wrapper
  function getPomo() {
    try { return window.FluxPomo || null; } catch (e) { return null; }
  }

  function onChange(handler) {
    if (!handler) return;
    // FluxPomo may emit custom events; listen to a generic bus event as well
    if (window.FluxBus) window.FluxBus.on('flux-pomo-change', handler);
    window.addEventListener('flux-pomo-change', (e) => handler(e.detail));
  }

  function init() {
    try { if (window.FluxPomo && typeof window.FluxPomo.init === 'function') window.FluxPomo.init(); } catch (e) { /* ignore */ }
  }

  window.FluxPomoService = window.FluxPomoService || { getPomo, onChange, init };
}());
