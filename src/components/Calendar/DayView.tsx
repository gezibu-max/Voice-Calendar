import { useEffect, useRef, useState } from 'react';
import { useCalendarStore } from '@/store';
import { formatTime, getHoursInDay, isSameDay, formatDayOfWeek } from '@/utils/dateUtils';
import { layoutDayEvents } from '@/utils/layoutEvents';
import EventCard from '../Event/EventCard';
import type { Event } from '@/types';

interface DayViewProps {
  onEventClick: (event: Event) => void;
  onQuickCreate: (startTime: Date, endTime: Date) => void;
}

const HOUR_HEIGHT = 56;
const STACK_OFFSET = 10;

export const DayView = ({ onEventClick, onQuickCreate }: DayViewProps) => {
  const { events, currentDate } = useCalendarStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = HOUR_HEIGHT * 7;
    }
  }, []);

  const hours = getHoursInDay();
  const isToday = isSameDay(currentDate, now);
  const positioned = layoutDayEvents(events, currentDate);

  const handleHourClick = (hour: number) => {
    const start = new Date(currentDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    onQuickCreate(start, end);
  };

  const nowOffset = isToday ? (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT : -1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-3 border-b border-neutral-200/70 dark:border-neutral-800 flex items-baseline gap-3">
        <span className={`text-2xl font-semibold tracking-tight ${isToday ? 'text-accent' : 'text-neutral-900 dark:text-neutral-100'}`}>
          {currentDate.getDate()}
        </span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {formatDayOfWeek(currentDate)}
        </span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[64px_1fr]">
          <div className="border-r border-neutral-200/60 dark:border-neutral-800/80">
            {hours.map(h => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-1.5 right-2 text-[10px] tabular-nums text-neutral-400 dark:text-neutral-500">
                  {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            {hours.map(h => (
              <div
                key={h}
                onClick={() => handleHourClick(h)}
                className="border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors cursor-pointer"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}

            {positioned.map(({ event, startHour, durationHours, stackIndex, stackTotal }) => {
              const top = startHour * HOUR_HEIGHT;
              const height = Math.max(22, durationHours * HOUR_HEIGHT - 2);
              const leftPx = 4 + stackIndex * STACK_OFFSET;
              const rightPx = 4 + (stackTotal - 1 - stackIndex) * 0;
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  style={{
                    top,
                    height,
                    left: leftPx,
                    right: rightPx,
                    zIndex: 10 + stackIndex,
                  }}
                />
              );
            })}

            {nowOffset >= 0 && (
              <div className="absolute left-0 right-0 pointer-events-none z-40" style={{ top: nowOffset }}>
                <div className="flex items-center">
                  <span className="w-2 h-2 -ml-1 rounded-full bg-rose-500" />
                  <span className="flex-1 h-px bg-rose-500" />
                </div>
                <span className="absolute -top-2 left-1.5 text-[10px] tabular-nums text-rose-500 bg-white dark:bg-neutral-950 px-1">
                  {formatTime(now)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
