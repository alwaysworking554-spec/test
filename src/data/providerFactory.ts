import type { CalendarProvider } from "./calendarProvider";
import { MockCalendarProvider } from "./calendarProvider";
import { TauriCalendarProvider } from "./tauriCalendarProvider";

/** True inside the Tauri iOS shell (EventKit only exists there). */
export function isTauriIos(): boolean {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Real EventKit on iOS, in-memory mock everywhere else (browser, desktop, Android). */
export function createCalendarProvider(): CalendarProvider {
  return isTauriIos() ? new TauriCalendarProvider() : new MockCalendarProvider();
}
