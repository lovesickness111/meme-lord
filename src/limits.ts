import sharp from 'sharp';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Resource limits, env-configurable with safe defaults (DESIGN-v2 §3.4). */
export const limits = {
  maxPixels: (): number => envInt('MEME_MAX_PIXELS', 16_000_000),
  maxInputBytes: (): number => envInt('MEME_MAX_INPUT_BYTES', 25_000_000),
  maxGifFrames: (): number => envInt('MEME_MAX_GIF_FRAMES', 300),
  maxTextLen: (): number => envInt('MEME_MAX_TEXT_LEN', 2_000),
  maxTotalTextLen: (): number => envInt('MEME_MAX_TOTAL_TEXT_LEN', 8_000),
  renderTimeoutMs: (): number => envInt('MEME_RENDER_TIMEOUT_MS', 15_000),
  maxConcurrency: (): number => envInt('MEME_MAX_CONCURRENCY', 4),
  maxBodyBytes: (): number => envInt('MEME_MAX_BODY_BYTES', 5_000_000),
  sharpCacheMb: (): number => envInt('MEME_SHARP_CACHE_MB', 200),
  sharpConcurrency: (): number => envInt('MEME_SHARP_CONCURRENCY', 4),
};

let sharpConfigured = false;

/** Bound sharp's global cache and thread pool. Idempotent. */
export function configureSharp(): void {
  if (sharpConfigured) return;
  sharpConfigured = true;
  sharp.cache({ memory: limits.sharpCacheMb() });
  sharp.concurrency(limits.sharpConcurrency());
}

/** Minimal counting semaphore for adapter-level render concurrency caps. */
export class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}
