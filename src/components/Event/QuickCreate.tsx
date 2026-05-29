import { useState } from 'react';
import { formatTime, formatDate } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface QuickCreateProps {
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onSave: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function QuickCreate({ startTime, endTime, onClose, onSave }: QuickCreateProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: '',
      startTime,
      endTime,
      allDay: false,
      color: '#0A84FF',
      colorId: 'blue',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 bg-neutral-900/15 dark:bg-black/30 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-panel w-full max-w-sm animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
            {formatDate(startTime)} · {formatTime(startTime)} – {formatTime(endTime)}
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="添加标题…"
            autoFocus
            className="w-full bg-transparent border-none outline-none text-base font-medium text-neutral-900 dark:text-neutral-100 placeholder-neutral-400/70 dark:placeholder-neutral-500"
          />

          <div className="mt-3 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="glass-pill h-8 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-200 rounded-pill"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-8 px-4 text-xs font-semibold text-white rounded-pill"
              style={{
                background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 14px -4px rgba(10,132,255,0.55)',
              }}
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
