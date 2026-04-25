/* ═══════════════════════════════════════
   FLUX — Shared Utilities
   ═══════════════════════════════════════ */

// localStorage helpers with debounce
const Flux = {
  _saveTimers: {},

  isLowPerformanceDevice() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const lowCpu = Number(navigator.hardwareConcurrency || 8) <= 4;
    const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
    const smallScreen = window.matchMedia?.('(max-width: 900px)')?.matches;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = Boolean(connection?.saveData);
    const slowNetwork = /(^2g$|^slow-2g$|^3g$)/i.test(String(connection?.effectiveType || ''));

    return Boolean(reducedMotion || lowCpu || lowMemory || smallScreen || saveData || slowNetwork);
  },

  applyPerformanceClass() {
    if (this.isLowPerformanceDevice()) {
      document.body.classList.add('performance-lite');
      return true;
    }
    return false;
  },

  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  save(key, data, delay = 300) {
    clearTimeout(this._saveTimers[key]);
    this._saveTimers[key] = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    }, delay);
  },

  saveNow(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  },

  // Quotes data
  quotes: [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { text: "The mind is everything. What you think you become.", author: "Buddha" },
    { text: "It is not that we have a short time to live, but that we waste a good deal of it.", author: "Seneca" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport" },
    { text: "Bird by bird, buddy. Just take it bird by bird.", author: "Anne Lamott" },
    { text: "Free education is abundant, all over the internet. It's the desire to learn that's scarce.", author: "Naval Ravikant" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Robin Sharma" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "Waste no more time arguing about what a good person should be. Be one.", author: "Marcus Aurelius" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
    { text: "Productivity is never an accident. It is the result of intelligent effort.", author: "Paul J. Meyer" },
  ],

  // Toast notification
  showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Confetti burst
  confetti(x, y) {
    if (this.isLowPerformanceDevice()) return;

    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#8b5cf6','#06b6d4','#22d3a0','#f59e0b','#ec4899','#ef4444','#f97316','#3b82f6'];
    for (let i = 0; i < 20; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = x + 'px';
      piece.style.top = y + 'px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
      piece.style.animationDelay = (Math.random() * 0.15) + 's';
      const angle = (Math.random() - 0.5) * 120;
      piece.style.setProperty('--x', (Math.sin(angle * Math.PI / 180) * (80 + Math.random() * 100)) + 'px');
      container.appendChild(piece);
    }
    setTimeout(() => container.remove(), 1500);
  },

  // Format seconds to display string
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  },

  formatTimeShort(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  // Get today's date key
  todayKey() {
    return new Date().toISOString().split('T')[0];
  },

  // Sanitize text
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  cleanText(value, maxLen = 200) {
    const text = String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, maxLen);
  }
};
