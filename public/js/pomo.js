const FluxPomo = {
  mode: "focus",
  duration: 1500,
  remaining: 1500,
  running: false,
  interval: null,
  _leaderboardSyncInterval: null,
  settings: { focus: 25, short: 5, long: 15, interval: 4, autoBreak: true, autoFocus: true },
  sessionsToday: 0,
  streak: 0,
  longestStreak: 0,
  totalFocusToday: 0,
  consecutiveFocus: 0,
  activeTaskId: null,
  activeTaskText: "",
  circumference: 2 * Math.PI * 88,
  _wasRunningOnHide: false,
  getTodoApi: () => window.FluxTodo ? window.FluxTodo : (typeof FluxTodo !== 'undefined' ? FluxTodo : null),
  init() {
    const t = Flux.load("flux_settings", {});
    if (t.pomoDuration) this.settings.focus = t.pomoDuration;
    if (t.shortBreak) this.settings.short = t.shortBreak;
    if (t.longBreak) this.settings.long = t.longBreak;
    if (t.interval) this.settings.interval = t.interval;
    if (typeof t.autoBreak !== 'undefined') this.settings.autoBreak = t.autoBreak;
    if (typeof t.autoFocus !== 'undefined') this.settings.autoFocus = t.autoFocus;

    const e = Flux.load("flux_stats", {}), s = Flux.todayKey();
    this.sessionsToday = (e.sessions && e.sessions[s]) || 0;
    this.streak = e.streak || 0;
    this.longestStreak = e.longestStreak || 0;
    this.totalFocusToday = (e.totalTime && e.totalTime[s]) || 0;
    this.duration = 60 * this.settings.focus;
    this.remaining = this.duration;
    this.bindEvents();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.running) { this._wasRunningOnHide = true; this.pause(); }
      } else {
        if (this._wasRunningOnHide) { this._wasRunningOnHide = false; this.start(); }
      }
    });

    this.syncActiveTask();
    this.updateDisplay();
    this.updateStatsBar();
    this.syncSettingsUI();
    this.recomputeStreaks(e);
    this.updateStatsBar();
  },
  bindEvents() {
    const t = document.getElementById("pomo-play"); t && t.addEventListener("click", () => this.togglePlay());
    const e = document.getElementById("pomo-reset"); e && e.addEventListener("click", () => this.reset());
    const s = document.getElementById("pomo-skip"); s && s.addEventListener("click", () => this.skip());
    const o = document.getElementById("pomo-modes"); o && o.addEventListener("click", (ev) => { const btn = ev.target.closest('.mode-btn'); btn && this.setMode(btn.dataset.mode); });
    const n = document.getElementById("pomo-settings-btn"), i = document.getElementById("pomo-settings-dropdown"); n && i && n.addEventListener("click", () => i.classList.toggle("hidden"));
    const a = {
      "setting-focus": (v) => { this.settings.focus = v; if (this.mode !== 'focus' && !this.running) this.setDuration(60 * v); },
      "setting-short": (v) => { this.settings.short = v; if (this.mode !== 'short' && !this.running) this.setDuration(60 * v); },
      "setting-long": (v) => { this.settings.long = v; if (this.mode !== 'long' && !this.running) this.setDuration(60 * v); },
      "setting-interval": (v) => { this.settings.interval = v; }
    };
    for (const [id, fn] of Object.entries(a)) {
      const el = document.getElementById(id);
      el && el.addEventListener('change', (ev) => { fn(parseInt(ev.target.value) || 1); this.saveSettings(); });
    }
    const u = document.getElementById('setting-autobreak'); u && u.addEventListener('change', (ev) => { this.settings.autoBreak = ev.target.checked; this.saveSettings(); });
    const c = document.getElementById('setting-autofocus'); c && c.addEventListener('change', (ev) => { this.settings.autoFocus = ev.target.checked; this.saveSettings(); });
    window.addEventListener('flux-task-tracking-change', (ev) => { this.setActiveTask(ev.detail || null); });
  },
  syncActiveTask() { const t = this.getTodoApi()?.getActiveTask?.() || null; this.setActiveTask(t); },
  setActiveTask(t) {
    this.activeTaskId = t?.id || null; this.activeTaskText = t?.text || "";
    const e = document.getElementById('pomo-task-label');
    if (e) {
      if (this.activeTaskText) { e.textContent = `Task: ${this.activeTaskText}`; e.title = this.activeTaskText; }
      else { e.textContent = 'No task selected'; e.removeAttribute('title'); }
    }
  },
  syncSettingsUI() {
    const t = document.getElementById('setting-focus'); t && (t.value = this.settings.focus);
    const e = document.getElementById('setting-short'); e && (e.value = this.settings.short);
    const s = document.getElementById('setting-long'); s && (s.value = this.settings.long);
    const o = document.getElementById('setting-interval'); o && (o.value = this.settings.interval);
    const n = document.getElementById('setting-autobreak'); n && (n.checked = this.settings.autoBreak);
    const i = document.getElementById('setting-autofocus'); i && (i.checked = this.settings.autoFocus);
  },
  setMode(t) { this.stop(); this.mode = t; const e = { focus: this.settings.focus, short: this.settings.short, long: this.settings.long }; this.setDuration(60 * e[t]); document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active')); const s = document.querySelector(`[data-mode="${t}"]`); s && s.classList.add('active'); const o = document.getElementById('pomo-mode-label'); o && (o.textContent = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' }[t]); const n = document.getElementById('pomo-ring-progress'); n && (n.style.stroke = (t === 'focus') ? 'var(--accent)' : 'var(--green)'); },
  setDuration(t) { this.duration = t; this.remaining = t; this.updateDisplay(); },
  togglePlay() { this.running ? this.pause() : this.start(); },
  start() {
    if (this.remaining <= 0) return;
    this.running = true;
    const t = document.getElementById('pomo-play'); t && t.classList.add('playing');
    if (this.mode === 'focus') FluxAudio.pomoStart();

    // main tick
    this.interval = setInterval(() => {
      this.remaining--;
      if (this.mode === 'focus') { this.totalFocusToday++; this.getTodoApi()?.addTrackedTime?.(1); this.updateStatsBar(); }
      this.updateDisplay();
      if (this.remaining <= 0) this.onComplete();
    }, 1000);

    // Leaderboard presence sync: write immediately and then periodically while running
    try {
      if (window.Leaderboard?.syncLeaderboard) {
        // clear any existing sync interval
        if (this._leaderboardSyncInterval) { clearInterval(this._leaderboardSyncInterval); this._leaderboardSyncInterval = null; }
        // immediate write
        window.Leaderboard.syncLeaderboard();
        // periodic sync every 30s to keep presence fresh
        this._leaderboardSyncInterval = setInterval(() => { try { window.Leaderboard.syncLeaderboard(); } catch (e) {} }, 30 * 1000);
      }
    } catch (e) {}
  },
  pause() {
    this.running = false;
    clearInterval(this.interval);
    this.interval = null;
    // clear leaderboard sync interval
    try { if (this._leaderboardSyncInterval) { clearInterval(this._leaderboardSyncInterval); this._leaderboardSyncInterval = null; } } catch (e) {}
    const t = document.getElementById('pomo-play'); t && t.classList.remove('playing');
    try { window.Leaderboard?.syncLeaderboard?.(); } catch (e) {}
  },
  stop() { this.pause(); this.remaining = this.duration; this.updateDisplay(); },
  reset() { this.stop(); FluxAudio.buttonClick(); },
  skip() { FluxAudio.buttonClick(); this.onComplete(); },
  onComplete() {
    this.pause();
    if (this.mode === 'focus') {
      this.sessionsToday++; this.consecutiveFocus++; FluxAudio.pomoEnd(); Flux.showToast('Session complete! Time for a break 🌿');
      document.getElementById('bloom-container').classList.add('bloom-burst');
      setTimeout(() => document.getElementById('bloom-container').classList.remove('bloom-burst'), 600);
      this.saveStats(true);
      try { window.Leaderboard?.syncLeaderboard?.(); } catch (t) {}
      if (this.consecutiveFocus >= this.settings.interval) { this.consecutiveFocus = 0; this.setMode('long'); } else { this.setMode('short'); }
      if (this.settings.autoBreak) setTimeout(() => this.start(), 500);
    } else {
      FluxAudio.breakEnd(); Flux.showToast('Break over! Ready to focus? 💪'); this.setMode('focus');
      if (this.settings.autoFocus) setTimeout(() => this.start(), 500);
    }
    this.updateStatsBar();
  },
  updateDisplay() {
    const t = document.getElementById('pomo-time'); if (t) t.textContent = Flux.formatTimeShort(this.remaining);
    const e = this.duration > 0 ? (this.duration - this.remaining) / this.duration : 0;
    const s = this.circumference * (1 - e);
    const o = document.getElementById('pomo-ring-progress'); if (o) o.style.strokeDashoffset = s;
  },
  updateStatsBar() {
    const t = document.getElementById('pomo-session-count'); t && (t.textContent = this.sessionsToday);
    const e = document.getElementById('pomo-streak'); e && (e.textContent = this.streak + ' 🔥');
    const s = document.getElementById('pomo-total-time'); s && (s.textContent = Flux.formatTime(this.totalFocusToday));
    const o = document.getElementById('sidebar-focus-time'); o && (o.textContent = Flux.formatTime(this.totalFocusToday));
    const n = document.getElementById('sidebar-sessions'); n && (n.textContent = this.sessionsToday);
  },
  saveSettings() {
    Flux.updateSettings({ pomoDuration: this.settings.focus, shortBreak: this.settings.short, longBreak: this.settings.long, interval: this.settings.interval, autoBreak: this.settings.autoBreak, autoFocus: this.settings.autoFocus, accent: Flux.load('flux_settings', {}).accent, theme: Flux.load('flux_settings', {}).theme });
  },
  saveStats() {
    const t = Flux.load('flux_stats', { sessions: {}, totalTime: {}, events: {} }), e = Flux.todayKey();
    if (!t.sessions) t.sessions = {};
    if (!t.totalTime) t.totalTime = {};
    if (!t.events) t.events = {};
    t.sessions[e] = this.sessionsToday;
    t.totalTime[e] = this.totalFocusToday;
    if (this.mode === 'focus') {
      const s = (new Date).getHours(); if (!Array.isArray(t.events[e])) t.events[e] = [];
      t.events[e].push({ hour: s, duration: 60 * this.settings.focus, at: Date.now() });
    }
    this.recomputeStreaks(t);
    t.streak = this.streak;
    t.longestStreak = this.longestStreak;
    Flux.saveNow('flux_stats', t);
  },
  recomputeStreaks(t) {
    const e = t.sessions || {};
    let s = 0; let o = new Date();
    while ((e[o.toISOString().split('T')[0]] || 0) > 0) { s += 1; o.setDate(o.getDate() - 1); }
    const n = Object.keys(e).sort(); let i = 0, a = 0, u = null;
    n.forEach((k) => {
      if ((e[k] || 0) <= 0) { a = 0; u = k; return; }
      if (!u) { a = 1; i = Math.max(i, a); u = k; return; }
      const sD = new Date(u), oD = new Date(k);
      if (1 === Math.round((oD - sD) / 864e5) && (e[u] || 0) > 0) a += 1; else a = 1;
      i = Math.max(i, a); u = k;
    });
    this.streak = s; this.longestStreak = Math.max(this.longestStreak, i);
  }
};
