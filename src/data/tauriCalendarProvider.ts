import { addPluginListener, invoke } from "@tauri-apps/api/core";
import type { CalendarProvider } from "./calendarProvider";
import type { ExternalCalendar, ExternalEvent, ExternalEventInput, PermissionState } from "./types";

/** Commands that take data receive it wrapped as `{ payload }` (mirrors the Rust command signatures). */
const call = <T>(cmd: string, payload?: Record<string, unknown>) => invoke<T>(`plugin:eventkit|${cmd}`, payload ? { payload } : undefined);

/** iOS EventKit implementation, backed by the `eventkit` Tauri plugin (src-tauri/plugins/tauri-plugin-eventkit). */
export class TauriCalendarProvider implements CalendarProvider {
  readonly name = "eventkit";
  readonly native = true;

  async getPermission(): Promise<PermissionState> {
    return (await call<{ state: PermissionState }>("get_permission")).state;
  }
  async requestAccess(): Promise<PermissionState> {
    return (await call<{ state: PermissionState }>("request_access")).state;
  }
  async openSettings(): Promise<void> {
    await call("open_settings");
  }
  async listCalendars(): Promise<ExternalCalendar[]> {
    return (await call<{ calendars: ExternalCalendar[] }>("list_calendars")).calendars;
  }
  async fetchEvents(calendarId: string, rangeStart: string, rangeEnd: string): Promise<ExternalEvent[]> {
    return (await call<{ events: ExternalEvent[] }>("fetch_events", { calendarId, start: rangeStart, end: rangeEnd })).events;
  }
  async upsertEvent(event: ExternalEventInput): Promise<ExternalEvent> {
    return call<ExternalEvent>("upsert_event", { event });
  }
  async deleteEvent(externalId: string): Promise<void> {
    await call("delete_event", { externalId });
  }
  onChange(listener: () => void): () => void {
    let off: (() => void) | undefined;
    let cancelled = false;
    void addPluginListener("eventkit", "changed", () => listener()).then((l) => {
      if (cancelled) void l.unregister();
      else off = () => void l.unregister();
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }
}
