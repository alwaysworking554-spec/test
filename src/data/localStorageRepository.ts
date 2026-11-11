import type { Repository } from "./repository";
import type { OrganizerEvent, Task } from "./types";
import { devSeedEvents, seedTasks } from "./seed";

const EVENTS_KEY = "miami.events.v1";
const TASKS_KEY = "miami.tasks.v1";

function readArray<T>(key: string): T[] | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : null;
  } catch {
    return null;
  }
}

const isEvent = (e: unknown): e is OrganizerEvent =>
  typeof e === "object" && e !== null && typeof (e as OrganizerEvent).start === "string" && typeof (e as OrganizerEvent).end === "string";

export class LocalStorageRepository implements Repository {
  async listEvents(): Promise<OrganizerEvent[]> {
    const stored = readArray<unknown>(EVENTS_KEY);
    if (stored === null) {
      const seed = new URLSearchParams(location.search).get("seed") === "1";
      const data = seed ? devSeedEvents() : [];
      localStorage.setItem(EVENTS_KEY, JSON.stringify(data));
      return data;
    }
    // Scaffold-era entries (date/time/subtitle, sample data only) have no start/end: drop them.
    return stored.filter(isEvent);
  }
  async saveEvents(events: OrganizerEvent[]): Promise<void> {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }
  async listTasks(): Promise<Task[]> {
    const stored = readArray<Task>(TASKS_KEY);
    if (stored === null) {
      const data = seedTasks();
      localStorage.setItem(TASKS_KEY, JSON.stringify(data));
      return data;
    }
    return stored;
  }
  async saveTasks(tasks: Task[]): Promise<void> {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }
}
