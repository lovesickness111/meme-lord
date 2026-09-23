import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { Metadata } from 'sharp';
import { getTemplate, templateImagePath } from '../catalog.js';
import { configureSharp, limits } from '../limits.js';
import { outputRootDir, resolveInputPath, resolveOutputPath } from '../paths.js';
import {
  MemeError,
  parseMemeSpec,
  type MemeSpec,
  type Template,
  type TextBox,
  type TextConstraints,
  type Warning,
} from '../spec.js';
import { gifFrameInfo, renderGif, type TextOverlay } from './gif.js';
import { renderCanvasBase, renderLayoutBase } from './layout.js';
import { renderTextLayer, type Rect, type TextLayer } from './text.js';

configureSharp();

const RASTER_FORMATS = new Set(['png', 'jpeg', 'jpg', 'gif', 'webp']);

export interface RenderResult {
  path?: string;
  buffer: Buffer;
  format: 'png' | 'jpeg' | 'gif' | 'webp';
  width: number;
  height: number;
  bytes: number;
  warnings: Warning[];
}

function parseDim(value: number | string | undefined, total: number, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new MemeError('INVALID_SPEC', `invalid dimension: ${value}`);
    return value;
  }
  const n = parseFloat(value);
  if (!Number.isFinite(n)) throw new MemeError('INVALID_SPEC', `invalid dimension: "${value}"`);
  return (n / 100) * total;
}

function checkPixels(width: number, height: number): void {
  const cap = limits.maxPixels();
  if (width * height > cap) {
    throw new MemeError('RESOURCE_LIMIT', `output ${width}x${height} exceeds ${cap} pixels`, {
      limit: cap,
      requested: width * height,
      kind: 'pixels',
    });
  }
}

function checkInputBytes(path: string): void {
  let size: number;
  try {
    size = statSync(path).size;
  } catch (err) {
    throw new MemeError(
      'UNREADABLE_IMAGE',
      `cannot read image "${path}": ${(err as Error).message}`,
      {
        path,
        detail: (err as Error).message,
      },
    );
  }
  const cap = limits.maxInputBytes();
  if (size > cap) {
    throw new MemeError('RESOURCE_LIMIT', `input "${path}" is ${size} bytes (max ${cap})`, {
      limit: cap,
      requested: size,
      kind: 'input_bytes',
    });
  }
}

async function readImageMeta(path: string): Promise<Metadata> {
  let meta: Metadata;
  try {
    meta = await sharp(path, { limitInputPixels: limits.maxPixels() }).metadata();
  } catch (err) {
    throw new MemeError(
      'UNREADABLE_IMAGE',
      `cannot read image "${path}": ${(err as Error).message}`,
      {
        path,
        detail: (err as Error).message,
      },
    );
  }
  if (!meta.format || !RASTER_FORMATS.has(meta.format)) {
    throw new MemeError(
      'UNREADABLE_IMAGE',
      `unsupported input format "${meta.format ?? 'unknown'}" for "${path}" (allowed: png, jpeg, gif, webp)`,
      { path, detail: `format ${meta.format ?? 'unknown'}` },
    );
  }
  return meta;
}

