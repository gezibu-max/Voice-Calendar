import { useCalendarStore } from '@/store';
import { getWeekDays, formatDayOfWeek, formatDateShort, getHoursInDay, isSameDay } from '@/utils/dateUtils';
import EventCard from '../Event/EventCard';
import QuickCreate from '../Event/QuickCreate';
import type { Event } from '@/types';

interface WeekViewProps {
  onEventClick: (event: Event) => void;
  onQuickCreate: (startTime: Date, endTime: Date) => void;
}

export const WeekView = ({ onEventClick, onQuickCreate }: WeekViewProps) => {
  const { events, currentDate } = useCalendarStore();
  
  const weekDays = getWeekDays(currentDate);
  const hours = getHoursInDay();
  
  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return events.filter(event => {
      return isSameDay(event.startTime, day) && event.startTime.getHours() === hour;
    });
  };
  
  const handleCellClick = (day: Date, hour: number) => {
    const startTime = new Date(day);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);
    onQuickCreate(startTime, endTime);
  };
  
  const today = new Date();
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-13">
        <div className="col-span-2 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-4">
          <div className="h-12" />
          {hours.map(hour => (
            <div 
              key={hour} 
              className="h-12 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300"
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        
        {weekDays.map(day => {
          const isToday = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <div key={day.toDateString()} className={`col-span-1 ${isWeekend ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
              <div className={`h-12 flex flex-col items-center justify-center border-b border-gray-200 dark:border-gray-700 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <span className={`text-sm font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                  {formatDayOfWeek(day)}
                </span>
                <span className={`text-xs ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {formatDateShort(day)}
                </span>
              </div>
              
              <div className="relative">
                {hours.map(hour => (
                  <div 
                    key={hour} 
                    className={`h-12 border-b border-gray-100 dark:border-gray-700 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isToday ? 'border-l-2 border-blue-500' : ''}`}
                    onClick={() => handleCellClick(day, hour)}
                  >
                    {getEventsForDayAndHour(day, hour).map(event => (
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
          );
        })}
      </div>
    </div>
  );
};
