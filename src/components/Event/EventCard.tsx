import type { CSSProperties } from 'react';
import { formatTime } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  showTime?: boolean;
  variant?: 'block' | 'pill' | 'dot';
  style?: CSSProperties;
  className?: string;
}

export default function EventCard({ event, onClick, showTime = true, variant = 'block', style, className }: EventCardProps) {
  if (variant === 'dot') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`flex items-center gap-1.5 w-full text-left px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors ${className ?? ''}`}
        style={style}
        title={event.title}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
        {showTime && (
          <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 shrink-0">
            {formatTime(event.startTime)}
          </span>
        )}
        <span className="text-[11px] truncate text-neutral-700 dark:text-neutral-300">
          {event.title}
        </span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`block w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate hover:opacity-90 transition-opacity ${className ?? ''}`}
        style={{ backgroundColor: event.color + '1A', color: event.color, ...style }}
        title={event.title}
      >
        {event.title}
      </button>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`absolute px-2 py-1 rounded-md text-left overflow-hidden transition-all hover:brightness-95 dark:hover:brightness-110 hover:z-30 hover:shadow-pop ${className ?? ''}`}
      style={{
        backgroundColor: event.color + '1F',
        borderLeft: `2px solid ${event.color}`,
        ...style,
      }}
      title={event.title}
    >
      <div className="text-[11px] font-medium truncate" style={{ color: event.color }}>
        {event.title}
      </div>
      {showTime && (
        <div className="text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400 truncate">
          {formatTime(event.startTime)}
        </div>
      )}
    </button>
  );
}
