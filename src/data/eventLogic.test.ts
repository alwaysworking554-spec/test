import { describe, expect, it } from "vitest";
import { monthGrid, trimGrid, toKey } from "./dates";
import {
  daysWithEvents, draftFromEvent, eventFromDraft, eventsForDay, eventsOverlap, layoutDay, newDraft, occursOnDay, timeLabel, validateDraft,
} from "./eventLogic";
import type { OrganizerEvent } from "./types";

const ev = (id: string, s: [number, number, number, number, number], e: [number, number, number, number, number], allDay = false, title = id): OrganizerEvent => ({
  id, title, allDay, deleted: false, lastModified: "2025-01-01T00:00:00.000Z",
  start: new Date(...s).toISOString(), end: new Date(...e).toISOString(),
});

describe("month grid", () => {
  it("covers the month starting Sunday with 42 cells", () => {
    const g = monthGrid(2025, 5); // June 2025, starts Sunday
    expect(g).toHaveLength(42);
    expect(toKey(g[0])).toBe("2025-06-01");
    expect(toKey(g[41])).toBe("2025-07-12");
  });
  it("pads with previous month and trims an all-next-month last week", () => {
    const g = monthGrid(2025, 7); // Aug 2025 starts Friday
    expect(toKey(g[0])).toBe("2025-07-27");
    expect(trimGrid(monthGrid(2025, 5), 5)).toHaveLength(35);
    expect(trimGrid(g, 7)).toHaveLength(42);
  });
});

describe("occursOnDay / multi-day / all-day", () => {
  it("handles multi-day timed events", () => {
    const e = ev("a", [2025, 5, 10, 22, 0], [2025, 5, 12, 2, 0]);
    expect(["2025-06-09", "2025-06-10", "2025-06-11", "2025-06-12", "2025-06-13"].map((k) => occursOnDay(e, k))).toEqual([false, true, true, true, false]);
  });
  it("does not leak an event ending exactly at midnight into the next day", () => {
    const e = ev("a", [2025, 5, 10, 22, 0], [2025, 5, 11, 0, 0]);
    expect(occursOnDay(e, "2025-06-10")).toBe(true);
    expect(occursOnDay(e, "2025-06-11")).toBe(false);
  });
  it("all-day events use an exclusive end", () => {
    const e = ev("a", [2025, 5, 10, 0, 0], [2025, 5, 12, 0, 0], true);
    expect(["2025-06-10", "2025-06-11", "2025-06-12"].map((k) => occursOnDay(e, k))).toEqual([true, true, false]);
  });
  it("shows dots for each covered day and ignores deleted events", () => {
    const a = ev("a", [2025, 5, 10, 22, 0], [2025, 5, 11, 1, 0]);
    const b = { ...ev("b", [2025, 5, 20, 9, 0], [2025, 5, 20, 10, 0]), deleted: true };
    expect([...daysWithEvents([a, b], "2025-06-01", "2025-06-30")]).toEqual(["2025-06-10", "2025-06-11"]);
  });
});

describe("sorting", () => {
  it("lists all-day first, then by start time, then end", () => {
    const late = ev("late", [2025, 5, 10, 19, 0], [2025, 5, 10, 20, 0]);
    const early = ev("early", [2025, 5, 10, 8, 0], [2025, 5, 10, 9, 0]);
    const allDay = ev("all", [2025, 5, 10, 0, 0], [2025, 5, 11, 0, 0], true);
    const spanning = ev("span", [2025, 5, 9, 23, 0], [2025, 5, 10, 1, 0]);
    expect(eventsForDay([late, early, allDay, spanning], "2025-06-10").map((e) => e.id)).toEqual(["all", "span", "early", "late"]);
  });
});

