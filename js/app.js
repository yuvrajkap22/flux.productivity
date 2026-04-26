/* ═══════════════════════════════════════
   FLUX — Main App Controller
   ═══════════════════════════════════════ */

(function() {
  'use strict';

  const isLowPerformance = typeof Flux !== 'undefined' && Flux.applyPerformanceClass();

  /* ─── Custom Cursor — Magnetic with Trail ─── */
  const cursorDot  = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

  const disableCursorEffects = isLowPerformance || 'ontouchstart' in window;

  if (!disableCursorEffects) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursorDot.style.left  = mouseX + 'px';
      cursorDot.style.top   = mouseY + 'px';
    });

    function animateCursor() {
      const ease = 0.12;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top  = ringY + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  // Hover on interactive elements
  if (!disableCursorEffects) {
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('button, a, [draggable], .todo-item, .accent-dot, .banner-color-opt, .nav-item, .sound-btn, .challenge-card')) {
        document.body.classList.add('cursor-hover');
        document.body.classList.remove('cursor-text');
      } else if (e.target.closest('input[type="text"], input[type="number"], textarea, select')) {
        document.body.classList.add('cursor-text');
        document.body.classList.remove('cursor-hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('button, a, [draggable], .todo-item, .accent-dot, .banner-color-opt, .nav-item, .sound-btn, .challenge-card')) {
        document.body.classList.remove('cursor-hover');
      } else if (e.target.closest('input[type="text"], input[type="number"], textarea, select')) {
        document.body.classList.remove('cursor-text');
      }
    });
    document.addEventListener('mousedown', () => {
      document.body.classList.add('cursor-click');
    });
    document.addEventListener('mouseup', () => {
      setTimeout(() => document.body.classList.remove('cursor-click'), 120);
    });
  }

  // Hide cursor on touch devices
  if (disableCursorEffects) {
    cursorDot.style.display  = 'none';
    cursorRing.style.display = 'none';
    document.body.style.cursor = 'auto';
  }

  /* ─── Theme Toggle ─── */
  const themeToggle = document.getElementById('theme-toggle');
  function setTheme(theme, persist = true) {
    window.FluxTheme?.applyTheme(theme, { persist });
  }

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
    FluxAudio.buttonClick();
  });

  // Load saved theme
  const savedSettings = Flux.load('flux_settings', {});
  if (savedSettings.theme) setTheme(savedSettings.theme, false);

  /* ─── Accent Color ─── */
  function setAccent(color, persist = true) {
    const palette = window.FluxTheme?.applyAccent(color, { persist }) || null;
    const resolvedColor = palette?.primary || color;

    const accentInput = document.getElementById('custom-accent-color');
    if (accentInput) accentInput.value = resolvedColor;

    // Update active dot
    document.querySelectorAll('.accent-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.color === resolvedColor);
    });
  }

  document.getElementById('accent-dots')?.addEventListener('click', (e) => {
    const dot = e.target.closest('.accent-dot');
    if (dot) {
      setAccent(dot.dataset.color);
      FluxAudio.buttonClick();
    }
  });

  document.getElementById('custom-accent-color')?.addEventListener('input', (e) => {
    setAccent(e.target.value);
  });

  // Load saved accent
  if (savedSettings.accent) setAccent(savedSettings.accent, false);

  window.addEventListener('storage', (event) => {
    if (event.key !== 'flux_settings' || !event.newValue) return;

    try {
      const next = JSON.parse(event.newValue);
      if (next.theme) setTheme(next.theme, false);
      if (next.accent) setAccent(next.accent, false);
    } catch {}
  });

  window.addEventListener('flux-accent-change', () => {
    const accentInput = document.getElementById('custom-accent-color');
    if (accentInput) accentInput.value = Flux.load('flux_settings', {}).accent || '#8b5cf6';
    if (document.getElementById('view-challenges')?.classList.contains('active') && typeof FluxChallenges?.render === 'function') {
      FluxChallenges.render();
    }
  });

  const accentMenuToggle = document.getElementById('accent-menu-toggle');
  const accentMenu = document.getElementById('accent-menu');

  accentMenuToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    accentMenu?.classList.toggle('hidden');
    FluxAudio.buttonClick();
  });

  document.addEventListener('click', (event) => {
    if (!accentMenu || !accentMenuToggle) return;
    if (!accentMenu.contains(event.target) && !accentMenuToggle.contains(event.target)) {
      accentMenu.classList.add('hidden');
    }
  });

  /* ─── Sidebar ─── */
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  let sidebarCollapsed = false;

  sidebarToggle?.addEventListener('click', () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebar.classList.toggle('open');
    } else {
      sidebarCollapsed = !sidebarCollapsed;
      sidebar.classList.toggle('collapsed', sidebarCollapsed);
      document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }
    FluxAudio.buttonClick();
  });

  /* ─── Navigation ─── */
  function showView(view) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const currentNav = document.querySelector(`.nav-item[data-view="${view}"]`);
      if (currentNav) currentNav.classList.add('active');

      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

      if (view === 'dashboard') {
        document.getElementById('view-dashboard').classList.add('active');
      } else if (view === 'tasks') {
        document.getElementById('view-dashboard').classList.add('active');
        document.getElementById('todo-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (view === 'pomodoro') {
        document.getElementById('view-dashboard').classList.add('active');
        document.getElementById('pomo-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (view === 'stats') {
        document.getElementById('view-stats').classList.add('active');
        FluxStats.render();
      } else if (view === 'challenges') {
        document.getElementById('view-challenges').classList.add('active');
        FluxChallenges.render();
      } else if (view === 'settings') {
        document.getElementById('view-settings')?.classList.add('active');
      }

      if (window.innerWidth <= 768) sidebar.classList.remove('open');
      if (typeof FluxAudio?.buttonClick === 'function') FluxAudio.buttonClick();
  }

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      showView(item.dataset.view);
    });
  });

  document.getElementById('settings-open-profile')?.addEventListener('click', () => {
    const profileApi = window.FluxProfile || (typeof FluxProfile !== 'undefined' ? FluxProfile : null);
    profileApi?.openModal?.();
    FluxAudio.buttonClick();
  });

  document.getElementById('settings-theme-dark')?.addEventListener('click', () => {
    setTheme('dark');
    FluxAudio.buttonClick();
  });

  document.getElementById('settings-theme-light')?.addEventListener('click', () => {
    setTheme('light');
    FluxAudio.buttonClick();
  });

  document.getElementById('settings-open-accent')?.addEventListener('click', () => {
    accentMenu?.classList.remove('hidden');
    FluxAudio.buttonClick();
  });

  document.getElementById('settings-toggle-sound')?.addEventListener('click', () => {
    FluxAudio.toggleMute();
    FluxAudio.buttonClick();
  });

  const btnMotion = document.getElementById('settings-toggle-motion');
  if (btnMotion) {
    const isReduced = Flux.load('flux_settings', {}).reducedMotion;
    if (isReduced) btnMotion.classList.add('active');
    btnMotion.addEventListener('click', () => {
      const settings = Flux.load('flux_settings', {});
      settings.reducedMotion = !settings.reducedMotion;
      Flux.save('flux_settings', settings);
      btnMotion.classList.toggle('active', settings.reducedMotion);
      document.body.classList.toggle('performance-lite', settings.reducedMotion);
      Flux.showToast(settings.reducedMotion ? 'Reduced motion enabled' : 'Motion effects restored');
      FluxAudio.buttonClick();
    });
  }

  /* ─── Quotes ─── */
  let quoteIndex = Flux.load('flux_quoteIndex', 0);
  let quoteOrder = [];
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');

  function shuffleQuotes() {
    quoteOrder = Flux.quotes.map((_, i) => i);
    for (let i = quoteOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [quoteOrder[i], quoteOrder[j]] = [quoteOrder[j], quoteOrder[i]];
    }
    quoteIndex = 0;
  }
  shuffleQuotes();

  function showQuote(animate = true) {
    const q = Flux.quotes[quoteOrder[quoteIndex % quoteOrder.length]];
    if (animate) {
      quoteText.style.opacity = '0';
      quoteAuthor.style.opacity = '0';
      setTimeout(() => {
        quoteText.textContent = `"${q.text}"`;
        quoteAuthor.textContent = `— ${q.author}`;
        quoteText.style.opacity = '1';
        quoteAuthor.style.opacity = '1';
      }, 400);
    } else {
      quoteText.textContent = `"${q.text}"`;
      quoteAuthor.textContent = `— ${q.author}`;
    }
    Flux.save('flux_quoteIndex', quoteIndex);
  }

  function nextQuote() {
    quoteIndex = (quoteIndex + 1) % quoteOrder.length;
    if (quoteIndex === 0) shuffleQuotes();
    showQuote();
  }

  showQuote(false);
  setInterval(nextQuote, isLowPerformance ? 12000 : 8000);
  document.getElementById('quote-next-btn')?.addEventListener('click', () => {
    nextQuote();
    FluxAudio.buttonClick();
  });

  /* ─── Sound Mixer UI ─── */
  const soundBtns = document.querySelectorAll('.sound-btn');
  const volumeSlider = document.getElementById('sound-volume-slider');
  const volumeValue = document.getElementById('sound-volume-value');
  const waveBars = document.getElementById('sound-wave-bars');

  soundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sound;
      const active = FluxAudio.toggleAmbient(type);
      btn.classList.toggle('active', active);
      waveBars.classList.toggle('hidden', !FluxAudio.hasAnySoundActive());
      FluxAudio.buttonClick();
    });
  });

  volumeSlider?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    FluxAudio.setVolume(v);
    if (volumeValue) volumeValue.textContent = v + '%';
  });

  // Sound master toggle
  document.getElementById('sound-master-toggle')?.addEventListener('click', () => {
    FluxAudio.toggleMute();
  });

  // Restore saved sound state
  const savedSounds = Flux.load('flux_sounds', {});
  if (savedSounds.volume !== undefined) {
    if (volumeSlider) volumeSlider.value = savedSounds.volume;
    if (volumeValue) volumeValue.textContent = savedSounds.volume + '%';
  }

  function bootstrapModules(user) {
    if (window.__fluxModulesBootstrapped) {
      if (user && typeof FluxProfile !== 'undefined') FluxProfile.init(user);
      return;
    }

    window.__fluxModulesBootstrapped = true;
    FluxAudio.init();
    FluxTodo.init();
    FluxPomo.init();
    FluxStats.init();
    FluxChallenges.init();
    soundBtns.forEach((btn) => {
      btn.classList.toggle('active', FluxAudio.isActive(btn.dataset.sound));
    });
    waveBars.classList.toggle('hidden', !FluxAudio.hasAnySoundActive());
    if (user && typeof FluxProfile !== 'undefined') FluxProfile.init(user);
  }

  window.FluxApp = window.FluxApp || {};
  window.FluxApp.showView = showView;
  window.FluxApp.onAuthChange = (user) => {
    const appShell = document.getElementById('app-shell');
    const isLoginPage = location.pathname.endsWith('login.html');

    if (user) {
      document.body.classList.add('authenticated');
      if (appShell) appShell.style.display = 'block';
      bootstrapModules(user);
    } else {
      document.body.classList.remove('authenticated');
      if (appShell) appShell.style.display = 'none';
      if (!isLoginPage) {
        location.replace('login.html');
        return;
      }
    }
  };

  const currentAuthUser = window.FluxAuthState?.user || window.FluxAuth?.user?.();
  if (currentAuthUser) {
    window.FluxApp.onAuthChange(currentAuthUser);
  } else if (window.FluxAuthState?.ready && !currentAuthUser) {
    window.FluxApp.onAuthChange(null);
  }

})();
