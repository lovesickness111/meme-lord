import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getTemplate, listTemplates, templateImagePath } from './catalog.js';
import { limits, Semaphore } from './limits.js';
import { setPathPolicy } from './paths.js';
import { measureMeme, renderMeme } from './render/renderer.js';
import { MemeError } from './spec.js';
import { resolveTemplateSelectionGuide } from './template-guide.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MAX_SPEC_BODY_BYTES = 1_000_000;
const THUMB_WIDTH = 320;
const PREVIEW_CACHE_MAX_BYTES = 64_000_000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export function historyDir(): string {
  return process.env.MEME_HISTORY_DIR ?? join(homedir(), '.meme-maker', 'history');
}

const previewCache = new Map<string, { buffer: Buffer; mime: string }>();
let previewCacheBytes = 0;
const thumbCache = new Map<string, Buffer>();
const semaphore = new Semaphore(limits.maxConcurrency());

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendError(res: ServerResponse, err: unknown): void {
  const code = err instanceof MemeError ? err.code : 'IO_ERROR';
  const message = err instanceof Error ? err.message : String(err);
  const details = err instanceof MemeError ? err.details : undefined;
  const status =
    code === 'TEMPLATE_NOT_FOUND' || code === 'SLOT_NOT_FOUND'
      ? 404
      : code === 'INVALID_SPEC' || code === 'INVALID_JSON' || code === 'RESOURCE_LIMIT'
        ? 400
        : code === 'PATH_DENIED'
          ? 403
          : 500;
  sendJson(res, status, { error: { code, message, details } });
}

async function readBody(req: IncomingMessage, maxBytes = MAX_SPEC_BODY_BYTES): Promise<unknown> {
  const cap = Math.min(maxBytes, limits.maxBodyBytes());
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += (chunk as Buffer).length;
    if (total > cap) {
      throw new MemeError('RESOURCE_LIMIT', `request body exceeds ${cap} bytes`, {
        limit: cap,
        kind: 'body_bytes',
      });
    }
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new MemeError(
      'INVALID_JSON',
      `request body is not valid JSON: ${(err as Error).message}`,
    );
  }
}

async function previewTemplate(id: string): Promise<{ buffer: Buffer; mime: string }> {
  const cached = previewCache.get(id);
  if (cached) return cached;
  const t = getTemplate(id);
  const result = await semaphore.run(() =>
    renderMeme({ base: { kind: 'template', id }, texts: [], output: {} }),
  );
  const entry = {
    buffer: result.buffer,
    mime: t.type === 'gif' ? 'image/gif' : 'image/png',
  };
  previewCacheBytes += entry.buffer.length;
  previewCache.set(id, entry);
  for (const [k, v] of previewCache) {
    if (previewCacheBytes <= PREVIEW_CACHE_MAX_BYTES) break;
    previewCache.delete(k);
    previewCacheBytes -= v.buffer.length;
  }
  return entry;
}

async function thumbTemplate(id: string): Promise<Buffer> {
  const cached = thumbCache.get(id);
  if (cached) return cached;
  const t = getTemplate(id);
  const path = templateImagePath(t);
  const buffer = await sharp(path, { limitInputPixels: limits.maxPixels(), pages: 1 })
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  thumbCache.set(id, buffer);
  return buffer;
}

const HISTORY_NAME_RE = /^[\w-]+$/;

interface HistoryEntry {
  id: string;
  savedAt: number;
  template?: string;
}

async function listHistory(): Promise<HistoryEntry[]> {
  const dir = historyDir();
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const entries: HistoryEntry[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const id = f.slice(0, -'.json'.length);
    if (!HISTORY_NAME_RE.test(id) || !files.includes(`${id}.png`)) continue;
    const ts = parseInt(id.split('-')[0] ?? '', 10);
    let template: string | undefined;
    try {
      const spec = JSON.parse(await readFile(join(dir, f), 'utf8')) as {
        base?: { kind?: string; id?: string };
      };
      template = spec.base?.kind === 'template' ? spec.base.id : spec.base?.kind;
    } catch {
      /* unreadable spec; still list the image */
    }
    entries.push({ id, savedAt: Number.isFinite(ts) ? ts : 0, template });
  }
  return entries.sort((a, b) => b.savedAt - a.savedAt);
}

