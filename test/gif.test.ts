import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { getTemplate } from '../src/catalog.js';
import { renderMeme } from '../src/render/renderer.js';

const WIDTH = 120;
const HEIGHT = 90;
const COLORS = ['#ff0000', '#00aa00', '#0000ff'];

let gifPath: string;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'meme-gif-'));
  gifPath = join(dir, 'anim.gif');
  const frames = await Promise.all(
    COLORS.map((background) =>
      sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background } })
        .png()
        .toBuffer(),
    ),
  );
  await sharp(frames, { join: { animated: true } })
    .gif({ delay: [40, 60, 80] })
    .toFile(gifPath);
});

describe('animated GIF pipeline', () => {
  it('captions all frames, preserving frame count and timing', async () => {
    const out = join(mkdtempSync(join(tmpdir(), 'meme-gif-out-')), 'out.gif');
    const result = await renderMeme({
      base: { kind: 'image', path: gifPath },
      texts: [{ text: 'HI', y: 0, height: 40 }],
      output: { path: out },
    });
    expect(result.format).toBe('gif');
    const meta = await sharp(out, { animated: true }).metadata();
    expect(meta.pages).toBe(COLORS.length);
    expect(meta.delay).toEqual([40, 60, 80]);
    expect(meta.width).toBe(WIDTH);
    expect(meta.pageHeight).toBe(HEIGHT);
  });

  it('captions only a frame range when frames is given', async () => {
    const out = join(mkdtempSync(join(tmpdir(), 'meme-gif-out-')), 'out.gif');
    await renderMeme({
      base: { kind: 'image', path: gifPath },
      texts: [{ text: 'HI', y: 0, height: 40, frames: [1, 1] }],
      output: { path: out },
    });
    const raw = await sharp(out, { animated: true }).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const frameBytes = WIDTH * HEIGHT * 4;
    // Frame 0 should be untouched (pure red-ish), frame 1 should contain white pixels.
    const hasWhite = (frame: number): boolean => {
      for (let i = 0; i < frameBytes; i += 4) {
        const o = frame * frameBytes + i;
        if (raw.data[o]! > 200 && raw.data[o + 1]! > 200 && raw.data[o + 2]! > 200) return true;
      }
      return false;
    };
    expect(hasWhite(0)).toBe(false);
    expect(hasWhite(1)).toBe(true);
  });

  it('renders a real catalog GIF template', async () => {
    const template = getTemplate('mind-blown');
    const out = join(mkdtempSync(join(tmpdir(), 'meme-gif-out-')), 'out.gif');
    const result = await renderMeme({
      base: { kind: 'template', id: 'mind-blown' },
      texts: [{ slot: 'top', text: 'WOW' }],
      output: { path: out },
    });
    expect(result.format).toBe('gif');
    const meta = await sharp(out, { animated: true }).metadata();
    expect(meta.width).toBe(template.width);
    expect(meta.pageHeight).toBe(template.height);
    expect(meta.pages ?? 1).toBeGreaterThan(1);
  });

  it('rejects non-gif output for an animated base with UNSUPPORTED_OUTPUT', async () => {
    await expect(
      renderMeme({
        base: { kind: 'image', path: gifPath },
        texts: [{ text: 'X' }],
        output: { format: 'png' },
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_OUTPUT' });
  });

  it('downscales an animated GIF when maxWidth is set', async () => {
    const result = await renderMeme({
      base: { kind: 'image', path: gifPath },
      texts: [{ text: 'HI' }],
      output: { maxWidth: 60 },
    });
    expect(result.width).toBe(60);
    const meta = await sharp(result.buffer, { animated: true }).metadata();
    expect(meta.width).toBe(60);
    expect(meta.pages).toBe(COLORS.length);
  });

  it('warns FRAMES_OUT_OF_RANGE for reversed or out-of-range frames', async () => {
    const result = await renderMeme({
      base: { kind: 'image', path: gifPath },
      texts: [{ text: 'HI', frames: [5, 9] }],
      output: {},
    });
    const w = result.warnings.find((x) => x.code === 'FRAMES_OUT_OF_RANGE');
    expect(w).toBeDefined();
    expect(w && 'frameCount' in w ? w.frameCount : 0).toBe(COLORS.length);
  });

  it('rejects GIFs with too many frames via MEME_MAX_GIF_FRAMES', async () => {
    process.env.MEME_MAX_GIF_FRAMES = '2';
    try {
      await expect(
        renderMeme({ base: { kind: 'image', path: gifPath }, texts: [], output: {} }),
      ).rejects.toMatchObject({ code: 'RESOURCE_LIMIT' });
    } finally {
      delete process.env.MEME_MAX_GIF_FRAMES;
    }
  });
});
