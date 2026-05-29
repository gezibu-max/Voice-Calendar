import { useState, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognition = typeof window !== 'undefined' 
    ? (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition)
    : null;
  
  const recognitionInstance = recognition ? new recognition() : null;
  
  useEffect(() => {
    if (!recognitionInstance) return;
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'zh-CN';
    
    recognitionInstance.onresult = (event) => {
      const interimTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setTranscript(interimTranscript);
    };
    
    recognitionInstance.onerror = () => {
      setIsListening(false);
    };
    
    recognitionInstance.onend = () => {
      if (isListening) {
        recognitionInstance.start();
      }
    };
    
    return () => {
      recognitionInstance.abort();
    };
  }, [recognitionInstance, isListening]);
  
  const startListening = useCallback(() => {
    if (!recognitionInstance) return;
    setIsListening(true);
    setTranscript('');
    recognitionInstance.start();
  }, [recognitionInstance]);
  
  const stopListening = useCallback(() => {
    if (!recognitionInstance) return;
    setIsListening(false);
    recognitionInstance.stop();
  }, [recognitionInstance]);
  
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  };
};
