import type { OrganizerEvent, Task } from "./types";

/** Optional dev seed: load the app with `?seed=1` while storage has no events. Not used in normal launches. */
export function devSeedEvents(): OrganizerEvent[] {
  const now = new Date();
  const mk = (id: string, title: string, offset: number, h: number, m: number, mins: number, location?: string): OrganizerEvent => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m);
    return {
      id,
      title,
      location,
      start: start.toISOString(),
      end: new Date(start.getTime() + mins * 60000).toISOString(),
      allDay: false,
      lastModified: now.toISOString(),
      deleted: false,
    };
  };
  return [
    mk("e1", "Studio session", 0, 10, 0, 120, "Wynwood Studio"),
    mk("e2", "Dinner at Joe's", 0, 19, 30, 90, "Joe's Stone Crab"),
    mk("e3", "Sunset run", 2, 18, 0, 45, "South Pointe Park"),
    mk("e4", "Gallery opening", 5, 20, 0, 120, "Design District"),
  ];
}

export function seedTasks(): Task[] {
  return [
    { id: "t1", title: "Send mix to Carlos", done: true },
    { id: "t2", title: "Book flights to LA", done: false },
    { id: "t3", title: "Renew studio rental", done: false },
  ];
}
