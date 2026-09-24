import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ManifestSchema, MemeError, type Template } from './spec.js';
import { templateSelectionText } from './template-guide.js';
import { defaultFetchDir } from './templates-fetch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ASSETS_DIR = join(__dirname, '..', 'assets');
export const TEMPLATES_DIR = join(ASSETS_DIR, 'templates');
export const FONTS_DIR = join(ASSETS_DIR, 'fonts');

interface CatalogCache {
  templates: Template[];
  index: Map<string, Template>;
  dir: string;
}

let cache: CatalogCache | null = null;

/**
 * Active templates dir: MEME_TEMPLATES_DIR (or --templates-dir) > bundled
 * assets > fetched pack (`meme templates fetch`, for slim installs).
 */
export function templatesRoot(): string {
  if (process.env.MEME_TEMPLATES_DIR) return process.env.MEME_TEMPLATES_DIR;
  if (existsSync(join(TEMPLATES_DIR, 'manifest.json'))) return TEMPLATES_DIR;
  return defaultFetchDir();
}

function validateTemplateFile(file: string, id: string): void {
  if (isAbsolute(file) || file.split(/[\\/]/).includes('..')) {
    throw new MemeError('PATH_DENIED', `template "${id}" has an unsafe file path "${file}"`, {
      path: file,
    });
  }
}

export function loadManifest(templatesDir?: string): Template[] {
  return loadCatalog(templatesDir).templates;
}

function loadCatalog(templatesDir?: string): CatalogCache {
  const dir = templatesDir ?? templatesRoot();
  if (cache && cache.dir === dir) return cache;
  let raw: string;
  try {
    raw = readFileSync(join(dir, 'manifest.json'), 'utf8');
  } catch (err) {
    throw new MemeError('IO_ERROR', `cannot read manifest: ${(err as Error).message}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new MemeError('INVALID_JSON', `manifest is not valid JSON: ${(err as Error).message}`, {
      file: join(dir, 'manifest.json'),
    });
  }
  const parsed = ManifestSchema.safeParse(json);
  if (!parsed.success) {
    throw new MemeError('INVALID_SPEC', `invalid manifest: ${parsed.error.message}`);
  }
  for (const t of parsed.data.templates) validateTemplateFile(t.file, t.id);
  const templates = parsed.data.templates;
  cache = { templates, index: new Map(templates.map((t) => [t.id, t])), dir };
  return cache;
}

export interface TemplateFilter {
  type?: 'image' | 'gif';
  tag?: string;
  category?: string;
  search?: string;
}

export function listTemplates(filter: TemplateFilter = {}, templatesDir?: string): Template[] {
  let templates = loadManifest(templatesDir);
  if (filter.type) templates = templates.filter((t) => t.type === filter.type);
  if (filter.tag) templates = templates.filter((t) => t.tags.includes(filter.tag!));
  if (filter.category) templates = templates.filter((t) => t.category === filter.category);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    templates = templates.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        templateSelectionText(t).toLowerCase().includes(q),
    );
  }
  return templates;
}

export function getTemplate(id: string, templatesDir?: string): Template {
  const { index } = loadCatalog(templatesDir);
  const template = index.get(id);
  if (!template) {
    throw new MemeError(
      'TEMPLATE_NOT_FOUND',
      `unknown template "${id}"; search the catalog instead of guessing an id`,
      { id },
    );
  }
  return template;
}

export function templateImagePath(template: Template, templatesDir?: string): string {
  validateTemplateFile(template.file, template.id);
  return join(templatesDir ?? templatesRoot(), template.file);
}
