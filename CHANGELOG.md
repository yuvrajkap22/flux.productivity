# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog principles and semantic versioning.

## [2.0.0] - 2026-04-25

### Added
- New brand system with a dedicated app logo and favicon:
  - assets/flux-logo.svg
  - assets/flux-favicon.svg
- New repository documentation for version 2.0 in README.md.
- Social preview artwork for repository and sharing:
  - assets/social-preview.svg
  - assets/social-preview-square.svg
- Shared Firebase configuration module:
  - js/firebase-config.js
- Reduced Motion toggle in Settings to improve accessibility and performance.
- Native Guest Mode fallback gracefully bypasses placeholder Firebase credentials.

### Changed
- Refreshed UI and branding application across core pages.
- Settings view completely redesigned with a modern Bento-grid layout and icons.
- Improved the custom glassmorphic cursor to include a dynamic soft glow based on the theme accent.
- Profile modal UI enhanced with a glowing avatar wrapper and refined focus states.
- Header and login hero now use the new logo asset for visual consistency.
- Build pipeline now includes the assets directory in dist output.
- Package version bumped to 2.0.0.
- Login and app Firebase setup now consume a single shared config source.
- Loader flow synchronization improved between page readiness and auth readiness.

### Fixed
- Post-login profile avatar visibility issues.
- Avatar fallback handling for missing/invalid profile photo URLs.
- Profile state persistence reliability via user-scoped keys.
- Startup synchronization edge cases that could desync auth and UI state.

### Performance
- Continued support for performance-lite behavior on constrained devices.

### Developer Experience
- Cleaner project structure for release builds and static asset distribution.
- Clearer v2 documentation with feature listing and setup/build instructions.
- Automated GitHub Release workflow for tag-based publishing with generated notes.
