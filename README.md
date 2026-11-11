# Miami Organizer

Pink-and-black ("neon glow") organizer app for iOS and Android built with **Tauri 2**, React, TypeScript and Vite.
Events (create/edit/delete, month grid, day list and hourly day view), Tasks (due dates, sections) and Notes (autosaving editor, attach to a day) are implemented and persist locally. Two-way Apple Calendar sync (iOS, EventKit) is implemented. Append `?seed=1` to the dev URL on a fresh install to load sample events.

## Architecture

- `src/` — React + TS frontend. Runs in a plain browser and inside Tauri.
- `src/data/repository.ts` — `Repository` interface; `localStorageRepository.ts` is the current implementation (swap for IndexedDB/SQLite later).
- `src/data/calendarProvider.ts` — `CalendarProvider` interface with an in-memory mock (browser/desktop, chosen by `providerFactory.ts`) and `tauriCalendarProvider.ts` (iOS EventKit). `syncLogic.ts` holds the pure two-way sync rules; `useCalendarSync.ts` drives them (launch, foreground, EKEventStoreChanged, after local edits).
- `src-tauri/plugins/tauri-plugin-eventkit/` — Tauri 2 plugin: Swift (`ios/Sources/EventKitPlugin.swift`, EventKit) + Rust command bindings. Calendar usage strings live in `src-tauri/Info.ios.plist`; the capability is `eventkit:default`.
- `src-tauri/` — Tauri 2 Rust shell (`lib.rs` carries the mobile entry point).

## Run in the browser (no toolchain needed)

```sh
npm install
npm run dev        # http://127.0.0.1:5173 — use a 390x844 viewport
npm run build      # typecheck + production build
npm test           # unit tests (vitest): date/event/sync logic, task grouping, note helpers
```

## Run in Tauri desktop

Requires [Rust](https://rustup.rs) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```sh
npm run tauri dev
```

## iOS (requires macOS + Xcode)

iOS projects can only be generated and built on a Mac with Xcode, CocoaPods and the iOS Rust targets
(`rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios`).

```sh
npm run tauri ios init     # generates src-tauri/gen/apple (not committed here: needs Xcode)
npm run tauri ios dev      # simulator or device; set bundle.iOS.developmentTeam in tauri.conf.json for devices
```

## Android (requires Android Studio / SDK + NDK)

Set `ANDROID_HOME` and `NDK_HOME`, install the Rust targets
(`rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`).

```sh
npm run tauri android init  # generates src-tauri/gen/android (not committed here: needs the SDK)
npm run tauri android dev
```

The mobile entry point (`#[cfg_attr(mobile, tauri::mobile_entry_point)]`) and `crate-type = ["staticlib","cdylib","rlib"]` are already configured, so `init` only has to generate the native projects.

## Apple Calendar sync

No API keys: sync uses on-device EventKit and the calendar permission the user grants on the phone. Tap the **Synced** pill to open the settings sheet (permission, calendar picker, "Sync now", last-synced time). Pill states: Synced, Syncing, Off (no permission / no calendar), Error.

Rules (see `src/data/syncLogic.ts`, covered by `syncLogic.test.ts`): events are linked by a stored `externalId`, so repeated syncs never duplicate; if both sides changed, the later `lastModified` wins; deleting an event in the app deletes it in Apple Calendar, deleting it in Apple Calendar deletes it in the app, and the app never deletes Apple events it did not create unless you delete them in the app. Events linked to a previously chosen calendar are left alone when you switch calendars.

Known limitations: recurring events sync as their first occurrence only; Apple-side deletions carry no timestamp so they always win; the sync window is 1 year back to 2 years ahead.

### Manual iOS test checklist (Mac + iPhone/simulator; not run in CI)

1. `npm run tauri ios init`, then `npm run tauri ios dev`. Confirm the generated project picks up `src-tauri/Info.ios.plist` (both `NSCalendars*UsageDescription` keys) and builds the `tauri-plugin-eventkit` Swift package (fix `Package.swift` path to `.tauri/tauri-api` if Tauri generated it elsewhere).
2. First launch: pill shows **Off**; open it, tap **Allow calendar access** -> iOS permission prompt (full access). Allow -> permission "Allowed", a calendar is preselected, pill turns **Synced**.
3. Deny path: reset permission (Settings > General > Transfer or Reset > Reset Location & Privacy), deny the prompt -> sheet shows the denied note and **Open iOS Settings** opens this app's settings page; enabling access and returning to the app resumes sync.
4. Create in app -> within ~1s the event appears in the Apple Calendar app, in the chosen calendar.
5. Create in Apple Calendar -> foreground Miami Organizer (or stay in it) -> event appears in the app.
6. Edit the title/time in the app -> updates in Apple Calendar; edit in Apple Calendar -> updates in the app. Edit both before syncing: the later edit wins.
7. Delete in the app -> removed from Apple Calendar; delete in Apple Calendar -> removed from the app. An Apple event you never touched in the app is never deleted by the app.
8. Press **Sync now** several times and background/foreground the app: no duplicate events in either place.
9. Switch the picker to another calendar: its events appear; events from the previous calendar stay in the app untouched.
10. Airplane mode is irrelevant (EventKit is local); confirm the **Error** pill + message by revoking access mid-session.

Native code (Swift/Rust plugin) has not been compiled yet; expect to adjust Tauri plugin API details (`Invoke`, `trigger`) to the installed Tauri version on first Mac build.

## Not verified in the scaffold environment

The scaffold was built on Linux without Rust, Xcode or the Android SDK: the Tauri shell config is hand-written to Tauri 2 conventions and has not been compiled. The `src-tauri/icons/icon.png` is a placeholder; run `npm run tauri icon <source.png>` to generate the full icon set.

## Verification

See `.claude/skills/verify-app/SKILL.md` (mirrored in `.agents/skills/verify-app/`).

![Home screen](docs/home-390x844.png)
![Tasks](docs/tasks-390x844.png)
![Notes](docs/notes-390x844.png)

![Month](docs/events-month-390x844.png) ![Add sheet](docs/events-add-sheet-390x844.png) ![Day view](docs/events-day-390x844.png)
