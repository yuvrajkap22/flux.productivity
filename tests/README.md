Tests and E2E harness

- `scripts/headless-e2e.mjs` is the Puppeteer-based E2E test. It seeds a user into the Auth emulator and verifies that a presence document appears in the Firestore emulator.

How to run:
1. Start Firebase emulators:
   ```bash
   scripts/start-emulators.sh
   ```
2. Serve site on port 8081:
   ```bash
   npx serve dist -l 8081
   ```
3. Run E2E test:
   ```bash
   node scripts/headless-e2e.mjs http://127.0.0.1:8081
   ```

The test is intentionally conservative: it uses emulator REST APIs to seed users and to verify the presence document for deterministic checks.
