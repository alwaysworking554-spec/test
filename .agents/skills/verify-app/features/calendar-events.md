# Calendar / events
Status: implemented (create / edit / delete, month grid, day list, day view). Sync fields are stored but not used until TEST-PWK2XD.
- Storage `miami.events.v1`: `{id,title,notes?,location?,start,end,allDay,externalId?,calendarId?,lastModified,deleted}`; `start`/`end` are UTC ISO instants, all-day `end` is exclusive (local midnight after the last day). Delete is a soft tombstone (`deleted:true`). Fresh installs start empty; `/?seed=1` loads dev sample events when storage has none.
- Month grid `month-grid`, days `day-YYYY-MM-DD` (classes `today`, `selected`, `other`); dot `event-dot` under days with live events (multi-day events dot every covered day).
- List for the selected day: `event-count`, `event-card` (click opens edit), all-day first then by start; empty state `no-events`. `open-day-view` switches to the day view.
- Day view `screen-day`: `day-title`, `prev-day`/`next-day`, `day-back`, `allday-strip`/`allday-event`, `timeline`, `day-block` (solid pink; overlapping events share columns).
- Sheet (`add-button` or card/block click): `event-sheet`, `field-title|location|allday|start-date|start-time|end-date|end-time|notes`, `sheet-save`, `sheet-cancel`, errors `error-title`/`error-end`, `delete-event` -> `delete-confirm` -> `delete-confirm-yes|no`. Time pickers are hidden when all-day is on (the toggle input is visually hidden: use `evaluate(el => el.click())`).
- Drive: `drive.mjs` exercises create/validate/edit/day view/reload persistence/all-day/delete. Logic unit tests: `npm test` (`src/data/eventLogic.test.ts`).
