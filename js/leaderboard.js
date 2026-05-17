import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { firebaseConfig } from './firebase-config.js';
import {
  getFirestore, doc, setDoc, deleteDoc, serverTimestamp,
  collection, query, where, orderBy, limit, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

let app;
if (!getApps().length) app = initializeApp(firebaseConfig);
else app = getApp();
const db = getFirestore(app);

function _getVisibilitySetting() {
  try {
    const raw = localStorage.getItem('flux_leaderboard_visible');
    if (raw === null) return true;
    return raw === 'true' || raw === '1';
  } catch (e) { return true; }
}

async function syncLeaderboard() {
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

export { syncLeaderboard, setLeaderboardVisibility, subscribeLeaderboard };
