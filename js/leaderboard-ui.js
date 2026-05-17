(function () {
  const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString() : n || '0');

  function safeText(text) {
    if (text === null || text === undefined) return '';
    return String(text);
  }

  function createAvatarEl(u) {
    const wrap = document.createElement('div');
    wrap.className = 'avatar-col';
    if (u.photoURL && /^https?:\/\//i.test(u.photoURL)) {
      const img = document.createElement('img');
      img.src = u.photoURL;
      img.alt = safeText(u.displayName || 'Profile');
      wrap.appendChild(img);
    } else {
      const initials = document.createElement('div');
      initials.className = 'initials';
      initials.textContent = (safeText(u.displayName || 'User')[0] || 'F').toUpperCase();
      wrap.appendChild(initials);
    }
    return wrap;
  }

  function buildHeader() {
    const header = document.createElement('div');
    header.className = 'leaderboard-header';

    const tabs = document.createElement('div');
    tabs.className = 'leaderboard-tabs';
    tabs.setAttribute('role', 'tablist');

    const metrics = [
      { key: 'focusMinutesTotal', label: 'Focus' },
      { key: 'sessionsTotal', label: 'Sessions' },
      { key: 'tasksDoneTotal', label: 'Tasks' },
    ];

    metrics.forEach((m) => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.type = 'button';
      btn.dataset.leaderMetric = m.key;
      btn.textContent = m.label;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-pressed', 'false');
      tabs.appendChild(btn);
    });

    header.appendChild(tabs);
    return header;
  }

  function renderPodium(container, users, currentUid) {
    const top = users.slice(0, 3);
    const wrap = document.createElement('div');
    wrap.className = 'leader-podium';
    top.forEach((u, i) => {
      const slot = document.createElement('div');
      slot.className = `podium-slot rank-${i+1}` + (u.id === currentUid ? ' me' : '');

      const rank = document.createElement('div'); rank.className = 'rank'; rank.textContent = `#${i+1}`;
      const avatarWrap = document.createElement('div'); avatarWrap.className = 'avatar';
      if (u.photoURL && /^https?:\/\//i.test(u.photoURL)) {
        const img = document.createElement('img'); img.src = u.photoURL; img.alt = safeText(u.displayName || ''); avatarWrap.appendChild(img);
      } else {
        const initials = document.createElement('div'); initials.className = 'initials'; initials.textContent = (safeText(u.displayName || '')[0] || 'F').toUpperCase(); avatarWrap.appendChild(initials);
      }
      const meta = document.createElement('div'); meta.className = 'meta';
      const name = document.createElement('div'); name.className = 'name'; name.textContent = safeText(u.displayName || 'User');
      const val = document.createElement('div'); val.className = 'val'; val.textContent = `${fmtNum(u.focusMinutesTotal)}m`;
      meta.appendChild(name); meta.appendChild(val);

      slot.appendChild(rank); slot.appendChild(avatarWrap); slot.appendChild(meta);
      wrap.appendChild(slot);
    });
    container.appendChild(wrap);
  }

  function renderList(container, users, currentUid) {
    const wrap = document.createElement('div'); wrap.className = 'leader-list';
    users.forEach((u, idx) => {
      const row = document.createElement('div'); row.className = 'leader-row' + (u.id === currentUid ? ' me' : ''); row.dataset.uid = u.id;
      const rankCol = document.createElement('div'); rankCol.className = 'rank-col'; rankCol.textContent = String(idx + 1 + 3);
      const avatarCol = createAvatarEl(u);
      const nameCol = document.createElement('div'); nameCol.className = 'name-col'; nameCol.textContent = safeText(u.displayName || 'User');
      const statCol = document.createElement('div'); statCol.className = 'stat-col'; statCol.textContent = fmtNum(u[window._fluxLeaderboardMetric || 'focusMinutesTotal'] || 0);
      row.appendChild(rankCol); row.appendChild(avatarCol); row.appendChild(nameCol); row.appendChild(statCol);
      wrap.appendChild(row);
    });
    container.appendChild(wrap);

  async function renderPinnedRow(container, metric) {
    try {
      const info = await window.Leaderboard.getUserEntryAndRank(metric);
      if (!info || !info.entry) return;
      const users = window._fluxLeaderboardLast || [];
      const present = users.some(u => u.id === info.entry.id);
      if (present) return;

      const row = document.createElement('div');
      row.className = 'leader-row pinned me';
      const rankCol = document.createElement('div'); rankCol.className = 'rank-col'; rankCol.textContent = info.rank ? String(info.rank) : '—';
      const avatarCol = createAvatarEl(info.entry);
      const nameCol = document.createElement('div'); nameCol.className = 'name-col'; nameCol.textContent = safeText(info.entry.displayName || 'You');
      const statCol = document.createElement('div'); statCol.className = 'stat-col'; statCol.textContent = fmtNum(info.entry[metric] || 0);
      row.appendChild(rankCol); row.appendChild(avatarCol); row.appendChild(nameCol); row.appendChild(statCol);
      // add separator
      const sep = document.createElement('div'); sep.className = 'leader-list-sep';
      container.appendChild(sep);
      container.appendChild(row);
    } catch (e) { /* ignore */ }
  }
  }

  function attach(container) {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-leader-metric]');
      if (!btn) return;
      const metric = btn.dataset.leaderMetric;
      window._fluxLeaderboardMetric = metric;
      render(container, window._fluxLeaderboardLast || []);
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
  }

  function render(container, users) {
    window._fluxLeaderboardLast = users;
    container.replaceChildren();
    const currentUid = window.FluxAuth?.user?.()?.uid || null;
    const header = buildHeader();
    container.appendChild(header);
    // ensure active tab
    const activeKey = window._fluxLeaderboardMetric || 'focusMinutesTotal';
    const tabBtn = header.querySelector(`[data-leader-metric="${activeKey}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    renderPodium(container, users, currentUid);
    renderList(container, users.slice(3), currentUid);
    // pinned current-user row when not in top list
    renderPinnedRow(container, window._fluxLeaderboardMetric || 'focusMinutesTotal');
  }

  window.LeaderboardUI = {
    renderLeaderboard: render,
    attach,
  };
})();
