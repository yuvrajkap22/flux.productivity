# Flux: Productivity Companion

A modern, premium productivity tracker with a Pomodoro timer (up to 3 hours), task management, focus stats, daily motivational quotes, and real-time progress tracking. Built as a fully installable PWA — works offline and can be added to your home screen.

🌐 **Live app:** [yuvrajkap22.github.io/todo-list-app](https://yuvrajkap22.github.io/todo-list-app/)

💬 **Discord:** [Join our community](https://discord.gg/XxVmF3HtzE)

---

## ✨ Features

- **Task Management** — Add, complete, and delete tasks with smooth animations
- **Progress Tracking** — Live progress bar and completion counter
- **Pomodoro Timer** — Editable work/break durations (1–180 min), gradient ring, audio notification, and task linking
- **Focus Stats** — Daily session count, total focus minutes, and consecutive day streak
- **Daily Quote** — Rotating motivational quotes to keep you inspired
- **Glassmorphism UI** — Apple OS 26-inspired frosted glass design with iridescent violet-blue accents
- **Bloom Animations** — Glowing ring, check-circle ripple, ambient orb drift
- **Dark / Light Mode** — Toggle with a click or press `D`
- **Filters** — View All / Active / Completed tasks
- **Keyboard Shortcuts** — Full keyboard control (press `?` for help)
- **Offline Support** — Works without internet via service worker cache
- **Installable PWA** — "Add to Home Screen" on iOS and Android
- **Discord Integration** — Quick link to join the community

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Focus input to add a new task |
| `P` | Start / Pause Pomodoro timer |
| `D` | Toggle dark / light mode |
| `?` | Open shortcuts help |
| `1` `2` `3` | Filter: All / Active / Completed |
| `Esc` | Close overlay / Blur input |

---

## 📱 Install as an App

1. Open the live URL in **Safari (iOS)** or **Chrome (Android)**
2. Tap **Share → Add to Home Screen** (iOS) or the **Install** prompt (Android/Desktop)
3. Flux launches in fullscreen, just like a native app

---

## 🛠️ Tech Stack

- **HTML / CSS / JavaScript** — no frameworks, no build step
- **Web Audio API** — Pomodoro notification chimes
- **localStorage** — task, settings, and focus stats persistence
- **Service Worker** — offline caching
- **GitHub Actions** — automatic deployment to GitHub Pages

---

## 🚀 Local Development

Just open `index.html` in a browser — no server or install needed.

```bash
git clone https://github.com/yuvrajkap22/todo-list-app.git
cd todo-list-app
open index.html
```

---

## 📁 Project Structure

```
├── index.html          # App markup
├── style.css           # Glassmorphism dual-theme styles + animations
├── script.js           # App logic (tasks, timer, stats, shortcuts)
├── icon.svg            # Vector app icon
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── .github/
    └── workflows/
        └── pages.yml   # Auto-deploy to GitHub Pages
```

---

## 📋 Changelog

### v1.01 — March 2026

- **Pomodoro Expanded** — Work and break durations now support up to 180 minutes (3 hours)
- **UI Refresh** — Complete redesign with Apple OS 26-inspired glassmorphism, frosted glass panels, violet-blue gradient accents, and premium shadows
- **Timer Ring Fix** — Fixed animated ring creating a square shadow artifact; now uses SVG drop-shadow filter for clean circular glow
- **Focus Stats** — New dashboard showing today's completed sessions, total focus minutes, and consecutive day streak
- **Daily Quotes** — Rotating motivational quotes displayed in a glass card
- **Discord Integration** — Header and footer links to join the Flux Discord community
- **New App Icon** — Premium gradient SVG icon with stylized "F" and lightning bolt accent
- **Three Ambient Orbs** — Added a third ambient glow orb for richer depth

### v1.00 — March 2026

- Initial release with task management, Pomodoro timer, dark/light themes, keyboard shortcuts, and PWA support
