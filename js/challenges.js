/* ═══════════════════════════════════════
   FLUX — Monthly Challenges
   ═══════════════════════════════════════ */

const FluxChallenges = {
  activeTab: 'active',
  isBound: false,

  // Predefined monthly challenges
  predefined: [
    { id: 'p1', title: '20 Pomodoro Sessions', desc: 'Complete 20 focus sessions this month', icon: '🍅', cat: 'focus',       target: 20, metric: 'sessions' },
    { id: 'p2', title: '10 Hours of Focus',    desc: 'Accumulate 10 total hours of focused work', icon: '⏱', cat: 'focus',   target: 36000, metric: 'totalTime' },
    { id: 'p3', title: '7-Day Streak',          desc: 'Focus every day for 7 days straight', icon: '🔥', cat: 'consistency',  target: 7, metric: 'streak' },
    { id: 'p4', title: 'Complete 30 Tasks',     desc: 'Check off 30 tasks this month', icon: '✅', cat: 'tasks',             target: 30, metric: 'tasksCompleted' },
    { id: 'p5', title: 'Study 5 Days in a Row', desc: 'Log at least one session for 5 consecutive days', icon: '📅', cat: 'consistency', target: 5, metric: 'streak' },
    { id: 'p6', title: '30h Monthly Focus',     desc: 'Hit 30 hours of total focus this month', icon: '🎯', cat: 'focus',    target: 108000, metric: 'totalTime' },
    { id: 'p7', title: 'Early Bird Week',        desc: 'Start a session before 9 AM for 5 days', icon: '🌅', cat: 'wellness', target: 5, metric: 'earlyBird' },
    { id: 'p8', title: 'No-Distraction Day',    desc: 'Complete 4 pomodoros in a single day', icon: '🧘', cat: 'focus',      target: 4, metric: 'dailySessions' },
    { id: 'p9', title: 'Category Explorer',     desc: 'Track tasks in all 5 categories', icon: '🗂', cat: 'tasks',           target: 5, metric: 'categories' },
    { id: 'p10', title: 'Long Haul',            desc: 'Complete 3 long (25+ min) pomodoros in one day', icon: '🏋', cat: 'focus', target: 3, metric: 'longSessions' },
  ],

  init() {
    document.querySelectorAll('.challenge-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.challenge-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.ctab;
        this.render();
        FluxAudio.buttonClick();
      });
    });

    document.getElementById('custom-challenge-add-btn')?.addEventListener('click', () => this.addCustom());
    document.getElementById('custom-challenge-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addCustom();
    });

    if (!this.isBound) this.bindGridActions();

    this.render();
  },

  bindGridActions() {
    this.isBound = true;
    const grid = document.getElementById('challenges-grid');
    if (!grid) return;

    grid.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('.challenge-delete-btn');
      if (deleteBtn?.dataset.id) {
        this.deleteCustom(deleteBtn.dataset.id);
        return;
      }

      const doneBtn = event.target.closest('.challenge-complete-btn');
      if (doneBtn?.dataset.id) {
        this.markDone(doneBtn.dataset.id, event);
      }
    });
  },

  getChallengeData() {
    return Flux.load('flux_challenges', { completed: {}, custom: [], progress: {} });
  },

  saveData(data) {
    Flux.saveNow('flux_challenges', data);
  },

  getProgress(metric) {
    const stats = Flux.load('flux_stats', { sessions: {}, totalTime: {} });
    const todos = Flux.load('flux_todos', []);
    const events = stats.events || {};
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();

    // Compute this-month totals
    let monthSessions = 0, monthTime = 0, monthTasksCompleted = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = new Date(year, month, d).toISOString().split('T')[0];
      monthSessions += (stats.sessions?.[key]) || 0;
      monthTime     += (stats.totalTime?.[key]) || 0;
    }
    const monthKeys = [];
    // Count tasks completed this month by checking createdAt
    monthTasksCompleted = todos.filter(t => {
      if (!t.completed || !t.createdAt) return false;
      const taskMonth = new Date(t.createdAt).getMonth();
      const taskYear = new Date(t.createdAt).getFullYear();
      return taskMonth === month && taskYear === year;
    }).length;

    for (let d = 1; d <= daysInMonth; d++) {
      monthKeys.push(new Date(year, month, d).toISOString().split('T')[0]);
    }

    const monthMaxStreak = (() => {
      let best = 0;
      let cur = 0;
      monthKeys.forEach((key) => {
        if ((stats.sessions?.[key] || 0) > 0) {
          cur += 1;
          best = Math.max(best, cur);
        } else {
          cur = 0;
        }
      });
      return best;
    })();

    const monthMaxDailySessions = Math.max(...monthKeys.map((key) => stats.sessions?.[key] || 0), 0);

    const earlyBirdDays = (() => {
      let count = 0;
      monthKeys.forEach((key) => {
        const dayEvents = events[key] || [];
        if (dayEvents.some((evt) => Number.isInteger(evt.hour) && evt.hour < 9)) count += 1;
      });
      return count;
    })();

    const longHaulBestDay = (() => {
      let best = 0;
      monthKeys.forEach((key) => {
        const dayEvents = events[key] || [];
        const longCount = dayEvents.filter((evt) => (evt.duration || 0) >= 1500).length;
        best = Math.max(best, longCount);
      });
      return best;
    })();

    switch (metric) {
      case 'sessions':       return monthSessions;
      case 'totalTime':      return monthTime;
      case 'streak':         return monthMaxStreak;
      case 'tasksCompleted': return monthTasksCompleted;
      case 'categories': {
        const cats = new Set(todos.filter(t => t.completed).map(t => t.category));
        return cats.size;
      }
      case 'dailySessions': {
        return monthMaxDailySessions;
      }
      case 'earlyBird':      return earlyBirdDays;
      case 'longSessions':   return longHaulBestDay;
      default: return 0;
    }
  },

  render() {
    const data     = this.getChallengeData();
    const grid     = document.getElementById('challenges-grid');
    const monthLabel = document.getElementById('challenges-month-label');
    const now = new Date();
    monthLabel.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Update month label in header
    const allChallenges = [
      ...this.predefined.map(c => ({ ...c, isCustom: false })),
      ...(data.custom || []).map(c => ({ ...c, isCustom: true }))
    ];

    const totalCount = allChallenges.length;
    const doneCount  = allChallenges.filter(c => data.completed?.[c.id]).length;
    document.getElementById('challenges-total-count').textContent = totalCount;
    document.getElementById('challenges-done-count').textContent  = doneCount;
    document.getElementById('challenges-prog-pct').textContent    = totalCount > 0 ? Math.round(doneCount / totalCount * 100) + '%' : '0%';

    const circumference = 163;
    const pct = totalCount > 0 ? doneCount / totalCount : 0;
    document.getElementById('challenges-prog-ring').style.strokeDashoffset = circumference * (1 - pct);

    // Filter by tab
    let filtered = allChallenges;
    if (this.activeTab === 'completed') filtered = allChallenges.filter(c => data.completed?.[c.id]);
    else if (this.activeTab === 'active') filtered = allChallenges.filter(c => !data.completed?.[c.id]);
    else if (this.activeTab === 'custom') filtered = allChallenges.filter(c => c.isCustom);

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="challenges-empty">
        ${this.activeTab === 'completed' ? 'No completed challenges yet. Keep going! 💪' :
          this.activeTab === 'custom'    ? 'No custom challenges yet. Add one below!' :
          'All challenges completed! 🎉'}
      </div>`;
      return;
    }

    const accent = window.FluxTheme?.getAccentPalette?.(Flux.load('flux_settings', {})?.accent)?.primary || 'var(--accent)';
    const catColors = { focus: accent, consistency: '#22d3a0', tasks: '#60a5fa', wellness: '#f59e0b' };

    grid.innerHTML = filtered.map(c => {
      const done     = !!(data.completed?.[c.id]);
      const progress = !done && c.metric ? this.getProgress(c.metric) : (done ? c.target : 0);
      const pct      = c.target ? Math.min(Math.round(progress / c.target * 100), 100) : 0;
      const color    = catColors[c.cat] || 'var(--accent)';

      return `<div class="challenge-card glass-panel ${done ? 'challenge-done' : ''}">
        <div class="challenge-card-top">
          <span class="challenge-icon">${c.icon}</span>
          <span class="challenge-cat-badge" style="background:${color}22;color:${color}">${c.cat}</span>
          ${c.isCustom ? `<button class="challenge-delete-btn" data-id="${c.id}" title="Delete" type="button">✕</button>` : ''}
          ${done ? '<span class="challenge-done-badge">✓ Done</span>' : ''}
        </div>
        <h3 class="challenge-card-title">${Flux.sanitize(c.title)}</h3>
        <p class="challenge-card-desc">${Flux.sanitize(c.desc)}</p>
        ${c.target && !c.isCustom ? `
        <div class="challenge-progress-wrap">
          <div class="challenge-prog-bar-bg">
            <div class="challenge-prog-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="challenge-prog-val" style="color:${color}">${pct}%</span>
        </div>
        <div class="challenge-prog-label">${Math.min(progress, c.target)} / ${this.formatTarget(c.target, c.metric)}</div>
        ` : ''}
        ${!done ? `<button class="challenge-complete-btn" style="--btn-color:${color}" data-id="${c.id}" type="button">Mark Complete</button>` : ''}
      </div>`;
    }).join('');
  },

  formatTarget(target, metric) {
    if (metric === 'totalTime') return Flux.formatTime(target);
    return target;
  },

  markDone(id, event) {
    const data = this.getChallengeData();
    if (!data.completed) data.completed = {};
    data.completed[id] = true;
    this.saveData(data);
    Flux.showToast('Challenge completed! 🏆');
    FluxAudio.taskComplete();
    const source = event?.currentTarget;
    if (source) {
      const rect = source.getBoundingClientRect();
      Flux.confetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      Flux.confetti(window.innerWidth / 2, window.innerHeight / 3);
    }
    this.render();
  },

  addCustom() {
    const input = document.getElementById('custom-challenge-input');
    const cat   = document.getElementById('custom-challenge-cat').value;
    const text  = Flux.cleanText(input.value, 80);
    if (!text) return;

    const data = this.getChallengeData();
    if (!data.custom) data.custom = [];

    const catEmoji = { focus: '🎯', consistency: '📅', tasks: '✅', wellness: '🌿' };
    data.custom.push({
      id: 'c_' + Date.now().toString(36),
      title: text,
      desc: 'Your personal challenge',
      icon: catEmoji[cat] || '⭐',
      cat,
      isCustom: true,
    });

    this.saveData(data);
    input.value = '';
    FluxAudio.taskAdded();
    this.activeTab = 'custom';
    document.querySelectorAll('.challenge-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-ctab="custom"]').classList.add('active');
    this.render();
  },

  deleteCustom(id) {
    const data = this.getChallengeData();
    data.custom = (data.custom || []).filter(c => c.id !== id);
    if (data.completed) delete data.completed[id];
    this.saveData(data);
    FluxAudio.buttonClick();
    this.render();
  }
};
