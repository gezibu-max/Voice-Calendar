import type { Event } from '@/types';
import { createId } from './dateUtils';

const STORAGE_KEY = 'voice-calendar-events';

const loadEvents = (): Event[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.map((item: Event) => ({
        ...item,
        startTime: new Date(item.startTime),
        endTime: new Date(item.endTime),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
    }
  } catch {
    console.error('Failed to load events from localStorage');
  }
  return getDefaultEvents();
};

const saveEvents = (events: Event[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    console.error('Failed to save events to localStorage');
  }
};

const getDefaultEvents = (): Event[] => {
  const now = new Date();
  return [
    {
      id: createId(),
      title: '团队会议',
      description: '讨论本周工作计划',
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
      color: '#2563eb',
      colorId: 'blue',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      title: '午餐',
      description: '与客户共进午餐',
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
      color: '#16a34a',
      colorId: 'green',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      title: '项目评审',
      description: '季度项目进度评审',
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 16, 0, 0),
      color: '#ea580c',
      colorId: 'orange',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      title: '培训课程',
      description: '新员工技术培训',
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 9, 0, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 12, 0, 0),
      color: '#7c3aed',
      colorId: 'purple',
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const api = {
  getAllEvents: (): Promise<Event[]> => {
    return Promise.resolve(loadEvents());
  },

  getEventsByDate: (date: Date): Promise<Event[]> => {
    const events = loadEvents();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const filtered = events.filter(event => {
      const eventStart = new Date(event.startTime);
      return eventStart >= startOfDay && eventStart < endOfDay;
    });
    
    return Promise.resolve(filtered);
  },

  getEventsByWeek: (date: Date): Promise<Event[]> => {
    const events = loadEvents();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date.getFullYear(), date.getMonth(), diff);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const filtered = events.filter(event => {
      const eventStart = new Date(event.startTime);
      return eventStart >= weekStart && eventStart < weekEnd;
    });
    
    return Promise.resolve(filtered);
  },

  getEventsByMonth: (date: Date): Promise<Event[]> => {
    const events = loadEvents();
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    
    const filtered = events.filter(event => {
      const eventStart = new Date(event.startTime);
      return eventStart >= monthStart && eventStart < monthEnd;
    });
    
    return Promise.resolve(filtered);
  },

  createEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> => {
    const events = loadEvents();
    const now = new Date();
    const newEvent: Event = {
      ...event,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    };
    events.push(newEvent);
    saveEvents(events);
    return Promise.resolve(newEvent);
  },

  updateEvent: (id: string, updates: Partial<Event>): Promise<Event | null> => {
    const events = loadEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) {
      return Promise.resolve(null);
    }
    
    const updatedEvent: Event = {
      ...events[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    events[index] = updatedEvent;
    saveEvents(events);
    return Promise.resolve(updatedEvent);
  },

  deleteEvent: (id: string): Promise<boolean> => {
    const events = loadEvents();
    const filtered = events.filter(e => e.id !== id);
    
    if (filtered.length === events.length) {
      return Promise.resolve(false);
    }
    
    saveEvents(filtered);
    return Promise.resolve(true);
  },

  searchEvents: (query: string): Promise<Event[]> => {
    const events = loadEvents();
    const lowerQuery = query.toLowerCase();
    
    return Promise.resolve(events.filter(event => 
      event.title.toLowerCase().includes(lowerQuery) ||
      event.description.toLowerCase().includes(lowerQuery)
    ));
  },
};
