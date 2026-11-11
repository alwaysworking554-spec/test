/**
 * Calendar event. `start`/`end` are ISO-8601 instants (UTC, `toISOString()`); display and
 * day bucketing always use the device's local timezone.
 * All-day events: `start` is local midnight of the first day and `end` is local midnight of
 * the day AFTER the last day (exclusive end, matching EventKit/iCal).
 */
export interface OrganizerEvent {
  id: string;
  title: string;
  notes?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  /** Identifier in an external calendar (set by sync). */
  externalId?: string;
  /** Which external calendar the event belongs to (set by sync). */
  calendarId?: string;
  /** ISO instant of the last local or remote modification. */
  lastModified: string;
  /** Soft-delete tombstone so sync can propagate deletions. */
  deleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  /** Local date, YYYY-MM-DD, optional */
  due?: string;
}

export type SyncStatus = "synced" | "syncing" | "offline";
