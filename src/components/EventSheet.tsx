import { useState } from "react";
import type { OrganizerEvent } from "../data/types";
import { draftFromEvent, eventFromDraft, newDraft, validateDraft, type EventDraft } from "../data/eventLogic";

interface Props {
  /** Event being edited; undefined creates a new one on `day`. */
  event?: OrganizerEvent;
  day: string;
  onSave: (e: OrganizerEvent) => void;
  onDelete: (e: OrganizerEvent) => void;
  onClose: () => void;
}

export function EventSheet({ event, day, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<EventDraft>(() => (event ? draftFromEvent(event) : newDraft(day)));
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const errors = validateDraft(draft);
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    setSubmitted(true);
    if (errors.title || errors.end) return;
    onSave(eventFromDraft(draft, event));
  };

  return (
    <div className="sheet-backdrop" data-testid="event-sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        data-testid="event-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <button type="button" className="link" data-testid="sheet-cancel" onClick={onClose}>Cancel</button>
          <h2>{event ? "Edit event" : "New event"}</h2>
          <button type="submit" className="link strong" data-testid="sheet-save">{event ? "Save" : "Add"}</button>
        </div>

        <input
          className="field big"
          placeholder="Title"
          aria-label="Title"
          data-testid="field-title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          autoFocus={!event}
        />
        {submitted && errors.title && <div className="error" data-testid="error-title">{errors.title}</div>}
        <input
          className="field"
          placeholder="Location"
          aria-label="Location"
          data-testid="field-location"
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
        />

        <label className="row toggle">
          <span>All-day</span>
          <input type="checkbox" data-testid="field-allday" checked={draft.allDay} onChange={(e) => set("allDay", e.target.checked)} />
          <span className="switch" />
        </label>

        <div className="row">
          <span>{draft.allDay ? "First day" : "Starts"}</span>
          <span className="pickers">
            <input type="date" aria-label="Start date" data-testid="field-start-date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
            {!draft.allDay && (
              <input type="time" aria-label="Start time" data-testid="field-start-time" value={draft.startTime} onChange={(e) => set("startTime", e.target.value)} />
            )}
          </span>
        </div>
        <div className="row">
          <span>{draft.allDay ? "Last day" : "Ends"}</span>
          <span className="pickers">
            <input type="date" aria-label="End date" data-testid="field-end-date" value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} />
            {!draft.allDay && (
              <input type="time" aria-label="End time" data-testid="field-end-time" value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} />
            )}
          </span>
        </div>
        {submitted && errors.end && <div className="error" data-testid="error-end">{errors.end}</div>}

        <textarea
          className="field"
          rows={3}
          placeholder="Notes"
          aria-label="Notes"
          data-testid="field-notes"
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
        />

        {event && !confirming && (
          <button type="button" className="danger" data-testid="delete-event" onClick={() => setConfirming(true)}>Delete event</button>
        )}
        {event && confirming && (
          <div className="confirm" data-testid="delete-confirm">
            <span>Delete “{event.title}”?</span>
            <button type="button" className="danger solid" data-testid="delete-confirm-yes" onClick={() => onDelete(event)}>Delete</button>
            <button type="button" className="link" data-testid="delete-confirm-no" onClick={() => setConfirming(false)}>Keep</button>
          </div>
        )}
      </form>
    </div>
  );
}
