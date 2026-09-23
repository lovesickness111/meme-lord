/**
 * Manifest generator (DESIGN-v2 §6.2): scans assets/templates/{images,gifs}
 * and assets/templates/packs/<pack>/{images,gifs}, reads each template's
 * `<id>.meta.json` sidecar (name, tags, category, slots, source), derives
 * file path and dimensions from the media file, and emits the merged,
 * schema-validated assets/templates/manifest.json. Pack templates get ids
 * prefixed with the pack id (`<pack>-<filename>`).
 *
 * Usage: npm run build:manifest
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import {
  ManifestSchema,
  TemplateSelectionGuideSchema,
  TemplateSlotSchema,
  TemplateSourceSchema,
} from '../src/spec.js';
import type { Template } from '../src/spec.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES_DIR = join(ROOT, 'assets', 'templates');

const SidecarSchema = z
  .object({
    name: z.string(),
    tags: z.array(z.string()),
    category: z.string().optional(),
    selectionGuide: TemplateSelectionGuideSchema.optional(),
    slots: z.array(TemplateSlotSchema),
    source: TemplateSourceSchema.optional(),
  })
  .strict();

const PackJsonSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

interface Pack {
  id: string;
  dirName: string;
  tags: string[];
}

const MEDIA_EXT: Record<string, 'image' | 'gif'> = {
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.webp': 'image',
  '.gif': 'gif',
};

async function collect(subdir: 'images' | 'gifs', pack?: Pack): Promise<Template[]> {
  const dir = pack
    ? join(TEMPLATES_DIR, 'packs', pack.dirName, subdir)
    : join(TEMPLATES_DIR, subdir);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).sort();
  const templates: Template[] = [];
  for (const entry of entries) {
    const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase();
    const type = MEDIA_EXT[ext];
    if (!type) continue;
    const base = entry.slice(0, entry.lastIndexOf('.'));
    const id = pack ? `${pack.id}-${base}` : base;
    const relDir = pack ? `packs/${pack.dirName}/${subdir}` : subdir;
    const metaPath = join(dir, `${base}.meta.json`);
    let sidecarRaw: string;
    try {
      sidecarRaw = readFileSync(metaPath, 'utf8');
    } catch {
      throw new Error(`missing sidecar ${relDir}/${base}.meta.json for ${relDir}/${entry}`);
    }
    const sidecar = SidecarSchema.parse(JSON.parse(sidecarRaw));
    const meta = await sharp(join(dir, entry)).metadata();
    if (!meta.width || !meta.height) throw new Error(`cannot read dimensions of ${entry}`);
    templates.push({
      id,
      name: sidecar.name,
      type,
      file: `${relDir}/${entry}`,
      width: meta.width,
      height: meta.height,
      tags: [...new Set([...sidecar.tags, ...(pack?.tags ?? [])])],
      ...(sidecar.category ? { category: sidecar.category } : {}),
      ...(pack ? { pack: pack.id } : {}),
      ...(sidecar.selectionGuide ? { selectionGuide: sidecar.selectionGuide } : {}),
      slots: sidecar.slots,
      ...(sidecar.source ? { source: sidecar.source } : {}),
    });
  }
  return templates;
}

function discoverPacks(): Pack[] {
  const packsDir = join(TEMPLATES_DIR, 'packs');
  if (!existsSync(packsDir)) return [];
  return readdirSync(packsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const packJsonPath = join(packsDir, e.name, 'pack.json');
      if (!existsSync(packJsonPath)) return { id: e.name, dirName: e.name, tags: [] };
      const parsed = PackJsonSchema.parse(JSON.parse(readFileSync(packJsonPath, 'utf8')));
      return { id: parsed.id, dirName: e.name, tags: parsed.tags ?? [] };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function main(): Promise<void> {
  const templates = [...(await collect('images')), ...(await collect('gifs'))];
  for (const pack of discoverPacks()) {
    templates.push(...(await collect('images', pack)), ...(await collect('gifs', pack)));
  }
  const ids = new Set<string>();
  for (const t of templates) {
    if (ids.has(t.id)) throw new Error(`duplicate template id "${t.id}"`);
    ids.add(t.id);
  }
  const manifest = ManifestSchema.parse({ templates });
  const outPath = join(TEMPLATES_DIR, 'manifest.json');
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const images = templates.filter((t) => t.type === 'image').length;
  console.log(
    `wrote ${outPath}: ${templates.length} templates (${images} images, ${templates.length - images} gifs)`,
  );
}

await main();
