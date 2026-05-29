import { useEffect, useRef, useState } from 'react';
import { useCalendarStore } from '@/store';
import { useEvents } from '@/hooks/useEvents';
import { useDragDrop } from '@/hooks/useDragDrop';
import { formatTime, getHoursInDay, isSameDay, formatDayOfWeek } from '@/utils/dateUtils';
import { layoutDayEvents } from '@/utils/layoutEvents';
import EventCard from '../Event/EventCard';
import type { Event } from '@/types';

interface DayViewProps {
  onEventClick: (event: Event) => void;
  onQuickCreate: (startTime: Date, endTime: Date) => void;
}

const HOUR_HEIGHT = 56;
const COLUMN_GAP = 4;
const OVERFLOW_WIDTH = 36;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;

export const DayView = ({ onEventClick, onQuickCreate }: DayViewProps) => {
  const { events, currentDate } = useCalendarStore();
  const { updateEvent } = useEvents();
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [overflowOpen, setOverflowOpen] = useState<string | null>(null);

  const drag = useDragDrop({
    onCommit: (ev, start, end) => {
      updateEvent(ev.id, { startTime: start, endTime: end });
    },
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = HOUR_HEIGHT * 7;
  }, []);

  useEffect(() => {
    if (!overflowOpen) return;
    const onDoc = () => setOverflowOpen(null);
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, [overflowOpen]);

  const hours = getHoursInDay();
  const isToday = isSameDay(currentDate, now);
  const allDayEvents = events.filter(e => e.allDay && isSameDay(e.startTime, currentDate));
  const timedEvents = events.filter(e => !e.allDay);
  const { visible, overflows } = layoutDayEvents(timedEvents, currentDate);

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
      <div className="px-6 py-3 flex items-baseline gap-3 border-b border-white/40 dark:border-white/8">
        <span className={`text-2xl font-semibold tracking-tight ${isToday ? 'text-accent' : 'text-neutral-900 dark:text-neutral-100'}`}>
          {currentDate.getDate()}
        </span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {formatDayOfWeek(currentDate)}
        </span>
      </div>

      {allDayEvents.length > 0 && (
        <div className="px-3 py-1.5 border-b border-white/40 dark:border-white/8 grid grid-cols-[64px_1fr] gap-2 items-start">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 pl-2 pt-0.5">全天</div>
          <div className="flex flex-wrap gap-1.5">
            {allDayEvents.map(ev => (
              <EventCard key={ev.id} event={ev} variant="pill" onClick={() => onEventClick(ev)} />
            ))}
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[64px_1fr]">
          <div className="border-r border-white/40 dark:border-white/8">
            {hours.map(h => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-1.5 right-2 text-[10px] tabular-nums text-neutral-500/80 dark:text-neutral-400/70">
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
                className="border-b border-white/30 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/4 transition-colors cursor-pointer"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}

            {visible.map(({ event, startHour, durationHours, columnIndex, columnCount }) => {
              const isThisDragging = drag.preview && drag.isDragging(event.id);
              const startH = isThisDragging
                ? drag.preview!.startTime.getHours() + drag.preview!.startTime.getMinutes() / 60
                : startHour;
              const durH = isThisDragging
                ? (drag.preview!.endTime.getTime() - drag.preview!.startTime.getTime()) / 3600_000
                : durationHours;

              const top = startH * HOUR_HEIGHT;
              const height = Math.max(22, durH * HOUR_HEIGHT - 3);
              const hasOverflow = overflows.some(o =>
                startHour < o.startHour + o.durationHours && startHour + durationHours > o.startHour,
              );
              const reservedRight = hasOverflow ? OVERFLOW_WIDTH + COLUMN_GAP : 0;
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  dragging={!!isThisDragging}
                  onMoveStart={(e) => drag.begin(e, { event, mode: 'move', pxPerMinute: PX_PER_MINUTE })}
                  onResizeStart={(e) => drag.begin(e, { event, mode: 'resize', pxPerMinute: PX_PER_MINUTE })}
                  style={{
                    top,
                    height,
                    left: `calc(${(columnIndex / columnCount) * 100}% + ${COLUMN_GAP}px)`,
                    width: `calc(${(1 / columnCount) * 100}% - ${COLUMN_GAP * 2}px - ${columnIndex === columnCount - 1 ? reservedRight : 0}px)`,
                    zIndex: isThisDragging ? 50 : 10 + columnIndex,
                  }}
                />
              );
            })}

            {drag.preview && (
              <div
                className="pointer-events-none absolute right-2 z-50 glass-strong rounded-pill px-2.5 py-1 text-[11px] tabular-nums font-semibold text-neutral-800 dark:text-neutral-100 shadow-pop"
                style={{ top: (drag.preview.startTime.getHours() + drag.preview.startTime.getMinutes() / 60) * HOUR_HEIGHT - 30 }}
              >
                {formatTime(drag.preview.startTime)} – {formatTime(drag.preview.endTime)}
              </div>
            )}

            {overflows.map(o => {
              const top = o.startHour * HOUR_HEIGHT;
              const height = Math.max(28, o.durationHours * HOUR_HEIGHT - 3);
              const open = overflowOpen === o.key;
              return (
                <div
                  key={o.key}
                  className="absolute"
                  style={{ top, height, right: COLUMN_GAP, width: OVERFLOW_WIDTH, zIndex: 25 }}
                >
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setOverflowOpen(open ? null : o.key)}
                    className="glass-pill w-full h-full rounded-card text-[12px] font-semibold tabular-nums text-neutral-700 dark:text-neutral-200"
                    title={`还有 ${o.hidden.length} 个事件`}
                  >
                    +{o.hidden.length}
                  </button>
                  {open && (
                    <div
                      onMouseDown={e => e.stopPropagation()}
                      className="glass-strong absolute right-0 top-full mt-1.5 w-64 rounded-panel p-1.5 z-50 animate-pop-in"
                    >
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        其它 {o.hidden.length} 个事件
                      </div>
                      {o.hidden.map(ev => (
                        <button
                          key={ev.id}
                          onClick={() => {
                            setOverflowOpen(null);
                            onEventClick(ev);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/60 dark:hover:bg-white/8 text-left"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: `linear-gradient(135deg, ${ev.color}, #fff)` }}
                          />
                          <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 shrink-0">
                            {formatTime(ev.startTime)}
                          </span>
                          <span className="text-[12px] truncate text-neutral-800 dark:text-neutral-100">
                            {ev.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {nowOffset >= 0 && (
              <div className="absolute left-0 right-0 pointer-events-none z-40" style={{ top: nowOffset }}>
                <div className="flex items-center">
                  <span className="w-2 h-2 -ml-1 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                  <span className="flex-1 h-px bg-gradient-to-r from-rose-500 via-pink-400 to-transparent" />
                </div>
                <span className="absolute -top-2 left-1.5 text-[10px] tabular-nums text-rose-500 glass-pill rounded-pill px-1.5 leading-4">
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
