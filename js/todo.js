/* ═══════════════════════════════════════
   FLUX — Todo List Manager
   ═══════════════════════════════════════ */

const FluxTodo = {
  todos: [],
  filter: 'all',
  trackingId: null,
  trackingInterval: null,

  init() {
    this.todos = Flux.load('flux_todos', []);
    this.bindEvents();
    this.render();
    // Resume tracking if any task was being tracked
    const tracking = this.todos.find(t => t.tracking);
    if (tracking) {
      this.trackingId = tracking.id;
      this.startTrackingTimer();
    }
  },

  bindEvents() {
    const input = document.getElementById('todo-input');
    const addBtn = document.getElementById('todo-add-btn');
    const filters = document.getElementById('todo-filters');

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTodo();
    });
    addBtn.addEventListener('click', () => this.addTodo());

    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.filter = btn.dataset.filter;
      this.render();
    });
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
    this.updateStats();
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

  toggleTracking(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo || todo.completed) return;

    if (this.trackingId === id) {
      this.stopTracking();
    } else {
      // Stop current tracking if any
      if (this.trackingId) this.stopTracking();
      todo.tracking = true;
      this.trackingId = id;
      this.startTrackingTimer();
    }
    this.save();
    this.render();
  },

  startTrackingTimer() {
    this.trackingInterval = setInterval(() => {
      const todo = this.todos.find(t => t.id === this.trackingId);
      if (todo) {
        todo.timeTracked++;
        // Update display without full re-render
        const badge = document.querySelector(`[data-id="${this.trackingId}"] .todo-time-badge`);
        if (badge) badge.textContent = Flux.formatTime(todo.timeTracked);
        // Save periodically (every 10s)
        if (todo.timeTracked % 10 === 0) this.save();
      }
    }, 1000);
  },

  stopTracking() {
    if (this.trackingId) {
      const todo = this.todos.find(t => t.id === this.trackingId);
      if (todo) todo.tracking = false;
    }
    clearInterval(this.trackingInterval);
    this.trackingId = null;
    this.save();
  },

  getFiltered() {
    let list = [...this.todos];
    if (this.filter === 'active') list = list.filter(t => !t.completed);
    else if (this.filter === 'completed') list = list.filter(t => t.completed);
    return list;
  },

  render() {
    const container = document.getElementById('todo-list');
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

    // Setup drag and drop
    this.setupDragDrop();
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
    checkbox.addEventListener('click', () => this.toggleComplete(todo.id));

    const trackingDot = document.createElement('span');
    trackingDot.className = 'todo-tracking-dot';

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;
    text.addEventListener('click', () => this.toggleTracking(todo.id));

    const tag = document.createElement('span');
    tag.className = 'todo-tag';
    tag.dataset.cat = todo.category;
    tag.textContent = this.catLabel(todo.category);

    const badge = document.createElement('span');
    badge.className = 'todo-time-badge';
    badge.textContent = Flux.formatTime(todo.timeTracked);

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const priorityBtn = document.createElement('button');
    priorityBtn.className = 'todo-action-btn';
    priorityBtn.type = 'button';
    priorityBtn.title = 'Priority';
    priorityBtn.textContent = '🚩';
    priorityBtn.addEventListener('click', () => this.togglePriority(todo.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-action-btn delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));

    actions.append(priorityBtn, deleteBtn);
    item.append(checkbox, trackingDot, text, tag, badge, actions);
    return item;
  },

  catLabel(cat) {
    const labels = { work: '💼 Work', study: '📚 Study', personal: '🏠 Personal', health: '💪 Health', creative: '🎨 Creative' };
    return labels[cat] || cat;
  },

  setupDragDrop() {
    const items = document.querySelectorAll('.todo-item[draggable]');
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.id);
        item.style.opacity = '0.4';
      });
      item.addEventListener('dragend', () => { item.style.opacity = '1'; });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.style.borderTop = '2px solid var(--accent)';
      });
      item.addEventListener('dragleave', () => { item.style.borderTop = ''; });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.style.borderTop = '';
        const dragId = e.dataTransfer.getData('text/plain');
        const dropId = item.dataset.id;
        if (dragId === dropId) return;
        const dragIdx = this.todos.findIndex(t => t.id === dragId);
        const dropIdx = this.todos.findIndex(t => t.id === dropId);
        if (dragIdx < 0 || dropIdx < 0) return;
        const [moved] = this.todos.splice(dragIdx, 1);
        this.todos.splice(dropIdx, 0, moved);
        this.save();
        this.render();
      });
    });
  },

  updateStats() {
    // Update sidebar stats from live todo data
    const totalTime = this.todos.reduce((sum, t) => sum + (t.timeTracked || 0), 0);
    document.getElementById('sidebar-focus-time').textContent = Flux.formatTime(totalTime);
  },

  save() {
    Flux.save('flux_todos', this.todos);
  }
};
