import { useCalendarStore } from '@/store';
import { ViewSwitcher } from './ViewSwitcher';
import { DateNavigator } from './DateNavigator';
import { SearchBar } from './SearchBar';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { VoiceInput } from '../VoiceInput';
import { formatDate } from '@/utils/dateUtils';

interface HeaderProps {
  onVoiceCommand: (text: string) => void;
}

export const Header = ({ onVoiceCommand }: HeaderProps) => {
  const { currentDate } = useCalendarStore();
  
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">语音日历</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(currentDate)}</p>
            </div>
          </div>
          
          <ViewSwitcher />
        </div>
        
        <div className="flex items-center gap-4">
          <SearchBar />
          <VoiceInput onCommand={onVoiceCommand} />
          <DateNavigator />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
};
