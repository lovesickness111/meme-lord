/**
 * Slim release tarball: builds a tarball without assets/templates (fonts stay
 * bundled), intended as a GitHub Release artifact for the curl installer.
 * Slim installs run `meme templates fetch` (or set MEME_TEMPLATES_DIR) to get
 * the template catalog. Uses `npm pack` internally only.
 *
 * Usage: npm run build:slim-tarball
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = join(ROOT, 'package.json');

const original = readFileSync(PKG, 'utf8');
const pkg = JSON.parse(original) as { files: string[] };
pkg.files = ['dist', 'assets/fonts'];

try {
  writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');
  execFileSync('npm', ['pack', ...process.argv.slice(2)], { cwd: ROOT, stdio: 'inherit' });
} finally {
  writeFileSync(PKG, original);
}
