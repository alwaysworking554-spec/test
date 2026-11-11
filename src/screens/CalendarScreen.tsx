import { useState } from "react";
import type { Note, OrganizerEvent, SyncStatus, Task } from "../data/types";
import { homeTasks, countDone } from "../data/tasks";
import { noteTitle, notesForDay } from "../data/notes";
import { MONTHS_SHORT, WEEKDAYS, monthGrid, toKey, trimGrid } from "../data/dates";

interface Props {
  events: OrganizerEvent[];
  tasks: Task[];
  notes: Note[];
  sync: SyncStatus;
  onToggleTask: (id: string) => void;
}

const SYNC_LABEL: Record<SyncStatus, string> = { synced: "Synced", syncing: "Syncing", offline: "Offline" };

export function CalendarScreen({ events, tasks, notes, sync, onToggleTask }: Props) {
  const today = new Date();
  const todayKey = toKey(today);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(todayKey);

  const days = trimGrid(monthGrid(view.year, view.month), view.month);
  const eventDays = new Set(events.map((e) => e.date));
  const dayEvents = events.filter((e) => e.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const selDate = new Date(`${selected}T00:00:00`);
  const dayNotes = notesForDay(notes, selected);
  const todays = homeTasks(tasks, todayKey);
  const { done, total } = countDone(todays);

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  let touchX: number | null = null;

  return (
    <section
      data-testid="screen-calendar"
      onTouchStart={(e) => (touchX = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 60) shift(dx < 0 ? 1 : -1);
        touchX = null;
      }}
    >
      <header className="header">
        <h1 className="title" data-testid="month-title">
          {MONTHS_SHORT[view.month]}
          <span className="pink">.</span> {view.year}
        </h1>
        <div className="pill" data-testid="sync-pill">
          <span className="dot" />
          {SYNC_LABEL[sync]}
        </div>
      </header>

      <div className="subline" data-testid="selected-day">
        {WEEKDAYS[selDate.getDay()]} · {selDate.getDate()}
      </div>

      <div className="monthnav">
        <button aria-label="Previous month" data-testid="prev-month" onClick={() => shift(-1)}>‹</button>
        <button aria-label="Next month" data-testid="next-month" onClick={() => shift(1)}>›</button>
      </div>

      <div className="grid weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid days" data-testid="month-grid">
        {days.map((d) => {
          const key = toKey(d);
          const other = d.getMonth() !== view.month;
          const cls = ["day", other && "other", key === todayKey && "today", key === selected && "selected"].filter(Boolean).join(" ");
          return (
            <button key={key} className={cls} data-testid={`day-${key}`} onClick={() => setSelected(key)}>
              <span className="num">{d.getDate()}</span>
              {eventDays.has(key) && <span className="evdot" data-testid="event-dot" />}
            </button>
          );
        })}
      </div>

      <div className="section">
        <span>{selected === todayKey ? "Today" : "Events"}</span>
        <span className="count" data-testid="event-count">
          {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
        </span>
      </div>
      {dayEvents.map((e) => (
        <article className="card" key={e.id} data-testid="event-card">
          <div>
            <div className="card-title">{e.title}</div>
            <div className="card-sub">{e.subtitle}</div>
          </div>
          <div className="card-time">{e.time}</div>
        </article>
      ))}

      {dayNotes.map((n) => (
        <article className="card note" key={n.id} data-testid="note-row">
          <div className="card-title">{noteTitle(n)}</div>
          <span className="badge">Note</span>
        </article>
      ))}

      <div className="section">
        <span>Tasks</span>
        <span className="count" data-testid="task-count">
          {done} / {total}
        </span>
      </div>
      {todays.map((t) => (
        <label className={`task task-home${t.done ? " done" : ""}`} key={t.id} data-testid="task">
          <input type="checkbox" checked={t.done} onChange={() => onToggleTask(t.id)} />
          <span className="check" />
          <span className="task-label">{t.title}</span>
        </label>
      ))}
    </section>
  );
}
