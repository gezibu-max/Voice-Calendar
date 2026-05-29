import { useCalendarStore } from '@/store';
import type { CalendarView } from '@/types';

const views: { id: CalendarView; label: string }[] = [
  { id: 'day', label: '日' },
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
  { id: 'year', label: '年' },
];

export const ViewSwitcher = () => {
  const { view, setView } = useCalendarStore();

  return (
    <div className="glass-pill inline-flex p-0.5 rounded-pill h-8">
      {views.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          className={`px-3 h-7 rounded-pill text-xs font-medium transition-all ${
            view === id
              ? 'bg-white dark:bg-white/16 text-neutral-900 dark:text-white shadow-specular dark:shadow-specular-dark'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
