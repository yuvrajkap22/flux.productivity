// Lightweight event bus for progressive migration away from window.* globals
(function () {
  const subscribers = Object.create(null);

  function on(event, handler) {
    if (!event || typeof handler !== 'function') return;
    (subscribers[event] = subscribers[event] || []).push(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    if (!event) return;
    if (!handler) { subscribers[event] = []; return; }
    const arr = subscribers[event];
    if (!arr) return;
    const idx = arr.indexOf(handler);
    if (idx >= 0) arr.splice(idx, 1);
  }

  function emit(event, detail) {
    const arr = (subscribers[event] || []).slice();
    for (let i = 0; i < arr.length; i++) {
      try { arr[i](detail); } catch (e) { console.warn('FluxBus handler error', e); }
    }
  }

  window.FluxBus = window.FluxBus || { on, off, emit };
}());
