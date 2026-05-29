import { formatTime } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  showTime?: boolean;
}

export default function EventCard({ event, onClick, showTime = true }: EventCardProps) {
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-calendar hover:shadow-card-hover transition-all cursor-pointer border-l-4 truncate px-2 py-1.5 mr-1"
      style={{ borderLeftColor: event.color }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {showTime && (
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatTime(event.startTime)}
          </span>
        )}
        <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
          {event.title}
        </span>
      </div>
    </div>
  );
}
