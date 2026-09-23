import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { measureMeme, renderMeme } from '../src/render/renderer.js';
import { MemeError } from '../src/spec.js';

const GOLDEN_DIR = join(__dirname, 'golden');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

/** Mean absolute per-channel pixel difference between two encoded images. */
async function pixelDiff(a: Buffer, b: Buffer): Promise<number> {
  const [ra, rb] = await Promise.all([
    sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  expect(ra.info.width).toBe(rb.info.width);
  expect(ra.info.height).toBe(rb.info.height);
  let total = 0;
  for (let i = 0; i < ra.data.length; i++) total += Math.abs(ra.data[i]! - rb.data[i]!);
  return total / ra.data.length;
}

async function expectGolden(name: string, buffer: Buffer): Promise<void> {
  const path = join(GOLDEN_DIR, name);
  if (UPDATE || !existsSync(path)) {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    writeFileSync(path, buffer);
    return;
  }
  const diff = await pixelDiff(readFileSync(path), buffer);
  expect(diff, `${name} differs from golden by ${diff}`).toBeLessThan(1);
}

describe('renderMeme', () => {
  it('renders the classic drake meme (golden)', async () => {
    const result = await renderMeme({
      base: { kind: 'template', id: 'drake' },
      texts: [
        { slot: 'no', text: 'MANUAL EDITORS' },
        { slot: 'yes', text: 'AGENT CLIS' },
      ],
      output: {},
    });
    expect(result.format).toBe('png');
    expect(result.width).toBe(1200);
    await expectGolden('drake.png', result.buffer);
  });

  it('renders free-placement text on a blank canvas (golden)', async () => {
    const result = await renderMeme({
      base: { kind: 'canvas', width: 600, height: 400, color: '#1e3a5f' },
      texts: [{ text: 'HELLO AGENTS', y: '10%', height: '30%' }],
      output: {},
    });
    expect(result.width).toBe(600);
    await expectGolden('canvas.png', result.buffer);
  });

  it('renders a 2x1 layout with cell images (golden)', async () => {
    const cell = join(__dirname, '..', 'assets', 'templates', 'images', 'this-is-fine.jpg');
    const result = await renderMeme({
      base: { kind: 'layout', grid: [2, 1], cells: [{ image: cell }, { image: cell }], width: 600 },
      texts: [],
      output: {},
    });
    await expectGolden('layout.png', result.buffer);
  });

  it('is deterministic: identical spec, identical bytes', async () => {
    const spec = {
      base: { kind: 'template', id: 'two-buttons' },
      texts: [
        { slot: 'left', text: 'SHIP IT' },
        { slot: 'right', text: 'TEST IT' },
      ],
      output: {},
    };
    const [a, b] = await Promise.all([renderMeme(spec), renderMeme(spec)]);
    expect(a.buffer.equals(b.buffer)).toBe(true);
  });

  it('supports jpeg output and maxWidth downscaling', async () => {
    const result = await renderMeme({
      base: { kind: 'template', id: 'drake' },
      texts: [{ slot: 'yes', text: 'SMALL' }],
      output: { format: 'jpeg', maxWidth: 300 },
    });
    expect(result.width).toBe(300);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(300);
  });

  it('throws SLOT_NOT_FOUND for a bad slot', async () => {
    await expect(
      renderMeme({
        base: { kind: 'template', id: 'drake' },
        texts: [{ slot: 'bogus', text: 'X' }],
        output: {},
      }),
    ).rejects.toMatchObject({ code: 'SLOT_NOT_FOUND' });
  });

  it('throws TEMPLATE_NOT_FOUND for a bad template', async () => {
    await expect(
      renderMeme({ base: { kind: 'template', id: 'bogus' }, texts: [], output: {} }),
    ).rejects.toMatchObject({ code: 'TEMPLATE_NOT_FOUND' });
  });

  it('throws UNREADABLE_IMAGE for a missing image path', async () => {
    await expect(
      renderMeme({ base: { kind: 'image', path: '/nope/missing.png' }, texts: [], output: {} }),
    ).rejects.toMatchObject({ code: 'UNREADABLE_IMAGE' });
  });

  it('renders emoji via the fallback chain without warnings', async () => {
    const result = await renderMeme({
      base: { kind: 'canvas', width: 300, height: 200 },
      texts: [{ text: 'SHIP IT \u{1F680}' }],
      output: {},
    });
    expect(result.warnings.find((x) => x.code === 'UNSUPPORTED_GLYPHS')).toBeUndefined();
  });

  it('warns with structured UNSUPPORTED_GLYPHS for unmapped codepoints', async () => {
    const result = await renderMeme({
      base: { kind: 'canvas', width: 300, height: 200 },
      texts: [{ text: 'BAD \u{0378}' }],
      output: {},
    });
    const w = result.warnings.find((x) => x.code === 'UNSUPPORTED_GLYPHS');
    expect(w).toBeDefined();
    expect(w && 'codepoints' in w ? w.codepoints : []).toContain('U+0378');
  });

  it('warns EMPTY_TEXT for blank boxes', async () => {
    const result = await renderMeme({
      base: { kind: 'canvas', width: 100, height: 100 },
      texts: [{ text: '   ' }],
      output: {},
    });
    expect(result.warnings.some((w) => w.code === 'EMPTY_TEXT')).toBe(true);
  });

  it('strict mode turns warnings into a hard error', async () => {
    await expect(
      renderMeme({
        base: { kind: 'canvas', width: 100, height: 100 },
        texts: [{ text: '' }],
        output: { onDegrade: 'error' },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SPEC' });
  });

  it('rejects over-limit canvas dimensions with RESOURCE_LIMIT', async () => {
    await expect(
      renderMeme({ base: { kind: 'canvas', width: 10000, height: 10000 }, texts: [], output: {} }),
    ).rejects.toMatchObject({ code: 'RESOURCE_LIMIT' });
  });

  it('warns EXTENSION_MISMATCH when path extension differs from format', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'meme-ext-'));
    const out = join(dir, 'out.png');
    const result = await renderMeme({
      base: { kind: 'canvas', width: 50, height: 50 },
      texts: [],
      output: { path: out, format: 'jpeg' },
    });
    expect(result.warnings.some((w) => w.code === 'EXTENSION_MISMATCH')).toBe(true);
  });

  it('refuses to overwrite an existing output unless overwrite is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'meme-ow-'));
    const out = join(dir, 'out.png');
    const spec = {
      base: { kind: 'canvas', width: 40, height: 40 },
      texts: [],
      output: { path: out },
    };
    await renderMeme(spec);
    await expect(renderMeme(spec)).rejects.toMatchObject({ code: 'PATH_DENIED' });
    const forced = { ...spec, output: { path: out, overwrite: true } };
    await expect(renderMeme(forced)).resolves.toBeDefined();
  });

  it('reports overflow warnings instead of corrupting output', async () => {
    const result = await renderMeme({
      base: { kind: 'canvas', width: 60, height: 40 },
      texts: [
        {
          text: 'AN EXTREMELY LONG CAPTION THAT CANNOT POSSIBLY FIT',
          x: 0,
          y: 0,
          width: 20,
          height: 10,
        },
      ],
      output: {},
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(60);
  });

  it('reports structured quality warnings when text technically fits but is unreadable', async () => {
    const spec = {
      base: { kind: 'canvas' as const, width: 300, height: 180 },
      texts: [
        {
          text: 'ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN',
          x: 20,
          y: 20,
          width: 120,
          height: 120,
          constraints: { minFontSize: 80, maxLines: 1, maxTextCoverage: 0.01 },
        },
      ],
      output: {},
    };
    const result = await renderMeme(spec);
    expect(result.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['TEXT_TOO_SMALL', 'TEXT_TOO_MANY_LINES', 'TEXT_TOO_DENSE']),
    );
  });

  it('turns quality warnings into a hard error in strict mode', async () => {
    await expect(
      renderMeme({
        base: { kind: 'canvas', width: 300, height: 180 },
        texts: [
          {
            text: 'THIS CAPTION MUST NOT SHRINK SILENTLY',
            width: 100,
            height: 40,
            constraints: { minFontSize: 80 },
          },
        ],
        output: { onDegrade: 'error' },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_SPEC',
      details: {
        warnings: expect.arrayContaining([expect.objectContaining({ code: 'TEXT_TOO_SMALL' })]),
      },
    });
  });

  it('uses template safeRect plus padding for measurement', async () => {
    const result = await measureMeme({
      base: { kind: 'template', id: 'disappointed-black-guy' },
      texts: [{ slot: 'expectation', text: 'BENCHMARKS' }],
      output: {},
    });
    expect(result.boxes[0]?.rect).toEqual({ x: 47, y: 47, width: 516, height: 216 });
    expect(result.boxes[0]?.lineCount).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it('rejects the old four-line Change My Mind caption in strict mode', async () => {
    await expect(
      renderMeme({
        base: { kind: 'template', id: 'change-my-mind' },
        texts: [
          {
            slot: 'sign',
            text: 'CÁC ÔNG LỚN:\nMODEL TỐT? TÙY.\nBẢNG ĐIỂM ĐẸP? BẮT BUỘC.\n— GOODHART',
            style: { color: 'black', strokeWidth: 0, caps: false },
          },
        ],
        output: { onDegrade: 'error' },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_SPEC',
      details: {
        warnings: expect.arrayContaining([
          expect.objectContaining({ code: 'TEXT_TOO_MANY_LINES' }),
        ]),
      },
    });
  });

  it('supports top/middle/bottom band slots on non-template bases', async () => {
    const result = await renderMeme({
      base: { kind: 'canvas', width: 600, height: 400 },
      texts: [
        { slot: 'top', text: 'TOP' },
        { slot: 'bottom', text: 'BOTTOM' },
      ],
      output: {},
    });
    expect(result.width).toBe(600);
    await expect(
      renderMeme({
        base: { kind: 'canvas', width: 600, height: 400 },
        texts: [{ slot: 'sideways', text: 'NOPE' }],
        output: {},
      }),
    ).rejects.toMatchObject({ code: 'SLOT_NOT_FOUND' });
  });

  it('rejects layout with too many cells', async () => {
    await expect(
      renderMeme({
        base: {
          kind: 'layout',
          grid: [1, 1],
          cells: [{ image: 'a.png' }, { image: 'b.png' }],
        },
        texts: [],
        output: {},
      }),
    ).rejects.toBeInstanceOf(MemeError);
  });
});
