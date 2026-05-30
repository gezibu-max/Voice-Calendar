import { useEffect, useRef, useState } from 'react';

interface VoiceModalProps {
  isListening: boolean;
  finalTranscript: string;
  interimTranscript: string;
  isSupported: boolean;
  parsing?: boolean;
  onStart: () => void;
  onStop: () => void;
  onSubmit: (text: string, mode?: 'speech' | 'schedule') => void;
  onSubmitImage: (file: File) => void;
  onClose: () => void;
}

type Tab = 'voice' | 'image';

const accentBtn = 'h-9 px-4 rounded-pill text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100';
const accentStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #5AC8FA 0%, #0A84FF 60%, #5E5CE6 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -6px rgba(10,132,255,0.55)',
};

export const VoiceModal = ({
  isListening,
  finalTranscript,
  interimTranscript,
  isSupported,
  parsing = false,
  onStart,
  onStop,
  onSubmit,
  onSubmitImage,
  onClose,
}: VoiceModalProps) => {
  const [tab, setTab] = useState<Tab>('voice');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transcript = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
  const hasVoiceContent = transcript.length > 0;
  const hasImage = imageFile !== null;
  const busy = parsing;

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
        } else if (tab === 'image' && hasImage && imageFile) {
          e.preventDefault();
          onSubmitImage(imageFile);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, hasVoiceContent, hasImage, transcript, imageFile, busy, onStop, onSubmit, onSubmitImage, onClose]);

  const handleSubmit = () => {
    if (busy) return;
    if (tab === 'voice' && hasVoiceContent) {
      onStop();
      onSubmit(transcript, 'speech');
    } else if (tab === 'image' && hasImage && imageFile) {
      onSubmitImage(imageFile);
    }
  };

  const handleCancel = () => {
    if (busy) return;
    onStop();
    onClose();
  };

  const handleFile = (file: File) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-pill transition-all ${
        tab === id
          ? 'bg-white dark:bg-white/16 text-neutral-900 dark:text-white shadow-specular dark:shadow-specular-dark'
          : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 bg-neutral-900/25 dark:bg-black/45 backdrop-blur-md animate-fade-in"
      onClick={handleCancel}
    >
      <div
        className="glass-strong rounded-panel w-full max-w-md animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="glass-pill inline-flex p-0.5 rounded-pill">
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
            className="w-8 h-8 grid place-items-center rounded-pill text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            title="关闭 (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {tab === 'voice' ? (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`relative flex h-2 w-2 ${isListening ? 'animate-pulse-glow' : 'opacity-40'} rounded-full`}>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {!isSupported ? '浏览器不支持语音' : isListening ? '正在聆听' : '已暂停'}
              </span>
            </div>

            <div className="min-h-[120px] flex items-center">
              {!isSupported ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  当前浏览器不支持 Web Speech API。请使用 Chrome、Edge 等基于 Chromium 的浏览器。
                </p>
              ) : !hasVoiceContent ? (
                <div className="flex items-center gap-3 w-full">
                  <Waveform active={isListening} />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {isListening ? '说"明天下午三点开会"创建，或"明天有什么事"查询…' : '点击下方按钮重新开始'}
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
                    <span className="ml-0.5 inline-block w-[2px] h-[1.1em] -mb-[0.1em] bg-accent animate-pulse align-middle" />
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
                className="glass-subtle min-h-[180px] rounded-panel flex flex-col items-center justify-center gap-2 cursor-pointer text-neutral-600 dark:text-neutral-300 hover:bg-white/70 dark:hover:bg-white/8 transition-all hover:-translate-y-0.5"
              >
                <div
                  className="w-12 h-12 rounded-full grid place-items-center text-white"
                  style={{
                    background: 'linear-gradient(135deg, #FF6FB3 0%, #C77DFF 60%, #5E5CE6 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -6px rgba(94,92,230,0.5)',
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
                <div className="text-sm font-medium">点击或拖入课程表 / 日程截图</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  支持 PNG / JPG / WebP，由 AI 视觉模型直读
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="glass-subtle relative rounded-panel overflow-hidden p-1">
                  <img src={imagePreview} alt="预览" className="max-h-48 mx-auto rounded-card" />
                  <button
                    onClick={resetImage}
                    disabled={busy}
                    className="glass-pill absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-pill text-neutral-700 dark:text-neutral-200 disabled:opacity-40"
                    title="重新上传"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center">
                  {busy ? 'AI 正在识图…通常需要 10–30 秒' : '点击下方"AI 识图解析"，由视觉大模型直接抽取课程 / 日程。'}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-5 py-3 flex items-center justify-between gap-2 border-t border-white/40 dark:border-white/8">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:flex items-center gap-1">
            <kbd className="glass-pill font-mono px-1.5 py-0.5 rounded-md text-[10px]">Enter</kbd>
            <span>提交</span>
            <kbd className="glass-pill font-mono px-1.5 py-0.5 rounded-md text-[10px] ml-1.5">Esc</kbd>
            <span>取消</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {tab === 'voice' && (
              <button
                onClick={isListening ? onStop : onStart}
                disabled={!isSupported || busy}
                className="glass-pill h-9 px-4 text-xs font-medium text-neutral-700 dark:text-neutral-200 rounded-pill disabled:opacity-40"
              >
                {isListening ? '暂停' : '继续'}
              </button>
            )}
            {tab === 'image' && imagePreview && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="glass-pill h-9 px-4 text-xs font-medium text-neutral-700 dark:text-neutral-200 rounded-pill disabled:opacity-40"
              >
                换图
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={busy || (tab === 'voice' ? !hasVoiceContent : !hasImage)}
              className={accentBtn}
              style={accentStyle}
            >
              {busy && (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {parsing
                ? (tab === 'image' ? 'AI 识图中…' : '解析中…')
                : (tab === 'image' ? 'AI 识图解析' : '提交')}
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
        className={`w-1 rounded-full ${active ? 'animate-[pulse_1.2s_ease-in-out_infinite]' : 'opacity-30'}`}
        style={{
          height: active ? `${[40, 75, 100, 65, 50][i]}%` : '20%',
          animationDelay: `${i * 120}ms`,
          background: 'linear-gradient(180deg, #FF6FB3, #C77DFF)',
          boxShadow: active ? '0 0 8px rgba(199,125,255,0.5)' : 'none',
        }}
      />
    ))}
  </div>
);
