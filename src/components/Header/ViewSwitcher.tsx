import { useCalendarStore } from '@/store';
import type { CalendarView } from '@/types';

const views: { id: CalendarView; label: string; shortcut: string }[] = [
  { id: 'day', label: '日', shortcut: 'D' },
  { id: 'week', label: '周', shortcut: 'W' },
  { id: 'month', label: '月', shortcut: 'M' },
  { id: 'year', label: '年', shortcut: 'Y' },
];

export const ViewSwitcher = () => {
  const { view, setView } = useCalendarStore();

  return (
    <div className="inline-flex p-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
      {views.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          className={`px-2.5 h-7 rounded text-xs font-medium transition-all ${
            view === id
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-soft'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
