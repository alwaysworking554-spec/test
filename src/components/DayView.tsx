import { useEffect, useRef } from "react";
import type { OrganizerEvent } from "../data/types";
import { WEEKDAYS, MONTHS_SHORT } from "../data/dates";
import { addDays, dayStart, eventsForDay, layoutDay, timeLabel } from "../data/eventLogic";

export const HOUR_PX = 56;

interface Props {
  day: string;
  today: string;
  events: OrganizerEvent[];
  onDay: (key: string) => void;
  onBack: () => void;
  onOpen: (e: OrganizerEvent) => void;
}

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function DayView({ day, today, events, onDay, onBack, onOpen }: Props) {
  const d = dayStart(day);
  const allDay = eventsForDay(events, day).filter((e) => e.allDay);
  const blocks = layoutDay(events, day);
  const nowMin = day === today ? new Date().getHours() * 60 + new Date().getMinutes() : null;

  const ref = useRef<HTMLElement>(null);
  const firstMin = blocks.length ? Math.min(...blocks.map((b) => b.startMin)) : 8 * 60;
  useEffect(() => {
    const scroller = ref.current?.closest(".content");
    const tl = ref.current?.querySelector<HTMLElement>("[data-testid=timeline]");
    if (scroller && tl) scroller.scrollTop = Math.max(0, tl.offsetTop + (firstMin / 60) * HOUR_PX - 130);
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section data-testid="screen-day" ref={ref}>
      <div className="day-head">
      <header className="header">
        <button className="back" aria-label="Back to month" data-testid="day-back" onClick={onBack}>‹ Month</button>
        <div className="monthnav inline">
          <button aria-label="Previous day" data-testid="prev-day" onClick={() => onDay(addDays(day, -1))}>‹</button>
          <button aria-label="Next day" data-testid="next-day" onClick={() => onDay(addDays(day, 1))}>›</button>
        </div>
      </header>
      <h1 className="title" data-testid="day-title">
        {WEEKDAYS[d.getDay()].slice(0, 3)}
        <span className="pink">.</span> {MONTHS_SHORT[d.getMonth()]} {d.getDate()}
      </h1>
      </div>

      {allDay.length > 0 && (
        <div className="allday" data-testid="allday-strip">
          {allDay.map((e) => (
            <button key={e.id} className="allday-chip" data-testid="allday-event" onClick={() => onOpen(e)}>{e.title}</button>
          ))}
        </div>
      )}

      <div className="timeline" data-testid="timeline" style={{ height: 24 * HOUR_PX }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="hour" style={{ top: h * HOUR_PX }}>
            <span>{hourLabel(h)}</span>
          </div>
        ))}
        {nowMin !== null && <div className="nowline" style={{ top: (nowMin / 60) * HOUR_PX }} />}
        {blocks.map((b) => (
          <button
            key={b.event.id}
            className="block"
            data-testid="day-block"
            onClick={() => onOpen(b.event)}
            style={{
              top: (b.startMin / 60) * HOUR_PX,
              height: ((b.endMin - b.startMin) / 60) * HOUR_PX - 2,
              left: `calc(52px + (100% - 52px) * ${b.col / b.cols})`,
              width: `calc((100% - 52px) / ${b.cols} - 3px)`,
            }}
          >
            <span className="block-title">{b.event.title}</span>
            <span className="block-time">{timeLabel(b.event, day)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
