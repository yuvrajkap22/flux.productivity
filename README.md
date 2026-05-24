# Flux Productivity

![Flux social preview](assets/social-preview.svg)

Flux is a focused productivity workspace for Pomodoro sessions, tasks, stats, and live leaderboard presence.

## Project Snapshot
- Vanilla HTML, CSS, and JavaScript
- Firebase Authentication for sign-in flows
- Firestore for leaderboard and presence sync
- Static deployment with Vercel

## Dependencies
- `serve` for local static hosting
- `puppeteer` and `puppeteer-extra` for smoke and E2E checks
- `lighthouse` for performance and SEO audits
- `clean-css`, `html-minifier-terser`, and `terser` for the production build

## Visuals
![Flux logo](assets/flux-logo.svg)

![Flux square preview](assets/social-preview-square.svg)

## Live Demo
- Vercel: https://flux-productivity-nine.vercel.app/

## Notes
- Do not commit secrets or private credentials.
- Keep changes small, readable, and easy to test.
- See `CONTRIBUTING.md` if you want setup and testing guidance.

## Testing

A few quick commands to run the emulator-based smoke and optional UI E2E tests locally.

- Start the Firebase emulators (Auth + Firestore) for the project:

```bash
npx firebase emulators:start --only auth,firestore --project flux-productivity-39c09
```

- Serve the built `dist` site (the E2E scripts expect the app on port 8081 by default):

```bash
npx serve dist -l 8081
```

- Run the deterministic REST-only smoke E2E (fast, CI-friendly):

```bash
npm run e2e:smoke
```

- Run the full headless UI test (optional — enable when debugging UI flakes):

```bash
npm run e2e:ui
# or enable UI assertions when running the script directly
RUN_UI_TEST=1 node scripts/headless-e2e.mjs http://127.0.0.1:8081
```

Notes:
- The smoke test uses the Firebase Emulator Suite and the Firestore emulator REST API; make sure the emulators are running before invoking `npm run e2e:smoke`.
- We intentionally keep UI assertions optional to avoid flaky CI failures — prefer `e2e:smoke` for CI.
- I will not push commits to the remote repository unless you ask.
