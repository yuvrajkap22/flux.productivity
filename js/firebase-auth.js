import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const appShell = document.getElementById('app-shell');
const authMessage = document.getElementById('auth-message');
const authGoogleBtn = document.getElementById('auth-google-btn');
const profileAvatarBtn = document.getElementById('profile-avatar-btn');
const profileAvatarImg = document.getElementById('profile-avatar-img');
const profileAvatarInitials = document.getElementById('profile-avatar-initials');
const body = document.body;
let popupSafetyTimer = null;

const authState = {
  ready: false,
  user: null,
};

const authUtils = window.FluxAuthUtils || {
  normalizeDevHost: () => false,
  isLoginPage: () => location.pathname.endsWith('login.html'),
  resolveAvatarSource: (_, label) => label,
};

function createGuestUser() {
  return {
    uid: 'guest-local',
    displayName: 'Guest User',
    email: 'guest@local',
    photoURL: '',
    isGuest: true,
  };
}

function setMessage(text, kind = '') {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.classList.remove('error', 'success');
  if (kind) authMessage.classList.add(kind);
}

function setBusy(isBusy) {
  if (authGoogleBtn) {
    authGoogleBtn.disabled = isBusy;
    authGoogleBtn.classList.toggle('loading', isBusy);
  }
}

function clearPopupSafetyTimer() {
  if (popupSafetyTimer) {
    clearTimeout(popupSafetyTimer);
    popupSafetyTimer = null;
  }
}

function emitAuthReady(user) {
  window.dispatchEvent(new CustomEvent('flux-auth-ready', {
    detail: { user: user || null },
  }));
}

function setAuthenticated(user) {
  const isLoginPage = authUtils.isLoginPage();

  authState.user = user;
  body.classList.toggle('authenticated', Boolean(user));

  if (!user && !isLoginPage) {
    if (appShell) appShell.style.display = 'none';
    location.replace('login.html');
    return;
  }

  if (appShell) appShell.style.display = user ? '' : 'none';

  if (profileAvatarBtn) profileAvatarBtn.classList.toggle('hidden', !user);

  if (profileAvatarImg) {
    const fallbackLabel = user?.displayName || user?.email || 'Flux User';
    profileAvatarImg.src = user ? authUtils.resolveAvatarSource(user.photoURL, fallbackLabel) : '';
    profileAvatarImg.alt = user?.displayName || user?.email || 'Profile';
    profileAvatarImg.style.display = user ? 'block' : 'none';
    profileAvatarImg.onerror = () => {
      profileAvatarImg.src = authUtils.resolveAvatarSource('', fallbackLabel);
    };
  }
  if (profileAvatarInitials) {
    profileAvatarInitials.style.display = 'none';
  }

  window.FluxAuthState = { ready: true, user };
  window.FluxApp?.onAuthChange?.(user);

  if (user) {
    if (user.isGuest) setMessage('Running in local guest mode.', 'success');
    else setMessage('Signed in successfully.', 'success');
  } else {
    setMessage('Continue with Google to enter Flux.');
  }
}

function markSetupRequired() {
  setMessage('Add your Firebase config in js/firebase-config.js to enable login.', 'error');
  authGoogleBtn?.setAttribute('disabled', 'true');
}

function friendlyAuthError(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed.';
    case 'auth/popup-blocked':
      return 'Browser blocked the Google popup.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Use localhost for local testing or add this domain in Firebase Auth settings.';
    case 'auth/network-request-failed':
      return 'Network error. Try again.';
    default:
      return error?.message || 'Login failed.';
  }
}

if (authUtils.normalizeDevHost()) {
  window.FluxAuth = {
    ready: false,
    user: null,
    signOut: async () => {},
  };
  window.FluxAuthState = { ready: false, user: null };
  emitAuthReady(null);
} else if (!isFirebaseConfigured(firebaseConfig) || location.protocol === 'file:') {
  const guestUser = createGuestUser();
  if (!isFirebaseConfigured(firebaseConfig)) {
    setMessage('Firebase not configured. Running in local guest mode.', 'success');
  } else {
    setMessage('File mode detected. Running in local guest mode.', 'success');
  }
  setAuthenticated(guestUser);
  window.FluxAuth = {
    ready: true,
    user: () => guestUser,
    signOut: async () => {
      authState.user = null;
      window.FluxAuthState = { ready: true, user: null };
      emitAuthReady(null);
      setAuthenticated(null);
    },
  };
  window.FluxAuthState = { ready: true, user: guestUser };
  emitAuthReady(guestUser);
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  setPersistence(auth, browserLocalPersistence).catch(() => {});

  authGoogleBtn?.addEventListener('click', async () => {
    setBusy(true);
    setMessage('Opening Google sign-in...');
    clearPopupSafetyTimer();
    popupSafetyTimer = setTimeout(() => {
      setBusy(false);
      setMessage('Popup is still open. Complete sign-in or close it and try again.', 'error');
    }, 30000);

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setMessage(friendlyAuthError(error), 'error');
    } finally {
      clearPopupSafetyTimer();
      setBusy(false);
    }
  });

  onAuthStateChanged(auth, (user) => {
    authState.ready = true;
    clearPopupSafetyTimer();
    setBusy(false);
    setAuthenticated(user);
    emitAuthReady(user);
    if (!user && authUtils.isLoginPage()) {
      setMessage('Continue with Google to enter Flux.');
    }
    if (user && typeof FluxProfile !== 'undefined') FluxProfile.init(user);
  });

  window.FluxAuth = {
    ready: () => authState.ready,
    user: () => authState.user,
    signOut: () => signOut(auth),
  };
  window.FluxAuthState = { ready: false, user: null };
}
