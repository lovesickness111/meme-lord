/**
 * Thumbnail generator (DESIGN-v2 §6.2): renders a ~320 px webp preview of each
 * template into assets/templates/thumbs/<id>.webp, plus a contact sheet at
 * docs/contact-sheet.webp for the README.
 *
 * Usage: npm run build:thumbs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ManifestSchema } from '../src/spec.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES_DIR = join(ROOT, 'assets', 'templates');
const THUMBS_DIR = join(TEMPLATES_DIR, 'thumbs');

const THUMB_WIDTH = 320;
const CELL = 160;
const COLUMNS = 10;

async function main(): Promise<void> {
  const manifest = ManifestSchema.parse(
    JSON.parse(readFileSync(join(TEMPLATES_DIR, 'manifest.json'), 'utf8')),
  );
  mkdirSync(THUMBS_DIR, { recursive: true });

  const cells: Buffer[] = [];
  for (const t of manifest.templates) {
    const src = join(TEMPLATES_DIR, t.file);
    const thumb = await sharp(src, { pages: 1 })
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    writeFileSync(join(THUMBS_DIR, `${t.id}.webp`), thumb);
    cells.push(
      await sharp(thumb)
        .resize(CELL, CELL, { fit: 'contain', background: '#ffffff' })
        .png()
        .toBuffer(),
    );
  }

  const rows = Math.ceil(cells.length / COLUMNS);
  const sheet = sharp({
    create: {
      width: COLUMNS * CELL,
      height: rows * CELL,
      channels: 3,
      background: '#ffffff',
    },
  }).composite(
    cells.map((input, i) => ({
      input,
      left: (i % COLUMNS) * CELL,
      top: Math.floor(i / COLUMNS) * CELL,
    })),
  );
  const sheetPath = join(ROOT, 'docs', 'contact-sheet.webp');
  writeFileSync(sheetPath, await sheet.webp({ quality: 75 }).toBuffer());
  console.log(`wrote ${manifest.templates.length} thumbs to ${THUMBS_DIR} and ${sheetPath}`);
}

await main();
