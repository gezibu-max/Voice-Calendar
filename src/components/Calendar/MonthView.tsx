import { useCalendarStore } from '@/store';
import { getMonthStartDay, getDaysInMonth, formatDayOfWeek, isSameDay, isSameMonth } from '@/utils/dateUtils';
import EventCard from '../Event/EventCard';
import type { Event } from '@/types';

interface MonthViewProps {
  onEventClick: (event: Event) => void;
  onDayClick: (date: Date) => void;
}

export const MonthView = ({ onEventClick, onDayClick }: MonthViewProps) => {
  const { events, currentDate } = useCalendarStore();
  
  const startDay = getMonthStartDay(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const today = new Date();
  
  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - startDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      return null;
    }
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
  });
  
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.startTime, day));
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div 
            key={day} 
            className="h-12 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
        
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="h-20" />;
          }
          
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dayEvents = getEventsForDay(day);
          
          return (
            <div 
              key={day.toDateString()} 
              className={`h-20 p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                isToday ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400' : ''
              } ${!isCurrentMonth ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}
              onClick={() => onDayClick(day)}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday ? 'text-blue-600 dark:text-blue-400' : 
                isCurrentMonth ? 'text-gray-800 dark:text-white' : 'text-gray-400'
              }`}>
                {day.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className="text-xs truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: event.color + '20', color: event.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{dayEvents.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
