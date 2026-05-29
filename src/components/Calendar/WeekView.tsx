import { useEffect, useRef, useState } from 'react';
import { useCalendarStore } from '@/store';
import { useEvents } from '@/hooks/useEvents';
import { useDragDrop } from '@/hooks/useDragDrop';
import { getWeekDays, formatDayOfWeek, getHoursInDay, isSameDay, formatTime } from '@/utils/dateUtils';
import { layoutDayEvents } from '@/utils/layoutEvents';
import EventCard from '../Event/EventCard';
import type { Event } from '@/types';

interface WeekViewProps {
  onEventClick: (event: Event) => void;
  onQuickCreate: (startTime: Date, endTime: Date) => void;
}

const HOUR_HEIGHT = 48;
const COLUMN_GAP = 2;
const OVERFLOW_WIDTH = 28;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;

export const WeekView = ({ onEventClick, onQuickCreate }: WeekViewProps) => {
  const { events, currentDate } = useCalendarStore();
  const { updateEvent } = useEvents();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [overflowKey, setOverflowKey] = useState<string | null>(null);
  const [columnWidth, setColumnWidth] = useState(0);

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
    if (!overflowKey) return;
    const onDoc = () => setOverflowKey(null);
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, [overflowKey]);
  useEffect(() => {
    if (!gridRef.current) return;
    const measure = () => {
      if (!gridRef.current) return;
      // 总宽度减去左边 64px 时间列再除 7
      const w = gridRef.current.getBoundingClientRect().width;
      setColumnWidth((w - 64) / 7);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

  const weekDays = getWeekDays(currentDate);
  const hours = getHoursInDay();
  const allDayEventsByDay = weekDays.map(d =>
    events.filter(e => e.allDay && isSameDay(e.startTime, d)),
  );
  const hasAnyAllDay = allDayEventsByDay.some(arr => arr.length > 0);
  const timedEvents = events.filter(e => !e.allDay);

  const handleCellClick = (day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    onQuickCreate(start, end);
  };

  const todayIndex = weekDays.findIndex(d => isSameDay(d, now));
  const nowOffset = todayIndex >= 0 ? (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT : -1;

  const draggedEvent = drag.preview ? events.find(e => drag.isDragging(e.id)) : null;
  const draggedOriginalDayIndex = draggedEvent
    ? weekDays.findIndex(d => isSameDay(d, draggedEvent.startTime))
    : -1;
  const draggedTargetDayIndex = draggedEvent && drag.preview
    ? draggedOriginalDayIndex + drag.preview.dayOffset
    : -1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-[64px_repeat(7,1fr)] glass sticky top-0 z-10 rounded-none border-x-0 border-t-0">
        <div />
        {weekDays.map(day => {
          const isToday = isSameDay(day, now);
          return (
            <div key={day.toDateString()} className="px-3 py-3 border-l border-white/30 dark:border-white/8">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {formatDayOfWeek(day).replace('周', '')}
              </div>
              <div className={`mt-0.5 inline-flex items-center justify-center text-lg font-semibold tabular-nums tracking-tight ${
                isToday
                  ? 'w-7 h-7 rounded-full text-white shadow-glow-accent'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
                style={isToday ? { background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)' } : undefined}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {hasAnyAllDay && (
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-white/40 dark:border-white/8">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 pl-2 py-1.5">全天</div>
          {weekDays.map((day, di) => (
            <div key={day.toDateString()} className="px-1 py-1 border-l border-white/30 dark:border-white/8 flex flex-col gap-0.5 min-h-[32px]">
              {allDayEventsByDay[di].map(ev => (
                <EventCard key={ev.id} event={ev} variant="pill" onClick={() => onEventClick(ev)} />
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div ref={gridRef} className="grid grid-cols-[64px_repeat(7,1fr)]">
          <div className="border-r border-white/40 dark:border-white/8">
            {hours.map(h => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-1.5 right-2 text-[10px] tabular-nums text-neutral-500/80 dark:text-neutral-400/70">
                  {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, now);
            const { visible, overflows } = layoutDayEvents(timedEvents, day);
            return (
              <div key={day.toDateString()} className="relative border-l border-white/30 dark:border-white/8">
                {hours.map(h => (
                  <div
                    key={h}
                    onClick={() => handleCellClick(day, h)}
                    className="border-b border-white/30 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/4 transition-colors cursor-pointer"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {visible.map(({ event, startHour, durationHours, columnIndex, columnCount }) => {
                  const isThisDragging = drag.preview && drag.isDragging(event.id);
                  // 拖到了别的日子，就不在原日渲染（目标日会单独画 ghost）
                  if (isThisDragging && drag.preview!.dayOffset !== 0) return null;

                  const startH = isThisDragging
                    ? drag.preview!.startTime.getHours() + drag.preview!.startTime.getMinutes() / 60
                    : startHour;
                  const durH = isThisDragging
                    ? (drag.preview!.endTime.getTime() - drag.preview!.startTime.getTime()) / 3600_000
                    : durationHours;

                  const top = startH * HOUR_HEIGHT;
                  const height = Math.max(20, durH * HOUR_HEIGHT - 3);
                  const hasOverflow = overflows.some(o =>
                    startHour < o.startHour + o.durationHours && startHour + durationHours > o.startHour,
                  );
                  const reservedRight = hasOverflow ? OVERFLOW_WIDTH + COLUMN_GAP : 0;
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                      showTime={false}
                      dragging={!!isThisDragging}
                      onMoveStart={(e) => drag.begin(e, { event, mode: 'move', pxPerMinute: PX_PER_MINUTE, columnWidthPx: columnWidth })}
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

                {/* 跨日 ghost：当前列恰好是拖拽目标日，画一张半透明卡 */}
                {draggedEvent && drag.preview && draggedTargetDayIndex === dayIndex && drag.preview.dayOffset !== 0 && (() => {
                  const startH = drag.preview.startTime.getHours() + drag.preview.startTime.getMinutes() / 60;
                  const durH = (drag.preview.endTime.getTime() - drag.preview.startTime.getTime()) / 3600_000;
                  const top = startH * HOUR_HEIGHT;
                  const height = Math.max(20, durH * HOUR_HEIGHT - 3);
                  return (
                    <EventCard
                      event={draggedEvent}
                      onClick={() => {}}
                      showTime={false}
                      dragging
                      style={{
                        top,
                        height,
                        left: `${COLUMN_GAP}px`,
                        width: `calc(100% - ${COLUMN_GAP * 2}px)`,
                        zIndex: 50,
                      }}
                    />
                  );
                })()}

                {overflows.map(o => {
                  const open = overflowKey === `${day.toDateString()}-${o.key}`;
                  const top = o.startHour * HOUR_HEIGHT;
                  const height = Math.max(24, o.durationHours * HOUR_HEIGHT - 3);
                  return (
                    <div
                      key={o.key}
                      className="absolute"
                      style={{ top, height, right: COLUMN_GAP, width: OVERFLOW_WIDTH, zIndex: 25 }}
                    >
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() =>
                          setOverflowKey(open ? null : `${day.toDateString()}-${o.key}`)
                        }
                        className="glass-pill w-full h-full rounded-card text-[11px] font-semibold tabular-nums text-neutral-700 dark:text-neutral-200"
                        title={`还有 ${o.hidden.length} 个事件`}
                      >
                        +{o.hidden.length}
                      </button>
                      {open && (
                        <div
                          onMouseDown={e => e.stopPropagation()}
                          className="glass-strong absolute right-0 top-full mt-1.5 w-56 rounded-panel p-1.5 z-50 animate-pop-in"
                        >
                          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            其它 {o.hidden.length} 个事件
                          </div>
                          {o.hidden.map(ev => (
                            <button
                              key={ev.id}
                              onClick={() => {
                                setOverflowKey(null);
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

                {isToday && nowOffset >= 0 && dayIndex === todayIndex && (
                  <div className="absolute left-0 right-0 pointer-events-none z-40" style={{ top: nowOffset }}>
                    <div className="flex items-center">
                      <span className="w-2 h-2 -ml-1 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                      <span className="flex-1 h-px bg-gradient-to-r from-rose-500 via-pink-400 to-transparent" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {drag.preview && (
        <div
          className="pointer-events-none fixed z-50 glass-strong rounded-pill px-2.5 py-1 text-[11px] tabular-nums font-semibold text-neutral-800 dark:text-neutral-100 shadow-pop"
          style={{ left: drag.preview.pointerX + 12, top: drag.preview.pointerY + 12 }}
        >
          {formatTime(drag.preview.startTime)} – {formatTime(drag.preview.endTime)}
        </div>
      )}
    </div>
  );
};
