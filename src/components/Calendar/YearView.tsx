import { useCalendarStore } from '@/store';
import { getMonths, isSameMonth, isSameDay, getDaysInMonth, getMonthStartDay } from '@/utils/dateUtils';

interface YearViewProps {
  onMonthClick: (date: Date) => void;
}

export const YearView = ({ onMonthClick }: YearViewProps) => {
  const { events, currentDate } = useCalendarStore();
  const months = getMonths();
  const today = new Date();
  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-8 max-w-6xl mx-auto">
        {months.map(month => {
          const isCurrentMonth = isSameMonth(month, currentDate);
          const daysInMonth = getDaysInMonth(month);
          const startDay = (getMonthStartDay(month) + 6) % 7;
          const cellsCount = Math.ceil((startDay + daysInMonth) / 7) * 7;

          return (
            <button
              key={month.toDateString()}
              onClick={() => onMonthClick(month)}
              className={`text-left p-3 rounded-md border transition-all ${
                isCurrentMonth
                  ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-900/40'
                  : 'border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {month.toLocaleDateString('zh-CN', { month: 'long' })}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {month.getFullYear()}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {weekdays.map(w => (
                  <div key={w} className="h-5 text-[10px] text-neutral-400 dark:text-neutral-500 grid place-items-center">
                    {w}
                  </div>
                ))}
                {Array.from({ length: cellsCount }, (_, i) => {
                  const dayNum = i - startDay + 1;
                  if (dayNum < 1 || dayNum > daysInMonth) {
                    return <div key={i} className="h-5" />;
                  }
                  const day = new Date(month.getFullYear(), month.getMonth(), dayNum);
                  const isToday = isSameDay(day, today);
                  const hasEvent = events.some(e => isSameDay(e.startTime, day));

                  return (
                    <div
                      key={i}
                      className={`h-5 grid place-items-center text-[10px] tabular-nums rounded-sm ${
                        isToday
                          ? 'bg-accent text-white font-medium'
                          : hasEvent
                            ? 'text-neutral-900 dark:text-neutral-100 font-medium relative'
                            : 'text-neutral-500 dark:text-neutral-500'
                      }`}
                    >
                      {dayNum}
                      {hasEvent && !isToday && (
                        <span className="absolute bottom-0 w-1 h-1 rounded-full bg-accent" />
                      )}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
