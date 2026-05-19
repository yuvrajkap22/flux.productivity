import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';
import {
  getFirestore, doc, setDoc, deleteDoc, serverTimestamp, getDoc, collection,
  query, where, orderBy, limit, onSnapshot, getCountFromServer, getDocs
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let app;
try {
  if (!getApps().length) app = initializeApp(firebaseConfig);
  else app = getApp();
} catch (e) {
  console.warn('Firebase init skipped or failed', e);
  app = null;
}
const db = app ? getFirestore(app) : null;

// Safe service bridges (prefer new services, fall back to legacy globals)
function getAuthSvc() {
  return window.FluxAuthService || {
    getUser: () => (window.FluxAuth?.user?.() || window.FluxAuthState?.user || null),
    isGuest: () => { const u = (window.FluxAuth?.user?.() || window.FluxAuthState?.user); return !u || Boolean(u.isGuest); },
  };
}

function getProfileSvc() {
  return window.FluxProfileService || {
    getProfile: () => (window.FluxProfile?.data || {}),
    getActiveUser: () => (window.FluxProfile?.activeUser || window.FluxAuthState?.user || window.FluxAuth?.user?.() || null),
  };
}

function _getVisibilitySetting() {
  try {
    const raw = localStorage.getItem('flux_leaderboard_visible');
    if (raw === null) return true;
    return raw === 'true' || raw === '1';
  } catch (e) { return true; }
}

async function syncLeaderboard() {
  // debounced wrapper defined below delegates to _syncImmediate
  return _syncLeaderboardDebounced();
}

async function _syncLeaderboardImmediate() {
  if (!db) return;
  try {
    const authSvc = getAuthSvc();
    const profileSvc = getProfileSvc();
    const user = (authSvc && typeof authSvc.getUser === 'function') ? authSvc.getUser() : (window.FluxAuth?.user?.() || window.FluxAuthState?.user);
    if (!user || !user.uid || (authSvc && typeof authSvc.isGuest === 'function' ? authSvc.isGuest() : user.isGuest)) return;
    if (!_getVisibilitySetting()) return;

    const uid = user.uid;
    const stats = Flux.load('flux_stats', { sessions: {}, totalTime: {}, streak: 0 });
    const todos = Flux.load('flux_todos', []);

    const totalSeconds = Object.values(stats.totalTime || {}).reduce((a,b)=>a + (Number(b)||0), 0);
    const focusMinutesTotal = Math.round(totalSeconds / 60);
    const sessionsTotal = Object.values(stats.sessions || {}).reduce((a,b)=>a + (Number(b)||0), 0);
    const tasksDoneTotal = (todos.filter(t => t.completed).length) || 0;
    const currentStreak = stats.streak || 0;

    const profile = (profileSvc && typeof profileSvc.getProfile === 'function') ? profileSvc.getProfile() : (window.FluxProfile?.data || {});
    const displayName = user.displayName || profile?.displayName || profile?.username || (user.email ? String(user.email).split('@')[0] : '') || 'Flux User';
    const username = profile?.username || (user.email ? String(user.email).split('@')[0] : '');
    const photoURL = user.photoURL || profile?.photoURL || null;

    const payload = {
      displayName,
      username,
      photoURL,
      focusMinutesTotal,
      sessionsTotal,
      currentStreak,
      tasksDoneTotal,
      showOnLeaderboard: true,
      lastUpdated: serverTimestamp(),
    };

    await setDoc(doc(db, 'leaderboard', uid), payload, { merge: true });
  } catch (err) {
    console.warn('Leaderboard sync failed', err);
  }
}

// Simple debounce/throttle: ensure at most one write every 30s; coalesce calls
let _lastSyncAt = 0;
let _syncTimer = null;
function _syncLeaderboardDebounced() {
  const now = Date.now();
  const minGap = 30 * 1000;
  if (now - _lastSyncAt >= minGap) {
    _lastSyncAt = now;
    return _syncLeaderboardImmediate();
  }
  if (_syncTimer) clearTimeout(_syncTimer);
  return new Promise((resolve) => {
    _syncTimer = setTimeout(() => {
      _lastSyncAt = Date.now();
      _syncLeaderboardImmediate().then(resolve).catch(resolve);
      _syncTimer = null;
    }, minGap - (now - _lastSyncAt));
  });
}

async function setLeaderboardVisibility(visible) {
  try {
    const authSvc = getAuthSvc();
    const user = (authSvc && typeof authSvc.getUser === 'function') ? authSvc.getUser() : (window.FluxAuth?.user?.());
    localStorage.setItem('flux_leaderboard_visible', visible ? 'true' : 'false');
    if (!user || !user.uid) return;
    const ref = doc(db, 'leaderboard', user.uid);
    if (!visible) {
      await deleteDoc(ref).catch(()=>{});
    } else {
      await syncLeaderboard();
    }
  } catch (err) {
    console.warn('setLeaderboardVisibility failed', err);
  }
}

function _rangeStartTimestamp(range) {
  if (!range || range === 'all') return null;
  const now = new Date();
  if (range === 'today') {
    const d = new Date(now); d.setHours(0,0,0,0); return d;
  }
  if (range === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d;
  }
  if (range === 'month') {
    const d = new Date(now); d.setMonth(d.getMonth() - 1); d.setHours(0,0,0,0); return d;
  }
  return null;
}

function _toMillis(value) {
  if (!value) return 0;
  try {
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (e) {
    return 0;
  }
}

function _sortAndFilterUsers(users, metric, range) {
  const start = _rangeStartTimestamp(range);
  const filtered = start
    ? users.filter((u) => _toMillis(u.lastUpdated) >= start.getTime())
    : users.slice();
  filtered.sort((a, b) => {
    const mv = (Number(b?.[metric]) || 0) - (Number(a?.[metric]) || 0);
    if (mv !== 0) return mv;
    return _toMillis(b?.lastUpdated) - _toMillis(a?.lastUpdated);
  });
  return filtered;
}

async function _fetchLeaderboardFallback(metric, range) {
  if (!db) return [];
  try {
    const snapAll = await getDocs(query(collection(db, 'leaderboard'), where('showOnLeaderboard', '==', true), limit(1000)));
    return _sortAndFilterUsers(snapAll.docs.map((d) => ({ id: d.id, ...d.data() })), metric, range).slice(0, 50);
  } catch (err) {
    console.warn('leaderboard fallback fetch failed', err);
    return [];
  }
}

function subscribeLeaderboard(metric, range, callback) {
  // allow calling with (metric, callback)
  if (typeof range === 'function') { callback = range; range = 'week'; }
  if (!metric || typeof callback !== 'function') return () => {};
  
  // Check if user is guest (no Firebase auth)
  const authSvc = getAuthSvc();
  const user = (authSvc && typeof authSvc.getUser === 'function') ? authSvc.getUser() : (window.FluxAuth?.user?.() || window.FluxAuthState?.user);
  const isGuest = (authSvc && typeof authSvc.isGuest === 'function') ? authSvc.isGuest() : (!user || user.isGuest);
  
  // Guest mode: do not show fake/demo users
  if (isGuest || !db) {
    setTimeout(() => callback([], true), 100);
    return () => {};
  }

  // If a range is active, use a broader fetch path first so we don't miss users
  // who are in-range but not in the top metric slice returned by Firestore.
  if (range && range !== 'all') {
    const fallbackUsersPromise = _fetchLeaderboardFallback(metric, range);
    fallbackUsersPromise.then((users) => {
      if (Array.isArray(users) && users.length) callback(users, true);
    });
  }
  
  const col = collection(db, 'leaderboard');
  const primaryQuery = query(col, where('showOnLeaderboard', '==', true), orderBy(metric, 'desc'), limit(200));

  let fallbackUnsub = null;
  const startFallback = () => {
    if (fallbackUnsub) return;
    const fallbackQuery = query(col, where('showOnLeaderboard', '==', true), limit(500));
    fallbackUnsub = onSnapshot(fallbackQuery, (snap) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(_sortAndFilterUsers(users, metric, range).slice(0, 50), snap.metadata.fromCache);
    }, (fallbackErr) => {
      console.warn('leaderboard fallback subscription error', fallbackErr);
    });
  };

  const unsub = onSnapshot(primaryQuery, (snap) => {
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(_sortAndFilterUsers(users, metric, range).slice(0, 50), snap.metadata.fromCache);
  }, (err) => {
    const code = err?.code || '';
    const isIndexIssue = code === 'failed-precondition' || code === 'invalid-argument';
    const isPermissionIssue = code === 'permission-denied';
    console.warn('leaderboard subscription error', err);
    if (isIndexIssue) {
      try { window.Flux?.showToast?.('Leaderboard running in compatibility mode while indexes sync.'); } catch (e) {}
      _fetchLeaderboardFallback(metric, range).then((users) => {
        callback(users, true);
      });
      startFallback();
    } else if (isPermissionIssue) {
      try { window.Flux?.showToast?.('Leaderboard is unavailable for this account right now.'); } catch (e) {}
      _fetchLeaderboardFallback(metric, range).then((users) => callback(users, true));
    }
  });

  return () => {
    try { unsub?.(); } catch (e) {}
    try { fallbackUnsub?.(); } catch (e) {}
  };
}

window.Leaderboard = window.Leaderboard || {};
window.Leaderboard.syncLeaderboard = syncLeaderboard;
// Expose an immediate sync method for callers that need near-instant updates.
window.Leaderboard.syncLeaderboardImmediate = function () {
  try { return _syncLeaderboardImmediate(); } catch (e) { return Promise.resolve(); }
};
window.Leaderboard.setLeaderboardVisibility = setLeaderboardVisibility;
window.Leaderboard.subscribeLeaderboard = subscribeLeaderboard;
async function getUserEntryAndRank(metric = 'focusMinutesTotal', range = 'week') {
  if (!db) return { entry: null, rank: null };
  try {
    const authSvc = getAuthSvc();
    const user = (authSvc && typeof authSvc.getUser === 'function') ? authSvc.getUser() : (window.FluxAuth?.user?.());
    if (!user || !user.uid) return { entry: null, rank: null };
    const ref = doc(db, 'leaderboard', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { entry: null, rank: null };
    const entry = { id: snap.id, ...snap.data() };
    let rank = null;
    try {
      const start = _rangeStartTimestamp(range);
      if (start) {
        // attempt a count query with range filter (may require composite index)
        const luField = 'lastUpdated';
        const threshold = entry[metric] || 0;
        const q = query(collection(db, 'leaderboard'), where('showOnLeaderboard', '==', true), where(metric, '>', threshold), where(luField, '>=', start));
        const cnt = await getCountFromServer(q);
        rank = (cnt.data()?.count || 0) + 1;
      } else {
        const q = query(collection(db, 'leaderboard'), where('showOnLeaderboard', '==', true), where(metric, '>', entry[metric] || 0));
        const cnt = await getCountFromServer(q);
        rank = (cnt.data()?.count || 0) + 1;
      }
    } catch (e) {
      // count API or index may not be available; fallback to client-side rank estimate
      try {
        const q = query(collection(db, 'leaderboard'), where('showOnLeaderboard', '==', true), limit(500));
        const snapAll = await getDocs(q);
        const users = snapAll.docs.map((d) => ({ id: d.id, ...d.data() }));
        const ranked = _sortAndFilterUsers(users, metric, range);
        const idx = ranked.findIndex((u) => u.id === entry.id);
        rank = idx >= 0 ? idx + 1 : null;
      } catch (fallbackErr) {
        const users = await _fetchLeaderboardFallback(metric, range);
        const idx = users.findIndex((u) => u.id === entry.id);
        rank = idx >= 0 ? idx + 1 : null;
      }
    }
    return { entry, rank };
  } catch (err) {
    console.warn('getUserEntryAndRank failed', err);
    return { entry: null, rank: null };
  }
}
window.Leaderboard.getUserEntryAndRank = getUserEntryAndRank;

export { syncLeaderboard, setLeaderboardVisibility, subscribeLeaderboard };
