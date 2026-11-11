import { useEffect, useRef, useState } from "react";
import type { Note } from "../data/types";
import { isBlank } from "../data/notes";

interface Props {
  note: Note;
  onChange: (note: Note) => void;
  onDelete: (id: string) => void;
  /** Called on close; blank notes are discarded by the caller. */
  onClose: (note: Note) => void;
}

const AUTOSAVE_MS = 400;

export function NoteEditor({ note, onChange, onDelete, onClose }: Props) {
  const [body, setBody] = useState(note.body);
  const [date, setDate] = useState(note.date ?? "");
  const [saved, setSaved] = useState(true);
  const latest = useRef({ body, date });
  latest.current = { body, date };
  const first = useRef(true);

  const build = (): Note => ({ ...note, body: latest.current.body, date: latest.current.date || undefined, updatedAt: Date.now() });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved(false);
    const h = setTimeout(() => {
      if (!isBlank(latest.current)) onChange(build());
      setSaved(true);
    }, AUTOSAVE_MS);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, date]);

  return (
    <div className="editor" data-testid="note-editor">
      <div className="editor-bar">
        <button className="tlink" data-testid="note-back" onClick={() => onClose(build())}>‹ Notes</button>
        <span className="editor-state" data-testid="note-saved">{saved ? "Saved" : "Saving…"}</span>
        <button className="tlink danger-text" data-testid="note-delete" onClick={() => onDelete(note.id)}>Delete</button>
      </div>
      <div className="trow editor-date">
        <label className="tfield-label">Day</label>
        <input className="tfield" type="date" data-testid="note-date" value={date} onChange={(e) => setDate(e.target.value)} />
        {date && <button className="tlink" onClick={() => setDate("")}>Clear</button>}
      </div>
      <textarea className="editor-body" data-testid="note-body" placeholder="Title on the first line…" autoFocus value={body} onChange={(e) => setBody(e.target.value)} />
    </div>
  );
}