function resolveRect(
  box: TextBox,
  template: Template | null,
  width: number,
  height: number,
): {
  rect: Rect;
  constraints: TextConstraints;
  defaults?: {
    style?: TextBox['style'];
    anchor?: 'top' | 'middle' | 'bottom';
    align?: 'left' | 'center' | 'right';
  };
} {
  const finalize = (rect: Rect, constraints: TextConstraints): Rect => {
    const padding = constraints.padding ?? 0;
    if (padding === 0) return rect;
    if (padding * 2 >= rect.width || padding * 2 >= rect.height) {
      throw new MemeError(
        'INVALID_SPEC',
        `text padding ${padding} leaves no drawable area inside ${rect.width}x${rect.height}`,
        { padding, rect },
      );
    }
    return {
      x: rect.x + padding,
      y: rect.y + padding,
      width: rect.width - padding * 2,
      height: rect.height - padding * 2,
    };
  };

  if (box.slot !== undefined) {
    if (!template) {
      const bandHeight = height * 0.25;
      const bands: Record<string, { y: number; anchor: 'top' | 'middle' | 'bottom' }> = {
        top: { y: 0, anchor: 'top' },
        middle: { y: (height - bandHeight) / 2, anchor: 'middle' },
        bottom: { y: height - bandHeight, anchor: 'bottom' },
      };
      const band = bands[box.slot];
      if (!band) {
        throw new MemeError(
          'SLOT_NOT_FOUND',
          `slot "${box.slot}" given but base is not a template; only "top", "middle", "bottom" are allowed`,
        );
      }
      const constraints = { ...box.constraints };
      const rect = { x: width * 0.05, y: band.y, width: width * 0.9, height: bandHeight };
      return {
        rect: finalize(rect, constraints),
        constraints,
        defaults: { anchor: band.anchor },
      };
    }
    const slot = template.slots.find((s) => s.name === box.slot);
    if (!slot) {
      throw new MemeError(
        'SLOT_NOT_FOUND',
        `template "${template.id}" has no slot "${box.slot}"; slots: ${template.slots.map((s) => s.name).join(', ')}`,
        { template: template.id, slot: box.slot, available: template.slots.map((s) => s.name) },
      );
    }
    const [x, y, w, h] = slot.safeRect ?? slot.rect;
    const constraints = { ...slot.constraints, ...box.constraints };
    return {
      rect: finalize({ x, y, width: w, height: h }, constraints),
      constraints,
      defaults: { style: slot.style, anchor: slot.anchor, align: slot.align },
    };
  }
  const w = parseDim(box.width, width, width * 0.9);
  const h = parseDim(box.height, height, height * 0.25);
  const x = parseDim(box.x, width, (width - w) / 2);
  const y = parseDim(box.y, height, (height - h) / 2);
  const constraints = { ...box.constraints };
  return { rect: finalize({ x, y, width: w, height: h }, constraints), constraints };
}

function appendTextWarnings(
  warnings: Warning[],
  box: number,
  layer: TextLayer,
  constraints: TextConstraints,
): void {
  if (layer.unsupportedGlyphs.length > 0) {
    warnings.push({ code: 'UNSUPPORTED_GLYPHS', box, codepoints: layer.unsupportedGlyphs });
  }
  if (layer.overflow) {
    warnings.push({ code: 'TEXT_OVERFLOW', box, fittedSize: layer.fittedSize });
  }
  if (constraints.minFontSize !== undefined && layer.fittedSize < constraints.minFontSize) {
    warnings.push({
      code: 'TEXT_TOO_SMALL',
      box,
      fittedSize: layer.fittedSize,
      minimum: constraints.minFontSize,
    });
  }
  if (constraints.maxLines !== undefined && layer.lineCount > constraints.maxLines) {
    warnings.push({
      code: 'TEXT_TOO_MANY_LINES',
      box,
      lines: layer.lineCount,
      maximum: constraints.maxLines,
    });
  }
  if (constraints.maxTextCoverage !== undefined && layer.coverage > constraints.maxTextCoverage) {
    warnings.push({
      code: 'TEXT_TOO_DENSE',
      box,
      coverage: Number(layer.coverage.toFixed(4)),
      maximum: constraints.maxTextCoverage,
    });
  }
}

