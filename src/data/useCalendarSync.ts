import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarProvider } from "./calendarProvider";
import { loadSyncSettings, saveSyncSettings } from "./syncSettings";
import { mergeAfterSync, runSync, syncWindow } from "./syncLogic";
import type { ExternalCalendar, OrganizerEvent, PermissionState, SyncSettings, SyncStatus } from "./types";

interface Options {
  provider: CalendarProvider;
  events: OrganizerEvent[];
  ready: boolean;
  /** Replace the stored events (state + persistence). */
  replaceEvents: (next: OrganizerEvent[]) => void;
}

export interface CalendarSync {
  status: SyncStatus;
  permission: PermissionState;
  calendars: ExternalCalendar[];
  settings: SyncSettings;
  error?: string;
  providerName: string;
  syncNow: () => void;
  /** Debounced sync after a local edit. */
  scheduleSync: () => void;
  requestAccess: () => Promise<void>;
  openSettings: () => Promise<void>;
  chooseCalendar: (id: string) => void;
}

const same = (a: OrganizerEvent[], b: OrganizerEvent[]) => JSON.stringify(a) === JSON.stringify(b);

export function useCalendarSync({ provider, events, ready, replaceEvents }: Options): CalendarSync {
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [settings, setSettings] = useState<SyncSettings>(loadSyncSettings);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string>();

  const eventsRef = useRef(events);
  eventsRef.current = events;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const permissionRef = useRef(permission);
  permissionRef.current = permission;
  const replaceRef = useRef(replaceEvents);
  replaceRef.current = replaceEvents;
  const running = useRef(false);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateSettings = useCallback((patch: Partial<SyncSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    saveSyncSettings(next);
    setSettings(next);
  }, []);

  const doSync = useCallback(async () => {
    const calendarId = settingsRef.current.calendarId;
    if (permissionRef.current !== "granted" || !calendarId) return;
    if (running.current) {
      pending.current = true;
      return;
    }
    running.current = true;
    setSyncing(true);
    try {
      const snapshot = eventsRef.current;
      const result = await runSync(provider, snapshot, calendarId, syncWindow());
      const merged = mergeAfterSync(snapshot, eventsRef.current, result.events);
      if (!same(merged, eventsRef.current)) replaceRef.current(merged);
      if (result.error) setError(result.error.message || String(result.error));
      else {
        setError(undefined);
        updateSettings({ lastSyncedAt: new Date().toISOString() });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      running.current = false;
      setSyncing(false);
      if (pending.current) {
        pending.current = false;
        void doSync();
      }
    }
  }, [provider, updateSettings]);

  const loadCalendars = useCallback(async () => {
    const list = await provider.listCalendars();
    setCalendars(list);
    const chosen = settingsRef.current.calendarId;
    if (!chosen || !list.some((c) => c.id === chosen)) {
      const pick = list.find((c) => c.isDefault) ?? list[0];
      updateSettings({ calendarId: pick?.id });
    }
  }, [provider, updateSettings]);

  const refreshPermission = useCallback(
    async (state?: PermissionState) => {
      const p = state ?? (await provider.getPermission());
      permissionRef.current = p;
      setPermission(p);
      if (p === "granted") {
        try {
          await loadCalendars();
          await doSync();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    },
    [provider, loadCalendars, doSync],
  );

  // Launch (once local events are loaded).
  useEffect(() => {
    if (ready) void refreshPermission();
  }, [ready, refreshPermission]);

  // Foreground + external changes.
  useEffect(() => {
    if (!ready) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshPermission();
    };
    document.addEventListener("visibilitychange", onVisible);
    const off = provider.onChange(() => void doSync());
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      off();
    };
  }, [ready, provider, refreshPermission, doSync]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const scheduleSync = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void doSync(), 800);
  }, [doSync]);

  const requestAccess = useCallback(async () => {
    await refreshPermission(await provider.requestAccess());
  }, [provider, refreshPermission]);

  const chooseCalendar = useCallback(
    (id: string) => {
      updateSettings({ calendarId: id });
      void doSync();
    },
    [updateSettings, doSync],
  );

  let status: SyncStatus;
  if (permission !== "granted" || !settings.calendarId) status = "off";
  else if (syncing) status = "syncing";
  else if (error) status = "error";
  else status = "synced";

  return {
    status,
    permission,
    calendars,
    settings,
    error,
    providerName: provider.name,
    syncNow: () => void doSync(),
    scheduleSync,
    requestAccess,
    openSettings: () => provider.openSettings(),
    chooseCalendar,
  };
}
