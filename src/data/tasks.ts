import type { Task } from "./types";

export type TaskSection = "overdue" | "today" | "upcoming" | "nodate" | "done";
export const SECTION_ORDER: TaskSection[] = ["overdue", "today", "upcoming", "nodate", "done"];
export const SECTION_LABEL: Record<TaskSection, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  nodate: "No date",
  done: "Done",
};

/** Due date ascending (undated last), then title. */
function byDueThenTitle(a: Task, b: Task): number {
  if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
  if (a.due && !b.due) return -1;
  if (!a.due && b.due) return 1;
  return a.title.localeCompare(b.title);
}

export function sectionOf(task: Task, todayKey: string): TaskSection {
  if (task.done) return "done";
  if (!task.due) return "nodate";
  if (task.due < todayKey) return "overdue";
  if (task.due === todayKey) return "today";
  return "upcoming";
}

/** Group tasks into sections (all five keys always present), each sorted. Done: most recent due first. */
export function groupTasks(tasks: Task[], todayKey: string): Record<TaskSection, Task[]> {
  const out: Record<TaskSection, Task[]> = { overdue: [], today: [], upcoming: [], nodate: [], done: [] };
  for (const t of tasks) out[sectionOf(t, todayKey)].push(t);
  for (const k of SECTION_ORDER) out[k].sort(byDueThenTitle);
  out.done.sort((a, b) => -byDueThenTitle(a, b));
  return out;
}

/** Tasks for the home screen: overdue + due today, plus done tasks that were due today or earlier. */
export function homeTasks(tasks: Task[], todayKey: string): Task[] {
  return tasks
    .filter((t) => (t.due ? t.due <= todayKey : false))
    .sort((a, b) => Number(a.done) - Number(b.done) || byDueThenTitle(a, b));
}

export function countDone(tasks: Task[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
}