async function buildBase(spec: MemeSpec): Promise<{
  buffer?: Buffer;
  gifPath?: string;
  template: Template | null;
  width: number;
  height: number;
}> {
  const { base } = spec;
  switch (base.kind) {
    case 'template': {
      const template = getTemplate(base.id);
      const path = templateImagePath(template);
      if (template.type === 'gif') {
        return { gifPath: path, template, width: template.width, height: template.height };
      }
      try {
        return {
          buffer: await sharp(path, { limitInputPixels: limits.maxPixels() }).toBuffer(),
          template,
          width: template.width,
          height: template.height,
        };
      } catch (err) {
        if (err instanceof MemeError) throw err;
        throw new MemeError(
          'UNREADABLE_IMAGE',
          `cannot read template image "${path}": ${(err as Error).message}`,
          {
            path,
            detail: (err as Error).message,
          },
        );
      }
    }
    case 'image': {
      const path = resolveInputPath(base.path);
      checkInputBytes(path);
      const meta = await readImageMeta(path);
      const isGif = meta.format === 'gif' && (meta.pages ?? 1) > 1;
      if (isGif) {
        return {
          gifPath: path,
          template: null,
          width: meta.width ?? 0,
          height: meta.pageHeight ?? meta.height ?? 0,
        };
      }
      try {
        return {
          buffer: await sharp(path, { limitInputPixels: limits.maxPixels() }).toBuffer(),
          template: null,
          width: meta.width ?? 0,
          height: meta.height ?? 0,
        };
      } catch (err) {
        throw new MemeError(
          'UNREADABLE_IMAGE',
          `cannot read image "${path}": ${(err as Error).message}`,
          {
            path,
            detail: (err as Error).message,
          },
        );
      }
    }
    case 'canvas':
      checkPixels(base.width, base.height);
      return {
        buffer: await renderCanvasBase(base),
        template: null,
        width: base.width,
        height: base.height,
      };
    case 'layout': {
      const cells = base.cells.map((cell) => {
        const image = resolveInputPath(cell.image);
        checkInputBytes(image);
        return { image };
      });
      const buffer = await renderLayoutBase({ ...base, cells });
      const meta = await sharp(buffer).metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;
      checkPixels(width, height);
      return { buffer, template: null, width, height };
    }
  }
}

export interface RenderOptions {
  /** Turn every degraded-success warning into a hard error. */
  strict?: boolean;
}

