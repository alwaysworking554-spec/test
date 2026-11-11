import type { CalendarProvider } from "./calendarProvider";
import type { ExternalEvent, ExternalEventInput, OrganizerEvent } from "./types";

/*
 * Pure two-way sync logic between local events and one external calendar.
 * Rules:
 *  - Events are linked by `externalId` (stored locally), so repeated syncs never duplicate.
 *  - Both sides changed -> the later `lastModified` wins; identical content is a no-op.
 *  - Local deletes are tombstones: they propagate to the external calendar (unless the external
 *    copy was modified later). Events the app never created are only deleted if the user deletes
 *    them in the app.
 *  - A linked event that vanished externally (inside the synced window) was deleted in Apple
 *    Calendar: delete it locally. External deletions carry no timestamp, so they always win.
 *  - Local events linked to another calendar than the selected one are left untouched.
 */

export interface SyncRange {
  start: string;
  end: string;
}

const ts = (iso: string) => new Date(iso).getTime();

/** Window synced on each run: a year back, two years ahead. */
export function syncWindow(now = new Date()): SyncRange {
  return {
    start: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString(),
    end: new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString(),
  };
}

export function toExternalInput(e: OrganizerEvent, calendarId: string): ExternalEventInput {
  return {
    externalId: e.externalId,
    calendarId,
    title: e.title,
    notes: e.notes,
    location: e.location,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
  };
}

/** Local event for an external one. A new event gets a deterministic id so re-pulls cannot duplicate. */
export function fromExternal(x: ExternalEvent, existing?: OrganizerEvent): OrganizerEvent {
  return {
    id: existing?.id ?? `ek-${x.externalId}`,
    title: x.title,
    notes: x.notes || undefined,
    location: x.location || undefined,
    start: x.start,
    end: x.end,
    allDay: x.allDay,
    externalId: x.externalId,
    calendarId: x.calendarId,
    lastModified: x.lastModified,
    deleted: false,
  };
}

/** Same user-visible content (ignores ids and timestamps). */
export function sameContent(l: OrganizerEvent, r: ExternalEvent): boolean {
  return (
    l.title === r.title &&
    (l.notes ?? "") === (r.notes ?? "") &&
    (l.location ?? "") === (r.location ?? "") &&
    l.allDay === r.allDay &&
    ts(l.start) === ts(r.start) &&
    ts(l.end) === ts(r.end)
  );
}

const inRange = (e: OrganizerEvent, range: SyncRange) => ts(e.start) < ts(range.end) && ts(e.end) >= ts(range.start);

export interface SyncPlan {
  /** Local state after pulling (before pushes complete). */
  events: OrganizerEvent[];
  /** Local ids whose current content must be created/updated externally. */
  push: string[];
  /** External deletions to perform, with the tombstone that caused each. */
  remove: { externalId: string; local: OrganizerEvent }[];
}

export function planSync(local: OrganizerEvent[], remote: ExternalEvent[], calendarId: string, range: SyncRange): SyncPlan {
  const remoteById = new Map(remote.map((r) => [r.externalId, r]));
  const seen = new Set<string>();
  const events: OrganizerEvent[] = [];
  const push: string[] = [];
  const remove: SyncPlan["remove"] = [];

  for (const l of local) {
    if (l.externalId === undefined) {
      if (l.deleted) continue; // never synced: nothing to delete externally
      push.push(l.id);
      events.push(l);
      continue;
    }
    if (l.calendarId && l.calendarId !== calendarId) {
      if (l.deleted) remove.push({ externalId: l.externalId, local: l });
      else events.push(l);
      continue;
    }
    const r = remoteById.get(l.externalId);
    if (!r) {
      // Gone externally: deleted in Apple Calendar (only trusted inside the fetched window).
      if (!l.deleted && !inRange(l, range)) events.push(l);
      continue;
    }
    seen.add(r.externalId);
    const remoteNewer = ts(r.lastModified) > ts(l.lastModified);
    if (l.deleted) {
      if (remoteNewer) events.push(fromExternal(r, l));
      else remove.push({ externalId: r.externalId, local: l });
    } else if (sameContent(l, r)) {
      events.push(l.lastModified === r.lastModified ? l : { ...l, lastModified: r.lastModified });
    } else if (remoteNewer) {
      events.push(fromExternal(r, l));
    } else {
      push.push(l.id);
      events.push(l);
    }
  }
  for (const r of remote) if (!seen.has(r.externalId)) events.push(fromExternal(r));
  return { events, push, remove };
}

export interface SyncResult {
  events: OrganizerEvent[];
  pushed: number;
  removed: number;
  error?: Error;
}

/** Execute a sync. On failure returns the progress made so far (links created) plus the error. */
export async function runSync(provider: CalendarProvider, local: OrganizerEvent[], calendarId: string, range: SyncRange): Promise<SyncResult> {
  let remote: ExternalEvent[];
  try {
    remote = await provider.fetchEvents(calendarId, range.start, range.end);
  } catch (e) {
    return { events: local, pushed: 0, removed: 0, error: e as Error };
  }
  const plan = planSync(local, remote, calendarId, range);
  const byId = new Map(plan.events.map((e) => [e.id, e]));
  const restore: OrganizerEvent[] = [];
  let pushed = 0;
  let removed = 0;
  let error: Error | undefined;

  for (const id of plan.push) {
    const e = byId.get(id)!;
    try {
      const saved = await provider.upsertEvent(toExternalInput(e, calendarId));
      byId.set(id, { ...e, externalId: saved.externalId, calendarId, lastModified: saved.lastModified });
      pushed++;
    } catch (err) {
      error = err as Error;
      break;
    }
  }
  if (!error) {
    for (const r of plan.remove) {
      try {
        await provider.deleteEvent(r.externalId);
        removed++;
      } catch (err) {
        error = err as Error;
        restore.push(r.local); // keep the tombstone so the next sync retries
      }
    }
  } else {
    restore.push(...plan.remove.map((r) => r.local));
  }
  return { events: [...plan.events.map((e) => byId.get(e.id) ?? e), ...restore], pushed, removed, error };
}

/**
 * Combine a sync result with edits the user made while it was running: anything changed since
 * `snapshot` keeps the user's version (but inherits the external link created by the sync).
 */
export function mergeAfterSync(snapshot: OrganizerEvent[], current: OrganizerEvent[], synced: OrganizerEvent[]): OrganizerEvent[] {
  const snap = new Map(snapshot.map((e) => [e.id, e]));
  const syncedById = new Map(synced.map((e) => [e.id, e]));
  const out: OrganizerEvent[] = [];
  for (const c of current) {
    const s = snap.get(c.id);
    const y = syncedById.get(c.id);
    if (!s) out.push(c);
    else if (c.lastModified !== s.lastModified || c.deleted !== s.deleted) {
      out.push(c.externalId === undefined && y?.externalId ? { ...c, externalId: y.externalId, calendarId: y.calendarId } : c);
    } else if (y) out.push(y);
  }
  const have = new Set(current.map((e) => e.id));
  for (const y of synced) if (!snap.has(y.id) && !have.has(y.id)) out.push(y);
  return out;
}
