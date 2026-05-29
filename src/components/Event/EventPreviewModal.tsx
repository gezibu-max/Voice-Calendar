import { useState } from 'react';
import { EVENT_COLORS } from '@/utils/colors';
import { formatDate, formatTime } from '@/utils/dateUtils';
import type { ParsedDraft, ParseStatus } from '@/utils/llmParse';

interface EventPreviewModalProps {
  status: ParseStatus;
  drafts: ParsedDraft[];
  message?: string;
  text: string;
  retrying?: boolean;
  onConfirm: (drafts: ParsedDraft[]) => void;
  onRetry: (text: string) => void;
  onClose: () => void;
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDuration = (start: Date, end: Date): string => {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} 小时`;
  if (remainder === 30) return `${hours}.5 小时`;
  return `${hours} 小时 ${remainder} 分`;
};

export const EventPreviewModal = ({ status, drafts, message, text, retrying = false, onConfirm, onRetry, onClose }: EventPreviewModalProps) => {
  const [items, setItems] = useState<(ParsedDraft & { selected: boolean })[]>(
    drafts.map(d => ({ ...d, selected: true }))
  );

  if (status !== 'ok' || drafts.length === 0) {
    const isError = status === 'error';
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4 bg-neutral-900/30 dark:bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-neutral-950 rounded-xl shadow-pop border border-neutral-200/70 dark:border-neutral-800 w-full max-w-md animate-pop-in" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                isError
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isError ? (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v8M9 12h6" />
                    </>
                  )}
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {isError ? '解析失败' : '未识别到事件'}
                </h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {message || (isError ? '请稍后重试，或检查后端是否正常。' : '请尝试更具体的表述，比如"明天下午 3 点开会一小时"。')}
                </p>
                {text && (
                  <div className="mt-3 px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 italic">
                    “{text}”
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-1.5">
              <button onClick={onClose} className="h-8 px-3 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md transition-colors">
                关闭
              </button>
              {text && (
                <button
                  onClick={() => onRetry(text)}
                  disabled={retrying}
                  className="h-8 px-3 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-200 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {retrying && (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {retrying ? '重试中…' : '重新解析'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const update = (idx: number, patch: Partial<typeof items[number]>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const remove = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const selectedCount = items.filter(i => i.selected).length;

  const handleConfirm = () => {
    const chosen = items
      .filter(i => i.selected)
      .map(({ selected: _selected, ...rest }) => rest);
    onConfirm(chosen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-neutral-900/30 dark:bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-950 rounded-xl shadow-pop border border-neutral-200/70 dark:border-neutral-800 w-full max-w-lg max-h-[80vh] flex flex-col animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            识别到 {drafts.length} 个事件
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`group rounded-lg border transition-all ${
                item.selected
                  ? 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950'
                  : 'border-dashed border-neutral-200 dark:border-neutral-800 opacity-50'
              }`}
            >
              <div className="flex items-start gap-3 p-3">
                <button
                  onClick={() => update(idx, { selected: !item.selected })}
                  className={`mt-1 w-4 h-4 shrink-0 rounded border grid place-items-center transition-colors ${
                    item.selected ? 'border-transparent' : 'border-neutral-300 dark:border-neutral-700 bg-transparent'
                  }`}
                  style={item.selected ? { backgroundColor: item.color } : undefined}
                  aria-label={item.selected ? '取消选择' : '选择'}
                >
                  {item.selected && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <input
                    value={item.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                    className="w-full bg-transparent border-none outline-none text-sm font-medium text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-700 focus:ring-2 focus:ring-neutral-100 dark:focus:ring-neutral-800 rounded px-1 -mx-1"
                    placeholder="事件标题"
                  />
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      value={toLocalInput(item.startTime)}
                      onChange={(e) => update(idx, { startTime: new Date(e.target.value) })}
                      className="text-[11px] tabular-nums bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded px-1.5 py-0.5 text-neutral-700 dark:text-neutral-300 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-400">→</span>
                    <input
                      type="datetime-local"
                      value={toLocalInput(item.endTime)}
                      onChange={(e) => update(idx, { endTime: new Date(e.target.value) })}
                      className="text-[11px] tabular-nums bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded px-1.5 py-0.5 text-neutral-700 dark:text-neutral-300 focus:outline-none"
                    />
                    <div className="flex items-center gap-1 ml-1">
                      {EVENT_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => update(idx, { colorId: c.id, color: c.color })}
                          title={c.name}
                          className={`w-3 h-3 rounded-full transition-transform ${
                            item.colorId === c.id ? 'ring-2 ring-offset-1 dark:ring-offset-neutral-950 scale-110' : 'hover:scale-110'
                          }`}
                          style={{
                            backgroundColor: c.color,
                            ...(item.colorId === c.id ? ({ '--tw-ring-color': c.color } as React.CSSProperties) : {}),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <span>{formatDate(item.startTime)} · {formatTime(item.startTime)} – {formatTime(item.endTime)}</span>
                    <span className="text-neutral-300 dark:text-neutral-600">·</span>
                    <span>{formatDuration(item.startTime, item.endTime)}</span>
                    {item.durationInferred && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[10px] bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300 cursor-help"
                        title={item.durationReason || 'AI 推测的时长'}
                      >
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.663 17h4.673M12 3v1M5.6 5.6l.7.7M3 12h1M20 12h1M18.4 5.6l-.7.7M21 16a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                        </svg>
                        AI 估时
                      </span>
                    )}
                  </div>
                  {item.durationInferred && item.durationReason && (
                    <div className="mt-0.5 text-[10px] text-violet-600/70 dark:text-violet-300/70">
                      {item.durationReason}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => remove(idx)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 grid place-items-center rounded text-neutral-400 hover:text-rose-500 transition-all"
                  title="删除"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-2 bg-neutral-50/60 dark:bg-neutral-900/40">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            将创建 <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedCount}</span> 个事件
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="h-8 px-3 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="h-8 px-3 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              全部创建
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
