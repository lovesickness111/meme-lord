import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from '../src/http.js';

let server: RunningServer;
let historyTmp: string;

const get = (path: string) => fetch(`${server.url}${path}`);
const post = (path: string, body: unknown) =>
  fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const DRAKE_SPEC = {
  base: { kind: 'template', id: 'drake' },
  texts: [{ slot: 'no', text: 'writing HTTP servers by hand' }],
  output: {},
};

describe('HTTP adapter', () => {
  beforeAll(async () => {
    historyTmp = mkdtempSync(join(tmpdir(), 'meme-history-'));
    process.env.MEME_HISTORY_DIR = historyTmp;
    server = await startServer({ port: 0, uiDir: join(__dirname, '..', 'dist', 'ui') });
  });

  afterAll(async () => {
    await server.close();
    delete process.env.MEME_HISTORY_DIR;
    rmSync(historyTmp, { recursive: true, force: true });
  });

  it('binds localhost and reports its url', () => {
    expect(server.url).toBe(`http://127.0.0.1:${server.port}`);
  });

  it('GET /api/templates lists the catalog', async () => {
    const res = await get('/api/templates');
    expect(res.status).toBe(200);
    const list = (await res.json()) as { id: string }[];
    expect(list.map((t) => t.id)).toContain('drake');
    expect(list.find((t) => t.id === 'drake')).toMatchObject({ guideSource: 'curated' });
  });

  it('GET /api/templates supports type/search filters', async () => {
    const gifs = (await (await get('/api/templates?type=gif')).json()) as { type: string }[];
    expect(gifs.length).toBeGreaterThan(0);
    expect(gifs.every((t) => t.type === 'gif')).toBe(true);
    const drakes = (await (await get('/api/templates?search=drake')).json()) as { id: string }[];
    expect(drakes.map((t) => t.id)).toContain('drake');
  });

  it('GET /api/templates/:id returns full metadata with an example', async () => {
    const res = await get('/api/templates/drake');
    expect(res.status).toBe(200);
    const t = (await res.json()) as {
      slots: { rect: number[] }[];
      selectionGuide: { source: string; bestFor: string[] };
      example: { base: unknown };
    };
    expect(t.slots[0]!.rect).toHaveLength(4);
    expect(t.example.base).toEqual({ kind: 'template', id: 'drake' });
    expect(t.selectionGuide.source).toBe('curated');
    expect(t.selectionGuide.bestFor.length).toBeGreaterThan(0);
  });

  it('GET /api/templates/:id 404s with a typed error for unknown ids', async () => {
    const res = await get('/api/templates/nope');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('GET /api/preview/:id returns a png', async () => {
    const res = await get('/api/preview/drake');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
  });

  it('GET /thumbs/:id returns a resized webp', async () => {
    const res = await get('/thumbs/drake');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('POST /api/measure returns boxes and fitted sizes without a raster', async () => {
    const res = await post('/api/measure', DRAKE_SPEC);
    expect(res.status).toBe(200);
    const m = (await res.json()) as {
      width: number;
      boxes: { slot?: string; fittedSize: number; rect: { width: number } }[];
    };
    expect(m.width).toBe(1200);
    expect(m.boxes[0]!.slot).toBe('no');
    expect(m.boxes[0]!.fittedSize).toBeGreaterThan(0);
  });

  it('POST /api/render returns base64 image data and warnings', async () => {
    const res = await post('/api/render', DRAKE_SPEC);
    expect(res.status).toBe(200);
    const r = (await res.json()) as {
      base64: string;
      width: number;
      format: string;
      warnings: unknown[];
    };
    expect(r.format).toBe('png');
    expect(r.width).toBe(1200);
    expect(Buffer.from(r.base64, 'base64').subarray(1, 4).toString()).toBe('PNG');
  });

  it('POST /api/render rejects invalid specs with a typed 400', async () => {
    const res = await post('/api/render', { base: { kind: 'nope' } });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_SPEC');
  });

  it('history save / list / fetch / delete round-trips', async () => {
    const render = (await (await post('/api/render', DRAKE_SPEC)).json()) as { base64: string };
    const saved = (await (
      await post('/api/history', { spec: DRAKE_SPEC, png: render.base64 })
    ).json()) as { id: string };
    expect(saved.id).toMatch(/^\d+-[0-9a-f]{8}$/);

    const list = (await (await get('/api/history')).json()) as { id: string }[];
    expect(list.map((e) => e.id)).toContain(saved.id);

    const spec = (await (await get(`/api/history/${saved.id}.json`)).json()) as typeof DRAKE_SPEC;
    expect(spec.base).toEqual(DRAKE_SPEC.base);
    const png = await get(`/api/history/${saved.id}.png`);
    expect(png.headers.get('content-type')).toBe('image/png');

    const del = await fetch(`${server.url}/api/history/${saved.id}.json`, { method: 'DELETE' });
    expect(del.status).toBe(200);
    const after = (await (await get('/api/history')).json()) as { id: string }[];
    expect(after.map((e) => e.id)).not.toContain(saved.id);
  });

  it('rejects traversal in history names', async () => {
    const res = await get('/api/history/..%2F..%2Fetc.json');
    expect([403, 404]).toContain(res.status);
  });

  it('serves the SPA index at /', async () => {
    const res = await get('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('<div id="app">');
  });

  it('falls back to index.html for SPA routes', async () => {
    const res = await get('/my-memes');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('404s unknown /api/ GET routes with a typed error instead of the SPA', async () => {
    const res = await get('/api/nonexistent');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('IO_ERROR');
  });
});
