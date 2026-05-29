import { useRef, useCallback } from 'react';
import type { Event } from '@/types';

interface DragState {
  event: Event;
  startY: number;
  originalStart: Date;
}

export const useDragDrop = () => {
  const dragState = useRef<DragState | null>(null);
  
  const handleDragStart = useCallback((e: React.MouseEvent, event: Event) => {
    dragState.current = {
      event,
      startY: e.clientY,
      originalStart: new Date(event.startTime),
    };
  }, []);
  
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current) return;
    
    const { startY, originalStart } = dragState.current;
    const deltaY = e.clientY - startY;
    const minutesDelta = Math.round(deltaY / 10);
    
    const newStartTime = new Date(originalStart);
    newStartTime.setMinutes(newStartTime.getMinutes() + minutesDelta);
    
    const newEndTime = new Date(newStartTime);
    const duration = dragState.current.event.endTime.getTime() - dragState.current.event.startTime.getTime();
    newEndTime.setTime(newStartTime.getTime() + duration);
    
    return {
      event: dragState.current.event,
      newStartTime,
      newEndTime,
    };
  }, []);
  
  const handleDragEnd = useCallback(() => {
    const result = dragState.current;
    dragState.current = null;
    return result;
  }, []);
  
  return {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
};
