import { useCalendarStore } from '@/store';
import { formatTime, getHoursInDay, isSameDay } from '@/utils/dateUtils';
import EventCard from '../Event/EventCard';
import QuickCreate from '../Event/QuickCreate';
import type { Event } from '@/types';

interface DayViewProps {
  onEventClick: (event: Event) => void;
  onQuickCreate: (startTime: Date, endTime: Date) => void;
}

export const DayView = ({ onEventClick, onQuickCreate }: DayViewProps) => {
  const { events, currentDate } = useCalendarStore();
  
  const dayEvents = events.filter(event => isSameDay(event.startTime, currentDate));
  const hours = getHoursInDay();
  
  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(event => {
      const eventHour = event.startTime.getHours();
      return eventHour === hour;
    });
  };
  
  const handleHourClick = (hour: number) => {
    const startTime = new Date(currentDate);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);
    onQuickCreate(startTime, endTime);
  };
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-12">
        <div className="col-span-2 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-4">
          <div className="h-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">时间</div>
          {hours.map(hour => (
            <div 
              key={hour} 
              className="h-12 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300"
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        
        <div className="col-span-10">
          <div className="h-12 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
            <span className="text-lg font-semibold text-gray-800 dark:text-white">
              {currentDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          
          <div className="relative">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="h-12 border-b border-gray-100 dark:border-gray-700 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleHourClick(hour)}
              >
                {getEventsForHour(hour).map(event => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onClick={() => onEventClick(event)}
                    showTime={false}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
