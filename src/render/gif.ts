import sharp from 'sharp';
import type { Metadata, OverlayOptions, Sharp } from 'sharp';
import { limits } from '../limits.js';
import { MemeError } from '../spec.js';

export interface TextOverlay {
  svg: Buffer;
  frames?: [number, number];
}

/**
 * Composite text overlays onto an animated GIF, preserving frame timing and
 * loop count. sharp represents an animated image as a vertically-stacked
 * canvas of pages, so each overlay is composited once per applicable frame
 * at that frame's vertical offset.
 */
export async function renderGif(
  inputPath: string,
  overlays: TextOverlay[],
  maxWidth?: number,
): Promise<Buffer> {
  let image: Sharp;
  let meta: Metadata;
  try {
    image = sharp(inputPath, { animated: true, limitInputPixels: limits.maxPixels() });
    meta = await image.metadata();
  } catch (err) {
    throw new MemeError(
      'UNREADABLE_IMAGE',
      `cannot read GIF "${inputPath}": ${(err as Error).message}`,
      {
        path: inputPath,
        detail: (err as Error).message,
      },
    );
  }
  const frameCount = meta.pages ?? 1;
  if (frameCount > limits.maxGifFrames()) {
    throw new MemeError(
      'RESOURCE_LIMIT',
      `GIF has ${frameCount} frames (max ${limits.maxGifFrames()})`,
      {
        limit: limits.maxGifFrames(),
        requested: frameCount,
        kind: 'gif_frames',
      },
    );
  }
  const frameHeight = meta.pageHeight ?? meta.height ?? 0;

  const composites: OverlayOptions[] = [];
  for (let i = 0; i < frameCount; i++) {
    for (const o of overlays) {
      if (o.frames && (i < o.frames[0] || i > o.frames[1])) continue;
      composites.push({ input: o.svg, left: 0, top: i * frameHeight });
    }
  }
  if (composites.length > 0) image = image.composite(composites);

  const encoded = await image.gif({ loop: meta.loop ?? 0, delay: meta.delay }).toBuffer();
  const width = meta.width ?? 0;
  if (maxWidth === undefined || maxWidth >= width) return encoded;
  // sharp applies resize before composite in a single pipeline, so downscale in a second pass.
  return sharp(encoded, { animated: true, limitInputPixels: limits.maxPixels() })
    .resize({ width: maxWidth })
    .gif({ loop: meta.loop ?? 0, delay: meta.delay })
    .toBuffer();
}

export async function gifFrameInfo(
  inputPath: string,
): Promise<{ frames: number; width: number; height: number }> {
  const meta = await sharp(inputPath, { animated: true }).metadata();
  return {
    frames: meta.pages ?? 1,
    width: meta.width ?? 0,
    height: meta.pageHeight ?? meta.height ?? 0,
  };
}
