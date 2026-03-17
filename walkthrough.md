# Taskly — Productivity Tracker Walkthrough

## What Was Built

Overhauled the todo app into a full-featured productivity tracker called **Taskly**, across three files:

| File | Key Changes |
|------|-------------|
| [index.html](file:///Users/yuvrajkapoor/Documents/GitHub/todo-list-app/index.html) | Branded header, theme toggle, Pomodoro timer with circular ring, keyboard shortcuts overlay, progress bar, filter tabs, empty state |
| [style.css](file:///Users/yuvrajkapoor/Documents/GitHub/todo-list-app/style.css) | Dual dark/light theme via CSS custom properties. Colors: sky blue (focus), green (growth), warm amber (energy), soft red (urgency). Glassmorphism, micro-animations, responsive layout |
| [script.js](file:///Users/yuvrajkapoor/Documents/GitHub/todo-list-app/script.js) | Pomodoro timer (25/5 min cycles with audio notification), per-task focus linking, theme toggle, keyboard shortcuts, task CRUD, progress tracking, localStorage persistence |

## Design

````carousel
![Dark mode — initial state with Pomodoro timer and empty task list](/Users/yuvrajkapoor/.gemini/antigravity/brain/16541b0f-cafd-4483-b97a-76b9998d10f9/initial_dark_mode_1773773325955.png)
<!-- slide -->
![Dark mode — tasks added with 33% progress, completed task strikethrough](/Users/yuvrajkapoor/.gemini/antigravity/brain/16541b0f-cafd-4483-b97a-76b9998d10f9/task_marked_done_dark_mode_1773773378120.png)
<!-- slide -->
![Light mode — same state in clean light theme](/Users/yuvrajkapoor/.gemini/antigravity/brain/16541b0f-cafd-4483-b97a-76b9998d10f9/light_mode_state_1773773392643.png)
<!-- slide -->
![Keyboard shortcuts overlay in light mode](/Users/yuvrajkapoor/.gemini/antigravity/brain/16541b0f-cafd-4483-b97a-76b9998d10f9/keyboard_shortcuts_overlay_1773773400172.png)
````

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Focus the input to add a new task |
| `P` | Start / Pause Pomodoro timer |
| `D` | Toggle dark / light mode |
| `?` | Open shortcuts help overlay |
| `1` `2` `3` | Switch filter: All / Active / Completed |
| `Esc` | Close overlay or blur input |

## Verification Results

All features tested in the browser — **no bugs found**:
- ✅ Add, complete, and delete tasks — progress bar updates
- ✅ Dark ↔ Light theme toggle — persists on reload
- ✅ Pomodoro timer ring, start/pause/reset
- ✅ Focus button links task to Pomodoro
- ✅ Keyboard shortcuts all functional
- ✅ LocalStorage persistence for tasks and theme
- ✅ Responsive layout

![Full app demo recording](/Users/yuvrajkapoor/.gemini/antigravity/brain/16541b0f-cafd-4483-b97a-76b9998d10f9/full_app_demo_1773773309071.webp)
