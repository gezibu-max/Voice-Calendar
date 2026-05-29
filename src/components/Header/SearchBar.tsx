import { useState } from 'react';
import { useCalendarStore } from '@/store';

export const SearchBar = () => {
  const { searchQuery, setSearchQuery } = useCalendarStore();
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
      isFocused 
        ? 'border-blue-500 bg-white dark:bg-gray-800' 
        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
    }`}>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 w-40"
        placeholder="搜索事件..."
      />
    </div>
  );
};
