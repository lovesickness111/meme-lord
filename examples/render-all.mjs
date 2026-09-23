#!/usr/bin/env node
// Renders every example spec in this directory and verifies the output exists.
// Usage: node examples/render-all.mjs   (run `npm run build` first)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const examplesDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(examplesDir, '..');
const cli = join(root, 'dist', 'cli.js');
const workDir = mkdtempSync(join(tmpdir(), 'meme-examples-'));

// Placeholder inputs for specs that reference local images (layout cells, image base).
const colors = { 'a.jpg': '#e94560', 'b.jpg': '#0f3460', 'c.jpg': '#16213e', 'd.jpg': '#533483' };
for (const [name, background] of Object.entries(colors)) {
  await sharp({ create: { width: 400, height: 400, channels: 3, background } })
    .jpeg()
    .toFile(join(workDir, name));
}
await sharp({ create: { width: 600, height: 600, channels: 3, background: '#2e2e2e' } })
  .jpeg()
  .toFile(join(workDir, 'photo.jpg'));

const specs = readdirSync(examplesDir).filter((f) => f.endsWith('.json'));
let failed = 0;
for (const file of specs) {
  const spec = JSON.parse(readFileSync(join(examplesDir, file), 'utf8'));
  const outPath = join(workDir, spec.output.path);
  try {
    execFileSync(
      process.execPath,
      [cli, 'spec', 'render', join(examplesDir, file), '-o', outPath],
      {
        cwd: workDir,
        stdio: 'pipe',
      },
    );
    const size = statSync(outPath).size;
    if (size === 0) throw new Error('empty output file');
    console.log(`ok   ${file} -> ${spec.output.path} (${size} bytes)`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${file}: ${err.stderr?.toString().trim() || err.message}`);
  }
}

console.log(`\n${specs.length - failed}/${specs.length} examples rendered (outputs in ${workDir})`);
process.exit(failed ? 1 : 0);
