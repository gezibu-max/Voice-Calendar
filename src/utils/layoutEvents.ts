import type { Event } from '@/types';

const MAX_COLUMNS = 3;

export interface PositionedEvent {
  event: Event;
  /** 起始小时（含分钟小数），相对 0:00 */
  startHour: number;
  /** 时长，小时 */
  durationHours: number;
  /** 该事件在所属重叠组的列索引（0..MAX_COLUMNS-1） */
  columnIndex: number;
  /** 实际渲染的列数（min(可见数, MAX_COLUMNS)；溢出时为 MAX_COLUMNS） */
  columnCount: number;
}

export interface OverflowMarker {
  /** 该组里被折叠掉的事件（按时间序） */
  hidden: Event[];
  /** 标记锚定的小时（取该组覆盖的起始小时） */
  startHour: number;
  /** 该组覆盖的时长，与组的 (groupEnd - groupStart) 一致 */
  durationHours: number;
  /** 用作 React key */
  key: string;
}

export interface DayLayout {
  visible: PositionedEvent[];
  overflows: OverflowMarker[];
}

/**
 * 把一天的事件按时间排序后按"重叠组"分组：
 * - 每组内按开始时间升序、同时间则按结束时间升序
 * - 前 MAX_COLUMNS (3) 个事件并列显示，每个占 1/N 宽
 * - 第 MAX_COLUMNS+1 起折叠到 OverflowMarker，由调用方画"+N"角标
 *
 * 重叠定义：A.end > B.start && B.end > A.start。
 */
export const layoutDayEvents = (events: Event[], day: Date): DayLayout => {
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

  const visible: PositionedEvent[] = [];
  const overflows: OverflowMarker[] = [];
  let group: typeof sliced = [];
  let groupStart = Infinity;
  let groupEnd = -Infinity;

  const flush = () => {
    if (group.length === 0) return;
    const visibleCount = Math.min(group.length, MAX_COLUMNS);
    const columnCount = visibleCount;

    group.slice(0, visibleCount).forEach((it, idx) => {
      visible.push({
        event: it.event,
        startHour: (it.s - dayStart) / 3600_000,
        durationHours: Math.max(0.25, (it.t - it.s) / 3600_000),
        columnIndex: idx,
        columnCount,
      });
    });

    if (group.length > MAX_COLUMNS) {
      const hidden = group.slice(MAX_COLUMNS).map(it => it.event);
      overflows.push({
        hidden,
        startHour: (groupStart - dayStart) / 3600_000,
        durationHours: Math.max(0.5, (groupEnd - groupStart) / 3600_000),
        key: `ovf-${groupStart}-${groupEnd}`,
      });
    }

    group = [];
    groupStart = Infinity;
    groupEnd = -Infinity;
  };

  for (const it of sliced) {
    if (it.s < groupEnd) {
      group.push(it);
      groupStart = Math.min(groupStart, it.s);
      groupEnd = Math.max(groupEnd, it.t);
    } else {
      flush();
      group.push(it);
      groupStart = it.s;
      groupEnd = it.t;
    }
  }
  flush();
  return { visible, overflows };
};
