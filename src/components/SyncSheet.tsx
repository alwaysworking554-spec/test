import type { CalendarSync } from "../data/useCalendarSync";

const PERMISSION_LABEL = {
  granted: "Allowed",
  denied: "Denied",
  undetermined: "Not asked yet",
  unsupported: "Not available",
} as const;

function lastSynced(iso?: string): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SyncSheet({ sync, onClose }: { sync: CalendarSync; onClose: () => void }) {
  const granted = sync.permission === "granted";
  return (
    <div className="sheet-backdrop" data-testid="sync-sheet-backdrop" onClick={onClose}>
      <div className="sheet" data-testid="sync-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <span />
          <h2>Apple Calendar</h2>
          <button type="button" className="link strong" data-testid="sync-done" onClick={onClose}>Done</button>
        </div>

        <div className="row">
          <span>Calendar access</span>
          <span className={`sync-state ${granted ? "ok" : ""}`} data-testid="sync-permission">{PERMISSION_LABEL[sync.permission]}</span>
        </div>

        {sync.permission === "undetermined" && (
          <button type="button" className="sync-btn" data-testid="sync-allow" onClick={() => void sync.requestAccess()}>
            Allow calendar access
          </button>
        )}
        {sync.permission === "denied" && (
          <>
            <p className="sync-note" data-testid="sync-denied-note">
              Calendar access is turned off. Enable it for Miami Organizer in iOS Settings to sync.
            </p>
            <button type="button" className="sync-btn" data-testid="sync-open-settings" onClick={() => void sync.openSettings()}>
              Open iOS Settings
            </button>
          </>
        )}
        {sync.permission === "unsupported" && <p className="sync-note">Calendar sync is not available on this device.</p>}

        {granted && (
          <>
            <label className="row">
              <span>Sync with</span>
              <select
                className="sync-select"
                data-testid="sync-calendar"
                value={sync.settings.calendarId ?? ""}
                onChange={(e) => sync.chooseCalendar(e.target.value)}
              >
                {sync.calendars.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
            <div className="row">
              <span>Last synced</span>
              <span className="sync-state" data-testid="sync-last">{lastSynced(sync.settings.lastSyncedAt)}</span>
            </div>
            {sync.providerName === "mock" && (
              <p className="sync-note" data-testid="sync-mock-note">Demo mode: syncing with an in-memory calendar. Real sync runs in the iOS app.</p>
            )}
            {sync.error && <p className="sync-note error" data-testid="sync-error">{sync.error}</p>}
            <button type="button" className="sync-btn" data-testid="sync-now" disabled={sync.status === "syncing"} onClick={sync.syncNow}>
              {sync.status === "syncing" ? "Syncing…" : "Sync now"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
