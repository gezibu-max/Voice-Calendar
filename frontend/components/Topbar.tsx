const views = ["日", "周", "月", "年"] as const;

export default function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-card border border-gray-200 px-3 py-1 text-sm text-ink transition-colors hover:bg-surface-muted"
        >
          今天
        </button>
        <span className="text-sm text-ink-muted">2026 年 5 月</span>
      </div>
      <div className="flex items-center gap-1 rounded-card border border-gray-200 p-0.5 text-sm">
        {views.map((view) => (
          <button
            key={view}
            type="button"
            className="rounded-card px-3 py-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            {view}
          </button>
        ))}
      </div>
    </header>
  );
}
