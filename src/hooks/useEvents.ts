import { useEffect, useCallback } from 'react';
import { useCalendarStore } from '@/store';
import { api } from '@/utils/api';

export const useEvents = () => {
  const { events, setEvents, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  
  useEffect(() => {
    api.getAllEvents().then(loadedEvents => {
      setEvents(loadedEvents);
    });
  }, [setEvents]);
  
  const handleCreateEvent = useCallback(async (eventData: Parameters<typeof addEvent>[0]) => {
    const newEvent = await api.createEvent(eventData);
    addEvent(eventData);
    return newEvent;
  }, [addEvent]);
  
  const handleUpdateEvent = useCallback(async (id: string, updates: Parameters<typeof updateEvent>[1]) => {
    const updated = await api.updateEvent(id, updates);
    if (updated) {
      updateEvent(id, updates);
    }
    return updated;
  }, [updateEvent]);
  
  const handleDeleteEvent = useCallback(async (id: string) => {
    const success = await api.deleteEvent(id);
    if (success) {
      deleteEvent(id);
    }
    return success;
  }, [deleteEvent]);
  
  const searchEvents = useCallback((query: string) => {
    return api.searchEvents(query);
  }, []);
  
  return {
    events,
    createEvent: handleCreateEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
    searchEvents,
  };
};
