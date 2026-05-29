import type { EventColor } from '@/types';

export const EVENT_COLORS: EventColor[] = [
  { id: 'blue', color: '#2563eb', name: '蓝色' },
  { id: 'green', color: '#16a34a', name: '绿色' },
  { id: 'orange', color: '#ea580c', name: '橙色' },
  { id: 'purple', color: '#7c3aed', name: '紫色' },
  { id: 'pink', color: '#db2777', name: '粉色' },
  { id: 'red', color: '#dc2626', name: '红色' },
  { id: 'gray', color: '#6b7280', name: '灰色' },
];

export const getColorById = (id: string): string => {
  const color = EVENT_COLORS.find(c => c.id === id);
  return color?.color || '#2563eb';
};

export const getColorNameById = (id: string): string => {
  const color = EVENT_COLORS.find(c => c.id === id);
  return color?.name || '蓝色';
};
