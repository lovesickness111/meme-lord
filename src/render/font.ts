import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import opentype from 'opentype.js';
import { FONTS_DIR } from '../catalog.js';
import { MemeError } from '../spec.js';

/**
 * Font layer built on opentype.js: each logical font is a fallback chain
 * (display font → Noto Sans → Noto Emoji) resolved per codepoint, with
 * kerning from GPOS/kern. Output stays SVG glyph-outline path data so
 * rendering remains deterministic across platforms.
 */

/** Default-ignorable codepoints: rendered zero-width, never flagged unsupported. */
export function isIgnorable(cp: number): boolean {
  return cp === 0x200c || cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f);
}

interface Resolved {
  font: opentype.Font;
  glyph: opentype.Glyph;
}

function parseFontFile(path: string): opentype.Font {
  let buf: Buffer;
  try {
    buf = readFileSync(path);
  } catch (err) {
    throw new MemeError('IO_ERROR', `cannot read font "${path}": ${(err as Error).message}`);
  }
  try {
    return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  } catch (err) {
    throw new MemeError('IO_ERROR', `cannot parse font "${path}": ${(err as Error).message}`);
  }
}

export class Font {
  /** Metrics of the primary (display) font; used for line layout. */
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  private readonly chain: opentype.Font[];
  private readonly resolveCache = new Map<number, Resolved>();

  constructor(paths: string[]) {
    this.chain = paths.map(parseFontFile);
    const primary = this.chain[0]!;
    this.unitsPerEm = primary.unitsPerEm;
    this.ascender = primary.ascender;
    this.descender = primary.descender;
  }

  /** True when some font in the chain maps this codepoint to a real glyph. */
  hasGlyph(cp: number): boolean {
    if (isIgnorable(cp)) return true;
    const ch = String.fromCodePoint(cp);
    return this.chain.some((f) => f.charToGlyphIndex(ch) !== 0);
  }

  private resolve(cp: number): Resolved {
    const cached = this.resolveCache.get(cp);
    if (cached) return cached;
    const ch = String.fromCodePoint(cp);
    let resolved: Resolved | undefined;
    for (const font of this.chain) {
      const index = font.charToGlyphIndex(ch);
      if (index !== 0) {
        resolved = { font, glyph: font.glyphs.get(index) };
        break;
      }
    }
    resolved ??= { font: this.chain[0]!, glyph: this.chain[0]!.glyphs.get(0) };
    this.resolveCache.set(cp, resolved);
    return resolved;
  }

  /** Advance width in pixels at the given size (0 for ignorables). */
  advancePx(cp: number, size: number): number {
    if (isIgnorable(cp)) return 0;
    const { font, glyph } = this.resolve(cp);
    return ((glyph.advanceWidth ?? 0) / font.unitsPerEm) * size;
  }

  /** Kerning adjustment in pixels between two codepoints (same-font pairs only). */
  kerningPx(prevCp: number | undefined, cp: number, size: number): number {
    if (prevCp === undefined || isIgnorable(prevCp) || isIgnorable(cp)) return 0;
    const a = this.resolve(prevCp);
    const b = this.resolve(cp);
    if (a.font !== b.font) return 0;
    return (a.font.getKerningValue(a.glyph, b.glyph) / a.font.unitsPerEm) * size;
  }

  /** SVG path data for the glyph at (x, baselineY), y-down, at the given size. */
  pathData(cp: number, x: number, baselineY: number, size: number): string {
    if (isIgnorable(cp)) return '';
    const { glyph } = this.resolve(cp);
    return glyph.getPath(x, baselineY, size).toPathData(2);
  }

  /** Width of a string in pixels at the given size, including kerning. */
  measureText(text: string, size: number): number {
    let width = 0;
    let prev: number | undefined;
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      width += this.kerningPx(prev, cp, size) + this.advancePx(cp, size);
      if (!isIgnorable(cp)) prev = cp;
    }
    return width;
  }
}

const fontCache = new Map<string, Font>();

export const BUILTIN_FONTS: Record<string, string> = {
  anton: 'Anton-Regular.ttf',
};

/** Fallback fonts appended to every chain, in priority order. */
export const FALLBACK_FONTS = ['NotoSans-Regular.ttf', 'NotoEmoji-Regular.ttf'];

export const DEFAULT_FONT = 'anton';

export function loadFont(name: string = DEFAULT_FONT): Font {
  const key = name.toLowerCase();
  const cached = fontCache.get(key);
  if (cached) return cached;
  const file = BUILTIN_FONTS[key];
  if (!file) {
    throw new MemeError(
      'INVALID_SPEC',
      `unknown font "${name}"; available: ${Object.keys(BUILTIN_FONTS).join(', ')}`,
    );
  }
  const font = new Font([file, ...FALLBACK_FONTS].map((f) => join(FONTS_DIR, f)));
  fontCache.set(key, font);
  return font;
}
