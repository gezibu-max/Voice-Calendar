import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface VoiceInputProps {
  onCommand: (text: string) => void;
}

export const VoiceInput = ({ onCommand }: VoiceInputProps) => {
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  
  const handleStart = () => {
    startListening();
  };
  
  const handleStop = () => {
    stopListening();
    if (transcript.trim()) {
      onCommand(transcript.trim());
    }
  };
  
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={isListening ? handleStop : handleStart}
        className={`p-3 rounded-full transition-all transform hover:scale-105 ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
        }`}
        title={isListening ? '停止录音' : '开始录音'}
      >
        {isListening ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v18a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm6.5 4a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 18 20a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18 5zm-13 0A1.5 1.5 0 0 0 3 6.5v13A1.5 1.5 0 0 0 4.5 21a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 4.5 5z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3S13.66 8 12 8 9 9.34 9 11s1.34 3 3 3zm5.6-2c0-1.38-.59-2.63-1.56-3.56C14.88 8.22 13.48 7 12 7c-1.48 0-2.88 1.22-3.04 2.44-.97.93-1.56 2.18-1.56 3.56s.59 2.63 1.56 3.56c.16 1.22 1.56 2.44 3.04 2.44 1.48 0 2.88-1.22 3.04-2.44.97-.93 1.56-2.18 1.56-3.56zm2.4-5.5c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5zM4.5 8.5c0 1.38-1.12 2.5-2.5 2.5S-.5 9.88-.5 8.5 1.12 6 2.5 6s2 .62 2 1.5z" />
          </svg>
        )}
      </button>
      
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-blue-600 dark:text-blue-400">
            {transcript || '正在听...'}
          </span>
        </div>
      )}
    </div>
  );
};
