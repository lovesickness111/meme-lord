import type { TextBox, TextStyle } from '../spec.js';
import { DEFAULT_FONT, isIgnorable, loadFont, type Font } from './font.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolvedStyle {
  font: string;
  size: number | 'auto';
  color: string;
  stroke: string;
  strokeWidth: number | 'auto';
  background?: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  rotation: number;
  opacity: number;
  lineHeight: number;
  caps: boolean;
}

export const CLASSIC_STYLE: ResolvedStyle = {
  font: DEFAULT_FONT,
  size: 'auto',
  color: '#ffffff',
  stroke: '#000000',
  strokeWidth: 'auto',
  bold: false,
  italic: false,
  underline: false,
  rotation: 0,
  opacity: 1,
  lineHeight: 1.1,
  caps: true,
};

export function resolveStyle(...overrides: (TextStyle | undefined)[]): ResolvedStyle {
  const style = { ...CLASSIC_STYLE };
  for (const o of overrides) {
    if (!o) continue;
    if (o.font !== undefined) style.font = o.font;
    if (o.size !== undefined) style.size = o.size;
    if (o.color !== undefined) style.color = o.color;
    if (o.stroke !== undefined) style.stroke = o.stroke;
    if (o.strokeWidth !== undefined) style.strokeWidth = o.strokeWidth;
    if (o.background !== undefined) style.background = o.background;
    if (o.bold !== undefined) style.bold = o.bold;
    if (o.italic !== undefined) style.italic = o.italic;
    if (o.underline !== undefined) style.underline = o.underline;
    if (o.rotation !== undefined) style.rotation = o.rotation;
    if (o.opacity !== undefined) style.opacity = o.opacity;
    if (o.lineHeight !== undefined) style.lineHeight = o.lineHeight;
    if (o.caps !== undefined) style.caps = o.caps;
  }
  return style;
}

export function measureText(text: string, font: Font, size: number): number {
  return font.measureText(text, size);
}

