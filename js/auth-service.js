(function () {
  // Minimal auth/profile service bridge — reads existing global auth/profile APIs
  function getUser() {
    try {
      if (window.FluxAuth && typeof window.FluxAuth.user === 'function') return window.FluxAuth.user();
      if (window.FluxAuthState && window.FluxAuthState.user) return window.FluxAuthState.user;
      return null;
    } catch (e) { return null; }
  }

  function isGuest() {
    const u = getUser();
    return u ? Boolean(u.isGuest) : true;
  }

  function onAuthChange(handler) {
    if (!handler) return;
    // Subscribe to legacy window events and new FluxBus
    window.addEventListener('flux-auth-change', () => handler(getUser()));
    if (window.FluxBus) window.FluxBus.on('flux-auth-change', handler);
  }

  function onAuthReady(handler) {
    if (!handler) return;
    window.addEventListener('flux-auth-ready', () => handler(getUser()));
    if (window.FluxBus) window.FluxBus.on('flux-auth-ready', handler);
  }

  window.FluxAuthService = window.FluxAuthService || { getUser, isGuest, onAuthChange, onAuthReady };

  // Bridge: re-emit legacy window events through FluxBus for new consumers
  function bridgeEvent(name) {
    window.addEventListener(name, (e) => {
      if (window.FluxBus) window.FluxBus.emit(name, e.detail);
    });
  }

  ['flux-auth-ready', 'flux-auth-change', 'flux-profile-change', 'flux-accent-change', 'flux-theme-change'].forEach(bridgeEvent);
}());
