import type { Note, OrganizerEvent, Task } from "./types";

/** Storage seam: swap the implementation (IndexedDB, SQLite, ...) without touching the UI. */
export interface Repository {
  listEvents(): Promise<OrganizerEvent[]>;
  saveEvents(events: OrganizerEvent[]): Promise<void>;
  listTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
  listNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
}
