import { useEffect, useRef, useState } from 'react';
import type { Event } from '@/types';

const SNAP_MINUTES = 15;
const DRAG_THRESHOLD_PX = 4;

export type DragMode = 'move' | 'resize';

export interface DragPreview {
  /** 屏幕像素 - 仅用来画 ghost / overlay */
  pointerX: number;
  pointerY: number;
  /** 计算后的新时间 */
  startTime: Date;
  endTime: Date;
  /** 跨日时落到的目标日（仅 WeekView 用） */
  dayOffset: number;
}

export interface BeginDragArgs {
  event: Event;
  mode: DragMode;
  /** 1 像素对应的分钟数 — 由调用方根据 HOUR_HEIGHT 计算 */
  pxPerMinute: number;
  /** 仅 WeekView：单列宽度，用来在 X 方向跨日吸附 */
  columnWidthPx?: number;
}

interface DragState extends BeginDragArgs {
  startX: number;
  startY: number;
  origStart: Date;
  origEnd: Date;
  active: boolean;
}

const snapTo = (date: Date, minutes: number) => {
  const out = new Date(date);
  const m = Math.round(out.getMinutes() / minutes) * minutes;
  out.setMinutes(m, 0, 0);
  return out;
};

interface UseDragDropOpts {
  onCommit: (event: Event, startTime: Date, endTime: Date) => void;
}

/**
 * 拖拽 / 拉伸事件块的全局 hook。
 *
 * 用法：
 *   const drag = useDragDrop({ onCommit });
 *   <div onMouseDown={(e) => drag.begin(e, { event, mode: 'move', pxPerMinute, columnWidthPx })} />
 *
 *  - 阈值：移动距离 < DRAG_THRESHOLD_PX 时不进入拖拽，让点击照常工作
 *  - 吸附：SNAP_MINUTES = 15 分钟
 *  - mode='resize': 只动 endTime，不动 startTime
 *  - mode='move': 整体平移，保持时长，可跨日（columnWidthPx 设置时）
 */
export const useDragDrop = ({ onCommit }: UseDragDropOpts) => {
  const stateRef = useRef<DragState | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (!s.active) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
        s.active = true;
        document.body.style.cursor = s.mode === 'resize' ? 'ns-resize' : 'grabbing';
        document.body.style.userSelect = 'none';
      }

      const dayOffset = s.columnWidthPx
        ? Math.round(dx / s.columnWidthPx)
        : 0;
      const minuteDelta = Math.round((dy / s.pxPerMinute) / SNAP_MINUTES) * SNAP_MINUTES;

      let newStart = new Date(s.origStart);
      let newEnd = new Date(s.origEnd);

      if (s.mode === 'move') {
        newStart.setMinutes(newStart.getMinutes() + minuteDelta);
        newEnd.setMinutes(newEnd.getMinutes() + minuteDelta);
        if (dayOffset !== 0) {
          newStart.setDate(newStart.getDate() + dayOffset);
          newEnd.setDate(newEnd.getDate() + dayOffset);
        }
      } else {
        newEnd.setMinutes(newEnd.getMinutes() + minuteDelta);
        // 拉伸不能小于 15 分钟
        if (newEnd.getTime() - newStart.getTime() < 15 * 60_000) {
          newEnd = new Date(newStart.getTime() + 15 * 60_000);
        }
      }

      newStart = snapTo(newStart, SNAP_MINUTES);
      newEnd = snapTo(newEnd, SNAP_MINUTES);

      setPreview({
        pointerX: e.clientX,
        pointerY: e.clientY,
        startTime: newStart,
        endTime: newEnd,
        dayOffset,
      });
    };

    const onUp = () => {
      const s = stateRef.current;
      if (!s) return;
      const p = preview;
      stateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (s.active && p) {
        const changed =
          p.startTime.getTime() !== s.origStart.getTime() ||
          p.endTime.getTime() !== s.origEnd.getTime();
        if (changed) onCommit(s.event, p.startTime, p.endTime);
      }
      setPreview(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onCommit, preview]);

  const begin = (e: React.MouseEvent, args: BeginDragArgs) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    stateRef.current = {
      ...args,
      startX: e.clientX,
      startY: e.clientY,
      origStart: new Date(args.event.startTime),
      origEnd: new Date(args.event.endTime),
      active: false,
    };
  };

  const isDragging = (id: string) => stateRef.current?.event.id === id && stateRef.current.active;

  return { begin, preview, isDragging };
};