export async function renderMeme(
  input: MemeSpec | unknown,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const timeoutMs = limits.renderTimeoutMs();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new MemeError('RESOURCE_LIMIT', `render exceeded ${timeoutMs} ms`, {
          limit: timeoutMs,
          kind: 'timeout',
        }),
      );
    }, timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([renderMemeInner(input, options), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function renderMemeInner(
  input: MemeSpec | unknown,
  options: RenderOptions,
): Promise<RenderResult> {
  const spec = parseMemeSpec(input);
  const strict = options.strict === true || spec.output.onDegrade === 'error';
  const { buffer, gifPath, template, width, height } = await buildBase(spec);
  const warnings: Warning[] = [];

  const isGif = gifPath !== undefined;
  const frameCount = isGif ? (await gifFrameInfo(gifPath)).frames : 1;

  const overlays: TextOverlay[] = spec.texts.map((box, i) => {
    const { rect, constraints, defaults } = resolveRect(box, template, width, height);
    const layer = renderTextLayer(box, rect, width, height, defaults);
    if (box.text.trim() === '') warnings.push({ code: 'EMPTY_TEXT', box: i });
    appendTextWarnings(warnings, i, layer, constraints);
    let frames = box.frames;
    if (frames && isGif) {
      const [a, b] = frames;
      if (a > b || a >= frameCount || b >= frameCount) {
        warnings.push({ code: 'FRAMES_OUT_OF_RANGE', box: i, frames: [a, b], frameCount });
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        frames = [Math.min(lo, frameCount - 1), Math.min(hi, frameCount - 1)];
      }
    }
    return { svg: Buffer.from(layer.svg), frames };
  });

  const format = spec.output.format ?? (isGif ? 'gif' : 'png');

  let out: Buffer;
  let outWidth = width;
  let outHeight = height;
  try {
    if (isGif) {
      if (format !== 'gif') {
        throw new MemeError(
          'UNSUPPORTED_OUTPUT',
          `animated base requires gif output, got "${format}"`,
          { format, reason: 'animated base' },
        );
      }
      out = await renderGif(gifPath, overlays, spec.output.maxWidth);
      if (spec.output.maxWidth && spec.output.maxWidth < width) {
        outWidth = spec.output.maxWidth;
        outHeight = Math.round(height * (spec.output.maxWidth / width));
      }
    } else {
      let pipeline = sharp(buffer).composite(
        overlays.map((o) => ({ input: o.svg, left: 0, top: 0 })),
      );
      if (spec.output.maxWidth && spec.output.maxWidth < width) {
        // composite before resize is not supported in one pass; flatten first
        const flat = await pipeline.png().toBuffer();
        pipeline = sharp(flat).resize({ width: spec.output.maxWidth });
        const scale = spec.output.maxWidth / width;
        outWidth = spec.output.maxWidth;
        outHeight = Math.round(height * scale);
      }
      const quality = spec.output.quality;
      if (format === 'png') pipeline = pipeline.png();
      else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: quality ?? 90 });
      else if (format === 'webp') pipeline = pipeline.webp({ quality: quality ?? 90 });
      else pipeline = pipeline.gif();
      out = await pipeline.toBuffer();
    }
  } catch (err) {
    if (err instanceof MemeError) throw err;
    throw new MemeError('RENDER_ERROR', `render failed: ${(err as Error).message}`, {
      detail: (err as Error).message,
    });
  }

  if (spec.output.path) {
    const ext = spec.output.path.split('.').pop()?.toLowerCase();
    const matches = ext === format || (format === 'jpeg' && ext === 'jpg');
    if (!matches) {
      warnings.push({ code: 'EXTENSION_MISMATCH', path: spec.output.path, actual: format });
    }
  }

  if (strict && warnings.length > 0) {
    throw new MemeError(
      'INVALID_SPEC',
      `strict mode: degraded render (${warnings.map((w) => w.code).join(', ')})`,
      { warnings },
    );
  }

  const result: RenderResult = {
    buffer: out,
    format,
    width: Math.round(outWidth),
    height: Math.round(outHeight),
    bytes: out.length,
    warnings,
  };

  if (spec.output.path) {
    const target = resolveOutputPath(spec.output.path, spec.output.overwrite === true);
    try {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(target, out);
    } catch (err) {
      throw new MemeError('WRITE_FAILED', `cannot write "${target}": ${(err as Error).message}`, {
        path: target,
        detail: (err as Error).message,
      });
    }
    result.path = target;
  }
  return result;
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

/** Resolve slot rects and fitted font sizes without rasterizing (DESIGN-v2 §4.1). */
export async function measureMeme(input: MemeSpec | unknown): Promise<MeasureResult> {
  const spec = parseMemeSpec(input);
  const { template, width, height } = await buildBase(spec);
  const warnings: Warning[] = [];
  const boxes: MeasuredBox[] = spec.texts.map((box, i) => {
    const { rect, constraints, defaults } = resolveRect(box, template, width, height);
    const layer = renderTextLayer(box, rect, width, height, defaults);
    if (box.text.trim() === '') warnings.push({ code: 'EMPTY_TEXT', box: i });
    appendTextWarnings(warnings, i, layer, constraints);
    return {
      box: i,
      slot: box.slot,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      fittedSize: layer.fittedSize,
      lineCount: layer.lineCount,
      coverage: Number(layer.coverage.toFixed(4)),
      overflow: layer.overflow,
    };
  });
  return { width, height, boxes, warnings };
}

export function defaultOutputName(spec: MemeSpec, format: string): string {
  const hash = createHash('sha1').update(JSON.stringify(spec)).digest('hex').slice(0, 8);
  const name = spec.base.kind === 'template' ? spec.base.id : spec.base.kind;
  return join(outputRootDir(), `meme-${name}-${hash}.${format}`);
}
