import { useCalendarStore } from '@/store';

export const VoiceInput = () => {
  const { openVoiceModal } = useCalendarStore();

  return (
    <button
      onClick={openVoiceModal}
      className="w-7 h-7 grid place-items-center rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
      title="语音输入"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
      </svg>
    </button>
  );
};
