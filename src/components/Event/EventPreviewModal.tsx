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

const accentBtn = 'h-9 px-4 rounded-pill text-xs font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed';
const accentStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -6px rgba(10,132,255,0.55)',
};

export const EventPreviewModal = ({ status, drafts, message, text, retrying = false, onConfirm, onRetry, onClose }: EventPreviewModalProps) => {
  const [items, setItems] = useState<(ParsedDraft & { selected: boolean })[]>(
    drafts.map(d => ({ ...d, selected: true }))
  );

  if (status !== 'ok' || drafts.length === 0) {
    const isError = status === 'error';
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4 bg-neutral-900/20 dark:bg-black/40 backdrop-blur-md animate-fade-in" onClick={onClose}>
        <div className="glass-strong rounded-panel w-full max-w-md animate-pop-in" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 text-white ${isError ? '' : ''}`}
                style={{
                  background: isError
                    ? 'linear-gradient(135deg, #FF6F91, #FF3B30)'
                    : 'linear-gradient(135deg, #FFD66B, #FF9F0A)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 14px -4px rgba(0,0,0,0.25)',
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  {isError ? (<><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>)
                            : (<><circle cx="12" cy="12" r="10" /><path d="M12 8v8M9 12h6" /></>)}
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {isError ? '解析失败' : '未识别到事件'}
                </h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {message || (isError ? '请稍后重试，或检查后端是否正常。' : '请尝试更具体的表述，比如"明天下午 3 点开会一小时"。')}
                </p>
                {text && (
                  <div className="glass-subtle mt-3 px-3 py-2 rounded-card text-xs text-neutral-700 dark:text-neutral-300 italic">
                    “{text}”
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="glass-pill h-9 px-4 text-xs font-medium text-neutral-700 dark:text-neutral-200 rounded-pill">
                关闭
              </button>
              {text && (
                <button
                  onClick={() => onRetry(text)}
                  disabled={retrying}
                  className={`${accentBtn} inline-flex items-center gap-1.5`}
                  style={accentStyle}
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-neutral-900/25 dark:bg-black/45 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong rounded-panel w-full max-w-lg max-h-[80vh] flex flex-col animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/40 dark:border-white/8">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            识别到 {drafts.length} 个事件
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-pill text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
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
              className={`group glass-subtle rounded-card transition-all overflow-hidden relative ${
                item.selected ? '' : 'opacity-40'
              }`}
              style={{
                borderLeft: `3px solid ${item.color}`,
              }}
            >
              <div className="flex items-start gap-3 p-3">
                <button
                  onClick={() => update(idx, { selected: !item.selected })}
                  className={`mt-1 w-4 h-4 shrink-0 rounded-md grid place-items-center transition-all ${
                    item.selected ? 'text-white' : 'border border-neutral-400/60 dark:border-neutral-500/60 bg-white/40 dark:bg-white/5'
                  }`}
                  style={item.selected
                    ? { background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }
                    : undefined}
                  aria-label={item.selected ? '取消选择' : '选择'}
                >
                  {item.selected && (
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <input
                    value={item.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                    className="w-full bg-transparent border-none outline-none text-sm font-semibold text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 rounded px-1 -mx-1 focus:bg-white/40 dark:focus:bg-white/8 transition-colors"
                    placeholder="事件标题"
                  />
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      value={toLocalInput(item.startTime)}
                      onChange={(e) => update(idx, { startTime: new Date(e.target.value) })}
                      className="text-[11px] tabular-nums glass-pill rounded-pill px-2 py-0.5 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <span className="text-[11px] text-neutral-400">→</span>
                    <input
                      type="datetime-local"
                      value={toLocalInput(item.endTime)}
                      onChange={(e) => update(idx, { endTime: new Date(e.target.value) })}
                      className="text-[11px] tabular-nums glass-pill rounded-pill px-2 py-0.5 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <div className="flex items-center gap-1 ml-1">
                      {EVENT_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => update(idx, { colorId: c.id, color: c.color })}
                          title={c.name}
                          className={`w-3.5 h-3.5 rounded-full transition-transform ${
                            item.colorId === c.id ? 'ring-2 ring-offset-1 dark:ring-offset-neutral-900 scale-110' : 'hover:scale-110'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)`,
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
                            ...(item.colorId === c.id ? ({ '--tw-ring-color': c.color } as React.CSSProperties) : {}),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 flex-wrap">
                    <span>{formatDate(item.startTime)} · {formatTime(item.startTime)} – {formatTime(item.endTime)}</span>
                    <span className="text-neutral-300 dark:text-neutral-600">·</span>
                    <span>{formatDuration(item.startTime, item.endTime)}</span>
                    {item.durationInferred && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-pill text-[10px] font-medium text-white cursor-help"
                        title={item.durationReason || 'AI 推测的时长'}
                        style={{
                          background: 'linear-gradient(135deg, #C77DFF, #9B5DE5)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
                        }}
                      >
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.663 17h4.673M12 3v1M5.6 5.6l.7.7M3 12h1M20 12h1M18.4 5.6l-.7.7M21 16a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                        </svg>
                        AI 估时
                      </span>
                    )}
                  </div>
                  {item.durationInferred && item.durationReason && (
                    <div className="mt-1 text-[10px] text-violet-600/80 dark:text-violet-300/80">
                      {item.durationReason}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => remove(idx)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 grid place-items-center rounded-pill text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
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

        <div className="px-5 py-3 flex items-center justify-between gap-2 border-t border-white/40 dark:border-white/8">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            将创建 <span className="font-semibold text-neutral-800 dark:text-neutral-100">{selectedCount}</span> 个事件
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="glass-pill h-9 px-4 text-xs font-medium text-neutral-700 dark:text-neutral-200 rounded-pill"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className={accentBtn}
              style={accentStyle}
            >
              全部创建
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
