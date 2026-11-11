import { describe, expect, it } from "vitest";
import { countDone, groupTasks, homeTasks } from "./tasks";
import type { Task } from "./types";

const T = "2026-06-10";
const t = (id: string, o: Partial<Task> = {}): Task => ({ id, title: id, done: false, ...o });

describe("groupTasks", () => {
  const tasks = [
    t("late", { due: "2026-06-01" }),
    t("now", { due: T }),
    t("soon", { due: "2026-06-20" }),
    t("sooner", { due: "2026-06-12" }),
    t("whenever"),
    t("finished", { done: true, due: "2026-06-02" }),
  ];
  const g = groupTasks(tasks, T);
  it("buckets by due date and done", () => {
    expect(g.overdue.map((x) => x.id)).toEqual(["late"]);
    expect(g.today.map((x) => x.id)).toEqual(["now"]);
    expect(g.nodate.map((x) => x.id)).toEqual(["whenever"]);
    expect(g.done.map((x) => x.id)).toEqual(["finished"]);
  });
  it("sorts upcoming by due date", () => {
    expect(g.upcoming.map((x) => x.id)).toEqual(["sooner", "soon"]);
  });
  it("sorts ties by title", () => {
    const r = groupTasks([t("b"), t("a")], T);
    expect(r.nodate.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("homeTasks / countDone", () => {
  const tasks = [t("late", { due: "2026-06-01" }), t("now", { due: T, done: true }), t("soon", { due: "2026-06-20" }), t("none")];
  it("keeps overdue and today only, open first", () => {
    expect(homeTasks(tasks, T).map((x) => x.id)).toEqual(["late", "now"]);
  });
  it("counts done / total", () => {
    expect(countDone(tasks)).toEqual({ done: 1, total: 4 });
  });
});
