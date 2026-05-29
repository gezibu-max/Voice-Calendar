const navItems = [
  { label: "日程", icon: "📅" },
  { label: "搜索", icon: "🔍" },
  { label: "标签", icon: "🏷️" },
  { label: "设置", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white p-4 md:block">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-card bg-brand text-sm font-semibold text-white">
          V
        </div>
        <span className="text-base font-semibold tracking-tight">
          Voice Calendar
        </span>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex w-full items-center gap-2 rounded-card px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
