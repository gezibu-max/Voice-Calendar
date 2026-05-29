import type { Event } from '@/types';

export interface PositionedEvent {
  event: Event;
  /** 起始小时（含分钟小数），相对 0:00 */
  startHour: number;
  /** 时长，小时 */
  durationHours: number;
  /** 同一重叠组里的索引，0 = 最底层 */
  stackIndex: number;
  /** 该组总数 */
  stackTotal: number;
}

/**
 * 把一天的事件按时间排序后按"重叠组"分组，给每个事件分配 stackIndex。
 *
 * 重叠定义：A.end > B.start && B.end > A.start。
 * 一组里的事件按开始时间升序，同时间则按结束时间升序，stackIndex 递增。
 */
export const layoutDayEvents = (
  events: Event[],
  day: Date,
): PositionedEvent[] => {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = dayStart + 24 * 3600_000;

  const sliced = events
    .filter(e => {
      const s = new Date(e.startTime).getTime();
      const t = new Date(e.endTime).getTime();
      return t > dayStart && s < dayEnd;
    })
    .map(e => {
      const s = Math.max(new Date(e.startTime).getTime(), dayStart);
      const t = Math.min(new Date(e.endTime).getTime(), dayEnd);
      return { event: e, s, t };
    })
    .sort((a, b) => a.s - b.s || a.t - b.t);

  const result: PositionedEvent[] = [];
  let group: typeof sliced = [];
  let groupEnd = -Infinity;

  const flush = () => {
    const total = group.length;
    group.forEach((it, idx) => {
      const startHour = (it.s - dayStart) / 3600_000;
      const durationHours = Math.max(0.25, (it.t - it.s) / 3600_000);
      result.push({
        event: it.event,
        startHour,
        durationHours,
        stackIndex: idx,
        stackTotal: total,
      });
    });
    group = [];
    groupEnd = -Infinity;
  };

  for (const it of sliced) {
    if (it.s < groupEnd) {
      group.push(it);
      groupEnd = Math.max(groupEnd, it.t);
    } else {
      flush();
      group.push(it);
      groupEnd = it.t;
    }
  }
  flush();
  return result;
};
