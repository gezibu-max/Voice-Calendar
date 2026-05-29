import { useEffect, useRef, useState } from 'react';
import { useCalendarStore } from '@/store';
import { getWeekDays, formatDayOfWeek, getHoursInDay, isSameDay } from '@/utils/dateUtils';
import { layoutDayEvents } from '@/utils/layoutEvents';
import EventCard from '../Event/EventCard';
import type { Event } from '@/types';

interface WeekViewProps {
  onEventClick: (event: Event) => void;
  onQuickCreate: (startTime: Date, endTime: Date) => void;
}

const HOUR_HEIGHT = 48;
const STACK_OFFSET = 6;

export const WeekView = ({ onEventClick, onQuickCreate }: WeekViewProps) => {
  const { events, currentDate } = useCalendarStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = HOUR_HEIGHT * 7;
  }, []);

  const weekDays = getWeekDays(currentDate);
  const hours = getHoursInDay();

  const handleCellClick = (day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    onQuickCreate(start, end);
  };

  const todayIndex = weekDays.findIndex(d => isSameDay(d, now));
  const nowOffset = todayIndex >= 0 ? (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT : -1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur sticky top-0 z-10">
        <div />
        {weekDays.map(day => {
          const isToday = isSameDay(day, now);
          return (
            <div key={day.toDateString()} className="px-3 py-3 border-l border-neutral-200/60 dark:border-neutral-800/80">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {formatDayOfWeek(day).replace('周', '')}
              </div>
              <div className={`mt-0.5 inline-flex items-center justify-center text-lg font-semibold tabular-nums tracking-tight ${
                isToday
                  ? 'w-7 h-7 rounded-full bg-accent text-white'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[64px_repeat(7,1fr)]">
          <div className="border-r border-neutral-200/60 dark:border-neutral-800/80">
            {hours.map(h => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-1.5 right-2 text-[10px] tabular-nums text-neutral-400 dark:text-neutral-500">
                  {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, now);
            const positioned = layoutDayEvents(events, day);
            return (
              <div key={day.toDateString()} className="relative border-l border-neutral-200/60 dark:border-neutral-800/80">
                {hours.map(h => (
                  <div
                    key={h}
                    onClick={() => handleCellClick(day, h)}
                    className="border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors cursor-pointer"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {positioned.map(({ event, startHour, durationHours, stackIndex, stackTotal }) => {
                  const top = startHour * HOUR_HEIGHT;
                  const height = Math.max(20, durationHours * HOUR_HEIGHT - 2);
                  const leftPx = 2 + stackIndex * STACK_OFFSET;
                  const rightPx = 2 + Math.max(0, stackTotal - 1 - stackIndex) * 0;
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                      showTime={false}
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

                {isToday && nowOffset >= 0 && dayIndex === todayIndex && (
                  <div className="absolute left-0 right-0 pointer-events-none z-40" style={{ top: nowOffset }}>
                    <div className="flex items-center">
                      <span className="w-2 h-2 -ml-1 rounded-full bg-rose-500" />
                      <span className="flex-1 h-px bg-rose-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
