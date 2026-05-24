#!/usr/bin/env node
// Minimal REST-only E2E for emulator presence write/read (easy to debug)
import fs from 'fs';

const EMULATOR_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const EMULATOR_FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT_ID = process.env.FIREBASE_PROJECT || 'flux-productivity-39c09';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : {}; } catch (e) { body = { raw: text }; }
  return { res, body };
}

(async function main() {
  try {
    const stamp = Date.now();
    const email = `e2e+${stamp}@example.com`;
    const password = 'password123';

    console.log('Creating emulator user:', email);
    const signUpUrl = `http://${EMULATOR_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=notasecret`;
    const { res: suRes, body: suBody } = await fetchJson(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    if (!suRes || !suBody || !suBody.localId) throw new Error('SignUp failed: ' + JSON.stringify(suBody));
    const uid = suBody.localId;
    // Ensure we obtain a fresh idToken via signInWithPassword (emulator stable behavior)
    const signInUrl = `http://${EMULATOR_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=notasecret`;
    const { res: siRes, body: siBody } = await fetchJson(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    if (!siRes || !siBody || !siBody.idToken) {
      console.warn('signInWithPassword did not return idToken, falling back to signUp idToken');
    }
    const idToken = (siBody && siBody.idToken) ? siBody.idToken : suBody.idToken;
    console.log('Created user uid=', uid, 'idToken length=', idToken ? idToken.length : 0);

    // Prepare Firestore REST document body
    const now = new Date().toISOString();
    // Create a full stats-style document that includes `showOnLeaderboard:true`.
    // This satisfies the isValidLeaderboardStatsWrite rule (requires displayName > 0)
    const docBody = {
      fields: {
        uid: { stringValue: uid },
        displayName: { stringValue: 'E2E User' },
        username: { stringValue: '' },
        photoURL: { nullValue: null },
        focusMinutesTotal: { integerValue: 1 },
        sessionsTotal: { integerValue: 1 },
        currentStreak: { integerValue: 0 },
        tasksDoneTotal: { integerValue: 0 },
        showOnLeaderboard: { booleanValue: true },
        isLive: { booleanValue: true },
        presenceState: { stringValue: 'studying' },
        lastPresenceAt: { timestampValue: now },
        lastUpdated: { timestampValue: now }
      }
    };

    const docUrl = `http://${EMULATOR_FIRESTORE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/leaderboard/${uid}`;

    console.log('Writing presence document via REST to', docUrl);
    const { res: patchRes, body: patchBody } = await fetchJson(docUrl + '?currentDocument.exists=true', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(docBody),
    });

    // If PATCH failed because document doesn't exist, try creating with ?currentDocument.exists=false
    if (!patchRes || (patchRes.status >= 400 && patchRes.status < 500)) {
      // try PUT via PATCH without existence precondition
      const { res: createRes, body: createBody } = await fetchJson(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(docBody),
      });
      if (!createRes || createRes.status >= 400) {
        console.error('Write failed:', createRes && createRes.status, createBody);
        throw new Error('Failed to write presence document');
      }
      console.log('Presence document written (created).');
    } else {
      console.log('Presence document patched OK.');
    }

    // Small delay for emulator to materialize
    await sleep(300);

    console.log('Reading back presence document to verify');
    const { res: getRes, body: getBody } = await fetchJson(docUrl, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    if (!getRes) throw new Error('No response from emulator');
    if (getRes.status !== 200) {
      console.error('GET status', getRes.status, getBody);
      throw new Error('Failed to read presence document');
    }

    const fields = getBody.fields || {};
    const isLive = fields.isLive && fields.isLive.booleanValue === true;
    const show = fields.showOnLeaderboard && fields.showOnLeaderboard.booleanValue === true;
    if (isLive && show) {
      console.log('PASS: presence doc isLive and showOnLeaderboard are set');
      process.exit(0);
    }
    console.error('FAIL: presence doc missing expected fields:', JSON.stringify(fields));
    process.exit(2);
  } catch (err) {
    console.error('Error:', err && err.stack || err);
    process.exit(3);
  }
})();
