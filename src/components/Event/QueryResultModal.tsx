import { useEffect } from 'react';
import { formatDate, formatTime } from '@/utils/dateUtils';
import type { QueryIntent } from '@/utils/llmParse';
import type { Event } from '@/types';

interface QueryResultModalProps {
  question: string;
  answer: string;
  intent: QueryIntent;
  matched: Event[];
  onClose: () => void;
  onEventClick: (event: Event) => void;
}

const INTENT_LABEL: Record<QueryIntent, string> = {
  list: '日程',
  count: '统计',
  conflict: '冲突检查',
  free: '空闲',
  next: '最近安排',
  when: '时间查询',
  other: '回答',
};

const lighten = (hex: string, amount = 0.22) => {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map(s => parseInt(s, 16));
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

export const QueryResultModal = ({
  question,
  answer,
  intent,
  matched,
  onClose,
  onEventClick,
}: QueryResultModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-neutral-900/25 dark:bg-black/45 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-panel w-full max-w-md max-h-[80vh] flex flex-col animate-pop-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[10px] font-semibold uppercase tracking-wider text-white"
            style={{
              background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            AI 回答
          </span>
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {INTENT_LABEL[intent]}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-pill text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            title="关闭 (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">
            “{question}”
          </div>
          <div className="text-lg leading-relaxed tracking-tight text-neutral-900 dark:text-neutral-100 font-medium">
            {answer}
          </div>
        </div>

        {matched.length > 0 && (
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1.5 border-t border-white/40 dark:border-white/8 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              相关事件 · {matched.length}
            </div>
            {matched.map(ev => (
              <button
                key={ev.id}
                onClick={() => {
                  onClose();
                  onEventClick(ev);
                }}
                className="glass-subtle w-full text-left rounded-card p-2.5 transition-transform hover:-translate-y-0.5"
                style={{ borderLeft: `3px solid ${ev.color}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate text-neutral-900 dark:text-neutral-100">
                    {ev.title}
                  </div>
                  <span
                    className="shrink-0 inline-block w-2 h-2 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${ev.color}, ${lighten(ev.color, 0.3)})` }}
                  />
                </div>
                <div className="mt-0.5 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {ev.allDay
                    ? `${formatDate(ev.startTime)} · 全天`
                    : `${formatDate(ev.startTime)} · ${formatTime(ev.startTime)} – ${formatTime(ev.endTime)}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
