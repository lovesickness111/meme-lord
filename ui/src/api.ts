export interface SlotInfo {
  name: string;
  hint?: string;
}

export interface TemplateCard {
  id: string;
  name: string;
  type: 'image' | 'gif';
  width: number;
  height: number;
  tags: string[];
  slots: SlotInfo[];
  guideSource?: 'curated' | 'derived';
}

export interface TemplateSelectionGuide {
  description: string;
  bestFor: string[];
  avoidWhen: string[];
  tone: string[];
  mechanics: { visual: string; text: string };
  source: 'curated' | 'derived';
  previewRecommended: boolean;
}

export interface TemplateSlot {
  name: string;
  rect: [number, number, number, number];
  safeRect?: [number, number, number, number];
  hint?: string;
  constraints?: TextConstraints;
}

export interface TextConstraints {
  padding?: number;
  minFontSize?: number;
  maxLines?: number;
  maxTextCoverage?: number;
}

export interface TemplateDetail extends Omit<TemplateCard, 'slots'> {
  slots: TemplateSlot[];
  selectionGuide?: TemplateSelectionGuide;
  source?: string;
}

export interface TextBox {
  slot?: string;
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  anchor?: 'top' | 'middle' | 'bottom';
  align?: 'left' | 'center' | 'right';
  style?: Record<string, unknown>;
  constraints?: TextConstraints;
  frames?: [number, number];
}

export interface MemeSpec {
  base: Record<string, unknown> & { kind: string };
  texts: TextBox[];
  output: {
    format?: 'png' | 'jpeg' | 'gif' | 'webp';
    quality?: number;
    maxWidth?: number;
  };
}

export interface Warning {
  code: string;
  box?: number;
  fittedSize?: number;
  minimum?: number;
  lines?: number;
  maximum?: number;
  coverage?: number;
  codepoints?: string[];
}

export interface RenderResult {
  base64: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  warnings: Warning[];
}

export interface MeasuredBox {
  box: number;
  slot?: string;
  rect: { x: number; y: number; width: number; height: number };
  fittedSize: number;
  lineCount: number;
  coverage: number;
  overflow: boolean;
}

export interface MeasureResult {
  width: number;
  height: number;
  boxes: MeasuredBox[];
  warnings: Warning[];
}

export interface HistoryEntry {
  id: string;
  savedAt: number;
  template?: string;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = (await res.json()) as T & {
    error?: { code: string; message: string; details?: unknown };
  };
  if (!res.ok || data.error) {
    const e = data.error ?? { code: 'HTTP_' + res.status, message: res.statusText };
    throw new ApiError(e.code, e.message, e.details);
  }
  return data;
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  templates: (params?: { type?: string; search?: string; tag?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.search) q.set('search', params.search);
    if (params?.tag) q.set('tag', params.tag);
    const qs = q.toString();
    return req<TemplateCard[]>(`/api/templates${qs ? '?' + qs : ''}`);
  },
  template: (id: string) => req<TemplateDetail>(`/api/templates/${encodeURIComponent(id)}`),
  render: (spec: MemeSpec) => req<RenderResult>('/api/render', post(spec)),
  measure: (spec: MemeSpec) => req<MeasureResult>('/api/measure', post(spec)),
  history: () => req<HistoryEntry[]>('/api/history'),
  historySpec: (id: string) => req<MemeSpec>(`/api/history/${id}.json`),
  saveHistory: (spec: MemeSpec, png: string) =>
    req<HistoryEntry>('/api/history', post({ spec, png })),
  deleteHistory: (id: string) =>
    req<{ deleted: string }>(`/api/history/${id}.json`, { method: 'DELETE' }),
};
