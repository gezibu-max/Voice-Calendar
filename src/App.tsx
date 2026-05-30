import { useEffect, useCallback, useState } from 'react';
import { useCalendarStore } from '@/store';
import { Header } from '@/components/Header/Header';
import { Calendar } from '@/components/Calendar/Calendar';
import { EventModal } from '@/components/Event/EventModal';
import { QuickCreate } from '@/components/Event/QuickCreate';
import { EventPreviewModal } from '@/components/Event/EventPreviewModal';
import { QueryResultModal } from '@/components/Event/QueryResultModal';
import { InsightsModal } from '@/components/Event/InsightsModal';
import { VoiceModal } from '@/components/VoiceModal';
import { useEvents } from '@/hooks/useEvents';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useHistory } from '@/hooks/useHistory';
import { parseEventsFromText, parseEventsFromImage, queryEvents, fetchInsights, type ParsedDraft, type ParseStatus, type QueryIntent, type InsightResult } from '@/utils/llmParse';
import { isQueryIntent } from '@/utils/intent';
import type { Event } from '@/types';

function App() {
  const {
    isEventModalOpen,
    selectedEvent,
    closeEventModal,
    isQuickCreateOpen,
    quickCreateTime,
    closeQuickCreate,
    isVoiceModalOpen,
    closeVoiceModal,
    openEventModal,
    currentDate,
    theme,
    setTheme,
  } = useCalendarStore();

  const { events, createEvent, bulkCreateEvents, updateEvent, deleteEvent, clearAllEvents } = useEvents();
  const { speak } = useSpeechSynthesis();
  const speech = useSpeechRecognition();
  const history = useHistory();

  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    status: ParseStatus;
    drafts: ParsedDraft[];
    text: string;
    message?: string;
  } | null>(null);
  const [queryResult, setQueryResult] = useState<{
    question: string;
    answer: string;
    intent: QueryIntent;
    matched: Event[];
  } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsResult, setInsightsResult] = useState<InsightResult | null>(null);
  const [insightsScopeLabel, setInsightsScopeLabel] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const upcomingEvents = events.filter(event => {
        const eventTime = new Date(event.startTime);
        const diffMs = eventTime.getTime() - now.getTime();
        return diffMs > 0 && diffMs <= 1000 * 60 * 5;
      });

      if (upcomingEvents.length > 0) {
        const event = upcomingEvents[0];
        const message = `即将有事件：${event.title}，时间是${event.startTime.toLocaleTimeString('zh-CN')}`;
        speak(message);

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('日历提醒', {
            body: message,
            icon: '/vite.svg',
          });
        }
      }
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [events, speak]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  const handleVoiceCommand = useCallback(async (text: string, mode: 'speech' | 'schedule' = 'speech') => {
    if (!text.trim()) return;

    // 如果是查询意图，分流到查询管线
    if (mode === 'speech' && isQueryIntent(text)) {
      setParsing(true);
      try {
        // 只发"现在 ± 60 天"的事件，避免课表展开后体积超限 + 省 token
        const now = Date.now();
        const windowMs = 60 * 24 * 60 * 60 * 1000;
        const digest = events
          .filter(e => Math.abs(e.startTime.getTime() - now) <= windowMs)
          .map(e => ({
            id: e.id,
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            allDay: e.allDay,
          }));
        const result = await queryEvents(text, digest);
        speech.resetTranscript();
        closeVoiceModal();
        if (result.status === 'ok') {
          const matched = events.filter(e => result.highlightIds.includes(e.id));
          setQueryResult({
            question: text,
            answer: result.answer,
            intent: result.intent,
            matched,
          });
          if (result.answer) speak(result.answer);
        } else {
          const fallback = result.message || '查询失败，请稍后重试';
          setQueryResult({
            question: text,
            answer: fallback,
            intent: 'other',
            matched: [],
          });
          speak(fallback);
        }
      } finally {
        setParsing(false);
      }
      return;
    }

    setParsing(true);
    try {
      const result = await parseEventsFromText(text, { mode });
      setParseResult({
        status: result.status,
        drafts: result.drafts,
        text: result.text,
        message: result.message,
      });
      speech.resetTranscript();
      closeVoiceModal();
      if (result.status === 'ok' && result.drafts.length === 0) {
        speak('没有识别到事件');
      }
    } finally {
      setParsing(false);
    }
  }, [speak, speech, closeVoiceModal, events]);

  const handleImageCommand = useCallback(async (file: File) => {
    setParsing(true);
    try {
      const result = await parseEventsFromImage(file);
      setParseResult({
        status: result.status,
        drafts: result.drafts,
        text: result.text,
        message: result.message,
      });
      closeVoiceModal();
      if (result.status === 'ok' && result.drafts.length === 0) {
        speak('没有识别到事件');
      }
    } finally {
      setParsing(false);
    }
  }, [speak, closeVoiceModal]);

  const handleRetryParse = useCallback(async (text: string) => {
    setParsing(true);
    try {
      const result = await parseEventsFromText(text);
      setParseResult({
        status: result.status,
        drafts: result.drafts,
        text: result.text,
        message: result.message,
      });
    } finally {
      setParsing(false);
    }
  }, []);

  const handleConfirmDrafts = useCallback((drafts: ParsedDraft[]) => {
    if (drafts.length === 0) return;
    const list = drafts.map(d => ({
      title: d.title,
      description: d.description,
      startTime: d.startTime,
      endTime: d.endTime,
      allDay: false,
      color: d.color,
      colorId: d.colorId,
      priority: d.priority || 'P2',
    }));
    if (list.length === 1) {
      createEvent(list[0]);
      speak(`已创建事件：${drafts[0].title}`);
    } else {
      bulkCreateEvents(list, `批量新建 ${list.length} 个事件`);
      speak(`已创建 ${list.length} 个事件`);
    }
  }, [createEvent, bulkCreateEvents, speak]);

  const handleEventClick = useCallback((event: Event) => {
    openEventModal(event);
  }, [openEventModal]);

  const handleInsights = useCallback(async () => {
    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const yesterdayStart = new Date(dayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // 当天 + 前一天事件（前一天用于 follow-up 判断）
    const inScope = events.filter(ev => {
      const t = ev.startTime.getTime();
      return t >= yesterdayStart.getTime() && t < dayEnd.getTime();
    });

    setInsightsScopeLabel(
      dayStart.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    );
    setInsightsOpen(true);
    setInsightsResult(null);
    setInsightsLoading(true);
    try {
      const result = await fetchInsights(
        inScope.map(e => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay,
          priority: e.priority || 'P2',
        })),
        dayStart,
        dayEnd,
      );
      setInsightsResult(result);
      if (result.status === 'ok' && result.summary) speak(result.summary);
    } finally {
      setInsightsLoading(false);
    }
  }, [events, currentDate, speak]);

  const handleSaveEvent = useCallback((data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    createEvent(data);
  }, [createEvent]);

  const handleUpdateEvent = useCallback((id: string, data: Partial<Event>) => {
    updateEvent(id, data);
  }, [updateEvent]);

  const handleDeleteEvent = useCallback((id: string) => {
    deleteEvent(id);
  }, [deleteEvent]);

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex-1 flex flex-col min-h-0 text-neutral-900 dark:text-neutral-100">
        <Header onInsights={handleInsights} insightsLoading={insightsLoading} eventCount={events.length} onClearAll={clearAllEvents} />
        <Calendar onEventClick={handleEventClick} />
      </div>

      {isEventModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={closeEventModal}
          onSave={handleSaveEvent}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {isQuickCreateOpen && quickCreateTime && (
        <QuickCreate
          startTime={quickCreateTime.start}
          endTime={quickCreateTime.end}
          onClose={closeQuickCreate}
          onSave={handleSaveEvent}
        />
      )}

      {isVoiceModalOpen && (
        <VoiceModal
          isSupported={speech.isSupported}
          isListening={speech.isListening}
          finalTranscript={speech.finalTranscript}
          interimTranscript={speech.interimTranscript}
          parsing={parsing}
          onStart={speech.startListening}
          onStop={speech.stopListening}
          onSubmit={handleVoiceCommand}
          onSubmitImage={handleImageCommand}
          onClose={() => {
            speech.stopListening();
            speech.resetTranscript();
            closeVoiceModal();
          }}
        />
      )}

      {parseResult && (
        <EventPreviewModal
          status={parseResult.status}
          drafts={parseResult.drafts}
          text={parseResult.text}
          message={parseResult.message}
          retrying={parsing}
          onConfirm={handleConfirmDrafts}
          onRetry={handleRetryParse}
          onClose={() => setParseResult(null)}
        />
      )}

      {queryResult && (
        <QueryResultModal
          question={queryResult.question}
          answer={queryResult.answer}
          intent={queryResult.intent}
          matched={queryResult.matched}
          onClose={() => setQueryResult(null)}
          onEventClick={openEventModal}
        />
      )}

      {insightsOpen && (
        <InsightsModal
          loading={insightsLoading}
          result={insightsResult}
          events={events}
          scopeLabel={insightsScopeLabel}
          onClose={() => setInsightsOpen(false)}
          onEventClick={(ev) => {
            setInsightsOpen(false);
            openEventModal(ev);
          }}
        />
      )}
    </div>
  );
}

export default App;
