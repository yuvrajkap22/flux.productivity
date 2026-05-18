(function () {
  function getStats() {
    try { return window.FluxStats || null; } catch (e) { return null; }
  }

  function render() {
    try { return window.FluxStats?.render?.(); } catch (e) { return null; }
  }

  function scheduleRender(delay) {
    try { return window.FluxStats?.scheduleRender?.(delay); } catch (e) { return null; }
  }

  function updateOverview() {
    try { return window.FluxStats?.updateOverview?.(); } catch (e) { return null; }
  }

  window.FluxStatsService = window.FluxStatsService || { getStats, render, scheduleRender, updateOverview };
}());