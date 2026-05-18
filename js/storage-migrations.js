/* ═══════════════════════════════════════
   FLUX — Storage Migrations
   ═══════════════════════════════════════ */

(function () {
  const SCHEMA_KEY = 'flux_schema_version';
  const TARGET_SCHEMA = 3;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // ignore storage write failures
    }
  }

  function migrateTodosCompletedAt() {
    const todos = readJson('flux_todos', []);
    if (!Array.isArray(todos) || todos.length === 0) return;

    let changed = false;
    todos.forEach((todo) => {
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

    if (changed) writeJson('flux_todos', todos);
  }

  function normalizeStartViewSetting() {
    const settings = readJson('flux_settings', {});
    if (!settings || typeof settings !== 'object') return;

    const allowedViews = new Set(['dashboard', 'tasks', 'pomodoro', 'stats', 'challenges', 'leaderboard', 'settings']);
    const current = settings.startView;
    if (!current || allowedViews.has(current)) return;

    settings.startView = 'dashboard';
    writeJson('flux_settings', settings);
  }

  function normalizeLeaderboardVisibility() {
    try {
      const raw = localStorage.getItem('flux_leaderboard_visible');
      if (raw === null) return;
      if (raw === 'true' || raw === 'false') return;
      localStorage.setItem('flux_leaderboard_visible', raw === '1' ? 'true' : 'false');
    } catch (e) {
      // ignore storage failures
    }
  }

  const migrations = {
    1: migrateTodosCompletedAt,
    2: normalizeStartViewSetting,
    3: normalizeLeaderboardVisibility,
  };

  function runMigrations() {
    const rawVersion = Number(localStorage.getItem(SCHEMA_KEY) || 0);
    const currentVersion = Number.isFinite(rawVersion) ? rawVersion : 0;

    for (let version = currentVersion + 1; version <= TARGET_SCHEMA; version += 1) {
      try {
        migrations[version]?.();
      } catch (e) {
        console.warn('Storage migration failed', version, e);
        return;
      }
    }

    localStorage.setItem(SCHEMA_KEY, String(TARGET_SCHEMA));
  }

  runMigrations();
})();
