import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

interface VoiceOutputProps {
  text: string;
  autoPlay?: boolean;
}

export const VoiceOutput = ({ text, autoPlay = false }: VoiceOutputProps) => {
  const { isSpeaking, speak, stop } = useSpeechSynthesis();
  
  if (autoPlay && text && !isSpeaking) {
    speak(text);
  }
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => isSpeaking ? stop() : speak(text)}
        className={`px-3 py-2 rounded-lg text-sm transition-all ${
          isSpeaking 
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        }`}
      >
        {isSpeaking ? '停止播放' : '语音播报'}
      </button>
    </div>
  );
};
