import type { Repository } from "./repository";
import type { Note, OrganizerEvent, Task } from "./types";
import { seedEvents } from "./seed";

const EVENTS_KEY = "miami.events.v1";
const TASKS_KEY = "miami.tasks.v1";
const NOTES_KEY = "miami.notes.v1";

function read<T>(key: string, seed: () => T[]): T[] {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    // First launch (empty storage): seed sample data.
    const data = seed();
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return seed();
  }
}

export class LocalStorageRepository implements Repository {
  async listEvents(): Promise<OrganizerEvent[]> {
    return read(EVENTS_KEY, seedEvents);
  }
  async saveEvents(events: OrganizerEvent[]): Promise<void> {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }
  async listTasks(): Promise<Task[]> {
    return read(TASKS_KEY, () => []);
  }
  async saveTasks(tasks: Task[]): Promise<void> {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
  async listNotes(): Promise<Note[]> {
    return read(NOTES_KEY, () => []);
  }
  async saveNotes(notes: Note[]): Promise<void> {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }
}
