(function () {
  // Lightweight Profile service wrapper
  function getProfile() {
    try {
      if (window.FluxProfile && typeof window.FluxProfile.data === 'object') return window.FluxProfile.data;
      return { displayName: '', username: '', bio: '', photoURL: '' };
    } catch (e) { return { displayName: '', username: '', bio: '', photoURL: '' }; }
  }

  function getActiveUser() {
    try { return window.FluxProfile?.activeUser || window.FluxAuthState?.user || window.FluxAuth?.user?.() || null; } catch (e) { return null; }
  }

  function onProfileChange(handler) {
    if (!handler) return;
    window.addEventListener('flux-profile-change', (e) => handler(e.detail || {}));
    if (window.FluxBus) window.FluxBus.on('flux-profile-change', handler);
  }

  function init(profile) {
    try {
      if (window.FluxProfile && typeof window.FluxProfile.init === 'function') window.FluxProfile.init(profile || null);
    } catch (e) { /* ignore */ }
  }

  window.FluxProfileService = window.FluxProfileService || { getProfile, getActiveUser, onProfileChange, init };
}());
