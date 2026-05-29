import { useCalendarStore } from '@/store';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import type { Event } from '@/types';

interface CalendarProps {
  onEventClick: (event: Event) => void;
}

export const Calendar = ({ onEventClick }: CalendarProps) => {
  const { view, setView, setCurrentDate } = useCalendarStore();
  
  const handleQuickCreate = (startTime: Date, endTime: Date) => {
    setCurrentDate(startTime);
    setView('day');
  };
  
  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };
  
  const handleMonthClick = (date: Date) => {
    setCurrentDate(date);
    setView('month');
  };
  
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {view === 'day' && (
        <DayView 
          onEventClick={onEventClick} 
          onQuickCreate={handleQuickCreate}
        />
      )}
      {view === 'week' && (
        <WeekView 
          onEventClick={onEventClick} 
          onQuickCreate={handleQuickCreate}
        />
      )}
      {view === 'month' && (
        <MonthView 
          onEventClick={onEventClick} 
          onDayClick={handleDayClick}
        />
      )}
      {view === 'year' && (
        <YearView 
          onMonthClick={handleMonthClick}
        />
      )}
    </div>
  );
};
