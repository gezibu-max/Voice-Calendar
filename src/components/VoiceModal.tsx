import { useEffect, useRef, useState } from 'react';
import { ocrImageToText, type OcrProgress } from '@/utils/ocr';

interface VoiceModalProps {
  isListening: boolean;
  finalTranscript: string;
  interimTranscript: string;
  isSupported: boolean;
  parsing?: boolean;
  onStart: () => void;
  onStop: () => void;
  onSubmit: (text: string, mode?: 'speech' | 'schedule') => void;
  onClose: () => void;
}

type Tab = 'voice' | 'image';

export const VoiceModal = ({
  isListening,
  finalTranscript,
  interimTranscript,
  isSupported,
  parsing = false,
  onStart,
  onStop,
  onSubmit,
  onClose,
}: VoiceModalProps) => {
  const [tab, setTab] = useState<Tab>('voice');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transcript = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
  const hasVoiceContent = transcript.length > 0;
  const hasImageText = ocrText.trim().length > 0;
  const busy = parsing || (ocrProgress !== null && ocrProgress.progress < 1);

  useEffect(() => {
    if (tab === 'voice' && isSupported && !isListening && !finalTranscript) {
      onStart();
    }
    if (tab === 'image' && isListening) {
      onStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === 'Escape') {
        onStop();
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        if (tab === 'voice' && hasVoiceContent) {
          e.preventDefault();
          onStop();
          onSubmit(transcript, 'speech');
        } else if (tab === 'image' && hasImageText) {
          e.preventDefault();
          onSubmit(ocrText, 'schedule');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, hasVoiceContent, hasImageText, transcript, ocrText, busy, onStop, onSubmit, onClose]);

  const handleSubmit = () => {
    if (busy) return;
    if (tab === 'voice' && hasVoiceContent) {
      onStop();
      onSubmit(transcript, 'speech');
    } else if (tab === 'image' && hasImageText) {
      onSubmit(ocrText, 'schedule');
    }
  };

  const handleCancel = () => {
    if (busy) return;
    onStop();
    onClose();
  };

  const handleFile = async (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrText('');
    setOcrError(null);
    setOcrProgress({ status: '加载 OCR 引擎', progress: 0.05 });
    try {
      const text = await ocrImageToText(file, p => setOcrProgress(p));
      setOcrText(text);
      setOcrProgress({ status: '完成', progress: 1 });
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : String(err));
      setOcrProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md transition-colors ${
        tab === id
          ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-soft'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 bg-neutral-900/30 dark:bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleCancel}
    >
      <div
        className="bg-white dark:bg-neutral-950 rounded-2xl shadow-pop border border-neutral-200/70 dark:border-neutral-800 w-full max-w-md animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="inline-flex p-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
            {tabBtn('voice', '语音', (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
              </svg>
            ))}
            {tabBtn('image', '截图', (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            ))}
          </div>
          <button
            onClick={handleCancel}
            className="w-7 h-7 grid place-items-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            title="关闭 (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {tab === 'voice' ? (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`relative flex h-2 w-2 ${isListening ? '' : 'opacity-40'}`}>
                {isListening && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {!isSupported ? '浏览器不支持语音' : isListening ? '正在聆听' : '已暂停'}
              </span>
            </div>

            <div className="min-h-[120px] flex items-center">
              {!isSupported ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  当前浏览器不支持 Web Speech API。请使用 Chrome、Edge 等基于 Chromium 的浏览器。
                </p>
              ) : !hasVoiceContent ? (
                <div className="flex items-center gap-3 w-full">
                  <Waveform active={isListening} />
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">
                    {isListening ? '请开始说话…' : '点击下方按钮重新开始'}
                  </p>
                </div>
              ) : (
                <p className="text-lg leading-relaxed tracking-tight text-neutral-900 dark:text-neutral-100">
                  <span>{finalTranscript}</span>
                  {interimTranscript && (
                    <>
                      {finalTranscript ? ' ' : ''}
                      <span className="text-neutral-400 dark:text-neutral-500">{interimTranscript}</span>
                    </>
                  )}
                  {isListening && (
                    <span className="ml-0.5 inline-block w-[2px] h-[1.1em] -mb-[0.1em] bg-neutral-400 dark:bg-neutral-500 animate-pulse align-middle" />
                  )}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 pb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="min-h-[160px] rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-neutral-500 dark:text-neutral-400"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <div className="text-sm">点击或拖入课程表 / 日程截图</div>
                <div className="text-[11px] text-neutral-400">支持 PNG / JPG，本地 OCR 识别</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  <img src={imagePreview} alt="预览" className="max-h-48 mx-auto" />
                  <button
                    onClick={() => {
                      if (imagePreview) URL.revokeObjectURL(imagePreview);
                      setImageFile(null);
                      setImagePreview(null);
                      setOcrText('');
                      setOcrProgress(null);
                      setOcrError(null);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 grid place-items-center rounded-md bg-black/40 text-white hover:bg-black/60"
                    title="重新上传"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {ocrProgress && ocrProgress.progress < 1 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>{ocrProgress.status}</span>
                      <span>{Math.round(ocrProgress.progress * 100)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-accent transition-all" style={{ width: `${ocrProgress.progress * 100}%` }} />
                    </div>
                  </div>
                )}

                {ocrError && (
                  <div className="text-xs text-rose-600 dark:text-rose-400">OCR 失败：{ocrError}</div>
                )}

                {ocrText && (
                  <div className="rounded-md border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-2 max-h-32 overflow-y-auto">
                    <textarea
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed resize-none"
                      rows={Math.min(8, Math.max(3, ocrText.split('\n').length))}
                    />
                  </div>
                )}

                {ocrText && (
                  <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    可在上面框里手动修正错字，再点提交交给 AI 解析为日历事件。
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-5 py-3 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-2 bg-neutral-50/60 dark:bg-neutral-900/40">
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 hidden sm:block">
            <kbd className="font-mono px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-[10px]">Enter</kbd>
            <span className="mx-1">提交</span>
            <kbd className="font-mono px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-[10px]">Esc</kbd>
            <span className="ml-1">取消</span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {tab === 'voice' && (
              <button
                onClick={isListening ? onStop : onStart}
                disabled={!isSupported || busy}
                className="h-8 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-300 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-900 transition-colors disabled:opacity-40"
              >
                {isListening ? '暂停' : '继续'}
              </button>
            )}
            {tab === 'image' && imagePreview && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="h-8 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-300 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-900 transition-colors disabled:opacity-40"
              >
                换图
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={busy || (tab === 'voice' ? !hasVoiceContent : !hasImageText)}
              className="h-8 px-3 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {busy && (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {parsing
                ? '解析中…'
                : ocrProgress && ocrProgress.progress < 1
                  ? '识别中…'
                  : (tab === 'image' ? '解析为事件' : '提交')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Waveform = ({ active }: { active: boolean }) => (
  <div className="flex items-center gap-1 h-8">
    {[0, 1, 2, 3, 4].map(i => (
      <span
        key={i}
        className={`w-1 rounded-full bg-rose-500/80 ${active ? 'animate-[pulse_1.2s_ease-in-out_infinite]' : 'opacity-30'}`}
        style={{
          height: active ? `${[40, 75, 100, 65, 50][i]}%` : '20%',
          animationDelay: `${i * 120}ms`,
        }}
      />
    ))}
  </div>
);
