import { create } from 'zustand';
import type { Event, CalendarView, Theme } from '@/types';

interface CalendarState {
  events: Event[];
  currentDate: Date;
  view: CalendarView;
  theme: Theme;
  searchQuery: string;
  selectedEvent: Event | null;
  isEventModalOpen: boolean;
  isQuickCreateOpen: boolean;
  quickCreateTime: { start: Date; end: Date } | null;
  isVoiceModalOpen: boolean;

  setEvents: (events: Event[]) => void;
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  setTheme: (theme: Theme) => void;
  setSearchQuery: (query: string) => void;
  
  setSelectedEvent: (event: Event | null) => void;
  openEventModal: (event: Event | null) => void;
  closeEventModal: () => void;
  
  openQuickCreate: (start: Date, end: Date) => void;
  closeQuickCreate: () => void;

  openVoiceModal: () => void;
  closeVoiceModal: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  currentDate: new Date(),
  view: 'week',
  theme: 'light',
  searchQuery: '',
  selectedEvent: null,
  isEventModalOpen: false,
  isQuickCreateOpen: false,
  quickCreateTime: null,
  isVoiceModalOpen: false,

  setEvents: (events) => set({ events }),
  
  addEvent: (eventData) => set((state) => {
    const now = new Date();
    const newEvent: Event = {
      ...eventData,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      createdAt: now,
      updatedAt: now,
    };
    return { events: [...state.events, newEvent] };
  }),
  
  updateEvent: (id, updates) => set((state) => ({
    events: state.events.map(event => 
      event.id === id ? { ...event, ...updates, updatedAt: new Date() } : event
    ),
  })),
  
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(event => event.id !== id),
  })),
  
  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),
  setTheme: (theme) => {
    set({ theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  
  openEventModal: (event) => set({ selectedEvent: event, isEventModalOpen: true }),
  closeEventModal: () => set({ isEventModalOpen: false, selectedEvent: null }),
  
  openQuickCreate: (start, end) => set({
    isQuickCreateOpen: true,
    quickCreateTime: { start, end }
  }),
  closeQuickCreate: () => set({ isQuickCreateOpen: false, quickCreateTime: null }),

  openVoiceModal: () => set({ isVoiceModalOpen: true }),
  closeVoiceModal: () => set({ isVoiceModalOpen: false }),
}));
