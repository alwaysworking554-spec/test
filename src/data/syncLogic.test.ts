import { describe, expect, it } from "vitest";
import { MockCalendarProvider } from "./calendarProvider";
import { fromExternal, mergeAfterSync, planSync, runSync, sameContent, toExternalInput } from "./syncLogic";
import type { ExternalEvent, OrganizerEvent } from "./types";

const CAL = "mock-personal";
const RANGE = { start: "2025-01-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z" };
const T0 = "2025-06-01T10:00:00.000Z";
const T1 = "2025-06-01T11:00:00.000Z";
const T2 = "2025-06-01T12:00:00.000Z";

const local = (id: string, extra: Partial<OrganizerEvent> = {}): OrganizerEvent => ({
  id, title: id, allDay: false, deleted: false, lastModified: T1,
  start: "2025-06-10T09:00:00.000Z", end: "2025-06-10T10:00:00.000Z", ...extra,
});
const remote = (externalId: string, extra: Partial<ExternalEvent> = {}): ExternalEvent => ({
  externalId, calendarId: CAL, title: externalId, allDay: false, lastModified: T1,
  start: "2025-06-10T09:00:00.000Z", end: "2025-06-10T10:00:00.000Z", ...extra,
});

describe("mapping", () => {
  it("round-trips local <-> external and keeps the local id", () => {
    const l = local("a", { notes: "n", location: "L", externalId: "x1", calendarId: CAL });
    const input = toExternalInput(l, CAL);
    expect(input).toMatchObject({ externalId: "x1", calendarId: CAL, title: "a", notes: "n", location: "L" });
    const back = fromExternal({ ...input, externalId: "x1", lastModified: T2 }, l);
    expect(back).toMatchObject({ id: "a", title: "a", notes: "n", location: "L", externalId: "x1", lastModified: T2, deleted: false });
  });
  it("gives pulled events a deterministic id", () => {
    expect(fromExternal(remote("x9")).id).toBe("ek-x9");
  });
  it("sameContent ignores ids/timestamps and empty-vs-missing optional fields", () => {
    expect(sameContent(local("x1"), remote("x1", { notes: "", lastModified: T2 }))).toBe(true);
    expect(sameContent(local("x1"), remote("x1", { title: "other" }))).toBe(false);
    expect(sameContent(local("x1"), remote("x1", { start: "2025-06-10T09:30:00.000Z" }))).toBe(false);
  });
});

describe("planSync conflict rules", () => {
  it("pushes unlinked local events and drops unlinked tombstones", () => {
    const p = planSync([local("a"), local("b", { deleted: true })], [], CAL, RANGE);
    expect(p.push).toEqual(["a"]);
    expect(p.events.map((e) => e.id)).toEqual(["a"]);
    expect(p.remove).toEqual([]);
  });
  it("pulls unseen external events as new local events", () => {
    const p = planSync([], [remote("x1")], CAL, RANGE);
    expect(p.events).toHaveLength(1);
    expect(p.events[0]).toMatchObject({ externalId: "x1", calendarId: CAL });
  });
  it("later lastModified wins: remote newer pulls, local newer pushes", () => {
    const l = local("a", { externalId: "x1", calendarId: CAL, title: "local", lastModified: T1 });
    const pulled = planSync([l], [remote("x1", { title: "remote", lastModified: T2 })], CAL, RANGE);
    expect(pulled.events[0].title).toBe("remote");
    expect(pulled.push).toEqual([]);
    const pushed = planSync([{ ...l, lastModified: T2 }], [remote("x1", { title: "remote", lastModified: T1 })], CAL, RANGE);
    expect(pushed.push).toEqual(["a"]);
    expect(pushed.events[0].title).toBe("local");
  });
  it("identical content is a no-op (idempotent), only aligning the timestamp", () => {
    const l = local("a", { externalId: "x1", calendarId: CAL });
    const p = planSync([l], [remote("x1", { title: "a", lastModified: T2 })], CAL, RANGE);
    expect(p.push).toEqual([]);
    expect(p.remove).toEqual([]);
    expect(p.events).toEqual([{ ...l, lastModified: T2 }]);
  });
  it("local delete propagates unless the external copy changed later", () => {
    const tomb = local("a", { externalId: "x1", calendarId: CAL, deleted: true, lastModified: T1 });
    expect(planSync([tomb], [remote("x1", { lastModified: T1 })], CAL, RANGE).remove.map((r) => r.externalId)).toEqual(["x1"]);
    const res = planSync([tomb], [remote("x1", { lastModified: T2, title: "edited in Apple" })], CAL, RANGE);
    expect(res.remove).toEqual([]);
    expect(res.events[0]).toMatchObject({ id: "a", title: "edited in Apple", deleted: false });
  });
  it("an event missing externally inside the window was deleted in Apple Calendar", () => {
    const l = local("a", { externalId: "x1", calendarId: CAL });
    expect(planSync([l], [], CAL, RANGE).events).toEqual([]);
  });
  it("never removes linked events outside the fetched window or in other calendars", () => {
    const old = local("old", { externalId: "x1", calendarId: CAL, start: "2020-01-01T09:00:00.000Z", end: "2020-01-01T10:00:00.000Z" });
    const other = local("other", { externalId: "x2", calendarId: "mock-work" });
    const p = planSync([old, other], [], CAL, RANGE);
    expect(p.events.map((e) => e.id)).toEqual(["old", "other"]);
    expect(p.push).toEqual([]);
  });
});

