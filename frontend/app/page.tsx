import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function HomePage() {
  return (
    <div className="flex h-screen bg-surface-muted text-ink">
      <Sidebar />
      <main className="flex flex-1 flex-col">
        <Topbar />
        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-xl rounded-modal bg-white p-8 shadow-card">
            <h1 className="text-2xl font-semibold tracking-tight">
              Voice Calendar
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              以语音交互为核心、参考 Notion Calendar 风格的简约日程管理工具。
              当前版本为前端骨架，日 / 周 / 月 / 年视图、语音输入、事件 CRUD
              将在后续 PR 中陆续接入。
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink">
              <li>
                <span className="inline-block w-24 text-ink-muted">布局</span>
                左侧导航 + 顶部工具栏 + 主内容区
              </li>
              <li>
                <span className="inline-block w-24 text-ink-muted">主色</span>
                <span className="inline-block h-3 w-3 rounded-full bg-brand align-middle" />
                <span className="ml-2 align-middle">#2563eb</span>
              </li>
              <li>
                <span className="inline-block w-24 text-ink-muted">字体</span>
                Inter / 系统无衬线
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
