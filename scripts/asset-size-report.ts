/**
 * Asset size report: prints total size per pack/group under assets/ and flags
 * outlier files (GIF > 1 MB, other raster > 300 KB).
 *
 * Usage: npm run report:assets
 */
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const GIF_LIMIT = 1024 * 1024;
const RASTER_LIMIT = 300 * 1024;
const RASTER = new Set(['jpg', 'jpeg', 'png', 'webp']);

interface FileEntry {
  path: string;
  bytes: number;
}

function walk(dir: string, acc: FileEntry[] = []): FileEntry[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push({ path: relative(ASSETS, p), bytes: statSync(p).size });
  }
  return acc;
}

function groupOf(path: string): string {
  const parts = path.split('/');
  if (parts[0] === 'templates' && parts[1] === 'packs' && parts.length > 3) {
    return `templates/packs/${parts[2]}`;
  }
  return parts.slice(0, 2).join('/');
}

function mb(bytes: number): string {
  return (bytes / 1e6).toFixed(2) + ' MB';
}

const files = walk(ASSETS);
const groups = new Map<string, { bytes: number; count: number }>();
for (const f of files) {
  const g = groupOf(f.path);
  const cur = groups.get(g) ?? { bytes: 0, count: 0 };
  cur.bytes += f.bytes;
  cur.count += 1;
  groups.set(g, cur);
}

console.log('Asset size by group:');
for (const [g, { bytes, count }] of [...groups].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${g.padEnd(32)} ${String(count).padStart(5)} files  ${mb(bytes).padStart(10)}`);
}
console.log(
  `  ${'TOTAL'.padEnd(32)} ${String(files.length).padStart(5)} files  ${mb(files.reduce((s, f) => s + f.bytes, 0)).padStart(10)}`,
);

const outliers = files.filter((f) => {
  const ext = f.path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'gif') return f.bytes > GIF_LIMIT;
  if (RASTER.has(ext)) return f.bytes > RASTER_LIMIT;
  return false;
});

if (outliers.length > 0) {
  console.log('\nOutliers (gif > 1 MB, raster > 300 KB):');
  for (const f of outliers.sort((a, b) => b.bytes - a.bytes)) {
    console.log(`  ${mb(f.bytes).padStart(10)}  ${f.path}`);
  }
} else {
  console.log('\nNo outliers.');
}