/** Greedy word wrap; words longer than maxWidth are placed on their own line. */
export function wrapText(text: string, font: Font, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && measureText(candidate, font, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export interface FittedText {
  lines: string[];
  size: number;
  lineHeightPx: number;
  overflow: boolean;
}

const MIN_SIZE = 8;

/** Vertical extent of a line in em, from the font's ascender/descender. */
function emFactor(font: Font): number {
  return (font.ascender - font.descender) / font.unitsPerEm;
}

function fits(text: string, font: Font, size: number, rect: Rect, lineHeight: number): boolean {
  const lines = wrapText(text, font, size, rect.width);
  const height = lines.length * size * lineHeight * emFactor(font);
  const widest = Math.max(...lines.map((l) => measureText(l, font, size)), 0);
  return height <= rect.height && widest <= rect.width;
}

/** Binary-search the largest integer font size whose wrapped text fits the rect. */
export function fitText(
  text: string,
  font: Font,
  rect: Rect,
  lineHeight: number,
  fixedSize?: number,
): FittedText {
  if (fixedSize !== undefined) {
    const lines = wrapText(text, font, fixedSize, rect.width);
    return {
      lines,
      size: fixedSize,
      lineHeightPx: fixedSize * lineHeight * emFactor(font),
      overflow: !fits(text, font, fixedSize, rect, lineHeight),
    };
  }
  const cap = Math.max(MIN_SIZE, Math.floor(rect.height / emFactor(font)));
  let lo = MIN_SIZE;
  let hi = cap;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    if (fits(text, font, mid, rect, lineHeight)) lo = mid;
    else hi = mid - 1;
  }
  const size = lo;
  return {
    lines: wrapText(text, font, size, rect.width),
    size,
    lineHeightPx: size * lineHeight * emFactor(font),
    overflow: !fits(text, font, size, rect, lineHeight),
  };
}

export interface TextLayer {
  svg: string;
  overflow: boolean;
  fittedSize: number;
  lineCount: number;
  coverage: number;
  unsupportedGlyphs: string[];
}

/** XML-escape a value before interpolating it into an SVG attribute. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render a text box as a full-canvas SVG overlay: glyph outlines as paths
 * (deterministic; no fontconfig/pango dependency), painted stroke-under-fill
 * for the classic meme outline.
 */
export function renderTextLayer(
  box: TextBox,
  rect: Rect,
  canvasWidth: number,
  canvasHeight: number,
  defaults?: {
    style?: TextStyle;
    anchor?: 'top' | 'middle' | 'bottom';
    align?: 'left' | 'center' | 'right';
  },
): TextLayer {
  const style = resolveStyle(defaults?.style, box.style);
  const font = loadFont(style.font);
  const text = style.caps ? box.text.toUpperCase() : box.text;
  const unsupported = new Set<string>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (!/\s/.test(ch) && !font.hasGlyph(cp)) {
      unsupported.add(`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
    }
  }
  const fitted = fitText(
    text,
    font,
    rect,
    style.lineHeight,
    style.size === 'auto' ? undefined : style.size,
  );
  const { lines, size, lineHeightPx } = fitted;
  const ascentPx = (font.ascender / font.unitsPerEm) * size;
  const blockHeight = lines.length * lineHeightPx;
  const widestLine = Math.max(...lines.map((line) => measureText(line, font, size)), 0);
  const coverage =
    rect.width > 0 && rect.height > 0 ? (widestLine * blockHeight) / (rect.width * rect.height) : 1;
  const anchor = box.anchor ?? defaults?.anchor ?? 'middle';
  const align = box.align ?? defaults?.align ?? 'center';
  const strokeWidth =
    style.strokeWidth === 'auto' ? Math.max(1, Math.round(size / 14)) : style.strokeWidth;

  let blockTop: number;
  if (anchor === 'top') blockTop = rect.y;
  else if (anchor === 'bottom') blockTop = rect.y + rect.height - blockHeight;
  else blockTop = rect.y + (rect.height - blockHeight) / 2;

  const paths: string[] = [];
  const underlines: string[] = [];
  lines.forEach((line, i) => {
    const lineWidth = measureText(line, font, size);
    let x: number;
    if (align === 'left') x = rect.x;
    else if (align === 'right') x = rect.x + rect.width - lineWidth;
    else x = rect.x + (rect.width - lineWidth) / 2;
    const emHeightPx = ((font.ascender - font.descender) / font.unitsPerEm) * size;
    const baseline = blockTop + i * lineHeightPx + (lineHeightPx - emHeightPx) / 2 + ascentPx;
    let d = '';
    let cursor = x;
    let prev: number | undefined;
    for (const ch of line) {
      const cp = ch.codePointAt(0)!;
      cursor += font.kerningPx(prev, cp, size);
      d += font.pathData(cp, cursor, baseline, size);
      cursor += font.advancePx(cp, size);
      if (!isIgnorable(cp)) prev = cp;
    }
    if (d) paths.push(d);
    if (style.underline && line.length > 0) {
      const uy = (baseline + size * 0.08).toFixed(2);
      underlines.push(
        `<line x1="${x.toFixed(2)}" y1="${uy}" x2="${(x + lineWidth).toFixed(2)}" y2="${uy}" stroke="${escapeXml(style.color)}" stroke-width="${Math.max(1, size / 16).toFixed(2)}"/>`,
      );
    }
  });

  const d = paths.join('');
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const transforms: string[] = [];
  if (style.rotation) transforms.push(`rotate(${style.rotation} ${cx} ${cy})`);
  if (style.italic) transforms.push(`translate(${cx} 0) skewX(-12) translate(${-cx} 0)`);
  const transform = transforms.length ? ` transform="${transforms.join(' ')}"` : '';
  const boldStroke = style.bold ? Math.max(1, size / 40) : 0;

  const background = style.background
    ? `<rect x="${rect.x}" y="${blockTop.toFixed(2)}" width="${rect.width}" height="${blockHeight.toFixed(2)}" fill="${escapeXml(style.background)}"/>`
    : '';
  const strokeLayer =
    strokeWidth > 0 && d
      ? `<path d="${d}" fill="${escapeXml(style.stroke)}" stroke="${escapeXml(style.stroke)}" stroke-width="${(strokeWidth * 2 + boldStroke).toFixed(2)}" stroke-linejoin="round"/>`
      : '';
  const fillLayer = d
    ? `<path d="${d}" fill="${escapeXml(style.color)}"${boldStroke ? ` stroke="${escapeXml(style.color)}" stroke-width="${boldStroke.toFixed(2)}"` : ''}/>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">` +
    `<g opacity="${style.opacity}"${transform}>${background}${strokeLayer}${fillLayer}${underlines.join('')}</g>` +
    `</svg>`;
  return {
    svg,
    overflow: fitted.overflow,
    fittedSize: size,
    lineCount: lines.length,
    coverage,
    unsupportedGlyphs: [...unsupported].sort(),
  };
}
