import { createId } from './dateUtils';
import type { Event } from '@/types';

interface ParsedEvent {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
}

const timePatterns = [
  /(\d{1,2})[:：](\d{2})\s*(上午|下午)?/,
  /(\d{1,2})\s*(点|点钟)\s*(上午|下午)?/,
  /(\d{1,2})\s*(时)\s*(上午|下午)?/,
];

const datePatterns = [
  /今天/,
  /明天/,
  /后天/,
  /(\d{1,2})月(\d{1,2})日/,
  /(\d{1,2})号/,
];

const parseTime = (text: string): { hours: number; minutes: number } | null => {
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3];
      
      if (period === '下午' && hours < 12) {
        hours += 12;
      } else if (period === '上午' && hours === 12) {
        hours = 0;
      }
      
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return { hours, minutes };
      }
    }
  }
  return null;
};

const parseDate = (text: string): Date | null => {
  const now = new Date();
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0] === '今天') {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (match[0] === '明天') {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (match[0] === '后天') {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
      } else if (match[1] && match[2]) {
        const month = parseInt(match[1], 10) - 1;
        const day = parseInt(match[2], 10);
        if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
          return new Date(now.getFullYear(), month, day);
        }
      } else if (match[1]) {
        const day = parseInt(match[1], 10);
        if (day >= 1 && day <= 31) {
          return new Date(now.getFullYear(), now.getMonth(), day);
        }
      }
    }
  }
  return null;
};

export const parseVoiceCommand = (text: string): ParsedEvent | null => {
  const lowerText = text.toLowerCase();
  
  const date = parseDate(lowerText) || new Date();
  const time = parseTime(lowerText);
  
  const titleMatch = text.match(/(添加|创建|安排)(.*?)(事件|日程|会议|提醒)/);
  const title = titleMatch ? titleMatch[2].trim() : '未命名事件';
  
  const descriptionMatch = text.match(/备注[：:](.*)/);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  
  const startTime = new Date(date);
  if (time) {
    startTime.setHours(time.hours, time.minutes, 0, 0);
  } else {
    startTime.setHours(9, 0, 0, 0);
  }
  
  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 1);
  
  return { title, description, startTime, endTime };
};

export const createEventFromCommand = (text: string): Event | null => {
  const parsed = parseVoiceCommand(text);
  if (!parsed) return null;
  
  return {
    id: createId(),
    title: parsed.title,
    description: parsed.description,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    color: '#2563eb',
    colorId: 'blue',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
