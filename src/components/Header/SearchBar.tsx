import { useState } from 'react';
import { useCalendarStore } from '@/store';

export const SearchBar = () => {
  const { searchQuery, setSearchQuery } = useCalendarStore();
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`flex items-center gap-1.5 h-7 pl-2 pr-2 rounded-md border transition-all ${
        focused
          ? 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 ring-2 ring-neutral-100 dark:ring-neutral-800'
          : 'border-transparent bg-neutral-100/70 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900'
      }`}
    >
      <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-3.5-3.5" />
      </svg>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="搜索"
        className="bg-transparent border-none outline-none text-xs text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 w-32 focus:w-44 transition-[width]"
      />
      <kbd className="hidden md:inline-block text-[10px] font-mono text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded px-1 leading-4">
        /
      </kbd>
    </div>
  );
};
