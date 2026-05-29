import { useCalendarStore } from '@/store';
import { addDays, addWeeks, addMonths, addYears } from '@/utils/dateUtils';

export const DateNavigator = () => {
  const { currentDate, view, setCurrentDate } = useCalendarStore();

  const shift = (direction: 1 | -1) => {
    switch (view) {
      case 'day':   return setCurrentDate(addDays(currentDate, direction));
      case 'week':  return setCurrentDate(addWeeks(currentDate, direction));
      case 'month': return setCurrentDate(addMonths(currentDate, direction));
      case 'year':  return setCurrentDate(addYears(currentDate, direction));
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setCurrentDate(new Date())}
        className="h-7 px-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 rounded-md border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
      >
        今天
      </button>
      <button
        onClick={() => shift(-1)}
        className="w-7 h-7 grid place-items-center rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
        title="上一个"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={() => shift(1)}
        className="w-7 h-7 grid place-items-center rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
        title="下一个"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
};
