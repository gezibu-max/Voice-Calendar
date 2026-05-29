export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
  colorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CalendarView = 'day' | 'week' | 'month' | 'year';

export type Theme = 'light' | 'dark';

export interface Timezone {
  id: string;
  name: string;
  offset: number;
}

export interface EventColor {
  id: string;
  color: string;
  name: string;
}
