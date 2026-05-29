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
    if (event) onUpdate(event.id, data);
    else onSave(data);
    onClose();
  };

  const handleDelete = () => {
    if (event) {
      onDelete(event.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-neutral-900/20 dark:bg-black/40 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong rounded-panel w-full max-w-md max-h-[80vh] overflow-y-auto animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/40 dark:border-white/8">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {event ? '编辑事件' : '新建事件'}
          </span>
          <div className="flex items-center gap-1">
            {event && (
              <button
                onClick={handleDelete}
                title="删除"
                className="w-8 h-8 grid place-items-center rounded-pill text-neutral-500 dark:text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 grid place-items-center rounded-pill text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {event && (
            <div className="mb-4 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {formatDate(event.startTime)} · {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </div>
          )}

          <EventForm event={event} onSubmit={handleSubmit} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
};
