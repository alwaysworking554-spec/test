# Tasks
Status: implemented (TEST-BNJ26C). Storage: `miami.tasks.v1` (starts empty; `seedTasks()` in `src/data/seed.ts` is an optional dev seed).
- Tab `tab-tasks` -> `screen-tasks`; empty state `tasks-empty`. Sections `section-overdue|today|upcoming|nodate|done` (only non-empty ones render).
- Rows: `task-row`; round checkbox `task-toggle`; row body `task-edit` opens the sheet.
- Add: `add-button` (FAB on Tasks tab) -> `task-sheet` with `task-title`, `task-due` (date input), `task-notes`, `task-save`, `task-delete` (edit only).
- Home screen: `task` rows (overdue + due today only), `task-count` = "done / total" of those; clicking a row toggles.
- Drive: `drive.mjs` covers add/complete/edit/delete, persistence across reload and the home count.
