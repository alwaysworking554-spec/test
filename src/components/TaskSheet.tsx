import { useState } from "react";
import type { Task } from "../data/types";

interface Props {
  /** Existing task to edit, or null to create. */
  task: Task | null;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TaskSheet({ task, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [due, setDue] = useState(task?.due ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const canSave = title.trim() !== "";

  const save = () => {
    if (!canSave) return;
    onSave({
      id: task?.id ?? `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      done: task?.done ?? false,
      due: due || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="overlay" data-testid="task-sheet" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-title">{task ? "Edit task" : "New task"}</div>
        <input className="field" placeholder="Title" data-testid="task-title" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
        <label className="field-label">Due date</label>
        <div className="row">
          <input className="field" type="date" data-testid="task-due" value={due} onChange={(e) => setDue(e.target.value)} />
          {due && <button className="link" onClick={() => setDue("")}>Clear</button>}
        </div>
        <textarea className="field" rows={3} placeholder="Notes (optional)" data-testid="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="row">
          <button className="btn primary" data-testid="task-save" disabled={!canSave} onClick={save}>Save</button>
          <button className="btn" onClick={onClose}>Cancel</button>
          {task && <button className="btn danger" data-testid="task-delete" onClick={() => onDelete(task.id)}>Delete</button>}
        </div>
      </div>
    </div>
  );
}
