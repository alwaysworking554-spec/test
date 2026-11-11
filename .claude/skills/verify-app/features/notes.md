# Notes
Status: implemented (TEST-BNJ26C). Storage: `miami.notes.v1` (array of `{id, body, date?, updatedAt}`; title = first non-empty line).
- Tab `tab-notes` -> `screen-notes`; empty state `notes-empty`; list rows `note-card` (title, preview, updated date).
- Create: `add-button` (FAB on Notes tab) -> full-screen `note-editor` with `note-body`, `note-date` (attach to day), `note-saved` ("Saving…" -> "Saved", 400 ms debounce), `note-back`, `note-delete`. Blank notes are discarded on close.
- Home screen: a note attached to the selected day shows as a `note-row` with a "Note" badge under the events.
- Drive: `drive.mjs` covers create, autosave, list, persistence across reload and the home Note row.
