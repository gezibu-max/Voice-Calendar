import { useCalendarStore } from '@/store';
import { getMonths, isSameMonth, isSameDay, getDaysInMonth } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface YearViewProps {
  onMonthClick: (date: Date) => void;
}

export const YearView = ({ onMonthClick }: YearViewProps) => {
  const { events, currentDate } = useCalendarStore();
  
  const months = getMonths();
  const today = new Date();
  
  const getEventsForMonth = (month: Date) => {
    return events.filter(event => isSameMonth(event.startTime, month));
  };
  
  const hasEventInMonth = (month: Date) => {
    return getEventsForMonth(month).length > 0;
  };
  
  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { month: 'short' });
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-4 gap-4">
        {months.map(month => {
          const isCurrentMonth = isSameMonth(month, currentDate);
          const isTodayMonth = isSameMonth(month, today);
          const daysInMonth = getDaysInMonth(month);
          const monthEvents = getEventsForMonth(month);
          
          return (
            <div 
              key={month.toDateString()}
              className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                isCurrentMonth ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400' : 
                'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => onMonthClick(month)}
            >
              <div className={`text-sm font-medium mb-2 ${
                isCurrentMonth ? 'text-blue-600 dark:text-blue-400' : 
                'text-gray-800 dark:text-white'
              }`}>
                {formatMonthName(month)}
              </div>
              
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = new Date(month.getFullYear(), month.getMonth(), i + 1);
                  const isToday = isSameDay(day, today);
                  const hasEvent = monthEvents.some(e => isSameDay(e.startTime, day));
                  
                  return (
                    <div 
                      key={i}
                      className={`h-5 flex items-center justify-center text-xs ${
                        isToday ? 'bg-blue-500 text-white rounded-full' :
                        hasEvent ? 'text-blue-600 dark:text-blue-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
              
              {hasEventInMonth(month) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {monthEvents.slice(0, 2).map(event => (
                    <div 
                      key={event.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                  ))}
                  {monthEvents.length > 2 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">+{monthEvents.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
