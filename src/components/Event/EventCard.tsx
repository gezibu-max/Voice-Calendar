import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { formatTime } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  showTime?: boolean;
  variant?: 'block' | 'pill' | 'dot';
  style?: CSSProperties;
  className?: string;
  /** mousedown 起拖（移动）。提供时 EventCard 进入可拖拽态。 */
  onMoveStart?: (e: ReactMouseEvent) => void;
  /** mousedown 起拉伸 endTime。提供时显示底部 resize handle。 */
  onResizeStart?: (e: ReactMouseEvent) => void;
  /** 当前正在拖拽，做半透明提示 */
  dragging?: boolean;
}

const lighten = (hex: string, amount = 0.22) => {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map(s => parseInt(s, 16));
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

export default function EventCard({
  event, onClick, showTime = true, variant = 'block', style, className,
  onMoveStart, onResizeStart, dragging = false,
}: EventCardProps) {
  if (variant === 'dot') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded-md hover:bg-white/60 dark:hover:bg-white/8 transition-colors ${className ?? ''}`}
        style={style}
        title={event.title}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: `linear-gradient(135deg, ${event.color}, ${lighten(event.color, 0.3)})` }}
        />
        {showTime && !event.allDay && (
          <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 shrink-0">
            {formatTime(event.startTime)}
          </span>
        )}
        <span className="text-[11px] truncate text-neutral-700 dark:text-neutral-200">
          {event.title}
        </span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`block w-full text-left px-2 py-0.5 rounded-pill text-[11px] truncate transition-all hover:brightness-110 ${className ?? ''}`}
        style={{
          background: `linear-gradient(135deg, ${event.color}, ${lighten(event.color, 0.25)})`,
          color: '#fff',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
          ...style,
        }}
        title={event.title}
      >
        {event.title}
      </button>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={onMoveStart}
      className={`event-glass absolute px-2 py-1 rounded-card text-left overflow-hidden text-white ${onMoveStart ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging ? 'opacity-60 ring-2 ring-white/60 dark:ring-white/30' : ''} ${className ?? ''}`}
      style={{
        ['--c1' as any]: event.color,
        ['--c2' as any]: lighten(event.color, 0.22),
        ...style,
      }}
      title={event.title}
    >
      <div className="text-[11px] font-semibold truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
        {event.title}
      </div>
      {showTime && (
        <div className="text-[10px] tabular-nums text-white/85 truncate">
          {formatTime(event.startTime)}
        </div>
      )}
      {onResizeStart && (
        <span
          onMouseDown={onResizeStart}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize rounded-b-card hover:bg-white/30 transition-colors"
          title="拖拽以调整时长"
        />
      )}
    </button>
  );
}
