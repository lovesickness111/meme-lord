import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { MemeError, type MemeBase } from '../spec.js';

const DEFAULT_CANVAS_COLOR = '#ffffff';
const DEFAULT_LAYOUT_WIDTH = 1200;
const DEFAULT_GUTTER = 8;

export async function renderCanvasBase(
  base: Extract<MemeBase, { kind: 'canvas' }>,
): Promise<Buffer> {
  return sharp({
    create: {
      width: base.width,
      height: base.height,
      channels: 4,
      background: base.color ?? DEFAULT_CANVAS_COLOR,
    },
  })
    .png()
    .toBuffer();
}

export async function renderLayoutBase(
  base: Extract<MemeBase, { kind: 'layout' }>,
): Promise<Buffer> {
  const [cols, rows] = base.grid;
  if (base.cells.length > cols * rows) {
    throw new MemeError(
      'INVALID_SPEC',
      `layout grid ${cols}x${rows} has ${cols * rows} cells but ${base.cells.length} images given`,
    );
  }
  const width = base.width ?? DEFAULT_LAYOUT_WIDTH;
  const gutter = base.gutter ?? DEFAULT_GUTTER;
  const cellWidth = Math.floor((width - gutter * (cols + 1)) / cols);
  const cellHeight = cellWidth; // square cells
  const height = cellHeight * rows + gutter * (rows + 1);

  const composites: OverlayOptions[] = [];
  for (let i = 0; i < base.cells.length; i++) {
    const cell = base.cells[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    let resized: Buffer;
    try {
      resized = await sharp(cell.image)
        .resize(cellWidth, cellHeight, { fit: 'cover' })
        .png()
        .toBuffer();
    } catch (err) {
      throw new MemeError(
        'UNREADABLE_IMAGE',
        `cannot read cell image "${cell.image}": ${(err as Error).message}`,
        { path: cell.image, detail: (err as Error).message },
      );
    }
    composites.push({
      input: resized,
      left: gutter + col * (cellWidth + gutter),
      top: gutter + row * (cellHeight + gutter),
    });
  }

  return sharp({
    create: { width, height, channels: 4, background: base.color ?? DEFAULT_CANVAS_COLOR },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