describe("runSync against the mock provider", () => {
  it("creates externally once and is idempotent across repeated syncs", async () => {
    const provider = new MockCalendarProvider();
    let events = [local("a"), local("b")];
    const first = await runSync(provider, events, CAL, RANGE);
    expect(first.pushed).toBe(2);
    expect(first.events.every((e) => e.externalId && e.calendarId === CAL)).toBe(true);
    events = first.events;
    const second = await runSync(provider, events, CAL, RANGE);
    expect(second.pushed).toBe(0);
    expect(second.events).toEqual(events);
    expect(await provider.fetchEvents(CAL, RANGE.start, RANGE.end)).toHaveLength(2);
  });
  it("two-way: external create/edit/delete reach the app; app edit/delete reach the calendar", async () => {
    let now = new Date(T0);
    const provider = new MockCalendarProvider(() => now);
    let events = (await runSync(provider, [local("a", { lastModified: T0 })], CAL, RANGE)).events;
    const ext = events[0].externalId!;

    now = new Date(T1);
    provider.simulateExternalWrite(remote(ext, { title: "Edited in Apple", lastModified: T1 }));
    provider.simulateExternalWrite(remote("apple-new", { title: "Made in Apple", lastModified: T1 }));
    events = (await runSync(provider, events, CAL, RANGE)).events;
    expect(events.map((e) => e.title).sort()).toEqual(["Edited in Apple", "Made in Apple"]);

    now = new Date(T2);
    events = events.map((e) => (e.externalId === ext ? { ...e, title: "Edited in app", lastModified: T2 } : e));
    events = (await runSync(provider, events, CAL, RANGE)).events;
    expect((await provider.fetchEvents(CAL, RANGE.start, RANGE.end)).find((x) => x.externalId === ext)?.title).toBe("Edited in app");

    events = events.map((e) => (e.externalId === ext ? { ...e, deleted: true, lastModified: "2025-06-01T13:00:00.000Z" } : e));
    const res = await runSync(provider, events, CAL, RANGE);
    expect(res.removed).toBe(1);
    expect(res.events.map((e) => e.externalId)).toEqual(["apple-new"]);
    expect((await provider.fetchEvents(CAL, RANGE.start, RANGE.end)).map((x) => x.externalId)).toEqual(["apple-new"]);

    provider.simulateExternalDelete("apple-new");
    expect((await runSync(provider, res.events, CAL, RANGE)).events).toEqual([]);
  });
  it("keeps progress and tombstones when the provider fails mid-sync", async () => {
    const provider = new MockCalendarProvider();
    let calls = 0;
    const orig = provider.upsertEvent.bind(provider);
    provider.upsertEvent = async (e) => {
      if (++calls === 2) throw new Error("boom");
      return orig(e);
    };
    const res = await runSync(provider, [local("a"), local("b")], CAL, RANGE);
    expect(res.error?.message).toBe("boom");
    expect(res.events.find((e) => e.id === "a")?.externalId).toBeDefined();
    expect(res.events.find((e) => e.id === "b")?.externalId).toBeUndefined();
  });
});

describe("mergeAfterSync", () => {
  it("keeps edits made during the sync but inherits the new external link", () => {
    const snap = [local("a")];
    const synced = [{ ...local("a"), externalId: "x1", calendarId: CAL }];
    const current = [local("a", { title: "edited meanwhile", lastModified: T2 })];
    expect(mergeAfterSync(snap, current, synced)).toEqual([{ ...current[0], externalId: "x1", calendarId: CAL }]);
  });
  it("adopts sync results for untouched events, keeps new local events and adds pulled ones", () => {
    const snap = [local("a")];
    const synced = [{ ...local("a"), title: "pulled update" }, local("ek-x")];
    const current = [local("a"), local("new")];
    const out = mergeAfterSync(snap, current, synced);
    expect(out.map((e) => e.id).sort()).toEqual(["a", "ek-x", "new"]);
    expect(out.find((e) => e.id === "a")?.title).toBe("pulled update");
  });
  it("drops untouched events the sync removed", () => {
    expect(mergeAfterSync([local("a")], [local("a")], [])).toEqual([]);
  });
});
