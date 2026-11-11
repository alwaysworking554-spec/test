import type { SyncSettings } from "./types";

const KEY = "miami.sync.v1";

export function loadSyncSettings(): SyncSettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return typeof v === "object" && v !== null ? (v as SyncSettings) : {};
  } catch {
    return {};
  }
}

export function saveSyncSettings(s: SyncSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
