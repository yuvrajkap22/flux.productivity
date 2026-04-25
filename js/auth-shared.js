(function () {
  'use strict';

  function normalizeDevHost() {
    if (location.protocol !== 'http:' || location.hostname !== '127.0.0.1') return false;
    const target = `http://localhost${location.port ? `:${location.port}` : ''}${location.pathname}${location.search}${location.hash}`;
    location.replace(target);
    return true;
  }

  function isLoginPage(pathname = location.pathname) {
    return pathname.endsWith('login.html');
  }

  function cleanLabel(label) {
    return String(label || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getInitials(label) {
    const safe = cleanLabel(label);
    if (!safe) return 'FU';

    const words = safe.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return safe.slice(0, 2).toUpperCase();
  }

  function fallbackAvatarDataUri(label = 'Flux User') {
    const initials = getInitials(label);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect width="200" height="200" rx="100" fill="url(#g)"/><text x="100" y="118" font-size="72" font-family="Arial,sans-serif" text-anchor="middle" fill="#fff">${initials}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function resolveAvatarSource(photoURL, label = 'Flux User') {
    const trimmed = String(photoURL || '').trim();
    return trimmed || fallbackAvatarDataUri(label);
  }

  window.FluxAuthUtils = Object.freeze({
    normalizeDevHost,
    isLoginPage,
    getInitials,
    fallbackAvatarDataUri,
    resolveAvatarSource,
  });
})();
