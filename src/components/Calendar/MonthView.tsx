import { useCalendarStore } from '@/store';
import { getMonthStartDay, getDaysInMonth, isSameDay, isSameMonth } from '@/utils/dateUtils';
import EventCard from '../Event/EventCard';
import type { Event } from '@/types';

interface MonthViewProps {
  onEventClick: (event: Event) => void;
  onDayClick: (date: Date) => void;
}

export const MonthView = ({ onEventClick, onDayClick }: MonthViewProps) => {
  const { events, currentDate } = useCalendarStore();

  const startDay = getMonthStartDay(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const today = new Date();

  const offset = (startDay + 6) % 7;
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const firstCell = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1 - offset);

  const cells: Date[] = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);
    return d;
  });

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="flex-1 flex flex-col min-h-0 px-3 pb-3 pt-2">
      <div className="grid grid-cols-7 mb-1.5 px-2">
        {weekdays.map(d => (
          <div key={d} className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {d}
          </div>
        ))}
      </div>

      <div
        className="glass flex-1 grid grid-cols-7 rounded-panel p-1 gap-1 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${totalCells / 7}, minmax(0, 1fr))` }}
      >
        {cells.map((day, i) => {
          const isToday = isSameDay(day, today);
          const inCurrentMonth = isSameMonth(day, currentDate);
          const dayEvents = events.filter(e => isSameDay(e.startTime, day));
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`group relative px-1.5 pt-1.5 pb-1 rounded-card cursor-pointer transition-colors min-h-0 ${
                inCurrentMonth
                  ? isWeekend
                    ? 'bg-white/40 dark:bg-white/5'
                    : 'bg-white/55 dark:bg-white/4'
                  : 'bg-transparent'
              } hover:bg-white/80 dark:hover:bg-white/8`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold tabular-nums tracking-tight ${
                    isToday
                      ? 'w-5 h-5 rounded-full text-white'
                      : inCurrentMonth
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-400 dark:text-neutral-600'
                  }`}
                  style={isToday
                    ? { background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)', boxShadow: '0 4px 10px -3px rgba(10,132,255,0.6)' }
                    : undefined}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventCard key={ev.id} event={ev} variant="dot" onClick={() => onEventClick(ev)} />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 px-1">
                    +{dayEvents.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