async function saveHistory(body: { spec?: unknown; png?: string }): Promise<HistoryEntry> {
  if (!body || typeof body !== 'object' || body.spec === undefined || !body.png) {
    throw new MemeError('INVALID_SPEC', 'expected { spec, png } with png as base64');
  }
  const png = Buffer.from(body.png, 'base64');
  if (png.length === 0 || png.length > limits.maxInputBytes()) {
    throw new MemeError('RESOURCE_LIMIT', 'png payload empty or too large', {
      kind: 'input_bytes',
    });
  }
  const ts = Date.now();
  const hash = createHash('sha1').update(JSON.stringify(body.spec)).digest('hex').slice(0, 8);
  const id = `${ts}-${hash}`;
  const dir = historyDir();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id}.json`), JSON.stringify(body.spec, null, 2));
  await writeFile(join(dir, `${id}.png`), png);
  return { id, savedAt: ts };
}

function historyFile(name: string): string {
  const id = name.replace(/\.(json|png)$/, '');
  if (!HISTORY_NAME_RE.test(id)) {
    throw new MemeError('PATH_DENIED', `invalid history id "${name}"`, { path: name });
  }
  return join(historyDir(), name);
}

async function serveStatic(res: ServerResponse, uiDir: string, pathname: string): Promise<void> {
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = resolve(uiDir, normalize(rel));
  const base = resolve(uiDir);
  const target = file.startsWith(base + sep) && existsSync(file) ? file : join(uiDir, 'index.html');
  if (!existsSync(target)) {
    sendJson(res, 404, {
      error: { code: 'IO_ERROR', message: 'UI not built; run `npm run build:ui`' },
    });
    return;
  }
  const body = await readFile(target);
  res.writeHead(200, {
    'content-type': MIME[extname(target)] ?? 'application/octet-stream',
    'cache-control': target.endsWith('index.html') ? 'no-store' : 'public, max-age=3600',
  });
  res.end(body);
}

function corsOrigin(): string | undefined {
  const origin = process.env.MEME_CORS_ORIGIN;
  return origin === undefined || origin === '' ? undefined : origin;
}

function clientIp(req: IncomingMessage): string {
  if (process.env.MEME_TRUST_PROXY) {
    const fwd = req.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function logRequest(req: IncomingMessage, res: ServerResponse): void {
  const start = Date.now();
  // Capture the IP up front: the socket is nulled if the request is destroyed.
  const ip = clientIp(req);
  res.once('finish', () => {
    process.stderr.write(
      `${ip} ${req.method ?? '-'} ${req.url ?? '-'} ${res.statusCode} ${Date.now() - start}ms\n`,
    );
  });
}

async function handle(req: IncomingMessage, res: ServerResponse, uiDir: string): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const { pathname } = url;
  const method = req.method ?? 'GET';

  const origin = corsOrigin();
  if (origin) {
    res.setHeader('access-control-allow-origin', origin);
    if (origin !== '*') res.setHeader('vary', 'origin');
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
      });
      res.end();
      return;
    }
  }

  if (method === 'GET' && pathname === '/api/templates') {
    const type = url.searchParams.get('type');
    sendJson(
      res,
      200,
      listTemplates({
        type: type === 'image' || type === 'gif' ? type : undefined,
        tag: url.searchParams.get('tag') ?? undefined,
        search: url.searchParams.get('search') ?? undefined,
      }).map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        width: t.width,
        height: t.height,
        tags: t.tags,
        slots: t.slots.map((s) => ({ name: s.name, hint: s.hint })),
        guideSource: resolveTemplateSelectionGuide(t).source,
      })),
    );
    return;
  }

  const templateMatch = /^\/api\/templates\/([^/]+)$/.exec(pathname);
  if (method === 'GET' && templateMatch) {
    const t = getTemplate(decodeURIComponent(templateMatch[1]!));
    const example = {
      base: { kind: 'template', id: t.id },
      texts: t.slots.map((s) => ({ slot: s.name, text: `<${s.hint ?? s.name}>` })),
    };
    sendJson(res, 200, {
      ...t,
      selectionGuide: resolveTemplateSelectionGuide(t),
      example,
    });
    return;
  }

  const previewMatch = /^\/api\/preview\/([^/]+)$/.exec(pathname);
  if (method === 'GET' && previewMatch) {
    const { buffer, mime } = await previewTemplate(decodeURIComponent(previewMatch[1]!));
    res.writeHead(200, { 'content-type': mime, 'cache-control': 'public, max-age=3600' });
    res.end(buffer);
    return;
  }

  const thumbMatch = /^\/thumbs\/([^/]+)$/.exec(pathname);
  if (method === 'GET' && thumbMatch) {
    const buffer = await thumbTemplate(decodeURIComponent(thumbMatch[1]!));
    res.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'public, max-age=3600' });
    res.end(buffer);
    return;
  }

  if (method === 'POST' && pathname === '/api/measure') {
    sendJson(res, 200, await measureMeme(await readBody(req)));
    return;
  }

  if (method === 'POST' && pathname === '/api/render') {
    const spec = (await readBody(req)) as { output?: Record<string, unknown> };
    const result = await semaphore.run(() => renderMeme(spec));
    sendJson(res, 200, {
      path: result.path,
      base64: result.buffer.toString('base64'),
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      warnings: result.warnings,
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/history') {
    sendJson(res, 200, await listHistory());
    return;
  }

  if (method === 'POST' && pathname === '/api/history') {
    sendJson(
      res,
      200,
      // History saves carry a base64 raster; allow the input-bytes limit plus base64 overhead.
      await saveHistory(
        (await readBody(req, Math.ceil(limits.maxInputBytes() * 1.5))) as {
          spec?: unknown;
          png?: string;
        },
      ),
    );
    return;
  }

  const historyMatch = /^\/api\/history\/([^/]+\.(?:json|png))$/.exec(pathname);
  if (historyMatch) {
    const file = historyFile(decodeURIComponent(historyMatch[1]!));
    if (method === 'GET') {
      if (!existsSync(file)) {
        sendJson(res, 404, { error: { code: 'IO_ERROR', message: 'not found' } });
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': file.endsWith('.png') ? 'image/png' : 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(body);
      return;
    }
    if (method === 'DELETE') {
      const id = historyMatch[1]!.replace(/\.(json|png)$/, '');
      await rm(join(historyDir(), `${id}.json`), { force: true });
      await rm(join(historyDir(), `${id}.png`), { force: true });
      sendJson(res, 200, { deleted: id });
      return;
    }
  }

  if (method === 'GET' && !pathname.startsWith('/api/')) {
    await serveStatic(res, uiDir, pathname);
    return;
  }

  sendJson(res, 404, { error: { code: 'IO_ERROR', message: `no route ${method} ${pathname}` } });
}

export interface HttpServerOptions {
  port?: number;
  host?: string;
  uiDir?: string;
  /** Log requests to stderr. */
  log?: boolean;
  /** Close the server and exit on SIGTERM/SIGINT. */
  handleSignals?: boolean;
}

export interface RunningServer {
  server: Server;
  url: string;
  port: number;
  close: () => Promise<void>;
}

function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const onError = (err: NodeJS.ErrnoException): void => {
      server.removeListener('error', onError);
      if (err.code === 'EADDRINUSE' && port !== 0) {
        // Auto-pick a free port on conflict (DESIGN-v2 §4.1).
        listen(server, 0, host).then(resolvePort, reject);
      } else {
        reject(err);
      }
    };
    server.once('error', onError);
    server.listen(port, host, () => {
      server.removeListener('error', onError);
      const addr = server.address();
      resolvePort(typeof addr === 'object' && addr ? addr.port : port);
    });
  });
}

/** Start the local HTTP adapter: JSON API + static SPA. Binds 127.0.0.1 unless MEME_UI_HOST is set. */
export async function startServer(options: HttpServerOptions = {}): Promise<RunningServer> {
  setPathPolicy('confined');
  const uiDir = options.uiDir ?? join(__dirname, 'ui');
  const host = options.host ?? process.env.MEME_UI_HOST ?? process.env.MEME_HOST ?? '127.0.0.1';
  const server = createServer((req, res) => {
    if (options.log) logRequest(req, res);
    handle(req, res, uiDir).catch((err: unknown) => {
      sendError(res, err);
      // An unconsumed request body (e.g. over-limit) poisons keep-alive reuse;
      // drop the connection once the error response is flushed.
      if (!req.complete) res.once('close', () => req.destroy());
    });
  });
  const port = await listen(server, options.port ?? 0, host);
  const urlHost = host === '0.0.0.0' ? '127.0.0.1' : host.includes(':') ? `[${host}]` : host;
  const url = `http://${urlHost}:${port}`;
  const close = (): Promise<void> =>
    new Promise((r) => {
      server.close(() => r());
      server.closeIdleConnections();
    });
  if (options.handleSignals) {
    const shutdown = (): void => {
      process.stderr.write('shutting down\n');
      void close().then(() => process.exit(0));
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }
  return { server, url, port, close };
}
