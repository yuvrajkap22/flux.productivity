# Flux: Productivity Companion

A modern, minimalist productivity tracker with a Pomodoro timer, task management, and real-time progress tracking. Built as a fully installable PWA — works offline and can be added to your home screen.

🌐 **Live app:** [yuvrajkap22.github.io/todo-list-app](https://yuvrajkap22.github.io/todo-list-app/)

---

## ✨ Features

- **Task Management** — Add, complete, and delete tasks with smooth animations
- **Progress Tracking** — Live progress bar and completion counter
- **Pomodoro Timer** — Editable work/break durations (1–60 min), circular ring, audio notification, and task linking
- **Bloom Animations** — Glowing ring bloom, check-circle ripple, ambient orb drift
- **Dark / Light Mode** — Toggle with a click or press `D`
- **Filters** — View All / Active / Completed tasks
- **Keyboard Shortcuts** — Full keyboard control (press `?` for help)
- **Offline Support** — Works without internet via service worker cache
- **Installable PWA** — "Add to Home Screen" on iOS and Android

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
- **localStorage** — task and settings persistence
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
├── style.css           # Dual-theme styles + animations
├── script.js           # App logic (tasks, timer, shortcuts)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── .github/
    └── workflows/
        └── pages.yml   # Auto-deploy to GitHub Pages
```
