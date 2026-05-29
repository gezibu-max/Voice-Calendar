import { getColorById } from './colors';

const API_BASE = 'http://127.0.0.1:8011/api';

export interface ParsedDraft {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  colorId: string;
  color: string;
  durationInferred: boolean;
  durationReason: string;
}

interface ParseApiEvent {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color_id?: string;
  duration_inferred?: boolean;
  duration_reason?: string;
}

interface ParseApiResponse {
  events: ParseApiEvent[];
}

const toDraft = (e: ParseApiEvent): ParsedDraft => {
  const colorId = e.color_id || 'blue';
  return {
    title: e.title,
    description: e.description || '',
    startTime: new Date(e.start_time),
    endTime: new Date(e.end_time),
    colorId,
    color: getColorById(colorId),
    durationInferred: e.duration_inferred ?? false,
    durationReason: e.duration_reason || '',
  };
};

export type ParseStatus = 'ok' | 'empty' | 'error';

export interface ParseResult {
  status: ParseStatus;
  drafts: ParsedDraft[];
  text: string;
  message?: string;
}

export const parseEventsFromText = async (
  text: string,
  options?: { mode?: 'speech' | 'schedule'; weeksToExpand?: number },
): Promise<ParseResult> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { status: 'empty', drafts: [], text: trimmed };
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  const mode = options?.mode || 'speech';
  const weeksToExpand = options?.weeksToExpand ?? 16;
  const timeoutMs = mode === 'schedule' ? 90_000 : 35_000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(`${API_BASE}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed,
        now: new Date().toISOString(),
        timezone: tz,
        mode,
        weeks_to_expand: weeksToExpand,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      let friendly = `HTTP ${resp.status}`;
      if (resp.status === 503) friendly = '后端未配置大模型 API Key';
      else if (resp.status === 502) friendly = '大模型上游错误，请稍后重试';
      else if (resp.status === 504) friendly = '大模型超时或网络不通';
      else if (detail) friendly += ` ${detail.slice(0, 100)}`;
      return { status: 'error', drafts: [], text: trimmed, message: friendly };
    }

    const data = (await resp.json()) as ParseApiResponse;
    const drafts = (data.events || []).map(toDraft).filter(d => d.startTime < d.endTime);

    if (drafts.length === 0) {
      return {
        status: 'empty',
        drafts: [],
        text: trimmed,
        message: '没有从这段话里识别出事件，可以换种说法再试',
      };
    }
    return { status: 'ok', drafts, text: trimmed };
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      status: 'error',
      drafts: [],
      text: trimmed,
      message: isAbort ? '请求超时，请稍后再试' : (err instanceof Error ? err.message : String(err)),
    };
  }
};

export const parseEventsFromImage = async (
  file: File,
  options?: { weeksToExpand?: number; timeoutMs?: number },
): Promise<ParseResult> => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  const weeksToExpand = options?.weeksToExpand ?? 16;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const placeholder = `[image:${file.name}]`;

  const form = new FormData();
  form.append('file', file);
  form.append('now', new Date().toISOString());
  form.append('timezone', tz);
  form.append('weeks_to_expand', String(weeksToExpand));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(`${API_BASE}/parse/image`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      let friendly = `HTTP ${resp.status}`;
      if (resp.status === 503) friendly = '后端未配置视觉大模型 API Key';
      else if (resp.status === 502) friendly = '视觉大模型上游错误，请稍后重试';
      else if (resp.status === 504) friendly = '视觉大模型超时或网络不通';
      else if (resp.status === 413) friendly = '图片太大，请压缩到 8MB 以内';
      else if (resp.status === 415) friendly = '不支持的图片格式';
      else if (detail) friendly += ` ${detail.slice(0, 100)}`;
      return { status: 'error', drafts: [], text: placeholder, message: friendly };
    }

    const data = (await resp.json()) as ParseApiResponse;
    const drafts = (data.events || []).map(toDraft).filter(d => d.startTime < d.endTime);

    if (drafts.length === 0) {
      return {
        status: 'empty',
        drafts: [],
        text: placeholder,
        message: '没有从这张图里识别出事件',
      };
    }
    return { status: 'ok', drafts, text: placeholder };
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      status: 'error',
      drafts: [],
      text: placeholder,
      message: isAbort ? '识图超时，请稍后再试或换张更清晰的截图' : (err instanceof Error ? err.message : String(err)),
    };
  }
};
