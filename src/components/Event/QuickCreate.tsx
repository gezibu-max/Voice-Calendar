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
      color: '#2383E2',
      colorId: 'blue',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 bg-neutral-900/20 dark:bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-950 rounded-xl shadow-pop border border-neutral-200/70 dark:border-neutral-800 w-full max-w-sm animate-pop-in"
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
            className="w-full bg-transparent border-none outline-none text-base font-medium text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-700"
          />

          <div className="mt-3 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-7 px-3 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
