import type { Event } from '@/types';
import { createId } from './dateUtils';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// 本地存储作为备用方案
const STORAGE_KEY = 'voice-calendar-events';

let useLocalStorage = true; // 默认使用本地存储，后端启动后可切换

const loadEventsLocal = (): Event[] => {
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

const saveEventsLocal = (events: Event[]): void => {
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
    ];
};

// API 请求工具
const apiRequest = async (
    url: string,
    options: RequestInit = {}
): Promise<Response> => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }
    
    return response;
};

// 类型转换：后端返回的 id 是数字，转换为字符串
const normalizeEvent = (data: any): Event => ({
    ...data,
    id: String(data.id),
    startTime: new Date(data.start_time),
    endTime: new Date(data.end_time),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    userId: data.user_id,
});

export const api = {
    getAllEvents: async (): Promise<Event[]> => {
        if (useLocalStorage) {
            return Promise.resolve(loadEventsLocal());
        }
        
        try {
            const response = await apiRequest('/events');
            const data = await response.json();
            return data.map(normalizeEvent);
        } catch (error) {
            console.error('Failed to fetch events from API, using localStorage', error);
            return Promise.resolve(loadEventsLocal());
        }
    },

    getEventsByDate: async (date: Date): Promise<Event[]> => {
        if (useLocalStorage) {
            const events = loadEventsLocal();
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            
            const filtered = events.filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= startOfDay && eventStart < endOfDay;
            });
            return Promise.resolve(filtered);
        }
        
        try {
            const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
            const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
            const response = await apiRequest(`/events?start_date=${startDate}&end_date=${endDate}`);
            const data = await response.json();
            return data.map(normalizeEvent);
        } catch (error) {
            console.error('Failed to fetch events by date from API', error);
            const events = loadEventsLocal();
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);
            return Promise.resolve(events.filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= startOfDay && eventStart < endOfDay;
            }));
        }
    },

    getEventsByWeek: async (date: Date): Promise<Event[]> => {
        if (useLocalStorage) {
            const events = loadEventsLocal();
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
        }
        
        try {
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(date.getFullYear(), date.getMonth(), diff).toISOString();
            const weekEnd = new Date(date.getFullYear(), date.getMonth(), diff + 7).toISOString();
            const response = await apiRequest(`/events?start_date=${weekStart}&end_date=${weekEnd}`);
            const data = await response.json();
            return data.map(normalizeEvent);
        } catch (error) {
            console.error('Failed to fetch events by week from API', error);
            const events = loadEventsLocal();
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(date.getFullYear(), date.getMonth(), diff);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return Promise.resolve(events.filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= weekStart && eventStart < weekEnd;
            }));
        }
    },

    getEventsByMonth: async (date: Date): Promise<Event[]> => {
        if (useLocalStorage) {
            const events = loadEventsLocal();
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            
            const filtered = events.filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= monthStart && eventStart < monthEnd;
            });
            return Promise.resolve(filtered);
        }
        
        try {
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString();
            const response = await apiRequest(`/events?start_date=${monthStart}&end_date=${monthEnd}`);
            const data = await response.json();
            return data.map(normalizeEvent);
        } catch (error) {
            console.error('Failed to fetch events by month from API', error);
            const events = loadEventsLocal();
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            return Promise.resolve(events.filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= monthStart && eventStart < monthEnd;
            }));
        }
    },

    createEvent: async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> => {
        if (useLocalStorage) {
            const events = loadEventsLocal();
            const now = new Date();
            const newEvent: Event = {
                ...event,
                id: createId(),
                createdAt: now,
                updatedAt: now,
            };
            events.push(newEvent);
            saveEventsLocal(events);
            return Promise.resolve(newEvent);
        }
        
        try {
            const response = await apiRequest('/events', {
                method: 'POST',
                body: JSON.stringify({
                    title: event.title,
                    description: event.description,
                    start_time: event.startTime.toISOString(),
                    end_time: event.endTime.toISOString(),
                    color: event.color,
                    color_id: event.colorId,
                }),
            });
            const data = await response.json();
            return normalizeEvent(data);
        } catch (error) {
            console.error('Failed to create event via API, using localStorage', error);
            const events = loadEventsLocal();
            const now = new Date();
            const newEvent: Event = {
                ...event,
                id: createId(),
                createdAt: now,
                updatedAt: now,
            };
            events.push(newEvent);
            saveEventsLocal(events);
            return Promise.resolve(newEvent);
        }
    },

    updateEvent: async (id: string, updates: Partial<Event>): Promise<Event | null> => {
        if (useLocalStorage) {
            const events = loadEventsLocal();
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
            saveEventsLocal(events);
            return Promise.resolve(updatedEvent);
        }
        
        try {
            const response = await apiRequest(`/events/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...(updates.title && { title: updates.title }),
                    ...(updates.description !== undefined && { description: updates.description }),
                    ...(updates.startTime && { start_time: updates.startTime.toISOString() }),
                    ...(updates.endTime && { end_time: updates.endTime.toISOString() }),
                    ...(updates.color && { color: updates.color }),
                    ...(updates.colorId && { color_id: updates.colorId }),
                }),
            });
            const data = await response.json();
            return normalizeEvent(data);
        } catch (error) {
            console.error('Failed to update event via API', error);
            return Promise.resolve(null);
        }
    },

    deleteEvent: async (id: string): Promise<boolean> => {
        if (useLocalStorage) {
            const events = loadEventsLocal();
            const filtered = events.filter(e => e.id !== id);
            
            if (filtered.length === events.length) {
                return Promise.resolve(false);
            }
            
            saveEventsLocal(filtered);
            return Promise.resolve(true);
        }
        
        try {
            await apiRequest(`/events/${id}`, {
                method: 'DELETE',
            });
            return Promise.resolve(true);
        } catch (error) {
            console.error('Failed to delete event via API', error);
            return Promise.resolve(false);
        }
    },

    searchEvents: async (query: string): Promise<Event[]> => {
        if (useLocalStorage) {
            const events = loadEventsLocal();
            const lowerQuery = query.toLowerCase();
            
            return Promise.resolve(events.filter(event => 
                event.title.toLowerCase().includes(lowerQuery) ||
                event.description.toLowerCase().includes(lowerQuery)
            ));
        }
        
        try {
            const response = await apiRequest(`/events/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            return data.map(normalizeEvent);
        } catch (error) {
            console.error('Failed to search events via API', error);
            const events = loadEventsLocal();
            const lowerQuery = query.toLowerCase();
            return Promise.resolve(events.filter(event => 
                event.title.toLowerCase().includes(lowerQuery) ||
                event.description.toLowerCase().includes(lowerQuery)
            ));
        }
    },
    
    setBackendEnabled: (enabled: boolean) => {
        useLocalStorage = !enabled;
    },
};