describe("overlaps and day layout", () => {
  it("detects overlap but not touching events", () => {
    const a = ev("a", [2025, 5, 10, 9, 0], [2025, 5, 10, 10, 0]);
    expect(eventsOverlap(a, ev("b", [2025, 5, 10, 9, 30], [2025, 5, 10, 11, 0]))).toBe(true);
    expect(eventsOverlap(a, ev("c", [2025, 5, 10, 10, 0], [2025, 5, 10, 11, 0]))).toBe(false);
  });
  it("puts overlapping events in side-by-side columns and clips to the day", () => {
    const a = ev("a", [2025, 5, 10, 9, 0], [2025, 5, 10, 11, 0]);
    const b = ev("b", [2025, 5, 10, 10, 0], [2025, 5, 10, 12, 0]);
    const c = ev("c", [2025, 5, 10, 13, 0], [2025, 5, 10, 14, 0]);
    const night = ev("n", [2025, 5, 9, 23, 0], [2025, 5, 10, 1, 0]);
    const blocks = layoutDay([a, b, c, night], "2025-06-10");
    const by = Object.fromEntries(blocks.map((x) => [x.event.id, x]));
    expect([by.a.col, by.a.cols, by.b.col, by.b.cols]).toEqual([0, 2, 1, 2]);
    expect([by.c.col, by.c.cols]).toEqual([0, 1]);
    expect([by.n.startMin, by.n.endMin]).toEqual([0, 60]);
  });
  it("excludes all-day events from the timeline", () => {
    expect(layoutDay([ev("a", [2025, 5, 10, 0, 0], [2025, 5, 11, 0, 0], true)], "2025-06-10")).toEqual([]);
  });
});

describe("drafts", () => {
  it("requires a title and an end after the start", () => {
    const d = { ...newDraft("2025-06-10", new Date(2025, 5, 10, 8, 30)), title: " " };
    expect(validateDraft(d).title).toBeDefined();
    expect(validateDraft({ ...d, title: "x" })).toEqual({});
    expect(validateDraft({ ...d, title: "x", endTime: d.startTime }).end).toBeDefined();
    expect(validateDraft({ ...d, title: "x", endDate: "2025-06-09" }).end).toBeDefined();
    expect(validateDraft({ ...d, title: "x", allDay: true, endDate: "2025-06-10" })).toEqual({});
  });
  it("round-trips timed and all-day events through a draft", () => {
    const timed = eventFromDraft({ ...newDraft("2025-06-10", new Date(2025, 5, 10, 8, 30)), title: " Hi ", location: "Pier" });
    expect(timed.title).toBe("Hi");
    expect(draftFromEvent(timed)).toMatchObject({ title: "Hi", location: "Pier", startTime: "09:00", endTime: "10:00" });
    const allDay = eventFromDraft({ ...newDraft("2025-06-10"), title: "Trip", allDay: true, endDate: "2025-06-12" });
    expect(occursOnDay(allDay, "2025-06-12")).toBe(true);
    expect(occursOnDay(allDay, "2025-06-13")).toBe(false);
    expect(draftFromEvent(allDay)).toMatchObject({ allDay: true, startDate: "2025-06-10", endDate: "2025-06-12" });
  });
  it("keeps id and sync fields when editing", () => {
    const base = { ...eventFromDraft({ ...newDraft("2025-06-10"), title: "A" }), externalId: "x1", calendarId: "cal" };
    const edited = eventFromDraft({ ...draftFromEvent(base), title: "B" }, base, new Date(2030, 0, 1));
    expect(edited).toMatchObject({ id: base.id, externalId: "x1", calendarId: "cal", title: "B", deleted: false });
    expect(edited.lastModified).toBe(new Date(2030, 0, 1).toISOString());
  });
  it("labels times relative to the viewed day", () => {
    const e = ev("a", [2025, 5, 10, 22, 0], [2025, 5, 11, 2, 0]);
    expect([timeLabel(e, "2025-06-10"), timeLabel(e, "2025-06-11")]).toEqual(["22:00 →", "→ 02:00"]);
    expect(timeLabel(ev("b", [2025, 5, 10, 9, 0], [2025, 5, 10, 10, 30]), "2025-06-10")).toBe("09:00 – 10:30");
  });
});
