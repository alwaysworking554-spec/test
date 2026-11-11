import { useEffect, useMemo, useState } from "react";
import { LocalStorageRepository } from "./data/localStorageRepository";
import { MockCalendarProvider } from "./data/calendarProvider";
import type { Note, OrganizerEvent, SyncStatus, Task } from "./data/types";
import { isBlank } from "./data/notes";
import { CalendarScreen } from "./screens/CalendarScreen";
import { TasksScreen } from "./screens/TasksScreen";
import { NotesScreen } from "./screens/NotesScreen";
import { NoteEditor } from "./screens/NoteEditor";
import { TaskSheet } from "./components/TaskSheet";
import { EventSheet } from "./components/EventSheet";
import { toKey } from "./data/dates";
import { TabBar, type Tab } from "./components/TabBar";

export function App() {
  const repo = useMemo(() => new LocalStorageRepository(), []);
  const calendar = useMemo(() => new MockCalendarProvider(), []);
  const [tab, setTab] = useState<Tab>("calendar");
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sync, setSync] = useState<SyncStatus>("synced");
  const [selected, setSelected] = useState(() => toKey(new Date()));
  const [sheet, setSheet] = useState<{ event?: OrganizerEvent } | null>(null);
  const [ready, setReady] = useState(false);
  /** null = closed, "new" = creating, Task = editing */
  const [taskSheet, setTaskSheet] = useState<Task | "new" | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    void Promise.all([repo.listEvents(), repo.listTasks(), repo.listNotes(), calendar.getSyncStatus()]).then(([e, t, n, s]) => {
      setEvents(e);
      setTasks(t);
      setNotes(n);
      setSync(s);
      setReady(true);
    });
  }, [repo, calendar]);

  const commitTasks = (next: Task[]) => {
    setTasks(next);
    void repo.saveTasks(next);
  };
  const toggleTask = (id: string) => commitTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const saveTask = (task: Task) => {
    commitTasks(tasks.some((t) => t.id === task.id) ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task]);
    setTaskSheet(null);
  };
  const deleteTask = (id: string) => {
    commitTasks(tasks.filter((t) => t.id !== id));
    setTaskSheet(null);
  };

  // Notes are written through a functional update so autosave and close never clobber each other.
  const commitNotes = (update: (prev: Note[]) => Note[]) => {
    setNotes((prev) => {
      const next = update(prev);
      void repo.saveNotes(next);
      return next;
    });
  };
  const upsertNote = (note: Note) =>
    commitNotes((prev) => (prev.some((n) => n.id === note.id) ? prev.map((n) => (n.id === note.id ? note : n)) : [...prev, note]));
  const deleteNote = (id: string) => {
    commitNotes((prev) => prev.filter((n) => n.id !== id));
    setEditingNote(null);
  };
  const closeNote = (note: Note) => {
    if (isBlank(note)) commitNotes((prev) => prev.filter((n) => n.id !== note.id));
    else upsertNote(note);
    setEditingNote(null);
  };
  const newNote = () =>
    setEditingNote({ id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body: "", updatedAt: Date.now() });

  const fabAction = tab === "tasks" ? () => setTaskSheet("new") : tab === "notes" ? newNote : () => setSheet({});

  const persist = (next: OrganizerEvent[]) => {
    setEvents(next);
    void repo.saveEvents(next);
  };
  const saveEvent = (e: OrganizerEvent) => {
    persist(events.some((x) => x.id === e.id) ? events.map((x) => (x.id === e.id ? e : x)) : [...events, e]);
    setSelected(toKey(new Date(e.start)));
    setSheet(null);
  };
  // Soft delete: keep a tombstone so a later sync can propagate the deletion.
  const deleteEvent = (e: OrganizerEvent) => {
    persist(events.map((x) => (x.id === e.id ? { ...x, deleted: true, lastModified: new Date().toISOString() } : x)));
    setSheet(null);
  };

  return (
    <div className="screen" data-testid="app" data-ready={ready}>
      <div className="glow" />
      <main className="content">
        {tab === "calendar" && (
          <CalendarScreen
            events={events}
            tasks={tasks}
            notes={notes}
            sync={sync}
            onToggleTask={toggleTask}
            selected={selected}
            onSelect={setSelected}
            onOpenEvent={(event) => setSheet({ event })}
          />
        )}
        {tab === "tasks" && <TasksScreen tasks={tasks} onToggle={toggleTask} onEdit={setTaskSheet} />}
        {tab === "notes" && <NotesScreen notes={notes} onOpen={(id) => setEditingNote(notes.find((n) => n.id === id) ?? null)} />}
      </main>
      <button className="fab" aria-label="Add" data-testid="add-button" onClick={fabAction}>
        +
      </button>
      {sheet && (
        <EventSheet
          key={sheet.event?.id ?? "new"}
          event={sheet.event}
          day={selected}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setSheet(null)}
        />
      )}
      <TabBar tab={tab} onChange={setTab} />
      {taskSheet && (
        <TaskSheet task={taskSheet === "new" ? null : taskSheet} onSave={saveTask} onDelete={deleteTask} onClose={() => setTaskSheet(null)} />
      )}
      {editingNote && <NoteEditor key={editingNote.id} note={editingNote} onChange={upsertNote} onDelete={deleteNote} onClose={closeNote} />}
    </div>
  );
}
