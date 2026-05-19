/* ═══════════════════════════════════════
   FLUX — Leaderboard UI State
   ═══════════════════════════════════════ */

(function () {
  const state = {
    metric: window._fluxLeaderboardMetric || 'focusMinutesTotal',
    range: window._fluxLeaderboardRange || 'week',
    users: Array.isArray(window._fluxLeaderboardLast) ? window._fluxLeaderboardLast : [],
    unsubscribe: typeof window._fluxLeaderboardUnsub === 'function' ? window._fluxLeaderboardUnsub : null,
  };

  function syncLegacyGlobals() {
    try {
      window._fluxLeaderboardMetric = state.metric;
      window._fluxLeaderboardRange = state.range;
      window._fluxLeaderboardLast = state.users;
      window._fluxLeaderboardUnsub = state.unsubscribe;
    } catch (e) { /* ignore in non-browser envs */ }
    // Emit a bus event for new consumers
    try { window.FluxBus?.emit('flux-leaderboard-change', { metric: state.metric, range: state.range, users: state.users }); } catch (e) { /* ignore */ }
  }

  const api = {
    getMetric() {
      return state.metric;
    },
    setMetric(metric) {
      state.metric = metric || 'focusMinutesTotal';
      syncLegacyGlobals();
    },
    getRange() {
      return state.range;
    },
    setRange(range) {
      state.range = range || 'week';
      syncLegacyGlobals();
    },
    getUsers() {
      return state.users;
    },
    setUsers(users) {
      const next = Array.isArray(users) ? users : [];
      if (state.users === next || (state.users.length === 0 && next.length === 0)) return;
      state.users = next;
      syncLegacyGlobals();
    },
    getUnsubscribe() {
      return state.unsubscribe;
    },
    setUnsubscribe(unsubscribe) {
      state.unsubscribe = typeof unsubscribe === 'function' ? unsubscribe : null;
      syncLegacyGlobals();
    },
    clearUnsubscribe() {
      if (typeof state.unsubscribe === 'function') {
        try { state.unsubscribe(); } catch (e) { /* ignore */ }
      }
      state.unsubscribe = null;
      syncLegacyGlobals();
    },
  };

  window.FluxLeaderboardState = api;
  syncLegacyGlobals();
})();
