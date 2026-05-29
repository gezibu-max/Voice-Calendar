import { useState } from 'react';
import { useCalendarStore } from '@/store';
import { formatTime } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface QuickCreateProps {
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onSave: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function QuickCreate({ startTime, endTime, onClose, onSave }: QuickCreateProps) {
  const [title, setTitle] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSave({
      title: title.trim(),
      description: '',
      startTime,
      endTime,
      color: '#2563eb',
      colorId: 'blue',
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            创建事件
          </h2>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {formatTime(startTime)} - {formatTime(endTime)}
          </div>
          
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入事件标题..."
              autoFocus
            />
            
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
