import { useEffect, useMemo, useState } from "react";
import { LocalStorageRepository } from "./data/localStorageRepository";
import { MockCalendarProvider } from "./data/calendarProvider";
import type { OrganizerEvent, SyncStatus, Task } from "./data/types";
import { CalendarScreen } from "./screens/CalendarScreen";
import { Placeholder } from "./screens/Placeholder";
import { TabBar, type Tab } from "./components/TabBar";

export function App() {
  const repo = useMemo(() => new LocalStorageRepository(), []);
  const calendar = useMemo(() => new MockCalendarProvider(), []);
  const [tab, setTab] = useState<Tab>("calendar");
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sync, setSync] = useState<SyncStatus>("synced");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([repo.listEvents(), repo.listTasks(), calendar.getSyncStatus()]).then(([e, t, s]) => {
      setEvents(e);
      setTasks(t);
      setSync(s);
      setReady(true);
    });
  }, [repo, calendar]);

  const toggleTask = (id: string) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(next);
    void repo.saveTasks(next);
  };

  return (
    <div className="screen" data-testid="app" data-ready={ready}>
      <div className="glow" />
      <main className="content">
        {tab === "calendar" && <CalendarScreen events={events} tasks={tasks} sync={sync} onToggleTask={toggleTask} />}
        {tab === "tasks" && <Placeholder title="Tasks" />}
        {tab === "notes" && <Placeholder title="Notes" />}
      </main>
      {tab === "calendar" && (
        <button className="fab" aria-label="Add" data-testid="add-button" onClick={() => alert("Adding events comes in a later ticket.")}>
          +
        </button>
      )}
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
