# Contributing to Flux Productivity

Thanks for helping improve Flux. This guide explains how to set up the development environment, run the local Firebase emulators, and execute headless/E2E tests.

## Prerequisites
- Node.js (v18+ recommended)
- npm
- Homebrew (macOS) or equivalent package manager
- Java JDK 21+ for the Firebase emulators

## Install dependencies
```
npm ci
```

## Install Java (macOS/Homebrew)
Recommended via Homebrew:
```bash
brew install openjdk@21
# Add to shell (example for zsh):
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
# Or use installed Temurin/Adoptium packages and set JAVA_HOME accordingly
```

## Start Firebase emulators (recommended)
A helper script is provided: `scripts/start-emulators.sh`.

```bash
# make executable once
chmod +x scripts/start-emulators.sh
# then run
scripts/start-emulators.sh
```

This will start the Auth and Firestore emulators (ports configured in `firebase.json`).

## Serve the built site
Build the distribution and serve it locally (or use `dist/` if present):
```bash
npm run build
npx serve dist -l 8080
```

Or run the local server on a different port (used by tests):
```bash
npx serve dist -l 8081
```

## Run headless smoke and E2E tests
- Headless smoke (screenshot):
```bash
npm run test:headless
```

- E2E harness (Puppeteer):
```bash
node scripts/headless-e2e.mjs http://127.0.0.1:8081
```

Notes
- E2E tests expect the Firebase emulators to be running on localhost (Auth:9099, Firestore:8080).
- If you see Java errors, ensure `java -version` reports 21+.

## Code style
- Add ESLint and Prettier in a follow-up PR — run formatters before committing.

Thanks — open a PR and describe your change; maintainers will review and merge.