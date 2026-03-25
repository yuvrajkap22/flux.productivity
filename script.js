// =============================================
//  FLUX v1.01 — Productivity Companion Script
//  Features: Tasks, Pomodoro (up to 180 min),
//  Focus Stats, Streak, Daily Quotes
// =============================================

// ===== DOM =====
const $ = id => document.getElementById(id);
const taskInput = $('taskInput');
const addBtn = $('addBtn');
const taskList = $('taskList');
const progressFill = $('progressFill');
const progressText = $('progressText');
const completedCountEl = $('completedCount');
const totalCountEl = $('totalCount');
const dateDisplay = $('dateDisplay');
const emptyState = $('emptyState');
const clearCompletedBtn = $('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeToggle = $('themeToggle');
const shortcutsBtn = $('shortcutsBtn');
const shortcutsOverlay = $('shortcutsOverlay');
const shortcutsClose = $('shortcutsClose');

// Pomodoro DOM
const pomodoroCard = $('pomodoroCard');
const pomoBody = $('pomoBody');
const pomoMinimize = $('pomoMinimize');
const pomoTime = $('pomoTime');
const pomoPhase = $('pomoPhase');
const pomoRing = $('pomoRing');
const pomoStartPause = $('pomoStartPause');
const pomoReset = $('pomoReset');
const pomoTaskLabel = $('pomoTaskLabel');
const pomoSettingsBtn = $('pomoSettingsBtn');
const pomoSettings = $('pomoSettings');
const workDurationInput = $('workDurationInput');
const breakDurationInput = $('breakDurationInput');
const pomoApply = $('pomoApply');

// Focus Stats DOM
const todaySessionsEl = $('todaySessions');
const todayMinutesEl = $('todayMinutes');
const streakCountEl = $('streakCount');

// Quote DOM
const quoteText = $('quoteText');
const quoteAuthor = $('quoteAuthor');

// ===== State =====
let tasks = [];
let currentFilter = 'all';
let focusedTaskId = null;

// Pomodoro — mutable durations (user-editable, up to 180 min)
let workDuration = 25 * 60;   // default 25 min
let breakDuration = 5 * 60;   // default 5 min
let pomoSeconds = workDuration;
let pomoIsRunning = false;
let pomoIsBreak = false;
let pomoInterval = null;

const RING_CIRCUMFERENCE = 2 * Math.PI * 60; // matches r=60 on the SVG

// ===== Motivational Quotes =====
const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It's not about having time, it's about making time.", author: "Unknown" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Productivity is never an accident. It is always the result of a commitment to excellence.", author: "Paul J. Meyer" },
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
    { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
    { text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.", author: "Stephen King" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "One thing at a time. Most important thing first. Start now.", author: "Caroline Webb" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Discipline is choosing what you want most over what you want now.", author: "Abraham Lincoln" },
    { text: "Until we can manage time, we can manage nothing else.", author: "Peter Drucker" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" }
];

// ===== Initialize =====
function init() {
    loadTasks();
    loadTheme();
    loadPomoSettings();
    renderDate();
    renderQuote();
    updateFocusStats();
    render();
    updatePomoDisplay();
}

// ===== Date =====
function renderDate() {
    const now = new Date();
    dateDisplay.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
}

// ===== Daily Quote =====
function renderQuote() {
    // Rotate quote daily based on day of year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const quote = QUOTES[dayOfYear % QUOTES.length];
    quoteText.textContent = `"${quote.text}"`;
    quoteAuthor.textContent = `— ${quote.author}`;
}

// ===== Theme =====
function loadTheme() {
    const saved = localStorage.getItem('flux-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('flux-theme', next);
}

// ===== LocalStorage — Tasks =====
function saveTasks() {
    localStorage.setItem('flux-tasks', JSON.stringify(tasks));
}
function loadTasks() {
    const stored = localStorage.getItem('flux-tasks') || localStorage.getItem('taskly-tasks');
    tasks = stored ? JSON.parse(stored) : [];
}

// ===== LocalStorage — Pomodoro Settings =====
function savePomoSettings() {
    localStorage.setItem('flux-pomo', JSON.stringify({
        work: workDuration / 60,
        break: breakDuration / 60
    }));
}
function loadPomoSettings() {
    const stored = localStorage.getItem('flux-pomo') || localStorage.getItem('taskly-pomo');
    if (stored) {
        const parsed = JSON.parse(stored);
        const breakVal = parsed.break ?? parsed.brk ?? 5;
        const workVal = parsed.work ?? 25;
        workDuration = Math.max(1, Math.min(180, workVal)) * 60;
        breakDuration = Math.max(1, Math.min(180, breakVal)) * 60;
        pomoSeconds = workDuration;
    }
    // Sync inputs
    workDurationInput.value = workDuration / 60;
    breakDurationInput.value = breakDuration / 60;
}

// ===== Focus Stats =====
function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function loadFocusData() {
    const stored = localStorage.getItem('flux-focus');
    return stored ? JSON.parse(stored) : {};
}

function saveFocusData(data) {
    localStorage.setItem('flux-focus', JSON.stringify(data));
}

function recordSession(durationMinutes) {
    const data = loadFocusData();
    const key = getTodayKey();
    if (!data[key]) {
        data[key] = { sessions: 0, minutes: 0 };
    }
    data[key].sessions += 1;
    data[key].minutes += durationMinutes;
    saveFocusData(data);
    updateFocusStats();
}

function getStreak() {
    const data = loadFocusData();
    let streak = 0;
    const today = new Date();

    // Check if today has sessions — if so, start counting from today, otherwise from yesterday
    const todayKey = getTodayKey();
    let checkDate = new Date(today);

    if (!data[todayKey] || data[todayKey].sessions === 0) {
        // No session today — check from yesterday
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (data[key] && data[key].sessions > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

function updateFocusStats() {
    const data = loadFocusData();
    const todayKey = getTodayKey();
    const today = data[todayKey] || { sessions: 0, minutes: 0 };

    todaySessionsEl.textContent = today.sessions;
    todayMinutesEl.textContent = Math.round(today.minutes);
    streakCountEl.textContent = getStreak();
}

// ===== Add Task =====
function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    tasks.unshift({
        id: Date.now(),
        text,
        done: false,
        createdAt: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
        })
    });

    saveTasks();
    render();
    taskInput.value = '';
    taskInput.focus();
}

// ===== Toggle Done =====
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        saveTasks();
        render();
    }
}

