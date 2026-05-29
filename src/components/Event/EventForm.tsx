import { useState, useEffect } from 'react';
import { EVENT_COLORS } from '@/utils/colors';
import type { Event } from '@/types';

interface EventFormProps {
  event?: Event | null;
  onSubmit: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const inputCls =
  'w-full px-3 h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ' +
  'text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 ' +
  'focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-2 focus:ring-neutral-100 dark:focus:ring-neutral-800 ' +
  'transition-colors';

const labelCls = 'block text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1';

export const EventForm = ({ event, onSubmit, onCancel }: EventFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [colorId, setColorId] = useState('blue');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setStartTime(event.startTime.toISOString().slice(0, 16));
      setEndTime(event.endTime.toISOString().slice(0, 16));
      setColorId(event.colorId);
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const color = EVENT_COLORS.find(c => c.id === colorId)?.color || '#2563eb';
    onSubmit({
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      color,
      colorId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="添加标题"
        autoFocus
        required
        className="w-full bg-transparent border-none outline-none text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-700"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>开始</label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>结束</label>
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="添加描述（可选）"
          className={inputCls.replace('h-9', 'min-h-[72px] py-2')}
        />
      </div>

      <div>
        <label className={labelCls}>颜色</label>
        <div className="flex gap-1.5 flex-wrap">
          {EVENT_COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorId(c.id)}
              title={c.name}
              className={`w-6 h-6 rounded-full border transition-transform ${
                colorId === c.id
                  ? 'ring-2 ring-offset-2 dark:ring-offset-neutral-950 scale-105'
                  : 'border-transparent hover:scale-110'
              }`}
              style={{
                backgroundColor: c.color,
                ...(colorId === c.id ? ({ '--tw-ring-color': c.color } as React.CSSProperties) : {}),
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-md text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="flex-1 h-9 rounded-md text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
        >
          {event ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );
};
