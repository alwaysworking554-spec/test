import { toKey } from "./dates";
import type { OrganizerEvent, Task } from "./types";

/** Seed relative to today so the home screen is never empty. */
export function seedEvents(): OrganizerEvent[] {
  const now = new Date();
  const day = (offset: number) => toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  return [
    { id: "e1", title: "Studio session", subtitle: "Wynwood Studio · 2h", date: day(0), time: "10:00" },
    { id: "e2", title: "Dinner at Joe's", subtitle: "Joe's Stone Crab · party of 4", date: day(0), time: "19:30" },
    { id: "e3", title: "Sunset run", subtitle: "South Pointe Park", date: day(2), time: "18:00" },
    { id: "e4", title: "Gallery opening", subtitle: "Design District", date: day(5), time: "20:00" },
    { id: "e5", title: "Dentist", subtitle: "Dr. Alvarez", date: day(-3), time: "09:15" },
  ];
}

export function seedTasks(): Task[] {
  return [
    { id: "t1", title: "Send mix to Carlos", done: true },
    { id: "t2", title: "Book flights to LA", done: false },
    { id: "t3", title: "Renew studio rental", done: false },
  ];
}
