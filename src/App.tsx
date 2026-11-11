import { useEffect, useMemo, useState } from "react";
import { LocalStorageRepository } from "./data/localStorageRepository";
import { createCalendarProvider } from "./data/providerFactory";
import { useCalendarSync } from "./data/useCalendarSync";
import { SyncSheet } from "./components/SyncSheet";
import type { OrganizerEvent, Task } from "./data/types";
import { CalendarScreen } from "./screens/CalendarScreen";
import { Placeholder } from "./screens/Placeholder";
import { EventSheet } from "./components/EventSheet";
import { toKey } from "./data/dates";
import { TabBar, type Tab } from "./components/TabBar";

export function App() {
  const repo = useMemo(() => new LocalStorageRepository(), []);
  const calendar = useMemo(() => createCalendarProvider(), []);
  const [tab, setTab] = useState<Tab>("calendar");
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syncSheet, setSyncSheet] = useState(false);
  const [selected, setSelected] = useState(() => toKey(new Date()));
  const [sheet, setSheet] = useState<{ event?: OrganizerEvent } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([repo.listEvents(), repo.listTasks()]).then(([e, t]) => {
      setEvents(e);
      setTasks(t);
      setReady(true);
    });
  }, [repo]);

  const toggleTask = (id: string) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(next);
    void repo.saveTasks(next);
  };

  const persist = (next: OrganizerEvent[]) => {
    setEvents(next);
    void repo.saveEvents(next);
  };
  const sync = useCalendarSync({ provider: calendar, events, ready, replaceEvents: persist });
  const saveEvent = (e: OrganizerEvent) => {
    persist(events.some((x) => x.id === e.id) ? events.map((x) => (x.id === e.id ? e : x)) : [...events, e]);
    setSelected(toKey(new Date(e.start)));
    setSheet(null);
    sync.scheduleSync();
  };
  // Soft delete: keep a tombstone so a later sync can propagate the deletion.
  const deleteEvent = (e: OrganizerEvent) => {
    persist(events.map((x) => (x.id === e.id ? { ...x, deleted: true, lastModified: new Date().toISOString() } : x)));
    setSheet(null);
    sync.scheduleSync();
  };

  return (
    <div className="screen" data-testid="app" data-ready={ready}>
      <div className="glow" />
      <main className="content">
        {tab === "calendar" && (
          <CalendarScreen
            events={events}
            tasks={tasks}
            sync={sync.status}
            onOpenSync={() => setSyncSheet(true)}
            onToggleTask={toggleTask}
            selected={selected}
            onSelect={setSelected}
            onOpenEvent={(event) => setSheet({ event })}
          />
        )}
        {tab === "tasks" && <Placeholder title="Tasks" />}
        {tab === "notes" && <Placeholder title="Notes" />}
      </main>
      {tab === "calendar" && (
        <button className="fab" aria-label="Add" data-testid="add-button" onClick={() => setSheet({})}>
          +
        </button>
      )}
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
      {syncSheet && <SyncSheet sync={sync} onClose={() => setSyncSheet(false)} />}
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
