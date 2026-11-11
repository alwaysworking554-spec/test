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
}

export type SyncStatus = "synced" | "syncing" | "offline";
