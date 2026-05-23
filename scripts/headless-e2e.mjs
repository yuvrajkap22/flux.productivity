import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch (error) { body = { raw: text }; }
  return { response, body };
}

async function waitFor(predicate, { timeout = 15000, interval = 400, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  let lastError = null;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts++;
    try {
      const result = await predicate();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    if (attempts % Math.max(1, Math.floor(3000 / Math.max(interval, 100))) === 0) {
      console.log(`waitFor: still waiting for ${label} (attempt ${attempts})`);
    }
    await sleep(interval);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.stack || lastError.message}` : ''}`);
}

function isLivePresenceDoc(doc) {
  const fields = doc?.fields || {};
  return fields.isLive?.booleanValue === true &&
    fields.presenceState?.stringValue === 'studying' &&
    Boolean(fields.lastPresenceAt) &&
    fields.showOnLeaderboard?.booleanValue === true;
}

(async function run() {
  const base = process.argv[2] || 'http://127.0.0.1:8081';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on('console', (msg) => console.log('PAGE:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE_ERROR:', err.message));

  const stamp = Date.now();
  const email = `e2e+${stamp}@example.com`;
  const password = 'password123';
  const projectId = 'flux-productivity-39c09';
  let uid = null;

  try {
    const { body: signUpBody } = await fetchJson('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=notasecret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    uid = signUpBody.localId || null;
    assert(uid, `Unable to create Auth emulator user: ${JSON.stringify(signUpBody)}`);
    console.log('Created emulator user:', uid);

    // Bypass UI sign-in: programmatically inject the emulator user into the app
    console.log('Opening app and injecting auth for uid:', uid);
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle2' });
    // wait for the app runtime to be available before injecting auth
    await page.waitForFunction(() => typeof window.FluxApp === 'object' && typeof window.FluxApp.onAuthChange === 'function', { timeout: 10000 }).catch(() => {});
    const injected = await page.evaluate((u, e) => {
      try {
        const user = { uid: u, email: e, displayName: e.split('@')[0], photoURL: '', isGuest: false };
        window.FluxAuth = { ready: () => true, user: () => user };
        window.FluxAuthState = { ready: true, user };
        if (window.FluxApp && typeof window.FluxApp.onAuthChange === 'function') {
          window.FluxApp.onAuthChange(user);
        }
        return true;
      } catch (err) {
        console.error('inject auth failed', err);
        return false;
      }
    }, uid, email);

    assert(injected, 'Failed to inject auth into page');
    await page.waitForSelector('#pomo-play', { visible: true, timeout: 30000 });
    console.log('Entered workspace:', page.url());

    await page.click('#pomo-play');
    await waitFor(async () => page.evaluate(() => Boolean(window.FluxPomo?.running)), {
      timeout: 15000,
      interval: 300,
      label: 'pomodoro running'
    });

    const presenceDoc = await waitFor(async () => {
      const { response, body } = await fetchJson(`http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/leaderboard/${uid}`);
      if (!response) return null;
      if (response.status === 404) return null;
      if (response.status !== 200) return null;
      return isLivePresenceDoc(body) ? body : null;
    }, { timeout: 30000, interval: 500, label: 'leaderboard presence doc' });

    assert(isLivePresenceDoc(presenceDoc), `Presence document did not contain the expected live fields: ${JSON.stringify(presenceDoc?.fields||{})}`);
    console.log('Firestore presence check PASSED for uid:', uid);

    await page.click('#topbar-leader-btn');
    const badgeText = await waitFor(async () => {
      const el = await page.$('#topbar-leader-badge');
      if (!el) return null;
      const txt = await page.evaluate((e) => e.textContent.trim(), el).catch(() => '');
      return txt || null;
    }, { timeout: 8000, interval: 250, label: 'leaderboard badge text' });
    console.log('Leaderboard badge text:', badgeText);
    assert(badgeText && /LIVE/i.test(badgeText), `Expected LIVE badge, got: ${badgeText}`);

    console.log('E2E check passed: presence and leaderboard badge are live.');
  } catch (error) {
    console.error('E2E test error:', error);
    process.exitCode = 3;
  } finally {
    await browser.close();
  }
})();
