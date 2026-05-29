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
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-7 border-b border-neutral-200/70 dark:border-neutral-800">
        {weekdays.map(d => (
          <div key={d} className="px-3 py-2 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(auto-fill,minmax(0,1fr))]" style={{ gridTemplateRows: `repeat(${totalCells / 7}, minmax(0, 1fr))` }}>
        {cells.map((day, i) => {
          const isToday = isSameDay(day, today);
          const inCurrentMonth = isSameMonth(day, currentDate);
          const dayEvents = events.filter(e => isSameDay(e.startTime, day));
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`group relative px-2 pt-1.5 pb-1 border-b border-r border-neutral-100 dark:border-neutral-900 cursor-pointer transition-colors ${
                isWeekend && inCurrentMonth ? 'bg-neutral-50/40 dark:bg-neutral-900/30' : ''
              } hover:bg-neutral-50 dark:hover:bg-neutral-900/60`}
              style={{ minHeight: 0 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`inline-flex items-center justify-center text-xs font-medium tabular-nums tracking-tight ${
                  isToday
                    ? 'w-5 h-5 rounded-full bg-accent text-white'
                    : inCurrentMonth
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-300 dark:text-neutral-700'
                }`}>
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventCard key={ev.id} event={ev} variant="dot" onClick={() => onEventClick(ev)} />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 px-1">
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
