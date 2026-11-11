import { formatUpdated, notePreview, noteTitle, sortNotes } from "../data/notes";
import type { Note } from "../data/types";

export function NotesScreen({ notes, onOpen }: { notes: Note[]; onOpen: (id: string) => void }) {
  return (
    <section data-testid="screen-notes">
      <h1 className="title">
        Notes<span className="pink">.</span>
      </h1>
      {notes.length === 0 && (
        <div className="empty" data-testid="notes-empty">
          <div className="empty-icon">✎</div>
          <div className="empty-title">No notes yet</div>
          <div className="empty-sub">Tap + to jot something down.</div>
        </div>
      )}
      <div style={{ marginTop: 18 }}>
        {sortNotes(notes).map((n) => (
          <button className="card note-card" key={n.id} data-testid="note-card" onClick={() => onOpen(n.id)}>
            <div>
              <div className="card-title">{noteTitle(n)}</div>
              {notePreview(n) && <div className="card-sub">{notePreview(n)}</div>}
            </div>
            <div className="card-time">{formatUpdated(n.updatedAt)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
