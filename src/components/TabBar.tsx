export type Tab = "calendar" | "tasks" | "notes";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "tasks", label: "Tasks", icon: "☑" },
  { id: "notes", label: "Notes", icon: "✎" },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab${tab === t.id ? " active" : ""}`}
          data-testid={`tab-${t.id}`}
          aria-current={tab === t.id ? "page" : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="tab-icon">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
