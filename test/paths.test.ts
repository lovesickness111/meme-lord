import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveInputPath, resolveOutputPath, setPathPolicy } from '../src/paths.js';
import { MemeError } from '../src/spec.js';

afterEach(() => {
  setPathPolicy('permissive');
  delete process.env.MEME_ALLOW_FS;
  delete process.env.MEME_INPUT_ROOT;
  delete process.env.MEME_OUTPUT_ROOT;
});

describe('path confinement', () => {
  it('permissive policy passes paths through', () => {
    expect(resolveInputPath('/abs/anywhere.png')).toBe('/abs/anywhere.png');
  });

  it('confined policy denies filesystem reads unless MEME_ALLOW_FS=1', () => {
    setPathPolicy('confined');
    expect(() => resolveInputPath('photo.png')).toThrowError(MemeError);
    try {
      resolveInputPath('photo.png');
    } catch (err) {
      expect((err as MemeError).code).toBe('PATH_DENIED');
    }
  });

  it('confined policy rejects absolute and .. input paths even with MEME_ALLOW_FS', () => {
    setPathPolicy('confined');
    process.env.MEME_ALLOW_FS = '1';
    expect(() => resolveInputPath('/etc/passwd')).toThrowError(MemeError);
    expect(() => resolveInputPath('../secret.png')).toThrowError(MemeError);
  });

  it('confined policy resolves relative inputs under MEME_INPUT_ROOT', () => {
    setPathPolicy('confined');
    process.env.MEME_ALLOW_FS = '1';
    const root = mkdtempSync(join(tmpdir(), 'meme-in-'));
    process.env.MEME_INPUT_ROOT = root;
    expect(resolveInputPath('a/b.png')).toBe(join(root, 'a', 'b.png'));
  });

  it('confined output rejects absolute paths and escapes', () => {
    setPathPolicy('confined');
    const root = mkdtempSync(join(tmpdir(), 'meme-out-'));
    process.env.MEME_OUTPUT_ROOT = root;
    expect(() => resolveOutputPath('/etc/clobber', false)).toThrowError(MemeError);
    expect(() => resolveOutputPath('../escape.png', false)).toThrowError(MemeError);
    expect(resolveOutputPath('ok.png', false)).toBe(join(root, 'ok.png'));
  });

  it('refuses overwrite unless allowed', () => {
    const root = mkdtempSync(join(tmpdir(), 'meme-ow-'));
    process.env.MEME_OUTPUT_ROOT = root;
    const target = join(root, 'x.png');
    writeFileSync(target, 'x');
    expect(() => resolveOutputPath('x.png', false)).toThrowError(MemeError);
    expect(resolveOutputPath('x.png', true)).toBe(target);
  });
});
