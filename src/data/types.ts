export interface OrganizerEvent {
  id: string;
  title: string;
  subtitle: string;
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Local time, HH:mm */
  time: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  /** Local date, YYYY-MM-DD, optional */
  due?: string;
  notes?: string;
}

export interface Note {
  id: string;
  /** Full text; the title is its first line. */
  body: string;
  /** Optional day this note is attached to, YYYY-MM-DD */
  date?: string;
  /** Epoch ms */
  updatedAt: number;
}

export type SyncStatus = "synced" | "syncing" | "offline";
