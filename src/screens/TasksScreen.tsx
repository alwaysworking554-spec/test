import type { Task } from "../data/types";
import { SECTION_LABEL, SECTION_ORDER, groupTasks } from "../data/tasks";
import { toKey } from "../data/dates";

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function TasksScreen({ tasks, onToggle, onEdit }: Props) {
  const groups = groupTasks(tasks, toKey(new Date()));
  return (
    <section data-testid="screen-tasks">
      <h1 className="title">
        Tasks<span className="pink">.</span>
      </h1>
      {tasks.length === 0 && (
        <div className="empty" data-testid="tasks-empty">
          <div className="empty-icon">☑</div>
          <div className="empty-title">Nothing to do</div>
          <div className="empty-sub">Tap + to add your first task.</div>
        </div>
      )}
      {SECTION_ORDER.map((s) =>
        groups[s].length === 0 ? null : (
          <div key={s} data-testid={`section-${s}`}>
            <div className="section">
              <span>{SECTION_LABEL[s]}</span>
              <span className="count">{groups[s].length}</span>
            </div>
            {groups[s].map((t) => (
              <div className={`task${t.done ? " done" : ""}`} key={t.id} data-testid="task-row">
                <button className="check" aria-label={t.done ? "Mark not done" : "Mark done"} data-testid="task-toggle" onClick={() => onToggle(t.id)} />
                <button className="task-main" data-testid="task-edit" onClick={() => onEdit(t)}>
                  <span className="task-label">{t.title}</span>
                  {(t.due || t.notes) && (
                    <span className="task-meta">{[t.due, t.notes?.split("\n")[0]].filter(Boolean).join(" · ")}</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        ),
      )}
    </section>
  );
}
