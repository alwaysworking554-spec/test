import type { OrganizerEvent, SyncStatus } from "./types";

/**
 * Native calendar access seam. The iOS EventKit implementation arrives in a later
 * ticket; browser and desktop use the mock below.
 */
export interface CalendarProvider {
  readonly name: string;
  getSyncStatus(): Promise<SyncStatus>;
  fetchEvents(rangeStart: string, rangeEnd: string): Promise<OrganizerEvent[]>;
  pushEvent(event: OrganizerEvent): Promise<void>;
}

export class MockCalendarProvider implements CalendarProvider {
  readonly name = "mock";
  async getSyncStatus(): Promise<SyncStatus> {
    return "synced";
  }
  async fetchEvents(): Promise<OrganizerEvent[]> {
    return [];
  }
  async pushEvent(): Promise<void> {}
}
