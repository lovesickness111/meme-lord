import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveOutputPath, setPathPolicy } from '../src/paths.js';
import { defaultOutputName } from '../src/render/renderer.js';
import type { MemeSpec } from '../src/spec.js';

const SERVER = join(__dirname, '..', 'dist', 'mcp.js');
const built = existsSync(SERVER);

const canvasSpec: MemeSpec = {
  base: { kind: 'canvas', width: 100, height: 100 },
  texts: [],
  output: {},
};

afterEach(() => {
  setPathPolicy('permissive');
  delete process.env.MEME_OUTPUT_ROOT;
  delete process.env.SYNARA_ARTIFACTS_DIR;
});

describe('output root consistency across surfaces', () => {
  it('accepts defaultOutputName under an absolute MEME_OUTPUT_ROOT', () => {
    const root = mkdtempSync(join(tmpdir(), 'meme-root-'));
    process.env.MEME_OUTPUT_ROOT = root;
    const name = defaultOutputName(canvasSpec, 'png');
    expect(resolveOutputPath(name, false)).toBe(name);
  });

  it('does not double-prefix a relative MEME_OUTPUT_ROOT', () => {
    const cwd = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), 'meme-cwd-'));
    process.chdir(dir);
    try {
      // process.cwd() resolves symlinks (e.g. /var -> /private/var on macOS)
      const realDir = process.cwd();
      process.env.MEME_OUTPUT_ROOT = 'outdir';
      const name = defaultOutputName(canvasSpec, 'png');
      expect(resolveOutputPath(name, false)).toBe(join(realDir, name));
    } finally {
      process.chdir(cwd);
    }
  });

  it('honors SYNARA_ARTIFACTS_DIR as the output root on the permissive surface', () => {
    const root = mkdtempSync(join(tmpdir(), 'meme-synara-'));
    process.env.SYNARA_ARTIFACTS_DIR = root;
    expect(resolveOutputPath('out.png', false)).toBe(join(root, 'out.png'));
    expect(() => resolveOutputPath('/etc/clobber.png', false)).toThrowError();
  });

  it('still confines escapes under SYNARA_ARTIFACTS_DIR when confined', () => {
    setPathPolicy('confined');
    const root = mkdtempSync(join(tmpdir(), 'meme-synara-c-'));
    process.env.SYNARA_ARTIFACTS_DIR = root;
    expect(() => resolveOutputPath('../escape.png', false)).toThrowError();
    expect(resolveOutputPath('ok.png', false)).toBe(join(root, 'ok.png'));
  });
});

describe.skipIf(!built)('MCP render meta schema', () => {
  it('render_meme meta carries the shared result keys including format', async () => {
    const client = new Client({ name: 'test-client', version: '0.0.1' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
    try {
      const result = await client.callTool({
        name: 'render_meme',
        arguments: {
          base: { kind: 'canvas', width: 120, height: 80 },
          texts: [{ slot: 'top', text: 'HI' }],
          output: { format: 'jpeg' },
        },
      });
      const content = result.content as { type: string; text?: string }[];
      const meta = JSON.parse(content.find((c) => c.type === 'text')!.text!);
      expect(meta.format).toBe('jpeg');
      for (const key of ['width', 'height', 'bytes', 'warnings']) {
        expect(meta).toHaveProperty(key);
      }
    } finally {
      await client.close();
    }
  });
});
