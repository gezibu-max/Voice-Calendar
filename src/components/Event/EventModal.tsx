import { useCalendarStore } from '@/store';
import { EventForm } from './EventForm';
import { formatDate, formatTime } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface EventModalProps {
  event: Event | null;
  onClose: () => void;
  onSave: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, data: Partial<Event>) => void;
  onDelete: (id: string) => void;
}

export const EventModal = ({ event, onClose, onSave, onUpdate, onDelete }: EventModalProps) => {
  const handleSubmit = (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (event) {
      onUpdate(event.id, data);
    } else {
      onSave(data);
    }
    onClose();
  };
  
  const handleDelete = () => {
    if (event) {
      onDelete(event.id);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {event ? '编辑事件' : '创建事件'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {event && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">时间：</span>
                {formatDate(event.startTime)} {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </div>
            </div>
          )}
          
          <EventForm 
            event={event} 
            onSubmit={handleSubmit} 
            onCancel={onClose} 
          />
          
          {event && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                删除事件
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
