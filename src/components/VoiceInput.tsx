import { useCalendarStore } from '@/store';

export const VoiceInput = () => {
  const { openVoiceModal } = useCalendarStore();

  return (
    <button
      onClick={openVoiceModal}
      className="w-8 h-8 grid place-items-center rounded-pill text-white transition-all hover:scale-105 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #FF6FB3 0%, #C77DFF 60%, #5E5CE6 100%)',
        boxShadow: '0 0 0 0.5px rgba(255,255,255,0.3) inset, 0 6px 14px -4px rgba(94,92,230,0.5)',
      }}
      title="语音输入 / 截图识别"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
      </svg>
    </button>
  );
};
