/**
 * End-to-end Option 1 smoke test:
 *   source -> npm tarball -> clean install -> CLI -> stdio MCP -> local render.
 *
 * The temporary install is intentionally retained and printed for inspection.
 * Set TEMP/TMP and npm cache to a drive with enough free space before running.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'meme-package-smoke-'));
const packDir = join(work, 'pack');
const projectDir = join(work, 'consumer');
const npmCache = join(work, 'npm-cache');
mkdirSync(packDir, { recursive: true });
mkdirSync(projectDir, { recursive: true });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`package smoke assertion failed: ${message}`);
}

function npm(args: string[], cwd: string, stdio: 'pipe' | 'inherit' = 'pipe'): string {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error('npm_execpath is unavailable; run this script through `npm run test:package`');
  }
  const result = execFileSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: 'utf8',
    stdio,
    env: { ...process.env, npm_config_cache: npmCache },
  });
  return typeof result === 'string' ? result : '';
}

function runCli(args: string[], input?: string): string {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: projectDir,
    encoding: 'utf8',
    input,
    env: { ...process.env, MEME_OUTPUT_ROOT: join(projectDir, '.memes') },
  });
}

process.stderr.write(`[package-smoke] workspace: ${work}\n`);
const suppliedTarball = process.env.MEME_PACKAGE_TARBALL?.trim();
let tarball: string;
if (suppliedTarball) {
  tarball = resolve(ROOT, suppliedTarball);
  assert(existsSync(tarball), `supplied tarball does not exist: ${tarball}`);
  process.stderr.write(`[package-smoke] using supplied tarball: ${tarball}\n`);
} else {
  npm(['pack', '--json', '--pack-destination', packDir], ROOT);
  const tarballs = readdirSync(packDir).filter((file) => file.endsWith('.tgz'));
  assert(tarballs.length === 1, `expected one tarball, found ${String(tarballs.length)}`);
  tarball = join(packDir, tarballs[0]!);
}

writeFileSync(
  join(projectDir, 'package.json'),
  JSON.stringify({ name: 'meme-maker-package-smoke', version: '1.0.0', private: true }, null, 2) +
    '\n',
);
npm(['install', '--no-audit', '--no-fund', tarball], projectDir, 'inherit');

const packageDir = join(projectDir, 'node_modules', 'meme-lord');
const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
  private?: boolean;
  bin?: Record<string, string>;
};
assert(packageJson.name === 'meme-lord', 'installed package name mismatch');
assert(packageJson.private !== true, 'package is still marked private');
assert(packageJson.bin?.['meme-lord'] === 'dist/cli.js', 'package-name bin is missing');

for (const excluded of ['src', 'test', 'scripts', 'ui', '.env']) {
  assert(!existsSync(join(packageDir, excluded)), `tarball unexpectedly contains ${excluded}`);
}

function containsSourceMap(dir: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && containsSourceMap(path)) return true;
    if (entry.isFile() && entry.name.endsWith('.map')) return true;
  }
  return false;
}

assert(!containsSourceMap(packageDir), 'tarball unexpectedly contains source maps');

const cliPath = join(packageDir, 'dist', 'cli.js');
const mcpPath = join(packageDir, 'dist', 'mcp.js');
assert(existsSync(cliPath), 'dist/cli.js missing from tarball');
assert(existsSync(mcpPath), 'dist/mcp.js missing from tarball');
assert(existsSync(join(packageDir, 'assets', 'templates', 'manifest.json')), 'templates missing');

const version = runCli(['--version']).trim();
assert(version === packageJson.version, `CLI version ${version} != package ${packageJson.version}`);
assert(
  npm(['exec', '--', 'meme-lord', '--version'], projectDir).trim() === packageJson.version,
  'npm package-name bin shim failed',
);
assert(
  npm(['exec', '--', 'meme', '--version'], projectDir).trim() === packageJson.version,
  'npm meme bin shim failed',
);

const suggested = JSON.parse(
  runCli([
    'templates',
    'suggest',
    'critical irony hypocrisy, public claim contradicted by actual behavior, two beat expectation reality',
    '--limit',
    '3',
    '--min-slots',
    '2',
    '--max-slots',
    '2',
    '--json',
  ]),
) as { suggestions: { id: string }[] };
assert(suggested.suggestions[0]?.id === 'disappointed-black-guy', 'semantic routing failed');

const spec = {
  base: { kind: 'template', id: 'disappointed-black-guy' },
  texts: [
    { slot: 'expectation', text: 'CÁC ÔNG LỚN:\nBENCHMARK KHÁCH QUAN' },
    { slot: 'reality', text: 'CŨNG CÁC ÔNG LỚN:\nLUYỆN MODEL THEO ĐỀ' },
  ],
  output: { format: 'png', onDegrade: 'error' },
};
const measured = JSON.parse(runCli(['spec', 'measure', '-', '--json'], JSON.stringify(spec))) as {
  status: string;
  warnings: unknown[];
};
assert(measured.status === 'ready', 'packed CLI preflight did not pass');
assert(measured.warnings.length === 0, 'packed CLI preflight returned warnings');

const outputPath = join(projectDir, '.memes', 'goodhart.png');
const rendered = JSON.parse(
  runCli(
    ['spec', 'render', '-', '--out', 'goodhart.png', '--force', '--strict', '--json'],
    JSON.stringify(spec),
  ),
) as { path: string; warnings: unknown[] };
assert(existsSync(outputPath), 'packed CLI did not write the rendered image');
assert(rendered.warnings.length === 0, 'packed CLI strict render returned warnings');

const client = new Client({ name: 'package-smoke', version: '1.0.0' });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [cliPath, 'mcp'],
    env: {
      ...process.env,
      MEME_OUTPUT_ROOT: join(projectDir, '.memes'),
    },
  }),
);
try {
  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  for (const required of ['suggest_templates', 'get_template', 'measure_meme', 'render_meme']) {
    assert(toolNames.includes(required), `MCP tool ${required} is missing`);
  }

  const suggestion = await client.callTool({
    name: 'suggest_templates',
    arguments: {
      query:
        'critical irony hypocrisy, public claim contradicted by actual behavior, two beat expectation reality',
      limit: 3,
      minSlots: 2,
      maxSlots: 2,
    },
  });
  const suggestionData = suggestion.structuredContent as {
    suggestions?: { id: string }[];
  };
  assert(
    suggestionData.suggestions?.[0]?.id === 'disappointed-black-guy',
    'packed MCP semantic retrieval failed',
  );

  const measurement = await client.callTool({ name: 'measure_meme', arguments: spec });
  assert(
    (measurement.structuredContent as { status?: string }).status === 'ready',
    'packed MCP preflight failed',
  );

  const render = await client.callTool({ name: 'render_meme', arguments: spec });
  assert(!render.isError, 'packed MCP render returned an error');
  assert(
    (render.content as { type: string }[]).some((item) => item.type === 'image'),
    'packed MCP render did not return an inline image',
  );
} finally {
  await client.close();
}

// The install lock is generated from the tarball and is safe to audit independently.
npm(['audit', '--omit=dev', '--audit-level=high'], projectDir, 'inherit');

process.stdout.write(
  JSON.stringify(
    {
      ok: true,
      package: `${packageJson.name}@${packageJson.version}`,
      tarball,
      cleanInstall: projectDir,
      rendered: outputPath,
      template: suggested.suggestions[0]?.id,
      warnings: 0,
    },
    null,
    2,
  ) + '\n',
);
