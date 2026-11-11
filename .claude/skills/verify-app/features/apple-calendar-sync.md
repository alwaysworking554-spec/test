# Apple Calendar sync
Status: not implemented (TEST-PWK2XD). Only `CalendarProvider` + `MockCalendarProvider` (`src/data/calendarProvider.ts`) exist; the pill (`sync-pill`) shows the provider's status.
- Real EventKit verification needs macOS + Xcode (iOS simulator); it cannot run in the browser.
- In the browser, verify only that the mock reports "Synced" and fetches nothing.
