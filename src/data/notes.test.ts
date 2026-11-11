import { describe, expect, it } from "vitest";
import { isBlank, notePreview, noteTitle, notesForDay, sortNotes } from "./notes";
import type { Note } from "./types";

const n = (id: string, body: string, updatedAt: number, date?: string): Note => ({ id, body, updatedAt, date });

describe("note helpers", () => {
  it("title is the first non-empty line, with a fallback", () => {
    expect(noteTitle({ body: "\n  Hello\nworld" })).toBe("Hello");
    expect(noteTitle({ body: "  " })).toBe("Untitled");
  });
  it("preview skips the title and truncates", () => {
    expect(notePreview({ body: "T\nline one\nline two" })).toBe("line one line two");
    expect(notePreview({ body: `T\n${"x".repeat(200)}` }, 10)).toHaveLength(10);
    expect(notePreview({ body: "only title" })).toBe("");
  });
  it("sorts by updatedAt desc without mutating", () => {
    const list = [n("a", "a", 1), n("b", "b", 3), n("c", "c", 2)];
    expect(sortNotes(list).map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(list[0].id).toBe("a");
  });
  it("filters by attached day", () => {
    const list = [n("a", "a", 1, "2026-06-10"), n("b", "b", 2), n("c", "c", 3, "2026-06-10")];
    expect(notesForDay(list, "2026-06-10").map((x) => x.id)).toEqual(["c", "a"]);
  });
  it("detects blank notes", () => {
    expect(isBlank({ body: " \n " })).toBe(true);
    expect(isBlank({ body: "x" })).toBe(false);
  });
});
