import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  finalTranscript: string;
  interimTranscript: string;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

type Ctor = new () => SpeechRecognition;

const getRecognitionCtor = (): Ctor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);

  const isSupported = !!getRecognitionCtor();

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'zh-CN';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        setFinalTranscript(prev => (prev ? prev + ' ' : '') + finalText.trim());
      }
      setInterimTranscript(interimText);
    };

    rec.onerror = () => {
      setIsListening(false);
      shouldRestartRef.current = false;
    };

    rec.onend = () => {
      if (shouldRestartRef.current) {
        try { rec.start(); } catch { /* ignore */ }
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    recognitionRef.current = rec;
    return () => {
      shouldRestartRef.current = false;
      try { rec.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    setFinalTranscript('');
    setInterimTranscript('');
    shouldRestartRef.current = true;
    setIsListening(true);
    try { rec.start(); } catch { /* already running */ }
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    shouldRestartRef.current = false;
    setIsListening(false);
    try { rec.stop(); } catch { /* ignore */ }
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  const transcript = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();

  return {
    isSupported,
    isListening,
    finalTranscript,
    interimTranscript,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  };
};
