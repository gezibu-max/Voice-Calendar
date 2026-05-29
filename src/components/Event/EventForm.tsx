import { useState, useEffect } from 'react';
import { EVENT_COLORS } from '@/utils/colors';
import type { Event } from '@/types';

interface EventFormProps {
  event?: Event | null;
  onSubmit: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const inputCls =
  'glass-subtle w-full px-3 h-9 rounded-pill text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all';

const labelCls = 'block text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1';

export const EventForm = ({ event, onSubmit, onCancel }: EventFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [colorId, setColorId] = useState('blue');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setStartTime(event.startTime.toISOString().slice(0, 16));
      setEndTime(event.endTime.toISOString().slice(0, 16));
      setAllDay(event.allDay);
      setColorId(event.colorId);
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const color = EVENT_COLORS.find(c => c.id === colorId)?.color || '#0A84FF';
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (allDay) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 0, 0);
    }
    onSubmit({
      title,
      description,
      startTime: start,
      endTime: end,
      allDay,
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
        className="w-full bg-transparent border-none outline-none text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 placeholder-neutral-400/70 dark:placeholder-neutral-500"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>开始</label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? startTime.slice(0, 10) : startTime}
            onChange={(e) => setStartTime(allDay ? `${e.target.value}T00:00` : e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>结束</label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={allDay ? endTime.slice(0, 10) : endTime}
            onChange={(e) => setEndTime(allDay ? `${e.target.value}T23:59` : e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>

      <label className="glass-subtle flex items-center justify-between gap-3 px-3 h-10 rounded-pill cursor-pointer">
        <span className="text-sm text-neutral-700 dark:text-neutral-200">全天事件</span>
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="peer sr-only"
          />
          <span className="w-9 h-5 rounded-pill bg-neutral-300 dark:bg-neutral-700 peer-checked:bg-accent transition-colors" />
          <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow peer-checked:translate-x-4 transition-transform" />
        </span>
      </label>

      <div>
        <label className={labelCls}>描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="添加描述（可选）"
          className={inputCls.replace('h-9', 'min-h-[72px] py-2').replace('rounded-pill', 'rounded-card')}
        />
      </div>

      <div>
        <label className={labelCls}>颜色</label>
        <div className="flex gap-2 flex-wrap">
          {EVENT_COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorId(c.id)}
              title={c.name}
              className={`w-7 h-7 rounded-full transition-transform ${
                colorId === c.id ? 'ring-2 ring-offset-2 dark:ring-offset-neutral-900 scale-110' : 'hover:scale-110'
              }`}
              style={{
                background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 10px -2px rgba(0,0,0,0.18)',
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
          className="glass-pill flex-1 h-10 rounded-pill text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          取消
        </button>
        <button
          type="submit"
          className="flex-1 h-10 rounded-pill text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -6px rgba(10,132,255,0.55)',
          }}
        >
          {event ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );
};
