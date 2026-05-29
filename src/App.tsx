import { useEffect, useCallback } from 'react';
import { useCalendarStore } from '@/store';
import { Header } from '@/components/Header/Header';
import { Calendar } from '@/components/Calendar/Calendar';
import { EventModal } from '@/components/Event/EventModal';
import { QuickCreate } from '@/components/Event/QuickCreate';
import { useEvents } from '@/hooks/useEvents';
import { parseVoiceCommand } from '@/utils/parser';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import type { Event } from '@/types';

function App() {
  const { 
    isEventModalOpen, 
    selectedEvent, 
    closeEventModal,
    isQuickCreateOpen,
    quickCreateTime,
    closeQuickCreate,
    openEventModal,
    theme,
    setTheme,
  } = useCalendarStore();
  
  const { events, createEvent, updateEvent, deleteEvent } = useEvents();
  const { speak } = useSpeechSynthesis();
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);
  
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const upcomingEvents = events.filter(event => {
        const eventTime = new Date(event.startTime);
        const diffMs = eventTime.getTime() - now.getTime();
        return diffMs > 0 && diffMs <= 1000 * 60 * 5;
      });
      
      if (upcomingEvents.length > 0) {
        const event = upcomingEvents[0];
        const message = `即将有事件：${event.title}，时间是${event.startTime.toLocaleTimeString('zh-CN')}`;
        speak(message);
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('日历提醒', {
            body: message,
            icon: '/vite.svg',
          });
        }
      }
    };
    
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [events, speak]);
  
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  const handleVoiceCommand = useCallback((text: string) => {
    const parsed = parseVoiceCommand(text);
    if (parsed) {
      createEvent({
        title: parsed.title,
        description: parsed.description,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        color: '#2563eb',
        colorId: 'blue',
      });
      speak(`已创建事件：${parsed.title}`);
    } else if (text.includes('查看') || text.includes('查询')) {
      const todayEvents = events.filter(e => {
        const eventDate = new Date(e.startTime);
        const today = new Date();
        return eventDate.toDateString() === today.toDateString();
      });
      
      if (todayEvents.length > 0) {
        const message = `今天有${todayEvents.length}个事件：${todayEvents.map(e => e.title).join('、')}`;
        speak(message);
      } else {
        speak('今天没有事件');
      }
    } else if (text.includes('删除')) {
      const match = text.match(/删除(.+?)事件/);
      if (match) {
        const eventTitle = match[1].trim();
        const event = events.find(e => e.title.includes(eventTitle));
        if (event) {
          deleteEvent(event.id);
          speak(`已删除事件：${eventTitle}`);
        } else {
          speak(`未找到事件：${eventTitle}`);
        }
      }
    }
  }, [events, createEvent, deleteEvent, speak]);
  
  const handleEventClick = useCallback((event: Event) => {
    openEventModal(event);
  }, [openEventModal]);
  
  const handleSaveEvent = useCallback((data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    createEvent(data);
  }, [createEvent]);
  
  const handleUpdateEvent = useCallback((id: string, data: Partial<Event>) => {
    updateEvent(id, data);
  }, [updateEvent]);
  
  const handleDeleteEvent = useCallback((id: string) => {
    deleteEvent(id);
  }, [deleteEvent]);
  
  const handleQuickCreate = useCallback((startTime: Date, endTime: Date) => {
    if (!quickCreateTime || 
        quickCreateTime.start.getTime() !== startTime.getTime() || 
        quickCreateTime.end.getTime() !== endTime.getTime()) {
      closeQuickCreate();
    }
  }, [quickCreateTime, closeQuickCreate]);
  
  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header onVoiceCommand={handleVoiceCommand} />
        <Calendar onEventClick={handleEventClick} />
      </div>
      
      {isEventModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={closeEventModal}
          onSave={handleSaveEvent}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}
      
      {isQuickCreateOpen && quickCreateTime && (
        <QuickCreate
          startTime={quickCreateTime.start}
          endTime={quickCreateTime.end}
          onClose={closeQuickCreate}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}

export default App;
