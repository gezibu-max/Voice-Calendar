import { useCalendarStore } from '@/store';
import { ViewSwitcher } from './ViewSwitcher';
import { DateNavigator } from './DateNavigator';
import { SearchBar } from './SearchBar';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { VoiceInput } from '../VoiceInput';

export const Header = () => {
  const { currentDate, view } = useCalendarStore();

  const title = (() => {
    if (view === 'year') return `${currentDate.getFullYear()}`;
    if (view === 'day') {
      return currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  })();

  return (
    <header className="glass h-14 px-4 flex items-center justify-between sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-card grid place-items-center shrink-0 text-white shadow-glow-accent"
          style={{ background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="17" rx="2.5" />
            <path d="M3 9h18M8 2v4M16 2v4" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 truncate tracking-tight">
            {title}
          </h1>
        </div>
        <div className="hidden md:block ml-2">
          <DateNavigator />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SearchBar />
        <div className="w-px h-5 bg-neutral-300/60 dark:bg-white/10 mx-1" />
        <ViewSwitcher />
        <VoiceInput />
        <ThemeSwitcher />
      </div>
    </header>
  );
};
