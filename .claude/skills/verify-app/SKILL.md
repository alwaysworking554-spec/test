---
name: verify-app
description: Launch, drive and capture evidence from the Miami Organizer app (Vite + React in a browser at 390x844). Use to confirm a change works in the real app, or to screenshot the home screen.
---

# verify-app

The frontend runs in a plain browser; Tauri/iOS/Android are not needed to verify UI. All data is in `localStorage` (keys `miami.events.v1`, `miami.tasks.v1`, `miami.notes.v1`).

## Launch
From empty storage (a fresh Playwright context has none; in a real browser clear it with `localStorage.clear()`):
```sh
npm install                                   # once (.fredrin/setup.sh does this)
npm run dev > /tmp/dev.log 2>&1 & echo $! > /tmp/verify-dev.pid
until curl -sf http://127.0.0.1:5173/ >/dev/null; do sleep 0.5; done
```
Ready means usable: `[data-testid="app"][data-ready="true"]` exists (repository loaded, seed written). Port is fixed at 5173 (`strictPort`).

## Doctor (read-only)
```sh
node -v && test -d node_modules && npx tsc --noEmit && curl -sfI http://127.0.0.1:5173/ | head -1
ls ~/.cache/ms-playwright 2>/dev/null   # headless Chromium present?
```
If Chromium is missing: `mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright && npx playwright install chromium && npx playwright install-deps chromium` (the last needs apt access). Then use `PW_DIR=/tmp/pw`.

## Drive
`PW_DIR=/tmp/pw node .claude/skills/verify-app/drive.mjs http://127.0.0.1:5173 .verify` drives the home screen and prints PASS/FAIL lines (exit 1 on any FAIL). Viewport 390x844 @2x. Real selectors (`data-testid`):
`app`, `screen-calendar|tasks|notes`, `month-title`, `sync-pill`, `selected-day`, `prev-month`, `next-month`, `month-grid`, `day-YYYY-MM-DD`, `event-dot`, `event-count`, `event-card`, `task`, `task-count`, `add-button`, `tab-calendar|tasks|notes`. Only route is `/` (tabs are state, not URLs).

## Evidence
Report the action, the resulting state and side effects: the PASS/FAIL lines (action -> state), `.verify/home.png` (screenshot), and storage side effects (read `localStorage` keys above after a task toggle: `miami.tasks.v1` changes, events unchanged). Also check `/tmp/dev.log` for errors.

## Cleanup
Kill only what you started: `kill "$(cat /tmp/verify-dev.pid)"` (never `pkill vite`). Keep `.verify/` (git-ignored) as evidence; do not delete it.

## Feature map
One file per feature under `features/`: `calendar-events.md`, `apple-calendar-sync.md`, `tasks.md`, `notes.md`. Read the file for the feature you changed; add selectors there when a feature lands.
