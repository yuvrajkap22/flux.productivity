(function () {
  const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString() : n || '0');

  function renderPodium(users, currentUid) {
    const top = users.slice(0, 3);
    return `
      <div class="leader-podium">
        ${top.map((u,i)=>`<div class="podium-slot rank-${i+1} ${u.id===currentUid? 'me':''}">
          <div class="rank">#${i+1}</div>
          <div class="avatar">${u.photoURL?`<img src="${u.photoURL}" alt="${u.displayName||''}">`:`<div class="initials">${(u.displayName||'')[0]||'F'}</div>`}</div>
          <div class="meta"><div class="name">${u.displayName||'User'}</div><div class="val">${fmtNum(u.focusMinutesTotal)}m</div></div>
        </div>`).join('')}
      </div>`;
  }

  function renderList(users, currentUid) {
    return `<div class="leader-list">${users.map((u, idx)=>`<div class="leader-row ${u.id===currentUid?'me':''}" data-uid="${u.id}">
      <div class="rank-col">${idx+1}</div>
      <div class="avatar-col">${u.photoURL?`<img src="${u.photoURL}" alt="${u.displayName||''}">`:`<div class="initials">${(u.displayName||'')[0]||'F'}</div>`}</div>
      <div class="name-col">${u.displayName||'User'}</div>
      <div class="stat-col">${fmtNum(u[window._fluxLeaderboardMetric||'focusMinutesTotal']||0)}</div>
    </div>`).join('')}</div>`;
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
  }

  function render(container, users) {
    window._fluxLeaderboardLast = users;
    const currentUid = window.FluxAuth?.user?.()?.uid || null;
    const html = `
      <div class="leaderboard-header">
        <div class="leaderboard-tabs">
          <button data-leader-metric="focusMinutesTotal" class="tab ${window._fluxLeaderboardMetric==='focusMinutesTotal'?'active':''}">Focus</button>
          <button data-leader-metric="sessionsTotal" class="tab ${window._fluxLeaderboardMetric==='sessionsTotal'?'active':''}">Sessions</button>
          <button data-leader-metric="tasksDoneTotal" class="tab ${window._fluxLeaderboardMetric==='tasksDoneTotal'?'active':''}">Tasks</button>
        </div>
      </div>
      ${renderPodium(users, currentUid)}
      ${renderList(users.slice(3), currentUid)}
    `;
    container.innerHTML = html;
  }

  window.LeaderboardUI = {
    renderLeaderboard: render,
    attach,
  };
})();
