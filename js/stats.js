/* ═══════════════════════════════════════
   FLUX — Enhanced Stats Engine
   ═══════════════════════════════════════ */

const FluxStats = {
  period: 'week', // 'week' | '30' | 'month' | 'all'
  dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  monthLabels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],

  init() {
    // Period toggle buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.period = btn.dataset.period;
        this.scheduleRender();
        FluxAudio.buttonClick();
      });
    });

    // Cache frequently used DOM references to avoid repeated lookups
    this.refs = {
      barChartTitle: document.getElementById('bar-chart-title'),
      barChart: document.getElementById('bar-chart'),
      dayHistogram: document.getElementById('day-histogram'),
      dayHistTitle: document.getElementById('day-hist-title'),
      topTasksList: document.getElementById('top-tasks-list'),
      categoryBars: document.getElementById('category-bars'),
      statTotalTime: document.getElementById('stat-total-time'),
      statTotalSessions: document.getElementById('stat-total-sessions'),
      statCurrentStreak: document.getElementById('stat-current-streak'),
      statLongestStreak: document.getElementById('stat-longest-streak'),
      statTasksDone: document.getElementById('stat-tasks-done'),
      statCompletionRate: document.getElementById('stat-completion-rate'),
      avgFocus: document.getElementById('avg-focus'),
      avgSessions: document.getElementById('avg-sessions'),
      bestDayLabel: document.getElementById('best-day-label'),
      bestDayTime: document.getElementById('best-day-time'),
      heatmapTitle: document.getElementById('heatmap-title'),
      heatmapGrid: document.getElementById('focus-heatmap'),
      heatmapBestDay: document.getElementById('heatmap-best-day'),
      heatmapBestDayTime: document.getElementById('heatmap-best-day-time'),
      heatmapTotalTime: document.getElementById('heatmap-total-time'),
    };
  },

  scheduleRender(delay = 250) {
    clearTimeout(this._renderTimer);
    this._renderTimer = setTimeout(() => {
      try { this.render(); } catch (e) { /* ignore */ }
    }, Number(delay) || 250);
  },

  render() {
    const stats  = Flux.load('flux_stats', { sessions: {}, totalTime: {} });
    const todos  = Flux.load('flux_todos', []);

    if (this.period === 'week')  this.renderWeek(stats, todos);
    else if (this.period === '30') this.render30Days(stats, todos);
    else if (this.period === 'month') this.renderMonth(stats, todos);
    else if (this.period === 'all') this.renderAll(stats, todos);
    this.render30DayHeatmap(stats);
    this.renderDayHistogram(stats);
    this.renderTopTasks(todos);
    this.renderCategoryBreakdown(todos);
  },

  render30Days(stats, todos) {
    const days = [];
    let totalSessions = 0, totalTime = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const sessions = (stats.sessions?.[key]) || 0;
      const time = (stats.totalTime?.[key]) || 0;
      days.push({ label: String(d.getDate()), sessions, time, key, date: d });
      totalSessions += sessions;
      totalTime += time;
    }

    if (this.refs?.barChartTitle) this.refs.barChartTitle.textContent = '30-Day Focus Distribution';
    this.setOverviewCards(totalTime, totalSessions, stats, todos);
    this.renderBarChart(days, 'time');
    this.renderAverages(days, totalTime, totalSessions);
  },

  /* ─── Weekly view ─── */
  renderWeek(stats, todos) {
    const days = [];
    let totalSessions = 0, totalTime = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const sessions = (stats.sessions?.[key]) || 0;
      const time     = (stats.totalTime?.[key]) || 0;
      days.push({ label: this.dayLabels[d.getDay()], sessions, time, key, date: d });
      totalSessions += sessions;
      totalTime     += time;
    }

    if (this.refs?.barChartTitle) this.refs.barChartTitle.textContent = 'Focus Trend (Last 7 Days)';
    this.setOverviewCards(totalTime, totalSessions, stats, todos);
    this.renderBarChart(days, 'time');
    this.renderAverages(days, totalTime, totalSessions);
  },

  /* ─── Monthly view ─── */
  renderMonth(stats, todos) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    let totalSessions = 0, totalTime = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key  = date.toISOString().split('T')[0];
      const sessions = (stats.sessions?.[key]) || 0;
      const time     = (stats.totalTime?.[key]) || 0;
      days.push({ label: String(d), sessions, time, key, date });
      totalSessions += sessions;
      totalTime     += time;
    }

    const monthName = this.monthLabels[month] + ' ' + year;
    if (this.refs?.barChartTitle) this.refs.barChartTitle.textContent = `Monthly Focus (${monthName})`;
    this.setOverviewCards(totalTime, totalSessions, stats, todos);
    this.renderBarChart(days, 'time');
    this.renderAverages(days, totalTime, totalSessions);
  },

  /* ─── All-time view ─── */
  renderAll(stats, todos) {
    // Group by month for last 12 months
    const months = [];
    let totalSessions = 0, totalTime = 0;

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const mon  = d.getMonth();
      let mSessions = 0, mTime = 0;

      const daysInM = new Date(year, mon + 1, 0).getDate();
      for (let day = 1; day <= daysInM; day++) {
        const date = new Date(year, mon, day);
        const key  = date.toISOString().split('T')[0];
        mSessions += (stats.sessions?.[key]) || 0;
        mTime     += (stats.totalTime?.[key]) || 0;
      }

      months.push({ label: this.monthLabels[mon], sessions: mSessions, time: mTime });
      totalSessions += mSessions;
      totalTime     += mTime;
    }

    if (this.refs?.barChartTitle) this.refs.barChartTitle.textContent = 'Monthly Focus (Last 12 Months)';
    this.setOverviewCards(totalTime, totalSessions, stats, todos);
    this.renderBarChart(months, 'time');
    this.renderAverages(months, totalTime, totalSessions);
  },

  setOverviewCards(totalTime, totalSessions, stats, todos) {
    if (this.refs?.statTotalTime) this.refs.statTotalTime.textContent = Flux.formatTime(totalTime);
    if (this.refs?.statTotalSessions) this.refs.statTotalSessions.textContent = totalSessions;
    if (this.refs?.statCurrentStreak) this.refs.statCurrentStreak.textContent = (stats.streak || 0) + ' 🔥';
    if (this.refs?.statLongestStreak) this.refs.statLongestStreak.textContent = stats.longestStreak || 0;

    const done  = todos.filter(t => t.completed).length;
    const total = todos.length;
    if (this.refs?.statTasksDone) this.refs.statTasksDone.textContent = done;
    if (this.refs?.statCompletionRate) this.refs.statCompletionRate.textContent =
      total > 0 ? Math.round(done / total * 100) + '% completion' : '—';
  },

  renderBarChart(days, metric) {
    if (!Array.isArray(days) || days.length === 0) return;
    const maxVal = Math.max(...days.map(d => d[metric] || 0), 1);
    const chart  = this.refs?.barChart || document.getElementById('bar-chart');
    if (!chart) return;
    const MAX_BARS = 14; // limit labels for readability in month view

    let displayDays = days;
    const isMobile = window.innerWidth <= 768;
    const barDelayStep = isMobile ? 12 : 24;
    if (days.length > MAX_BARS) {
      // Sample every N days
      const step = Math.ceil(days.length / MAX_BARS);
      displayDays = days.filter((_, i) => i % step === 0 || i === days.length - 1);
    }

    chart.innerHTML = displayDays.map((d, idx) => {
      const val  = d[metric] || 0;
      const h    = Math.max((val / maxVal) * 130, val > 0 ? 6 : 2);
      const isToday = d.key === Flux.todayKey();
      return `<div class="bar-col ${isToday ? 'bar-today' : ''}">
        <div class="bar-value">${val > 0 ? Flux.formatTime(val) : ''}</div>
        <div class="bar-fill" style="height:${h}px;--bar-delay:${idx * barDelayStep}ms"></div>
        <div class="bar-label">${d.label}</div>
      </div>`;
    }).join('');
  },

  render30DayHeatmap(stats) {
    const grid = this.refs?.heatmapGrid || document.getElementById('focus-heatmap');
    if (!grid) return;

    const days = [];
    let totalTime = 0;
    let bestDay = null;

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const time = Number(stats.totalTime?.[key]) || 0;
      const sessions = Number(stats.sessions?.[key]) || 0;
      const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const day = { key, date, label, time, sessions };
      days.push(day);
      totalTime += time;
      if (!bestDay || time > bestDay.time) bestDay = day;
    }

    const maxTime = Math.max(...days.map((day) => day.time), 1);
    const totalSessions = days.reduce((sum, day) => sum + day.sessions, 0);
    const intensityFor = (time) => {
      if (time <= 0) return 0;
      const ratio = time / maxTime;
      if (ratio > 0.75) return 4;
      if (ratio > 0.5) return 3;
      if (ratio > 0.25) return 2;
      return 1;
    };

    grid.innerHTML = days.map((day) => {
      const level = intensityFor(day.time);
      const title = `${day.label}: ${Flux.formatTime(day.time)} · ${day.sessions} session${day.sessions === 1 ? '' : 's'}`;
      return `<button class="heatmap-cell ${level ? `level-${level}` : 'is-empty'}" type="button" title="${title}" aria-label="${title}">
        <strong>${day.time > 0 ? Flux.formatTime(day.time) : '—'}</strong>
        <span>${day.sessions > 0 ? `${day.sessions}x` : day.label}</span>
      </button>`;
    }).join('');

    if (this.refs?.heatmapBestDay) this.refs.heatmapBestDay.textContent = bestDay ? bestDay.label : '—';
    if (this.refs?.heatmapBestDayTime) this.refs.heatmapBestDayTime.textContent = bestDay ? Flux.formatTime(bestDay.time || 0) : '0m';
    if (this.refs?.heatmapTotalTime) this.refs.heatmapTotalTime.textContent = Flux.formatTime(totalTime);
    if (this.refs?.heatmapTitle) this.refs.heatmapTitle.textContent = `30-Day Heatmap · ${totalSessions} sessions`;
  },

  render30DayLineGraph(stats) {
    const svg = this.refs?.lineChart30 || document.getElementById('line-chart-30');
    if (!svg) return;

    const points = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const time = (stats.totalTime?.[key]) || 0;
      points.push({ key, time, day: d.getDate() });
    }

    const max = Math.max(...points.map(p => p.time), 1);
    const width = 620;
    const height = 180;
    const padX = 18;
    const padY = 16;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    const linePoints = points.map((p, i) => {
      const x = padX + (usableW * i) / Math.max(points.length - 1, 1);
      const y = height - padY - ((p.time / max) * usableH);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    const areaPoints = `${padX},${height - padY} ${linePoints} ${width - padX},${height - padY}`;

    const xLabels = [0, 9, 19, 29].map((idx) => {
      const x = padX + (usableW * idx) / 29;
      return `<text x="${x.toFixed(2)}" y="${height - 2}" class="line-axis-label">${points[idx].day}</text>`;
    }).join('');

    svg.innerHTML = `
      <defs>
        <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.36"></stop>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"></stop>
        </linearGradient>
      </defs>
      <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" class="line-axis"></line>
      <polygon points="${areaPoints}" class="line-area" fill="url(#lineAreaGrad)"></polygon>
      <polyline points="${linePoints}" class="line-path"></polyline>
      ${xLabels}
    `;
  },

  renderDayHistogram(stats) {
    const hist = this.refs?.dayHistogram || document.getElementById('day-histogram');
    const title = this.refs?.dayHistTitle || document.getElementById('day-hist-title');
    if (!hist) return;

    const sourceKey = this.getLatestActivityDay(stats);
    const sourceDate = sourceKey ? new Date(`${sourceKey}T00:00:00`) : new Date();
    const events = stats.events?.[sourceKey] || [];
    const buckets = Array.from({ length: 24 }, () => 0);

    events.forEach((evt) => {
      const h = Number.isInteger(evt?.hour) ? evt.hour : -1;
      if (h >= 0 && h <= 23) {
        buckets[h] += Number(evt.duration) || 1500;
      }
    });

    if (events.length === 0) {
      const sessions = (stats.sessions?.[sourceKey]) || 0;
      buckets[12] = sessions * 1500;
    }

    const max = Math.max(...buckets, 1);
    const isMobile = window.innerWidth <= 768;
    const histDelayStep = isMobile ? 7 : 14;
    const dayLabel = sourceDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (title) title.textContent = `1-Day Hourly Histogram (${dayLabel})`;

    hist.innerHTML = buckets.map((val, hour) => {
      const barH = Math.max((val / max) * 96, val > 0 ? 4 : 2);
      const showLabel = hour % 4 === 0;
      return `<div class="day-hist-col" title="${hour}:00 - ${Flux.formatTime(val)}">
        <div class="day-hist-bar" style="height:${barH.toFixed(1)}px;--hist-delay:${hour * histDelayStep}ms"></div>
        <div class="day-hist-label">${showLabel ? hour : ''}</div>
      </div>`;
    }).join('');
  },

  getLatestActivityDay(stats) {
    const keys = Object.keys(stats.sessions || {}).sort();
    for (let i = keys.length - 1; i >= 0; i--) {
      const k = keys[i];
      if ((stats.sessions?.[k] || 0) > 0 || (stats.totalTime?.[k] || 0) > 0) return k;
    }
    return Flux.todayKey();
  },

  renderTopTasks(todos) {
    const list = this.refs?.topTasksList || document.getElementById('top-tasks-list');
    const top  = [...todos].filter(t => t.timeTracked > 0)
                           .sort((a, b) => b.timeTracked - a.timeTracked)
                           .slice(0, 6);

    if (top.length === 0) {
      const empty = document.createElement('div');
      empty.style.textAlign = 'center';
      empty.style.padding = '20px';
      empty.style.color = 'var(--text-dim)';
      empty.style.fontSize = '13px';
      empty.textContent = 'No tracked tasks yet';
      list.replaceChildren(empty);
      return;
    }
    const maxTime = top[0].timeTracked;
    const frag = document.createDocumentFragment();

    top.forEach((task, index) => {
      const row = document.createElement('div');
      row.className = 'top-task-item';

      const rank = document.createElement('span');
      rank.className = 'top-task-rank';
      rank.textContent = String(index + 1);

      const info = document.createElement('div');
      info.className = 'top-task-info';

      const name = document.createElement('span');
      name.className = 'top-task-name';
      name.textContent = task.text;

      const barBg = document.createElement('div');
      barBg.className = 'top-task-bar-bg';
      const barFill = document.createElement('div');
      barFill.className = 'top-task-bar-fill';
      barFill.style.width = `${Math.round(task.timeTracked / maxTime * 100)}%`;
      barBg.appendChild(barFill);

      info.append(name, barBg);

      const time = document.createElement('span');
      time.className = 'top-task-time';
      time.textContent = Flux.formatTime(task.timeTracked);

      row.append(rank, info, time);
      frag.appendChild(row);
    });

    list.replaceChildren(frag);
  },

  renderCategoryBreakdown(todos) {
    const cats = { work: 0, study: 0, personal: 0, health: 0, creative: 0 };
    todos.forEach(t => {
      if (cats[t.category] !== undefined) cats[t.category] += t.timeTracked || 0;
    });

    const total   = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
    const colors  = { work: '#60a5fa', study: '#a78bfa', personal: '#f472b6', health: '#34d399', creative: '#fbbf24' };
    const labels  = { work: '💼 Work', study: '📚 Study', personal: '🏠 Personal', health: '💪 Health', creative: '🎨 Creative' };
    const container = this.refs?.categoryBars || document.getElementById('category-bars');

    container.innerHTML = Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, time]) => {
        const pct = Math.round(time / total * 100);
        return `<div class="cat-row">
          <span class="cat-row-label">${labels[cat]}</span>
          <div class="cat-bar-bg">
            <div class="cat-bar-fill" style="width:${pct}%;background:${colors[cat]}"></div>
          </div>
          <span class="cat-row-val">${time > 0 ? Flux.formatTime(time) : '—'}</span>
        </div>`;
      }).join('');
  },

  renderAverages(days, totalTime, totalSessions) {
    const avgFocus   = Math.round(totalTime / Math.max(days.length, 1));
    const avgSess    = (totalSessions / Math.max(days.length, 1)).toFixed(1);

    const best = [...days].sort((a, b) => (b.time || 0) - (a.time || 0))[0];

    if (this.refs?.avgFocus) this.refs.avgFocus.textContent = Flux.formatTime(avgFocus);
    if (this.refs?.avgSessions) this.refs.avgSessions.textContent = avgSess;
    if (this.refs?.bestDayLabel) this.refs.bestDayLabel.textContent = best?.label || '—';
    if (this.refs?.bestDayTime) this.refs.bestDayTime.textContent = best ? Flux.formatTime(best.time || 0) : '—';
  },
  updateOverview() {
    const stats = Flux.load('flux_stats', { sessions: {}, totalTime: {}, streak: 0, longestStreak: 0 });
    const todos = Flux.load('flux_todos', []);
    // Update small, frequently-changing widgets without redrawing charts
    const totalTime = Object.values(stats.totalTime || {}).reduce((a, b) => a + (b || 0), 0);
    const totalSessions = Object.values(stats.sessions || {}).reduce((a, b) => a + (b || 0), 0);
    this.setOverviewCards(totalTime, totalSessions, stats, todos);
    // Update top tasks and category breakdown (DOM fragments)
    try { this.renderTopTasks(todos); } catch (e) { /* ignore */ }
    try { this.renderCategoryBreakdown(todos); } catch (e) { /* ignore */ }
  }
};
