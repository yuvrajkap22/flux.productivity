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
  while (Date.now() < deadline) {
    try {
      const result = await predicate();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(interval);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
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

    console.log('Opening login:', `${base}/login.html`);
    await page.goto(`${base}/login.html`, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#input-email', { visible: true });
    await page.evaluate(() => {
      if (document.body.classList.contains('mode-signup')) {
        document.getElementById('toggle-mode')?.click();
      }
    });

    await page.click('#input-email');
    await page.type('#input-email', email, { delay: 10 });
    await page.click('#input-password');
    await page.type('#input-password', password, { delay: 10 });
    await page.click('#btn-signin');

    const authState = await waitFor(async () => {
      const message = await page.$eval('#auth-message', (el) => el.textContent.trim()).catch(() => '');
      const enterVisible = await page.$eval('#enter-flux-btn', (el) => !el.closest('.enter-flux-wrap')?.classList.contains('is-visible') ? false : true).catch(() => false);
      return { message, enterVisible };
    }, { timeout: 20000, label: 'auth state' });

    assert(!authState.message || !/error|failed|invalid|incorrect/i.test(authState.message), `Auth error shown: ${authState.message}`);
    assert(authState.enterVisible, 'Expected the enter button to become visible after sign-in');

    await page.click('#enter-flux-btn');
    await page.waitForSelector('#pomo-play', { visible: true, timeout: 30000 });
    console.log('Entered workspace:', page.url());

    await page.click('#pomo-play');
    await waitFor(async () => page.evaluate(() => Boolean(window.FluxPomo?.running)), {
      timeout: 10000,
      label: 'pomodoro running'
    });

    const presenceDoc = await waitFor(async () => {
      const { response, body } = await fetchJson(`http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/leaderboard/${uid}`);
      if (response.status !== 200) return null;
      return isLivePresenceDoc(body) ? body : null;
    }, { timeout: 20000, label: 'leaderboard presence doc' });

    assert(isLivePresenceDoc(presenceDoc), 'Presence document did not contain the expected live fields');
    console.log('Firestore presence check PASSED for uid:', uid);

    await page.click('#topbar-leader-btn');
    await waitFor(async () => page.$eval('#topbar-leader-badge', (el) => el.textContent.trim()), {
      timeout: 5000,
      label: 'leaderboard badge'
    }).then((badgeText) => {
      console.log('Leaderboard badge text:', badgeText);
      assert(/LIVE/i.test(badgeText), `Expected LIVE badge, got: ${badgeText}`);
    });

    console.log('E2E check passed: presence and leaderboard badge are live.');
  } catch (error) {
    console.error('E2E test error:', error);
    process.exitCode = 3;
  } finally {
    await browser.close();
  }
})();
