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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {months.map(month => {
          const isCurrentMonth = isSameMonth(month, currentDate);
          const daysInMonth = getDaysInMonth(month);
          const startDay = (getMonthStartDay(month) + 6) % 7;
          const cellsCount = Math.ceil((startDay + daysInMonth) / 7) * 7;

          return (
            <button
              key={month.toDateString()}
              onClick={() => onMonthClick(month)}
              className={`glass text-left p-4 rounded-panel transition-transform hover:-translate-y-0.5 ${
                isCurrentMonth ? 'ring-2 ring-accent/50' : ''
              }`}
            >
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {month.toLocaleDateString('zh-CN', { month: 'long' })}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
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
                      className={`h-5 grid place-items-center text-[10px] tabular-nums rounded-md relative ${
                        isToday
                          ? 'text-white font-semibold'
                          : hasEvent
                            ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                            : 'text-neutral-500 dark:text-neutral-500'
                      }`}
                      style={isToday
                        ? { background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)' }
                        : undefined}
                    >
                      {dayNum}
                      {hasEvent && !isToday && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
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
