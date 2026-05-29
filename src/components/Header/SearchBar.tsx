import { useState } from 'react';
import { useCalendarStore } from '@/store';

export const SearchBar = () => {
  const { searchQuery, setSearchQuery } = useCalendarStore();
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-pill transition-all ${
        focused ? 'glass-strong ring-2 ring-accent/30' : 'glass-pill'
      }`}
    >
      <svg className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        className="bg-transparent border-none outline-none text-xs text-neutral-700 dark:text-neutral-200 placeholder-neutral-500/70 dark:placeholder-neutral-400/70 w-32 focus:w-44 transition-[width]"
      />
      <kbd className="hidden md:inline-block text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-white/40 dark:bg-white/8 rounded px-1 leading-4 border-0.5 border-white/40 dark:border-white/10">
        /
      </kbd>
    </div>
  );
};
