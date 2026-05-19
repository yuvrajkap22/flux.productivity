(function () {
  const lbState = window.FluxLeaderboardState || {
    getMetric: () => (window._fluxLeaderboardMetric || 'focusMinutesTotal'),
    setMetric: (metric) => { if (window.FluxLeaderboardState) window.FluxLeaderboardState.setMetric(metric); else window._fluxLeaderboardMetric = metric || 'focusMinutesTotal'; },
    getRange: () => (window._fluxLeaderboardRange || 'week'),
    setRange: (range) => { if (window.FluxLeaderboardState) window.FluxLeaderboardState.setRange(range); else window._fluxLeaderboardRange = range || 'week'; },
    getUsers: () => (window._fluxLeaderboardLast || []),
    setUsers: (users) => { if (window.FluxLeaderboardState) window.FluxLeaderboardState.setUsers(users); else window._fluxLeaderboardLast = Array.isArray(users) ? users : []; },
  };

  const authSvc = window.FluxAuthService || {
    getUser: () => (window.FluxAuth?.user?.() || window.FluxAuthState?.user || null),
    isGuest: () => true,
    onAuthChange: () => {},
    onAuthReady: () => {},
  };

  const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString() : n || '0');
  const looksLikeEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim());
  const displayNameOf = (u, fallback = 'User') => {
    const name = safeText(u?.displayName || '').trim();
    if (name && !looksLikeEmail(name)) return name;
    const alt = safeText(u?.username || '').trim().replace(/^@/, '');
    if (alt) return alt;
    return fallback;
  };
  const metricText = (metricKey, value) => {
    const n = Number(value) || 0;
    if (metricKey === 'focusMinutesTotal') return `${fmtNum(n)} min`;
    if (metricKey === 'sessionsTotal') return `${fmtNum(n)} sessions`;
    if (metricKey === 'tasksDoneTotal') return `${fmtNum(n)} tasks`;
    return fmtNum(n);
  };
  const displayHandle = (u) => {
    const raw = (u?.username || '').trim();
    if (!raw) return '';
    return raw.startsWith('@') ? raw : `@${raw}`;
  };

  function safeText(text) {
    if (text === null || text === undefined) return '';
    return String(text);
  }

  function createAvatarEl(u) {
    const wrap = document.createElement('div');
    wrap.className = 'avatar-col';
    const resolved = window.FluxAuthUtils?.resolveAvatarSource?.(u.photoURL, displayNameOf(u, 'Profile')) || u.photoURL;
    if (resolved && /^https?:\/\//i.test(resolved)) {
      const img = document.createElement('img');
      img.src = resolved;
      img.alt = safeText(displayNameOf(u, 'Profile'));
      wrap.appendChild(img);
    } else if (resolved && /^data:image\//i.test(resolved)) {
      const img = document.createElement('img');
      img.src = resolved;
      img.alt = safeText(displayNameOf(u, 'Profile'));
      wrap.appendChild(img);
    } else {
      const initials = document.createElement('div');
      initials.className = 'initials';
      initials.textContent = (safeText(displayNameOf(u, 'User'))[0] || 'F').toUpperCase();
      wrap.appendChild(initials);
    }
    return wrap;
  }

  function buildHeader() {
    const header = document.createElement('div');
    header.className = 'leaderboard-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'leaderboard-title';
    const heading = document.createElement('div'); heading.className = 'leaderboard-heading';
    const h = document.createElement('h1'); h.textContent = 'Leaderboard';
    const subtitle = document.createElement('div'); subtitle.className = 'leaderboard-subtitle'; subtitle.textContent = 'Global focus race for active users';
    const badge = document.createElement('div'); badge.className = 'leaderboard-badge'; badge.textContent = 'LIVE';
    heading.appendChild(h); heading.appendChild(subtitle);
    titleWrap.appendChild(heading); titleWrap.appendChild(badge);

    const actions = document.createElement('div'); actions.className = 'leaderboard-actions';

    const tabs = document.createElement('div');
    tabs.className = 'leaderboard-tabs';
    tabs.setAttribute('role', 'tablist');

    const ranges = [ { key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' } ];
    ranges.forEach(r => {
      const t = document.createElement('button'); t.className = 'tab'; t.type = 'button'; t.dataset.leaderRange = r.key; t.textContent = r.label; t.setAttribute('aria-label', `Range ${r.label}`); t.setAttribute('role', 'tab'); t.setAttribute('tabindex', '0'); t.setAttribute('aria-selected', 'false'); tabs.appendChild(t);
    });

    const metrics = [
      { key: 'focusMinutesTotal', label: 'Focus' },
      { key: 'sessionsTotal', label: 'Sessions' },
      { key: 'tasksDoneTotal', label: 'Tasks' },
    ];
    const metricGroup = document.createElement('div'); metricGroup.className = 'leaderboard-tabs';
    metrics.forEach((m) => {
      const btn = document.createElement('button'); btn.className = 'tab'; btn.type = 'button'; btn.dataset.leaderMetric = m.key; btn.textContent = m.label; btn.setAttribute('aria-label', `Metric ${m.label}`); btn.setAttribute('role', 'tab'); btn.setAttribute('tabindex', '0'); btn.setAttribute('aria-selected', 'false'); metricGroup.appendChild(btn);
    });

    const cta = document.createElement('button'); cta.className = 'leaderboard-cta'; cta.type = 'button'; cta.textContent = 'Sign in to compete';
    cta.addEventListener('click', () => {
      // prefer existing auth flow; fallback to login page
      try { if (document.getElementById('auth-google-btn')) { document.getElementById('auth-google-btn').click(); return; } } catch (e) {}
      location.href = 'login.html';
    });

    actions.appendChild(metricGroup);
    actions.appendChild(cta);

    header.appendChild(titleWrap);
    header.appendChild(tabs);
    header.appendChild(actions);
    return header;
  }

  function renderPodium(container, users, currentUid, metric) {
    const top = users.slice(0, 3);
    const wrap = document.createElement('div');
    wrap.className = 'leader-podium';
    if (!top.length) {
      const empty = document.createElement('div');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'No active competitors in this range yet.';
      container.appendChild(empty);
      return;
    }
    const visualOrder = top.length >= 3 ? [1, 0, 2] : top.map((_, idx) => idx);
    visualOrder.forEach((userIndex, i) => {
      const u = top[userIndex];
      const rankNum = userIndex + 1;
      const slot = document.createElement('div');
      slot.className = `podium-slot rank-${rankNum}` + (u.id === currentUid ? ' me' : '');
      const medal = document.createElement('div');
      medal.className = 'medal';
      medal.textContent = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : '🥉';

      const rank = document.createElement('div'); rank.className = 'rank'; rank.textContent = `#${rankNum}`;
      const avatarWrap = document.createElement('div'); avatarWrap.className = 'avatar';
      const resolved = window.FluxAuthUtils?.resolveAvatarSource?.(u.photoURL, displayNameOf(u, 'User')) || u.photoURL;
      if (resolved && /^https?:\/\//i.test(resolved)) {
        const img = document.createElement('img'); img.src = resolved; img.alt = safeText(u.displayName || ''); avatarWrap.appendChild(img);
      } else if (resolved && /^data:image\//i.test(resolved)) {
        const img = document.createElement('img'); img.src = resolved; img.alt = safeText(u.displayName || ''); avatarWrap.appendChild(img);
      } else {
        const initials = document.createElement('div'); initials.className = 'initials'; initials.textContent = (safeText(u.displayName || '')[0] || 'F').toUpperCase(); avatarWrap.appendChild(initials);
      }
      const meta = document.createElement('div'); meta.className = 'meta';
      const name = document.createElement('div'); name.className = 'name'; name.textContent = displayNameOf(u, 'User');
      const handle = document.createElement('div'); handle.className = 'handle'; handle.textContent = displayHandle(u);
      const val = document.createElement('div'); val.className = 'val';
      const metricKey = metric || lbState.getMetric() || 'focusMinutesTotal';
      const metricVal = u[metricKey] || 0;
      val.textContent = metricText(metricKey, metricVal);
      meta.appendChild(name); if (handle.textContent) meta.appendChild(handle); meta.appendChild(val);

      slot.appendChild(medal); slot.appendChild(rank); slot.appendChild(avatarWrap); slot.appendChild(meta);
      wrap.appendChild(slot);
    });
    container.appendChild(wrap);
  }

  function renderList(container, users, currentUid, metric) {
    const wrap = document.createElement('div'); wrap.className = 'leader-list';
    if (!users.length) {
      const empty = document.createElement('div');
      empty.className = 'leaderboard-empty in-list';
      empty.textContent = 'Keep focusing to become the first in this list.';
      wrap.appendChild(empty);
      container.appendChild(wrap);
      return;
    }
    users.forEach((u, idx) => {
      const row = document.createElement('div'); row.className = 'leader-row' + (u.id === currentUid ? ' me' : ''); row.dataset.uid = u.id;
      row.style.animationDelay = `${Math.min(idx, 8) * 30}ms`;
      const rankCol = document.createElement('div'); rankCol.className = 'rank-col'; rankCol.textContent = String(idx + 1 + 3);
      const avatarCol = createAvatarEl(u);
      const nameCol = document.createElement('div'); nameCol.className = 'name-col';
      const primary = document.createElement('div'); primary.className = 'primary'; primary.textContent = displayNameOf(u, 'User');
      const secondary = document.createElement('div'); secondary.className = 'secondary'; secondary.textContent = displayHandle(u);
      nameCol.appendChild(primary);
      if (secondary.textContent) nameCol.appendChild(secondary);
      const statCol = document.createElement('div'); statCol.className = 'stat-col';
      const metricKey = metric || lbState.getMetric() || 'focusMinutesTotal';
      const metricVal = u[metricKey] || 0;
      statCol.textContent = metricText(metricKey, metricVal);
      row.appendChild(rankCol); row.appendChild(avatarCol); row.appendChild(nameCol); row.appendChild(statCol);
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  async function renderPinnedRow(container, metric, range = 'week') {
    try {
      const info = await window.Leaderboard.getUserEntryAndRank(metric, range);
      if (!info || !info.entry) return;
      const users = lbState.getUsers() || [];
      const present = users.some(u => u.id === info.entry.id);
      if (present) return;

      const row = document.createElement('div');
      row.className = 'leader-row pinned me';
      const rankCol = document.createElement('div'); rankCol.className = 'rank-col'; rankCol.textContent = info.rank ? String(info.rank) : '—';
      const avatarCol = createAvatarEl(info.entry);
      const nameCol = document.createElement('div'); nameCol.className = 'name-col';
      const primary = document.createElement('div'); primary.className = 'primary'; primary.textContent = displayNameOf(info.entry, 'You');
      const secondary = document.createElement('div'); secondary.className = 'secondary'; secondary.textContent = displayHandle(info.entry);
      nameCol.appendChild(primary);
      if (secondary.textContent) nameCol.appendChild(secondary);
      const statCol = document.createElement('div'); statCol.className = 'stat-col'; statCol.textContent = metricText(metric, info.entry[metric] || 0);
      row.appendChild(rankCol); row.appendChild(avatarCol); row.appendChild(nameCol); row.appendChild(statCol);
      // add separator
      const sep = document.createElement('div'); sep.className = 'leader-list-sep';
      container.appendChild(sep);
      container.appendChild(row);
    } catch (e) { /* ignore */ }
  }

  function attach(container) {
    if (!container) return;
    if (container.__fluxLeaderboardAttached) {
      return;
    }
    container.__fluxLeaderboardAttached = true;

    container.addEventListener('click', (e) => {
      const metricBtn = e.target.closest('[data-leader-metric]');
      if (metricBtn) {
        const metric = metricBtn.dataset.leaderMetric;
        lbState.setMetric(metric);
        render(container, lbState.getUsers() || []);
        try { window.dispatchEvent(new CustomEvent('flux-leaderboard-metric-change', { detail: { metric } })); } catch (e) {}
        return;
      }

      const rangeBtn = e.target.closest('[data-leader-range]');
      if (rangeBtn) {
        const range = rangeBtn.dataset.leaderRange;
        lbState.setRange(range);
        render(container, lbState.getUsers() || []);
        try { window.dispatchEvent(new CustomEvent('flux-leaderboard-range-change', { detail: { range } })); } catch (e) {}
        return;
      }
    });

    // keyboard navigation for tabs
    container.addEventListener('keydown', (e) => {
      const focused = document.activeElement;
      if (!focused || !focused.matches || !focused.matches('.leaderboard-tabs .tab')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const tabs = Array.from(container.querySelectorAll('.leaderboard-tabs .tab'));
        const idx = tabs.indexOf(focused);
        const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        next.click();
      }
    });

    // Update UI on auth changes
    try {
      authSvc.onAuthChange((u) => {
        const c = container.querySelector('.leaderboard-cta');
        if (c) c.style.display = (u && !u.isGuest) ? 'none' : 'inline-flex';
      });
    } catch (e) { /* ignore */ }

    // Listen for leaderboard state changes from FluxBus
    try {
      const unsubscribe = window.FluxBus?.on('flux-leaderboard-change', (payload) => {
        if (!payload) return;
        const nextUsers = payload.users || lbState.getUsers() || [];
        const r = document.getElementById('leaderboard-root');
        if (r) render(r, nextUsers);
      });
      if (typeof unsubscribe === 'function') {
        container.__fluxLeaderboardUnsub = unsubscribe;
      }
    } catch (e) { /* ignore */ }
  }

  function render(container, users) {
    if (lbState.getUsers() !== users) {
      lbState.setUsers(users);
    }
    container.replaceChildren();
    const currentUid = (typeof authSvc.getUser === 'function' ? (authSvc.getUser()?.uid || null) : (window.FluxAuth?.user?.()?.uid || null));
    const header = buildHeader();
    container.appendChild(header);
    // ensure active tab
    const activeKey = lbState.getMetric() || 'focusMinutesTotal';
    header.querySelectorAll('[data-leader-metric]').forEach((el) => el.setAttribute('aria-selected', 'false'));
    const tabBtn = header.querySelector(`[data-leader-metric="${activeKey}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    const activeRange = lbState.getRange() || 'week';
    header.querySelectorAll('[data-leader-range]').forEach((el) => el.setAttribute('aria-selected', 'false'));
    const rangeBtn = header.querySelector(`[data-leader-range="${activeRange}"]`);
    if (rangeBtn) rangeBtn.classList.add('active');
    if (tabBtn) tabBtn.setAttribute('aria-selected', 'true');
    if (rangeBtn) rangeBtn.setAttribute('aria-selected', 'true');

    // hide CTA if user is signed in
    const cta = header.querySelector('.leaderboard-cta');
    const user = (typeof authSvc.getUser === 'function' ? authSvc.getUser() : (window.FluxAuth?.user?.() || window.FluxAuthState?.user));
    if (cta) cta.style.display = (user && !user.isGuest) ? 'none' : 'inline-flex';

    const body = document.createElement('div'); body.className = 'leaderboard-body';
    const podiumWrap = document.createElement('div'); podiumWrap.className = 'leader-podium-wrap';
    renderPodium(podiumWrap, users, currentUid, activeKey);
    body.appendChild(podiumWrap);

    const listWrap = document.createElement('div'); listWrap.className = 'leader-list-wrap';
    renderList(listWrap, users.slice(3), currentUid, activeKey);
    body.appendChild(listWrap);

    container.appendChild(body);
    // pinned current-user row when not in top list (async, non-blocking)
    setTimeout(() => {
      renderPinnedRow(container.querySelector('.leader-list-wrap') || container, lbState.getMetric() || 'focusMinutesTotal', lbState.getRange() || 'week');
    }, 0);
  }

  window.LeaderboardUI = {
    renderLeaderboard: render,
    attach,
  };
})();
