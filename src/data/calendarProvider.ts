import type { ExternalCalendar, ExternalEvent, ExternalEventInput, PermissionState } from "./types";

/**
 * Native calendar access seam. `TauriCalendarProvider` (iOS EventKit plugin) is used inside the
 * iOS app; browser and desktop use `MockCalendarProvider` (in-memory) so the app always runs.
 */
export interface CalendarProvider {
  readonly name: string;
  /** True when backed by a real device calendar. */
  readonly native: boolean;
  getPermission(): Promise<PermissionState>;
  /** Prompts the user (first time only); resolves to the resulting state. */
  requestAccess(): Promise<PermissionState>;
  /** Opens the OS settings page for this app (to recover from "denied"). */
  openSettings(): Promise<void>;
  listCalendars(): Promise<ExternalCalendar[]>;
  fetchEvents(calendarId: string, rangeStart: string, rangeEnd: string): Promise<ExternalEvent[]>;
  /** Create (no externalId) or update. Resolves to the stored event so callers learn id + lastModified. */
  upsertEvent(event: ExternalEventInput): Promise<ExternalEvent>;
  deleteEvent(externalId: string): Promise<void>;
  /** Subscribe to external changes (EKEventStoreChanged). Returns an unsubscribe function. */
  onChange(listener: () => void): () => void;
}

export class MockCalendarProvider implements CalendarProvider {
  readonly name = "mock";
  readonly native = false;
  private store = new Map<string, ExternalEvent>();
  private listeners = new Set<() => void>();
  private counter = 0;
  private clock: () => Date;

  constructor(clock: () => Date = () => new Date()) {
    this.clock = clock;
  }

  async getPermission(): Promise<PermissionState> {
    return "granted";
  }
  async requestAccess(): Promise<PermissionState> {
    return "granted";
  }
  async openSettings(): Promise<void> {}
  async listCalendars(): Promise<ExternalCalendar[]> {
    return [
      { id: "mock-personal", title: "Personal", isDefault: true },
      { id: "mock-work", title: "Work" },
    ];
  }
  async fetchEvents(calendarId: string, rangeStart: string, rangeEnd: string): Promise<ExternalEvent[]> {
    const s = new Date(rangeStart).getTime();
    const e = new Date(rangeEnd).getTime();
    return [...this.store.values()]
      .filter((x) => x.calendarId === calendarId && new Date(x.start).getTime() < e && new Date(x.end).getTime() >= s)
      .map((x) => ({ ...x }));
  }
  async upsertEvent(input: ExternalEventInput): Promise<ExternalEvent> {
    const externalId = input.externalId ?? `mock-${++this.counter}`;
    const stored: ExternalEvent = { ...input, externalId, lastModified: this.clock().toISOString() };
    this.store.set(externalId, stored);
    return { ...stored };
  }
  async deleteEvent(externalId: string): Promise<void> {
    this.store.delete(externalId);
  }
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Test helpers: simulate edits made in the Apple Calendar app. */
  simulateExternalWrite(event: ExternalEvent): void {
    this.store.set(event.externalId, { ...event });
    this.listeners.forEach((l) => l());
  }
  simulateExternalDelete(externalId: string): void {
    this.store.delete(externalId);
    this.listeners.forEach((l) => l());
  }
}
