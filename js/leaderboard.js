import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';
import {
  getFirestore, doc, setDoc, deleteDoc, serverTimestamp, getDoc, collection,
  query, where, orderBy, limit, onSnapshot, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

let app;
try {
  if (!getApps().length) app = initializeApp(firebaseConfig);
  else app = getApp();
} catch (e) {
  console.warn('Firebase init skipped or failed', e);
  app = null;
}
const db = app ? getFirestore(app) : null;

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
    const user = window.FluxAuth?.user?.();
    if (!user || !user.uid) return;
    if (!_getVisibilitySetting()) return;

    const uid = user.uid;
    const stats = Flux.load('flux_stats', { sessions: {}, totalTime: {}, streak: 0 });
    const todos = Flux.load('flux_todos', []);

    const totalSeconds = Object.values(stats.totalTime || {}).reduce((a,b)=>a + (Number(b)||0), 0);
    const focusMinutesTotal = Math.round(totalSeconds / 60);
    const sessionsTotal = Object.values(stats.sessions || {}).reduce((a,b)=>a + (Number(b)||0), 0);
    const tasksDoneTotal = (todos.filter(t => t.completed).length) || 0;
    const currentStreak = stats.streak || 0;

    const profileApi = window.FluxProfile || null;
    const displayName = user.displayName || profileApi?.data?.displayName || user.email || 'Flux User';
    const username = profileApi?.data?.username || '';
    const photoURL = user.photoURL || profileApi?.data?.photoURL || null;

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
    const user = window.FluxAuth?.user?.();
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

function subscribeLeaderboard(metric, callback) {
  if (!metric || typeof callback !== 'function') return () => {};
  const col = collection(db, 'leaderboard');
  const q = query(col, where('showOnLeaderboard', '==', true), orderBy(metric, 'desc'), orderBy('lastUpdated', 'asc'), limit(50));
  const unsub = onSnapshot(q, (snap) => {
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(users, snap.metadata.fromCache);
  }, (err) => {
    console.warn('leaderboard subscription error', err);
  });
  return unsub;
}

window.Leaderboard = window.Leaderboard || {};
window.Leaderboard.syncLeaderboard = syncLeaderboard;
window.Leaderboard.setLeaderboardVisibility = setLeaderboardVisibility;
window.Leaderboard.subscribeLeaderboard = subscribeLeaderboard;
async function getUserEntryAndRank(metric = 'focusMinutesTotal') {
  if (!db) return { entry: null, rank: null };
  try {
    const user = window.FluxAuth?.user?.();
    if (!user || !user.uid) return { entry: null, rank: null };
    const ref = doc(db, 'leaderboard', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { entry: null, rank: null };
    const entry = { id: snap.id, ...snap.data() };
    let rank = null;
    try {
      const q = query(collection(db, 'leaderboard'), where('showOnLeaderboard', '==', true), where(metric, '>', entry[metric] || 0));
      const cnt = await getCountFromServer(q);
      rank = (cnt.data()?.count || 0) + 1;
    } catch (e) {
      // count API or index may not be available; leave rank null
      rank = null;
    }
    return { entry, rank };
  } catch (err) {
    console.warn('getUserEntryAndRank failed', err);
    return { entry: null, rank: null };
  }
}
window.Leaderboard.getUserEntryAndRank = getUserEntryAndRank;

export { syncLeaderboard, setLeaderboardVisibility, subscribeLeaderboard };
