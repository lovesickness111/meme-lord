import { afterEach, describe, expect, it } from 'vitest';
import { Semaphore, limits } from '../src/limits.js';

describe('limits', () => {
  afterEach(() => {
    delete process.env.MEME_MAX_PIXELS;
  });

  it('returns the default when the env var is unset or empty', () => {
    delete process.env.MEME_MAX_PIXELS;
    expect(limits.maxPixels()).toBe(16_000_000);
    process.env.MEME_MAX_PIXELS = '';
    expect(limits.maxPixels()).toBe(16_000_000);
  });

  it('reads a positive integer override from the environment', () => {
    process.env.MEME_MAX_PIXELS = '1234';
    expect(limits.maxPixels()).toBe(1234);
  });

  it('falls back to the default for non-numeric or non-positive values', () => {
    for (const bad of ['abc', '0', '-5']) {
      process.env.MEME_MAX_PIXELS = bad;
      expect(limits.maxPixels()).toBe(16_000_000);
    }
  });
});

describe('Semaphore', () => {
  it('never runs more than max tasks concurrently', async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let peak = 0;
    const task = async (): Promise<void> => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
    };
    await Promise.all(Array.from({ length: 6 }, () => sem.run(task)));
    expect(peak).toBe(2);
  });

  it('propagates task results and errors', async () => {
    const sem = new Semaphore(1);
    await expect(sem.run(async () => 42)).resolves.toBe(42);
    await expect(
      sem.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
