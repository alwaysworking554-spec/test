import { useEffect, useState } from "react";
import { DayView } from "../components/DayView";
import type { OrganizerEvent, SyncStatus, Task } from "../data/types";
import { MONTHS_SHORT, WEEKDAYS, monthGrid, toKey, trimGrid } from "../data/dates";
import { daysWithEvents, eventsForDay, timeLabel } from "../data/eventLogic";

interface Props {
  events: OrganizerEvent[];
  tasks: Task[];
  sync: SyncStatus;
  onOpenSync: () => void;
  onToggleTask: (id: string) => void;
  selected: string;
  onSelect: (key: string) => void;
  onOpenEvent: (e: OrganizerEvent) => void;
}

const SYNC_LABEL: Record<SyncStatus, string> = { synced: "Synced", syncing: "Syncing", off: "Off", error: "Error" };

export function CalendarScreen({ events, tasks, sync, onOpenSync, onToggleTask, selected, onSelect, onOpenEvent }: Props) {
  const today = new Date();
  const todayKey = toKey(today);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [mode, setMode] = useState<"month" | "day">("month");

  const days = trimGrid(monthGrid(view.year, view.month), view.month);
  const eventDays = daysWithEvents(events, toKey(days[0]), toKey(days[days.length - 1]));
  const dayEvents = eventsForDay(events, selected);
  const selDate = new Date(`${selected}T00:00:00`);
  const done = tasks.filter((t) => t.done).length;

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  // Follow the selected day's month (day view arrows, saving an event on another date).
  useEffect(() => {
    const d = new Date(`${selected}T00:00:00`);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }, [selected]);

  if (mode === "day") {
    return <DayView day={selected} today={todayKey} events={events} onDay={onSelect} onBack={() => setMode("month")} onOpen={onOpenEvent} />;
  }

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
        <button className={`pill ${sync}`} data-testid="sync-pill" data-status={sync} aria-label="Apple Calendar sync settings" onClick={onOpenSync}>
          <span className="dot" />
          {SYNC_LABEL[sync]}
        </button>
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
            <button key={key} className={cls} data-testid={`day-${key}`} onClick={() => onSelect(key)}>
              <span className="num">{d.getDate()}</span>
              {eventDays.has(key) && <span className="evdot" data-testid="event-dot" />}
            </button>
          );
        })}
      </div>

      <div className="section">
        <span>{selected === todayKey ? "Today" : "Events"}</span>
        <span>
          <button className="viewday" data-testid="open-day-view" onClick={() => setMode("day")}>Day view ›</button>
          <span className="count" data-testid="event-count">
            {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
          </span>
        </span>
      </div>
      {dayEvents.length === 0 && <div className="placeholder" data-testid="no-events">Nothing planned. Tap + to add an event.</div>}
      {dayEvents.map((e) => (
        <button className="card" key={e.id} data-testid="event-card" onClick={() => onOpenEvent(e)}>
          <div>
            <div className="card-title">{e.title}</div>
            {e.location && <div className="card-sub">{e.location}</div>}
          </div>
          <div className="card-time">{timeLabel(e, selected)}</div>
        </button>
      ))}

      <div className="section">
        <span>Tasks</span>
        <span className="count" data-testid="task-count">
          {done} / {tasks.length}
        </span>
      </div>
      {tasks.map((t) => (
        <label className={`task${t.done ? " done" : ""}`} key={t.id} data-testid="task">
          <input type="checkbox" checked={t.done} onChange={() => onToggleTask(t.id)} />
          <span className="check" />
          <span className="task-label">{t.title}</span>
        </label>
      ))}
    </section>
  );
}
