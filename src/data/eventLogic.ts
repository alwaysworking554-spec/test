import { pad, toKey } from "./dates";
import type { OrganizerEvent } from "./types";

export const DAY_MS = 86_400_000;

/** Local-midnight Date for a YYYY-MM-DD key. */
export function dayStart(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local-midnight of the day after `key` (DST-safe). */
export function dayEnd(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d + 1);
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return toKey(new Date(y, m - 1, d + n));
}

export const isLive = (e: OrganizerEvent) => !e.deleted;

/** Does the event occupy any part of the local day `key`? Zero-length events count on their start day. */
export function occursOnDay(e: OrganizerEvent, key: string): boolean {
  const s = new Date(e.start).getTime();
  const en = new Date(e.end).getTime();
  const ds = dayStart(key).getTime();
  const de = dayEnd(key).getTime();
  if (en <= s) return s >= ds && s < de;
  return s < de && en > ds;
}

/** All-day first, then by start, end, title. */
export function compareEvents(a: OrganizerEvent, b: OrganizerEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (
    new Date(a.start).getTime() - new Date(b.start).getTime() ||
    new Date(a.end).getTime() - new Date(b.end).getTime() ||
    a.title.localeCompare(b.title)
  );
}

export function eventsForDay(events: OrganizerEvent[], key: string): OrganizerEvent[] {
  return events.filter((e) => isLive(e) && occursOnDay(e, key)).sort(compareEvents);
}

/** Set of day keys (within [firstKey, lastKey]) that have at least one live event. */
export function daysWithEvents(events: OrganizerEvent[], firstKey: string, lastKey: string): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (!isLive(e)) continue;
    for (let k = firstKey; k <= lastKey; k = addDays(k, 1)) {
      if (occursOnDay(e, k)) out.add(k);
    }
  }
  return out;
}

/** True when the two events share any time (touching end/start does not overlap). */
export function eventsOverlap(a: OrganizerEvent, b: OrganizerEvent): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}

export interface DayBlock {
  event: OrganizerEvent;
  /** Minutes from local midnight, clipped to the day. */
  startMin: number;
  endMin: number;
  /** Column index and column count within its overlap cluster. */
  col: number;
  cols: number;
}

const MIN_BLOCK = 30;

/** Lay out timed events of day `key` for the hourly timeline; overlapping events share columns. */
export function layoutDay(events: OrganizerEvent[], key: string): DayBlock[] {
  const ds = dayStart(key).getTime();
  const items = events
    .filter((e) => isLive(e) && !e.allDay && occursOnDay(e, key))
    .sort(compareEvents)
    .map((event) => {
      const startMin = Math.max(0, Math.round((new Date(event.start).getTime() - ds) / 60000));
      const rawEnd = Math.min(1440, Math.round((new Date(event.end).getTime() - ds) / 60000));
      return { event, startMin, endMin: Math.min(1440, Math.max(rawEnd, startMin + MIN_BLOCK)), col: 0, cols: 1 };
    });

  let cluster: typeof items = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((i) => i.col + 1));
    cluster.forEach((i) => (i.cols = cols));
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.startMin >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.endMin > it.startMin).map((c) => c.col));
    while (used.has(it.col)) it.col++;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();
  return items;
}

/* ---------- drafts (form state) ---------- */

export interface EventDraft {
  title: string;
  location: string;
  notes: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  /** For all-day events this is the (inclusive) last day. */
  endDate: string;
  endTime: string;
}

const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function newDraft(dayKey: string, now = new Date()): EventDraft {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(now.getHours() + 1);
  const end = new Date(start.getTime() + 3_600_000);
  const base = dayStart(dayKey);
  const at = (t: Date) => new Date(base.getFullYear(), base.getMonth(), base.getDate(), t.getHours(), t.getMinutes());
  const s = at(start);
  // Crossing midnight (e.g. 23:00 -> 00:00) stays on the chosen day: clamp to 1h ending 23:59.
  const e = end.getDate() !== start.getDate() ? new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59) : at(end);
  return {
    title: "",
    location: "",
    notes: "",
    allDay: false,
    startDate: dayKey,
    startTime: hhmm(s),
    endDate: dayKey,
    endTime: hhmm(e),
  };
}

export function draftFromEvent(e: OrganizerEvent): EventDraft {
  const s = new Date(e.start);
  const en = new Date(e.end);
  const lastDay = e.allDay ? new Date(en.getFullYear(), en.getMonth(), en.getDate() - 1) : en;
  return {
    title: e.title,
    location: e.location ?? "",
    notes: e.notes ?? "",
    allDay: e.allDay,
    startDate: toKey(s),
    startTime: e.allDay ? "09:00" : hhmm(s),
    endDate: toKey(lastDay),
    endTime: e.allDay ? "10:00" : hhmm(en),
  };
}

function at(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

/** Resolve a draft to start/end instants (ISO). Returns null when a field is unparseable. */
export function draftRange(d: EventDraft): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(d.endDate)) return null;
  if (!d.allDay && (!/^\d{2}:\d{2}$/.test(d.startTime) || !/^\d{2}:\d{2}$/.test(d.endTime))) return null;
  const start = d.allDay ? dayStart(d.startDate) : at(d.startDate, d.startTime);
  const end = d.allDay ? dayEnd(d.endDate) : at(d.endDate, d.endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}

export interface DraftErrors {
  title?: string;
  end?: string;
}

export function validateDraft(d: EventDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!d.title.trim()) errors.title = "Title is required";
  const range = draftRange(d);
  if (!range) errors.end = "Enter a valid date and time";
  else if (d.allDay ? d.endDate < d.startDate : new Date(range.end) <= new Date(range.start)) {
    errors.end = d.allDay ? "End day must be on or after the start day" : "End must be after start";
  }
  return errors;
}

let counter = 0;
const newId = () => `ev-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Build a new event, or apply the draft onto `existing` (keeping sync fields). */
export function eventFromDraft(d: EventDraft, existing?: OrganizerEvent, now = new Date()): OrganizerEvent {
  const range = draftRange(d);
  if (!range) throw new Error("Invalid draft");
  return {
    ...(existing ?? { id: newId(), deleted: false }),
    title: d.title.trim(),
    location: d.location.trim() || undefined,
    notes: d.notes.trim() || undefined,
    allDay: d.allDay,
    start: range.start,
    end: range.end,
    lastModified: now.toISOString(),
  };
}

/** "10:00 – 11:30", "All day", or a multi-day label relative to the viewed day. */
export function timeLabel(e: OrganizerEvent, key: string): string {
  if (e.allDay) return "All day";
  const s = new Date(e.start);
  const en = new Date(e.end);
  const startsToday = toKey(s) === key;
  const endsToday = toKey(en) === key || en.getTime() === dayEnd(key).getTime();
  if (startsToday && endsToday) return `${hhmm(s)} – ${hhmm(en)}`;
  if (startsToday) return `${hhmm(s)} →`;
  if (endsToday) return `→ ${hhmm(en)}`;
  return "All day";
}