// ===== Delete Task =====
function deleteTask(id) {
    const li = taskList.querySelector(`[data-id="${id}"]`);
    if (li) {
        li.classList.add('removing');
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            if (focusedTaskId === id) clearFocus();
            saveTasks();
            render();
        }, 300);
    }
}

// ===== Focus Task (link to Pomodoro) =====
function clearFocus() {
    focusedTaskId = null;
    pomoTaskLabel.textContent = 'No task selected';
}

function focusTask(id) {
    if (focusedTaskId === id) {
        clearFocus();
    } else {
        focusedTaskId = id;
        const task = tasks.find(t => t.id === id);
        pomoTaskLabel.textContent = task ? task.text : 'No task selected';
    }
    render();
}

// ===== Clear Completed =====
function clearCompleted() {
    const doneLis = taskList.querySelectorAll('li.done');
    if (doneLis.length === 0) return;
    doneLis.forEach(li => li.classList.add('removing'));
    setTimeout(() => {
        const removedIds = tasks.filter(t => t.done).map(t => t.id);
        if (removedIds.includes(focusedTaskId)) clearFocus();
        tasks = tasks.filter(t => !t.done);
        saveTasks();
        render();
    }, 300);
}

// ===== Filters =====
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    render();
}

function getFilteredTasks() {
    switch (currentFilter) {
        case 'active': return tasks.filter(t => !t.done);
        case 'completed': return tasks.filter(t => t.done);
        default: return tasks;
    }
}

// ===== Render =====
function render() {
    const filtered = getFilteredTasks();
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    completedCountEl.textContent = done;
    totalCountEl.textContent = total;
    progressFill.style.width = pct + '%';
    progressText.textContent = pct + '%';

    emptyState.classList.toggle('hidden', filtered.length > 0);

    taskList.innerHTML = '';
    filtered.forEach(task => {
        const li = document.createElement('li');
        li.setAttribute('data-id', task.id);
        if (task.done) li.classList.add('done');

        // Check circle
        const check = document.createElement('div');
        check.className = 'check-circle';
        check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        check.addEventListener('click', e => { e.stopPropagation(); toggleTask(task.id); });

        // Content
        const content = document.createElement('div');
        content.className = 'task-content';
        content.addEventListener('click', () => toggleTask(task.id));

        const textEl = document.createElement('div');
        textEl.className = 'task-text';
        textEl.textContent = task.text;

        const timeEl = document.createElement('div');
        timeEl.className = 'task-time';
        timeEl.textContent = task.createdAt;

        content.appendChild(textEl);
        content.appendChild(timeEl);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'task-actions';

        // Focus / link to Pomodoro button
        const focBtn = document.createElement('button');
        const isFocused = focusedTaskId === task.id;
        focBtn.className = 'focus-btn' + (isFocused ? ' active-focus' : '');
        focBtn.title = isFocused ? 'Unlink from Pomodoro' : 'Focus with Pomodoro';
        focBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        focBtn.addEventListener('click', e => { e.stopPropagation(); focusTask(task.id); });

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.title = 'Delete task';
        delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        delBtn.addEventListener('click', e => { e.stopPropagation(); deleteTask(task.id); });

        actions.appendChild(focBtn);
        actions.appendChild(delBtn);

        li.appendChild(check);
        li.appendChild(content);
        li.appendChild(actions);
        taskList.appendChild(li);
    });
}

