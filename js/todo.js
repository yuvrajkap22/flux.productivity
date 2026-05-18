/* ═══════════════════════════════════════
   FLUX — Todo List Manager
   ═══════════════════════════════════════ */

const FluxTodo = {
  todos: [],
  filter: 'all',
  trackingId: null,
  _leaderboardSyncTimer: null,

  init() {
    this.todos = Flux.load('flux_todos', []);
    this.migrateTodos();
    this.bindEvents();
    this.render();
    // Restore selected task for pomodoro targeting
    const tracking = this.todos.find(t => t.tracking);
    if (tracking) {
      this.trackingId = tracking.id;
    }
    this.emitTrackingChange();
  },

  migrateTodos() {
    if (!Array.isArray(this.todos) || this.todos.length === 0) return;
    let changed = false;
    this.todos.forEach((todo) => {
      if (!todo || typeof todo !== 'object') return;
      if (todo.completed) {
        if (!todo.completedAt) {
          todo.completedAt = todo.createdAt || new Date().toISOString();
          changed = true;
        }
      } else if (todo.completedAt) {
        todo.completedAt = null;
        changed = true;
      }
    });
    if (changed) Flux.saveNow('flux_todos', this.todos);
  },

  bindEvents() {
    const input = document.getElementById('todo-input');
    const addBtn = document.getElementById('todo-add-btn');
    const filters = document.getElementById('todo-filters');
    const clearCompletedBtn = document.getElementById('todo-clear-completed-btn');

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTodo();
    });
    addBtn.addEventListener('click', () => this.addTodo());
    clearCompletedBtn?.addEventListener('click', () => this.clearCompleted());

    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.filter = btn.dataset.filter;
      this.render();
    });

    // Event delegation for todo item actions (reduces per-item listeners)
    const list = document.getElementById('todo-list');
    if (list) {
      // Drag & drop handled at container level to avoid per-item listeners
      list._draggingId = null;
      list.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.todo-item');
        if (!item) return;
        if (item.classList.contains('is-editing')) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', item.dataset.id);
        item.style.opacity = '0.4';
        list._draggingId = item.dataset.id;
      });

      list.addEventListener('dragend', (e) => {
        const item = e.target.closest('.todo-item');
        if (item) item.style.opacity = '1';
        list.querySelectorAll('.todo-item').forEach(it => it.style.borderTop = '');
        list._draggingId = null;
      });

      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const over = e.target.closest('.todo-item');
        list.querySelectorAll('.todo-item').forEach(it => it.style.borderTop = '');
        if (!over || over.dataset.id === list._draggingId) return;
        over.style.borderTop = '2px solid var(--accent)';
      });

      list.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropItem = e.target.closest('.todo-item');
        if (!dropItem) return;
        dropItem.style.borderTop = '';
        const dragId = e.dataTransfer.getData('text/plain') || list._draggingId;
        const dropId = dropItem.dataset.id;
        if (!dragId || dragId === dropId) return;
        const dragIdx = this.todos.findIndex(t => t.id === dragId);
        const dropIdx = this.todos.findIndex(t => t.id === dropId);
        if (dragIdx < 0 || dropIdx < 0) return;
        const [moved] = this.todos.splice(dragIdx, 1);
        this.todos.splice(dropIdx, 0, moved);
        this.save();
        this.render();
      });
      list.addEventListener('click', (e) => {
        const item = e.target.closest('.todo-item');
        if (!item) return;
        const id = item.dataset.id;

        if (e.target.closest('.todo-checkbox')) {
          this.toggleComplete(id);
          return;
        }

        if (e.target.closest('.priority-btn')) {
          this.togglePriority(id);
          return;
        }

        if (e.target.closest('.timer-btn')) {
          this.startTimerForTask(id);
          return;
        }

        if (e.target.closest('.edit-btn')) {
          this.startEditTodo(id);
          return;
        }

        if (e.target.closest('.delete-btn')) {
          this.deleteTodo(id);
          return;
        }

        // Click on the item area toggles tracking (ignore clicks on buttons)
        if (e.target.closest('button, .todo-action-btn, .todo-checkbox')) return;
        if (item.classList.contains('is-editing')) return;
        this.toggleTracking(id);
      });

      list.addEventListener('dblclick', (e) => {
        const text = e.target.closest('.todo-text');
        if (!text) return;
        const item = text.closest('.todo-item');
        if (!item) return;
        this.startEditTodo(item.dataset.id);
      });
    }
  },

  addTodo() {
    const input = document.getElementById('todo-input');
    const catSelect = document.getElementById('todo-category');
    const text = Flux.cleanText(input.value, 200);
    if (!text) return;

    const todo = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text,
      category: catSelect.value,
      completed: false,
      priority: false,
      tracking: false,
      timeTracked: 0,
      createdAt: new Date().toISOString(),
    };

    this.todos.unshift(todo);
    input.value = '';
    this.save();
    this.render();
    FluxAudio.taskAdded();
  },

  toggleComplete(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date().toISOString() : null;

    if (todo.completed) {
      // Stop tracking if this task was being tracked
      if (this.trackingId === id) this.stopTracking();
      FluxAudio.taskComplete();
      // Confetti from checkbox position
      const el = document.querySelector(`[data-id="${id}"] .todo-checkbox`);
      if (el) {
        const rect = el.getBoundingClientRect();
        Flux.confetti(rect.left + rect.width / 2, rect.top);
      }
    }

    Flux.saveNow('flux_todos', this.todos);
    this.render();
    this.refreshStatsViews();
    this.scheduleLeaderboardSync();
  },

  togglePriority(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    todo.priority = !todo.priority;
    // Move priority items to top
    if (todo.priority) {
      this.todos = this.todos.filter(t => t.id !== id);
      this.todos.unshift(todo);
    }
    this.save();
    this.render();
  },

  deleteTodo(id) {
    if (this.trackingId === id) this.stopTracking();
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('removing');
      setTimeout(() => {
        this.todos = this.todos.filter(t => t.id !== id);
        this.save();
        this.render();
      }, 250);
    } else {
      this.todos = this.todos.filter(t => t.id !== id);
      this.save();
      this.render();
    }
  },

  clearCompleted() {
    const hadCompleted = this.todos.some(t => t.completed);
    if (!hadCompleted) return;

    if (this.trackingId) {
      const trackingTodo = this.todos.find(t => t.id === this.trackingId);
      if (trackingTodo?.completed) this.stopTracking();
    }

    this.todos = this.todos.filter(t => !t.completed);
    this.save();
    this.render();
    this.refreshStatsViews();
    this.scheduleLeaderboardSync();
    FluxAudio.buttonClick();
    Flux.showToast('Cleared completed tasks');
  },

  startEditTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    const item = document.querySelector(`[data-id="${id}"]`);
    const textEl = item ? item.querySelector('.todo-text') : null;
    if (!item || !textEl) return;

    if (item.classList.contains('is-editing')) return;

    item.classList.add('is-editing');
    item.draggable = false;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-edit-input';
    input.maxLength = 200;
    input.value = todo.text;
    input.setAttribute('aria-label', 'Edit task text');

    textEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => this.commitEditTodo(id, input.value);
    const cancel = () => this.render();

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    });

    input.addEventListener('blur', commit, { once: true });
  },

  commitEditTodo(id, rawText) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    const nextText = Flux.cleanText(rawText, 200);
    if (!nextText || nextText === todo.text) {
      this.render();
      return;
    }

    todo.text = nextText;
    this.save();
    this.render();
  },

  toggleTracking(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo || todo.completed) return;

    if (this.trackingId === id) {
      todo.tracking = false;
      this.trackingId = null;
      this.save();
      this.render();
      this.emitTrackingChange();
      return;
    } else {
      // Set selected task for task-specific pomodoro
      this.todos.forEach(t => { t.tracking = false; });
      todo.tracking = true;
      this.trackingId = id;
    }
    this.save();
    this.render();
    this.emitTrackingChange();
  },

  startTimerForTask(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo || todo.completed) return;

    if (this.trackingId !== id) {
      this.todos.forEach(t => { t.tracking = false; });
      todo.tracking = true;
      this.trackingId = id;
      this.save();
      this.render();
      this.emitTrackingChange();
    }

    const pomo = window.FluxPomo || (typeof FluxPomo !== 'undefined' ? FluxPomo : null);
    if (!pomo) return;

    if (pomo.mode !== 'focus') {
      pomo.setMode('focus');
    }
    if (!pomo.running) {
      pomo.start();
    }

    FluxAudio.buttonClick();
  },

  stopTracking() {
    if (this.trackingId) {
      const todo = this.todos.find(t => t.id === this.trackingId);
      if (todo) todo.tracking = false;
    }
    clearInterval(this.trackingInterval);
    this.trackingId = null;
    this.save();
    this.emitTrackingChange();
  },

  getFiltered() {
    let list = [...this.todos];
    if (this.filter === 'active') list = list.filter(t => !t.completed);
    else if (this.filter === 'completed') list = list.filter(t => t.completed);
    return list;
  },

  render() {
    const container = document.getElementById('todo-list');
    const clearCompletedBtn = document.getElementById('todo-clear-completed-btn');
    const hasCompleted = this.todos.some(t => t.completed);
    if (clearCompletedBtn) clearCompletedBtn.disabled = !hasCompleted;
    const filtered = this.getFiltered();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.textAlign = 'center';
      empty.style.padding = '40px 0';
      empty.style.color = 'var(--text-dim)';
      empty.style.fontSize = '14px';
      empty.textContent = this.filter === 'all' ? 'No tasks yet. Add one below!' : `No ${this.filter} tasks.`;
      container.replaceChildren(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((todo) => frag.appendChild(this.createTodoElement(todo)));
    container.replaceChildren(frag);

    // Drag/drop handled on container via delegated handlers
  },

  createTodoElement(todo) {
    const item = document.createElement('div');
    item.className = `todo-item ${todo.completed ? 'completed' : ''} ${todo.tracking ? 'tracking' : ''} ${todo.priority ? 'priority' : ''}`;
    item.dataset.id = todo.id;
    item.draggable = true;

    const checkbox = document.createElement('button');
    checkbox.className = 'todo-checkbox';
    checkbox.type = 'button';
    checkbox.setAttribute('aria-label', 'Toggle complete');
    checkbox.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';

    const trackingDot = document.createElement('span');
    trackingDot.className = 'todo-tracking-dot';

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;
    text.title = 'Select this task for Pomodoro';

    const tag = document.createElement('span');
    tag.className = 'todo-tag';
    tag.dataset.cat = todo.category;
    tag.textContent = this.catLabel(todo.category);

    const badge = document.createElement('span');
    badge.className = 'todo-time-badge';
    badge.textContent = Flux.formatTrackedTime(todo.timeTracked);

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const priorityBtn = document.createElement('button');
    priorityBtn.className = `todo-action-btn priority-btn ${todo.priority ? 'is-active' : ''}`.trim();
    priorityBtn.type = 'button';
    priorityBtn.title = todo.priority ? 'Remove priority' : 'Mark as priority';
    priorityBtn.setAttribute('aria-label', todo.priority ? 'Remove priority' : 'Mark as priority');
    priorityBtn.setAttribute('aria-pressed', todo.priority ? 'true' : 'false');
    priorityBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
    // Handled via event delegation on the list container

    const timerBtn = document.createElement('button');
    timerBtn.className = `todo-action-btn timer-btn ${todo.tracking ? 'is-active' : ''}`.trim();
    timerBtn.type = 'button';
    timerBtn.title = todo.tracking ? 'Stop timer for this task' : 'Start timer for this task';
    timerBtn.setAttribute('aria-label', timerBtn.title);
    // Use distinct icons for play vs pause for clearer affordance
    timerBtn.innerHTML = todo.tracking
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    // Handled via event delegation on the list container

    const editBtn = document.createElement('button');
    editBtn.className = 'todo-action-btn edit-btn';
    editBtn.type = 'button';
    editBtn.title = 'Edit task';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    // Handled via event delegation on the list container

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-action-btn delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    // Handled via event delegation on the list container

    actions.append(priorityBtn, timerBtn, editBtn, deleteBtn);
    item.append(checkbox, trackingDot, text, tag, badge, actions);

    // dblclick and item clicks handled via event delegation

    return item;
  },

  getActiveTaskId() {
    return this.trackingId;
  },

  getActiveTask() {
    if (!this.trackingId) return null;
    const todo = this.todos.find(t => t.id === this.trackingId && !t.completed);
    if (!todo) return null;
    return { id: todo.id, text: todo.text, timeTracked: todo.timeTracked || 0 };
  },

  emitTrackingChange() {
    const detail = this.getActiveTask();
    window.dispatchEvent(new CustomEvent('flux-task-tracking-change', { detail }));
  },

  addTrackedTime(seconds = 1) {
    if (!this.trackingId) return;
    const todo = this.todos.find(t => t.id === this.trackingId);
    if (!todo || todo.completed) return;

    todo.timeTracked = (todo.timeTracked || 0) + seconds;
    const badge = document.querySelector(`[data-id="${this.trackingId}"] .todo-time-badge`);
    if (badge) badge.textContent = Flux.formatTrackedTime(todo.timeTracked);
    // Persist and update views more responsively: save frequently but avoid per-second writes
    if (todo.timeTracked % 5 === 0) {
      this.save();
      this.refreshStatsViews();
      // Optimistically update the local leaderboard UI without forcing an immediate Firestore write
      try {
        const lbState = window.FluxLeaderboardState;
        const authUser = window.FluxAuth?.user?.() || window.FluxAuthState?.user;
        const profileSvc = window.FluxProfileService;
        const profile = profileSvc?.getProfile?.() || window.FluxProfile?.data || {};
        const displayName = (profile.displayName || authUser?.displayName || 'Flux User').trim ? (profile.displayName || authUser?.displayName || 'Flux User').trim() : (profile.displayName || authUser?.displayName || 'Flux User');
        const username = (profile.username || '').trim ? (profile.username || '').trim() : (profile.username || '');
        const photoURL = profile.photoURL || authUser?.photoURL || '';
        if (lbState && typeof lbState.getUsers === 'function' && authUser && authUser.uid) {
          const users = Array.isArray(lbState.getUsers()) ? lbState.getUsers().slice() : [];
          const metric = lbState.getMetric ? lbState.getMetric() : 'focusMinutesTotal';
          const deltaMinutes = seconds / 60;
          const idx = users.findIndex(u => u.id === authUser.uid);
          if (idx >= 0) {
            users[idx][metric] = (Number(users[idx][metric]) || 0) + deltaMinutes;
            users[idx].displayName = displayName;
            users[idx].username = username;
            users[idx].photoURL = photoURL;
            users[idx].lastUpdated = new Date().toISOString();
          } else {
            // Insert a lightweight entry so the current user appears
            const entry = {
              id: authUser.uid,
              displayName,
              username,
              photoURL,
              showOnLeaderboard: true,
              lastUpdated: new Date().toISOString(),
            };
            entry[metric] = deltaMinutes;
            users.unshift(entry);
          }
          lbState.setUsers(users);
        }
      } catch (e) { /* ignore optimistic update failures */ }
      // Still schedule a real leaderboard sync to persist to Firestore (debounced)
      this.scheduleLeaderboardSync();
    }
  },

  catLabel(cat) {
    const labels = { work: '💼 Work', study: '📚 Study', personal: '🏠 Personal', health: '💪 Health', creative: '🎨 Creative' };
    return labels[cat] || cat;
  },

  // setupDragDrop removed in favor of container-level handlers

  updateStats() {
    // Update sidebar stats from live todo data
    const totalTime = this.todos.reduce((sum, t) => sum + (t.timeTracked || 0), 0);
    const focusTimeEl = document.getElementById('sidebar-focus-time');
    if (focusTimeEl) focusTimeEl.textContent = Flux.formatTime(totalTime);
  },

  refreshStatsViews() {
    this.updateStats();
    try {
      if (window.FluxStats?.updateOverview) window.FluxStats.updateOverview();
      else if (window.FluxStats?.render) window.FluxStats.render();
    } catch (e) { /* ignore */ }
  },

  scheduleLeaderboardSync() {
    clearTimeout(this._leaderboardSyncTimer);
    this._leaderboardSyncTimer = setTimeout(() => {
      try { window.Leaderboard?.syncLeaderboard?.(); } catch (e) { /* ignore */ }
    }, 250);
  },

  save() {
    Flux.save('flux_todos', this.todos);
  }
};
