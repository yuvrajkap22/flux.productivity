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
      cursorDot.style.setProperty('--x', mouseX + 'px');
      cursorDot.style.setProperty('--y', mouseY + 'px');
    });

    function animateCursor() {
      const ease = 0.12;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;
      cursorRing.style.setProperty('--x', ringX + 'px');
      cursorRing.style.setProperty('--y', ringY + 'px');
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
  const savedSounds = Flux.load('flux_sounds', { volume: 30, muted: false, active: {} });
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

  /* ─── Settings Panel ─── */
  const settingsThemeSelect = document.getElementById('settings-theme-select');
  const settingsAccentPicker = document.getElementById('settings-accent-picker');
  const settingsAccentPresets = document.getElementById('settings-accent-presets');
  const settingsStartView = document.getElementById('settings-start-view');
  const settingsSidebarMode = document.getElementById('settings-sidebar-mode');
  const settingsQuoteToggle = document.getElementById('settings-quote-toggle');
  const settingsCompactToggle = document.getElementById('settings-compact-toggle');
  const settingsVolumeRange = document.getElementById('settings-volume-range');
  const settingsVolumeValue = document.getElementById('settings-volume-value');
  const settingsMuteToggle = document.getElementById('settings-mute-toggle');
  const settingsMotionToggle = document.getElementById('settings-motion-toggle');
  const settingsThemeChip = document.getElementById('settings-theme-chip');
  const settingsAccentChip = document.getElementById('settings-accent-chip');
  const settingsViewChip = document.getElementById('settings-view-chip');
  const settingsSoundChip = document.getElementById('settings-sound-chip');
  const settingsProfileAvatar = document.getElementById('settings-profile-avatar');
  const settingsProfileSummary = document.getElementById('settings-profile-summary');
  const settingsProfileNote = document.getElementById('settings-profile-note');
  const settingsResetBtn = document.getElementById('settings-reset-preferences');

  const settingsViewOptions = new Set(['dashboard', 'tasks', 'pomodoro', 'stats', 'challenges', 'settings']);

  function getCurrentSettings() {
    return Flux.load('flux_settings', {});
  }

  function getCurrentSoundSettings() {
    return Flux.load('flux_sounds', { volume: 30, muted: false, active: {} });
  }

  function getThemeLabel(value) {
    return value === 'light' ? 'Light' : 'Dark';
  }

  function getAccentLabel(color) {
    const palette = FluxTheme.getAccentPalette(color || '#8b5cf6');
    return palette.primary.toUpperCase();
  }

  function getStartViewLabel(view) {
    const labels = {
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      pomodoro: 'Pomodoro',
      stats: 'Stats',
      challenges: 'Challenges',
      settings: 'Settings',
    };
    return labels[view] || 'Dashboard';
  }

  function getProfileShortcutData() {
    const profileApi = window.FluxProfile || null;
    const profile = profileApi?.data || {};
    const user = profileApi?.activeUser || window.FluxAuthState?.user || null;
    const name = profile.displayName || user?.displayName || user?.email || 'Flux User';
    const username = profile.username ? `@${profile.username}` : '';
    const bio = profile.bio || 'Open your Flux profile editor to update your name, bio, photo, and banner.';
    const photoURL = profile.photoURL || user?.photoURL || '';

    return { name, username, bio, photoURL };
  }

  function applyWorkspacePreferences(settings = getCurrentSettings()) {
    document.body.classList.toggle('hide-quote-bar', Boolean(settings.hideQuotes));
    document.body.classList.toggle('compact-mode', Boolean(settings.compactMode));
    document.body.classList.toggle('performance-lite', Boolean(settings.reducedMotion));
  }

  function syncSettingsPanel() {
    const settings = getCurrentSettings();
    const sounds = getCurrentSoundSettings();
    const accent = settings.accent || '#8b5cf6';
    const volume = Number.isFinite(Number(sounds.volume)) ? Number(sounds.volume) : 30;
    const muted = Boolean(sounds.muted);
    const theme = settings.theme || document.documentElement.getAttribute('data-theme') || 'dark';

    if (settingsThemeSelect) settingsThemeSelect.value = theme;
    if (settingsAccentPicker) settingsAccentPicker.value = accent;
    if (settingsStartView) settingsStartView.value = settings.startView && settingsViewOptions.has(settings.startView) ? settings.startView : 'dashboard';
    if (settingsSidebarMode) settingsSidebarMode.value = settings.sidebarCollapsed ? 'collapsed' : 'expanded';
    if (settingsQuoteToggle) settingsQuoteToggle.checked = Boolean(settings.hideQuotes);
    if (settingsCompactToggle) settingsCompactToggle.checked = Boolean(settings.compactMode);
    if (settingsVolumeRange) settingsVolumeRange.value = String(volume);
    if (settingsVolumeValue) settingsVolumeValue.textContent = `${volume}%`;
    if (settingsMuteToggle) settingsMuteToggle.checked = muted;
    if (settingsMotionToggle) settingsMotionToggle.checked = Boolean(settings.reducedMotion);

    if (settingsThemeChip) settingsThemeChip.textContent = `Theme: ${getThemeLabel(theme)}`;
    if (settingsAccentChip) settingsAccentChip.textContent = `Accent: ${getAccentLabel(accent)}`;
    if (settingsViewChip) settingsViewChip.textContent = `Start: ${getStartViewLabel(settings.startView || 'dashboard')}`;
    if (settingsSoundChip) settingsSoundChip.textContent = muted ? 'Sound: Muted' : `Sound: ${volume}%`;

    const profile = getProfileShortcutData();
    if (settingsProfileAvatar) {
      settingsProfileAvatar.alt = profile.name;
      settingsProfileAvatar.src = profile.photoURL || window.FluxProfile?.getFallbackAvatar?.(profile.name) || 'assets/flux-logo.svg';
    }
    if (settingsProfileSummary) settingsProfileSummary.textContent = profile.bio;
    if (settingsProfileNote) settingsProfileNote.textContent = profile.username || 'Quick access';

    document.querySelectorAll('.settings-accent-dot').forEach((dot) => {
      dot.classList.toggle('active', dot.dataset.accent === accent);
    });

    applyWorkspacePreferences(settings);
  }

  function saveSettingsPatch(patch) {
    const next = Flux.updateSettings(patch);
    syncSettingsPanel();
    return next;
  }

  settingsThemeSelect?.addEventListener('change', (event) => {
    const theme = event.target.value === 'light' ? 'light' : 'dark';
    setTheme(theme);
    syncSettingsPanel();
    FluxAudio.buttonClick();
  });

  settingsAccentPicker?.addEventListener('input', (event) => {
    setAccent(event.target.value);
    syncSettingsPanel();
  });

  settingsAccentPresets?.addEventListener('click', (event) => {
    const preset = event.target.closest('.settings-accent-dot');
    if (!preset) return;
    setAccent(preset.dataset.accent);
    syncSettingsPanel();
    FluxAudio.buttonClick();
  });

  settingsStartView?.addEventListener('change', (event) => {
    const nextView = settingsViewOptions.has(event.target.value) ? event.target.value : 'dashboard';
    saveSettingsPatch({ startView: nextView });
    Flux.showToast(`Start page set to ${getStartViewLabel(nextView)}`);
  });

  settingsSidebarMode?.addEventListener('change', (event) => {
    const collapsed = event.target.value === 'collapsed';
    sidebarCollapsed = collapsed;
    saveSettingsPatch({ sidebarCollapsed: collapsed });
    updateSidebarState();
    FluxAudio.buttonClick();
  });

  settingsQuoteToggle?.addEventListener('change', (event) => {
    saveSettingsPatch({ hideQuotes: event.target.checked });
  });

  settingsCompactToggle?.addEventListener('change', (event) => {
    saveSettingsPatch({ compactMode: event.target.checked });
  });

  settingsVolumeRange?.addEventListener('input', (event) => {
    const volume = parseInt(event.target.value, 10);
    FluxAudio.setVolume(volume);
    if (settingsVolumeValue) settingsVolumeValue.textContent = `${volume}%`;
    syncSettingsPanel();
  });

  settingsMuteToggle?.addEventListener('change', (event) => {
    const shouldMute = Boolean(event.target.checked);
    if (FluxAudio.muted !== shouldMute) {
      FluxAudio.toggleMute();
    }
    syncSettingsPanel();
  });

  settingsMotionToggle?.addEventListener('change', (event) => {
    saveSettingsPatch({ reducedMotion: event.target.checked });
    document.body.classList.toggle('performance-lite', event.target.checked);
    Flux.showToast(event.target.checked ? 'Reduced motion enabled' : 'Motion effects restored');
    FluxAudio.buttonClick();
  });

  document.getElementById('settings-open-profile')?.addEventListener('click', () => {
    const profileApi = window.FluxProfile || (typeof FluxProfile !== 'undefined' ? FluxProfile : null);
    profileApi?.openModal?.();
    FluxAudio.buttonClick();
  });

  document.getElementById('settings-open-accent')?.addEventListener('click', () => {
    accentMenu?.classList.remove('hidden');
    settingsAccentPicker?.focus();
    FluxAudio.buttonClick();
  });

  settingsResetBtn?.addEventListener('click', () => {
    const confirmed = window.confirm('Reset Flux preferences back to defaults? This keeps your tasks and profile data.');
    if (!confirmed) return;

    try {
      localStorage.removeItem('flux_settings');
      localStorage.removeItem('flux_sounds');
    } catch {}

    Flux.showToast('Preferences reset');
    window.location.reload();
  });

  window.addEventListener('flux-theme-change', syncSettingsPanel);
  window.addEventListener('flux-accent-change', syncSettingsPanel);
  window.addEventListener('flux-sound-change', syncSettingsPanel);
  window.addEventListener('flux-profile-change', syncSettingsPanel);
  window.addEventListener('storage', (event) => {
    if (event.key === 'flux_settings' || event.key === 'flux_sounds' || event.key === 'flux_profile') {
      syncSettingsPanel();
    }
  });

  syncSettingsPanel();

  /* ─── Sidebar ─── */
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const sidebarClose = document.getElementById('sidebar-close');
  let sidebarCollapsed = false;
  let sidebarOpen = false;

  const mobileSidebarQuery = window.matchMedia('(max-width: 768px)');

  function isMobileSidebar() {
    return mobileSidebarQuery.matches;
  }

  function updateSidebarState() {
    if (!sidebar) return;

    const mobile = isMobileSidebar();

    if (mobile) {
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
      sidebar.classList.toggle('open', sidebarOpen);
      document.body.classList.toggle('sidebar-open', sidebarOpen);
      sidebarBackdrop?.classList.toggle('visible', sidebarOpen);
      sidebar.setAttribute('aria-hidden', sidebarOpen ? 'false' : 'true');
      sidebarToggle?.setAttribute('aria-expanded', sidebarOpen ? 'true' : 'false');
      return;
    }

    sidebarOpen = false;
    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    sidebarBackdrop?.classList.remove('visible');
    sidebar.setAttribute('aria-hidden', 'false');
    sidebarToggle?.setAttribute('aria-expanded', sidebarCollapsed ? 'true' : 'false');
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }

  function openMobileSidebar() {
    if (!isMobileSidebar()) return;
    sidebarOpen = true;
    updateSidebarState();
  }

  function closeMobileSidebar() {
    if (!isMobileSidebar()) return;
    sidebarOpen = false;
    updateSidebarState();
  }

  sidebarToggle?.addEventListener('click', () => {
    if (isMobileSidebar()) {
      sidebarOpen ? closeMobileSidebar() : openMobileSidebar();
    } else {
      sidebarCollapsed = !sidebarCollapsed;
      saveSettingsPatch({ sidebarCollapsed });
      updateSidebarState();
    }
    FluxAudio.buttonClick();
  });

  sidebarBackdrop?.addEventListener('click', () => {
    closeMobileSidebar();
  });

  sidebarClose?.addEventListener('click', () => {
    closeMobileSidebar();
  });

  window.addEventListener('resize', updateSidebarState);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isMobileSidebar() && sidebarOpen) {
      closeMobileSidebar();
    }
  });

  sidebarCollapsed = Boolean(getCurrentSettings().sidebarCollapsed);
  updateSidebarState();

  /* ─── Navigation ─── */
  function showView(view, options = {}) {
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

      if (isMobileSidebar()) closeMobileSidebar();
      if (options.playSound !== false && typeof FluxAudio?.buttonClick === 'function') FluxAudio.buttonClick();
  }

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      showView(item.dataset.view);
    });
  });

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

    if (!window.__fluxInitialViewApplied) {
      window.__fluxInitialViewApplied = true;
      const startView = getCurrentSettings().startView;
      if (startView && settingsViewOptions.has(startView)) {
        showView(startView, { playSound: false });
      }
    }
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