// ===== Pomodoro Timer =====
function updatePomoDisplay() {
    const mins = Math.floor(pomoSeconds / 60);
    const secs = pomoSeconds % 60;
    pomoTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Ring progress (drain as time counts down)
    const total = pomoIsBreak ? breakDuration : workDuration;
    const fraction = pomoSeconds / total;
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    pomoRing.style.strokeDashoffset = offset;

    // Phase badge
    pomoPhase.textContent = pomoIsBreak ? 'Break' : 'Work';
    pomoPhase.classList.toggle('break', pomoIsBreak);
    pomodoroCard.classList.toggle('break-mode', pomoIsBreak);

    // Running bloom class
    pomodoroCard.classList.toggle('pomo-running', pomoIsRunning);

    // Play/pause icon
    pomoStartPause.classList.toggle('running', pomoIsRunning);
}

function playChime(isBreakJustEnded) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = isBreakJustEnded ? 880 : 660;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.0);
    } catch (_) { /* audio not supported */ }
}

function pomoTick() {
    if (pomoSeconds <= 0) {
        clearInterval(pomoInterval);
        pomoInterval = null;
        pomoIsRunning = false;

        // Capture what phase just finished BEFORE flipping
        const justFinishedBreak = pomoIsBreak;
        playChime(justFinishedBreak);

        // Record completed work session in focus stats
        if (!justFinishedBreak) {
            recordSession(workDuration / 60);
        }

        // Auto-switch phase
        pomoIsBreak = !pomoIsBreak;
        pomoSeconds = pomoIsBreak ? breakDuration : workDuration;
        updatePomoDisplay();
        return;
    }
    pomoSeconds--;
    updatePomoDisplay();
}

function pomoToggle() {
    if (pomoIsRunning) {
        clearInterval(pomoInterval);
        pomoInterval = null;
        pomoIsRunning = false;
    } else {
        pomoIsRunning = true;
        pomoInterval = setInterval(pomoTick, 1000);
    }
    updatePomoDisplay();
}

function pomoResetTimer() {
    clearInterval(pomoInterval);
    pomoInterval = null;
    pomoIsRunning = false;
    pomoIsBreak = false;
    pomoSeconds = workDuration;
    updatePomoDisplay();
}

// ===== Pomodoro Settings =====
function applyPomoSettings() {
    const newWork = parseInt(workDurationInput.value, 10);
    const newBreak = parseInt(breakDurationInput.value, 10);

    if (isNaN(newWork) || newWork < 1 || newWork > 180) return;
    if (isNaN(newBreak) || newBreak < 1 || newBreak > 180) return;

    workDuration = newWork * 60;
    breakDuration = newBreak * 60;

    savePomoSettings();
    pomoResetTimer(); // reset to new durations
    closePomoSettings();
}

function togglePomoSettings() {
    const isOpen = pomoSettings.classList.contains('open');
    if (isOpen) {
        closePomoSettings();
    } else {
        pomoSettings.classList.add('open');
        pomoSettingsBtn.classList.add('active');
    }
}

function closePomoSettings() {
    pomoSettings.classList.remove('open');
    pomoSettingsBtn.classList.remove('active');
}

// ===== Shortcuts Overlay =====
function openShortcuts() { shortcutsOverlay.classList.add('open'); }
function closeShortcuts() { shortcutsOverlay.classList.remove('open'); }

// ===== Event Listeners =====
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
clearCompletedBtn.addEventListener('click', clearCompleted);
filterBtns.forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
themeToggle.addEventListener('click', toggleTheme);
shortcutsBtn.addEventListener('click', openShortcuts);
shortcutsClose.addEventListener('click', closeShortcuts);
shortcutsOverlay.addEventListener('click', e => { if (e.target === shortcutsOverlay) closeShortcuts(); });

// Pomodoro
pomoStartPause.addEventListener('click', pomoToggle);
pomoReset.addEventListener('click', pomoResetTimer);
pomoSettingsBtn.addEventListener('click', togglePomoSettings);
pomoApply.addEventListener('click', applyPomoSettings);

workDurationInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyPomoSettings(); });
breakDurationInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyPomoSettings(); });

pomoMinimize.addEventListener('click', () => {
    pomoBody.classList.toggle('collapsed');
    closePomoSettings();
});

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', e => {
    const tag = e.target.tagName.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea';

    if (e.key === 'Escape') {
        if (shortcutsOverlay.classList.contains('open')) { closeShortcuts(); return; }
        if (pomoSettings.classList.contains('open')) { closePomoSettings(); return; }
        if (isInput) { e.target.blur(); return; }
    }

    if (isInput) return; // Don't steal shortcuts while typing

    switch (e.key.toLowerCase()) {
        case 'n': e.preventDefault(); taskInput.focus(); break;
        case 'p': e.preventDefault(); pomoToggle(); break;
        case 'd': e.preventDefault(); toggleTheme(); break;
        case '?': e.preventDefault(); openShortcuts(); break;
        case '1': e.preventDefault(); setFilter('all'); break;
        case '2': e.preventDefault(); setFilter('active'); break;
        case '3': e.preventDefault(); setFilter('completed'); break;
    }
});

// ===== Start =====
init();
