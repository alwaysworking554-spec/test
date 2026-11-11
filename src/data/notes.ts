import type { Note } from "./types";
import { MONTHS_SHORT } from "./dates";

const lines = (body: string) => body.split("\n").map((l) => l.trim()).filter(Boolean);

/** Title = first non-empty line. */
export function noteTitle(note: Pick<Note, "body">): string {
  return lines(note.body)[0] ?? "Untitled";
}

/** Preview = the lines after the title, joined, truncated. */
export function notePreview(note: Pick<Note, "body">, max = 90): string {
  const text = lines(note.body).slice(1).join(" ");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Most recently updated first. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function notesForDay(notes: Note[], dayKey: string): Note[] {
  return sortNotes(notes.filter((n) => n.date === dayKey));
}

export function isBlank(note: Pick<Note, "body">): boolean {
  return note.body.trim() === "";
}

export function formatUpdated(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
