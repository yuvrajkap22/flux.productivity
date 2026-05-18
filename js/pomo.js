/* ═══════════════════════════════════════
   FLUX — Pomodoro Timer
   ═══════════════════════════════════════ */

const FluxPomo = {
  // Timer state
  mode: 'focus', // 'focus' | 'short' | 'long'
  duration: 25 * 60,
  remaining: 25 * 60,
  running: false,
  interval: null,

  // Settings
  settings: {
    focus: 25, short: 5, long: 15,
    interval: 4, autoBreak: true, autoFocus: true,
  },

  // Stats
  sessionsToday: 0,
  streak: 0,
  longestStreak: 0,
  totalFocusToday: 0,
  consecutiveFocus: 0,
  activeTaskId: null,
  activeTaskText: '',

  // Ring
  circumference: 2 * Math.PI * 88, // r=88
  _wasRunningOnHide: false,

  getTodoApi() {
    if (window.FluxTodo) return window.FluxTodo;
    if (typeof FluxTodo !== 'undefined') return FluxTodo;
    return null;
  },

  init() {
    // Load settings
    const saved = Flux.load('flux_settings', {});
    if (saved.pomoDuration) this.settings.focus = saved.pomoDuration;
    if (saved.shortBreak) this.settings.short = saved.shortBreak;
    if (saved.longBreak) this.settings.long = saved.longBreak;
    if (saved.interval) this.settings.interval = saved.interval;
    if (saved.autoBreak !== undefined) this.settings.autoBreak = saved.autoBreak;
    if (saved.autoFocus !== undefined) this.settings.autoFocus = saved.autoFocus;

    // Load stats
    const stats = Flux.load('flux_stats', {});
    const today = Flux.todayKey();
    this.sessionsToday = (stats.sessions && stats.sessions[today]) || 0;
    this.streak = stats.streak || 0;
    this.longestStreak = stats.longestStreak || 0;
    this.totalFocusToday = (stats.totalTime && stats.totalTime[today]) || 0;

    // Set initial duration
    this.duration = this.settings.focus * 60;
    this.remaining = this.duration;

    this.bindEvents();
    // Pause/resume when page visibility changes to reduce background work
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.running) {
          this._wasRunningOnHide = true;
          this.pause();
        }
      } else {
        if (this._wasRunningOnHide) {
          this._wasRunningOnHide = false;
          this.start();
        }
      }
    });
    this.syncActiveTask();
    this.updateDisplay();
    this.updateStatsBar();
    this.syncSettingsUI();
    this.recomputeStreaks(stats);
    this.updateStatsBar();
  },

  bindEvents() {
    const play = document.getElementById('pomo-play'); if (play) play.addEventListener('click', () => this.togglePlay());
    const reset = document.getElementById('pomo-reset'); if (reset) reset.addEventListener('click', () => this.reset());
    const skip = document.getElementById('pomo-skip'); if (skip) skip.addEventListener('click', () => this.skip());

    // Mode buttons
    const modesEl = document.getElementById('pomo-modes');
    if (modesEl) modesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      this.setMode(btn.dataset.mode);
    });

    // Settings toggle
    const settingsBtn = document.getElementById('pomo-settings-btn');
    const settingsDropdown = document.getElementById('pomo-settings-dropdown');
    if (settingsBtn && settingsDropdown) settingsBtn.addEventListener('click', () => settingsDropdown.classList.toggle('hidden'));

    // Settings inputs
    const settingInputs = {
      'setting-focus': (v) => { this.settings.focus = v; if (this.mode === 'focus' && !this.running) this.setDuration(v * 60); },
      'setting-short': (v) => { this.settings.short = v; if (this.mode === 'short' && !this.running) this.setDuration(v * 60); },
      'setting-long': (v) => { this.settings.long = v; if (this.mode === 'long' && !this.running) this.setDuration(v * 60); },
      'setting-interval': (v) => { this.settings.interval = v; },
    };

    for (const [id, handler] of Object.entries(settingInputs)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('change', (e) => {
        handler(parseInt(e.target.value) || 1);
        this.saveSettings();
      });
    }

    const autobreak = document.getElementById('setting-autobreak'); if (autobreak) autobreak.addEventListener('change', (e) => { this.settings.autoBreak = e.target.checked; this.saveSettings(); });
    const autofocus = document.getElementById('setting-autofocus'); if (autofocus) autofocus.addEventListener('change', (e) => { this.settings.autoFocus = e.target.checked; this.saveSettings(); });

    window.addEventListener('flux-task-tracking-change', (event) => {
      this.setActiveTask(event.detail || null);
    });
  },

  syncActiveTask() {
    const task = this.getTodoApi()?.getActiveTask?.() || null;
    this.setActiveTask(task);
  },

  setActiveTask(task) {
    this.activeTaskId = task?.id || null;
    this.activeTaskText = task?.text || '';
    const label = document.getElementById('pomo-task-label');
    if (!label) return;
    if (this.activeTaskText) {
      label.textContent = `Task: ${this.activeTaskText}`;
      label.title = this.activeTaskText;
    } else {
      label.textContent = 'No task selected';
      label.removeAttribute('title');
    }
  },

  syncSettingsUI() {
    const sf = document.getElementById('setting-focus'); if (sf) sf.value = this.settings.focus;
    const ss = document.getElementById('setting-short'); if (ss) ss.value = this.settings.short;
    const sl = document.getElementById('setting-long'); if (sl) sl.value = this.settings.long;
    const si = document.getElementById('setting-interval'); if (si) si.value = this.settings.interval;
    const sab = document.getElementById('setting-autobreak'); if (sab) sab.checked = this.settings.autoBreak;
    const saf = document.getElementById('setting-autofocus'); if (saf) saf.checked = this.settings.autoFocus;
  },

  setMode(mode) {
    this.stop();
    this.mode = mode;
    const durations = { focus: this.settings.focus, short: this.settings.short, long: this.settings.long };
    this.setDuration(durations[mode] * 60);

    // Update UI
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    const modeBtn = document.querySelector(`[data-mode="${mode}"]`);
    if (modeBtn) modeBtn.classList.add('active');

    const labels = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' };
    const modeLabel = document.getElementById('pomo-mode-label');
    if (modeLabel) modeLabel.textContent = labels[mode];

    // Ring color
    const ring = document.getElementById('pomo-ring-progress');
    if (ring) {
      if (mode === 'focus') ring.style.stroke = 'var(--accent)';
      else ring.style.stroke = 'var(--green)';
    }
  },

  setDuration(seconds) {
    this.duration = seconds;
    this.remaining = seconds;
    this.updateDisplay();
  },

  togglePlay() {
    if (this.running) {
      this.pause();
    } else {
      this.start();
    }
  },

  start() {
    if (this.remaining <= 0) return;
    this.running = true;
    const playBtn = document.getElementById('pomo-play'); if (playBtn) playBtn.classList.add('playing');

    if (this.mode === 'focus') FluxAudio.pomoStart();

    this.interval = setInterval(() => {
      this.remaining--;
      if (this.mode === 'focus') {
        this.totalFocusToday++;
        this.getTodoApi()?.addTrackedTime?.(1);
        this.updateStatsBar();
      }
      this.updateDisplay();

      if (this.remaining <= 0) {
        this.onComplete();
      }
    }, 1000);
  },

  pause() {
    this.running = false;
    clearInterval(this.interval);
    const playBtn = document.getElementById('pomo-play'); if (playBtn) playBtn.classList.remove('playing');
  },

  stop() {
    this.pause();
    this.remaining = this.duration;
    this.updateDisplay();
  },

  reset() {
    this.stop();
    FluxAudio.buttonClick();
  },

  skip() {
    FluxAudio.buttonClick();
    this.onComplete();
  },

  onComplete() {
    this.pause();

    if (this.mode === 'focus') {
      // Focus session completed
      this.sessionsToday++;
      this.consecutiveFocus++;

      FluxAudio.pomoEnd();
      Flux.showToast('Session complete! Time for a break 🌿');

      // Bloom burst
      document.getElementById('bloom-container').classList.add('bloom-burst');
      setTimeout(() => document.getElementById('bloom-container').classList.remove('bloom-burst'), 600);

      this.saveStats(true);
        // sync leaderboard after completed focus session
        try { window.Leaderboard?.syncLeaderboard?.(); } catch (e) { /* ignore */ }

      // Auto-switch to break
      if (this.consecutiveFocus >= this.settings.interval) {
        this.consecutiveFocus = 0;
        this.setMode('long');
      } else {
        this.setMode('short');
      }

      if (this.settings.autoBreak) {
        setTimeout(() => this.start(), 500);
      }
    } else {
      // Break completed
      FluxAudio.breakEnd();
      Flux.showToast('Break over! Ready to focus? 💪');
      this.setMode('focus');

      if (this.settings.autoFocus) {
        setTimeout(() => this.start(), 500);
      }
    }

    this.updateStatsBar();
  },

  updateDisplay() {
    const timeEl = document.getElementById('pomo-time');
    if (timeEl) timeEl.textContent = Flux.formatTimeShort(this.remaining);

    // Update ring
    const progress = this.duration > 0 ? (this.duration - this.remaining) / this.duration : 0;
    const offset = this.circumference * (1 - progress);
    const ringEl = document.getElementById('pomo-ring-progress');
    if (ringEl) ringEl.style.strokeDashoffset = offset;
  },

  updateStatsBar() {
    const sessEl = document.getElementById('pomo-session-count'); if (sessEl) sessEl.textContent = this.sessionsToday;
    const streakEl = document.getElementById('pomo-streak'); if (streakEl) streakEl.textContent = this.streak + ' 🔥';
    const totalEl = document.getElementById('pomo-total-time'); if (totalEl) totalEl.textContent = Flux.formatTime(this.totalFocusToday);

    // Also update sidebar (guarded)
    const sidebarFocus = document.getElementById('sidebar-focus-time'); if (sidebarFocus) sidebarFocus.textContent = Flux.formatTime(this.totalFocusToday);
    const sidebarSess = document.getElementById('sidebar-sessions'); if (sidebarSess) sidebarSess.textContent = this.sessionsToday;
  },

  saveSettings() {
    Flux.updateSettings({
      pomoDuration: this.settings.focus,
      shortBreak: this.settings.short,
      longBreak: this.settings.long,
      interval: this.settings.interval,
      autoBreak: this.settings.autoBreak,
      autoFocus: this.settings.autoFocus,
      accent: Flux.load('flux_settings', {}).accent,
      theme: Flux.load('flux_settings', {}).theme,
    });
  },

  saveStats() {
    const stats = Flux.load('flux_stats', { sessions: {}, totalTime: {}, events: {} });
    const today = Flux.todayKey();
    if (!stats.sessions) stats.sessions = {};
    if (!stats.totalTime) stats.totalTime = {};
    if (!stats.events) stats.events = {};
    stats.sessions[today] = this.sessionsToday;
    stats.totalTime[today] = this.totalFocusToday;

    if (this.mode === 'focus') {
      const hour = new Date().getHours();
      if (!Array.isArray(stats.events[today])) stats.events[today] = [];
      stats.events[today].push({
        hour,
        duration: this.settings.focus * 60,
        at: Date.now(),
      });
    }

    this.recomputeStreaks(stats);
    stats.streak = this.streak;
    stats.longestStreak = this.longestStreak;
    Flux.saveNow('flux_stats', stats);
  },

  recomputeStreaks(stats) {
    const sessions = stats.sessions || {};
    let current = 0;
    let cursor = new Date();
    while ((sessions[cursor.toISOString().split('T')[0]] || 0) > 0) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const keys = Object.keys(sessions).sort();
    let longest = 0;
    let run = 0;
    let prev = null;
    keys.forEach((key) => {
      if ((sessions[key] || 0) <= 0) {
        run = 0;
        prev = key;
        return;
      }

      if (!prev) {
        run = 1;
        longest = Math.max(longest, run);
        prev = key;
        return;
      }

      const prevDate = new Date(prev);
      const curDate = new Date(key);
      const diffDays = Math.round((curDate - prevDate) / 86400000);
      if (diffDays === 1 && (sessions[prev] || 0) > 0) run += 1;
      else run = 1;
      longest = Math.max(longest, run);
      prev = key;
    });

    this.streak = current;
    this.longestStreak = Math.max(this.longestStreak, longest);
  }
};
