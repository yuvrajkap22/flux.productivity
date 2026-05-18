(function () {
  // Pomodoro service wrapper
  function getPomo() {
    try { return window.FluxPomo || null; } catch (e) { return null; }
  }

  function onChange(handler) {
    if (!handler) return;
    // Prefer FluxBus when available to avoid duplicate callbacks from bridged window events.
    if (window.FluxBus) {
      window.FluxBus.on('flux-pomo-change', handler);
      return;
    }
    window.addEventListener('flux-pomo-change', (e) => handler(e.detail));
  }

  function init() {
    try { if (window.FluxPomo && typeof window.FluxPomo.init === 'function') window.FluxPomo.init(); } catch (e) { /* ignore */ }
  }

  window.FluxPomoService = window.FluxPomoService || { getPomo, onChange, init };
}());
