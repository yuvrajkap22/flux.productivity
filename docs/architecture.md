# Architecture Notes — Flux Productivity

This document outlines the core architecture for the leaderboard and presence features, and how components interact.

## Components
- Frontend: Vanilla JavaScript modules in `js/`. Key modules:
  - `js/pomo.js` — Pomodoro timer, session tracking, heartbeat for presence.
  - `js/leaderboard.js` — Firestore interface: `syncLeaderboard`, `subscribeLeaderboard`, `setLeaderboardVisibility`.
  - `js/leaderboard-ui.js` — Renders leaderboard lists, podium, mini dropdown; dispatches `flux-leaderboard-updated` events.
  - `js/app.js` — Navigation and view routing.

- Backend (Firebase Emulator / Firestore in production):
  - Collection: `leaderboard` — each document keyed by `uid` contains aggregated stats and presence fields:
    - `displayName`, `username`, `photoURL`
    - `focusMinutesTotal`, `sessionsTotal`, `tasksDoneTotal`, `currentStreak`
    - `isLive`, `presenceState`, `lastPresenceAt`, `lastUpdated`, `showOnLeaderboard`

## Presence model
- Presence writes are intentionally small and frequent when a user is active.
- Two write modes:
  - Presence-only: updates `isLive`, `presenceState`, `lastPresenceAt` and `lastUpdated` using `serverTimestamp()`; bypasses client-side debounce.
  - Full sync: writes aggregated user stats and profile info as a merged document (used at session completion or less frequently).

- Heartbeat strategy:
  - Pomodoro starts a presence heartbeat (`leaderboardPresenceHeartbeatMs`, e.g., 20s).
  - On each heartbeat the frontend calls `syncLeaderboard({ presenceOnly: true, isLive: true })`.
  - On stop/pause the frontend writes presence false immediately.

## Subscriptions & UI
- `subscribeLeaderboard(metric, range, callback)` returns a Firestore `onSnapshot` unsubscribe that serves live updates to the UI.
- UI uses `lastPresenceAt` and `isLive` to compute `Live` vs `Idle` states with a freshness threshold (e.g., 90 seconds).
- To reduce cost and index needs, queries prefer sorting by numeric metrics (e.g., `focusMinutesTotal`). When range filters are used, composite indexes may be required.

## Cost & Scalability considerations
- Minimize writes: presence-only writes are minimal. Avoid writing large payloads frequently.
- Retention: consider lifecycle cleanup for stale leaderboard entries or TTL policy in Firestore (server-side) if required.
- Indexes: add composite indexes required by range + order queries into `firestore.indexes.json`.

## Security
- Firestore security rules should only allow users to update their own `leaderboard/{uid}` entries and must validate fields (whitelist editable fields and types).
- Auth is required for presence writes in production.

## Testing
- Local development uses the Firebase Emulators. Use `scripts/start-emulators.sh` to start emulators in consistent ports.
- E2E tests should seed Auth & Firestore via emulator REST APIs or Admin SDK for deterministic checks.

## Improvements (future)
- Move to TypeScript to provide stronger contracts and easier refactors.
- Add CI with emulator support to run E2E tests on pushes/PRs.
- Add server-side scheduled job to compact leaderboard data and enforce retention.
