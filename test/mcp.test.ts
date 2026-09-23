import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SERVER = join(__dirname, '..', 'dist', 'mcp.js');
const built = existsSync(SERVER);

let client: Client;

describe.skipIf(!built)('MCP server (stdio integration)', () => {
  beforeAll(async () => {
    client = new Client({ name: 'test-client', version: '0.0.1' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });

  afterAll(async () => {
    await client.close();
  });

  it('lists the 7 local agent tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'get_template',
      'list_templates',
      'measure_meme',
      'preview_template',
      'render_layout',
      'render_meme',
      'suggest_templates',
    ]);
  });

  it('suggest_templates returns semantic guides and structured retrieval reasons', async () => {
    const result = await client.callTool({
      name: 'suggest_templates',
      arguments: {
        query:
          'critical irony hypocrisy, public claim contradicted by actual behavior, two beat expectation reality',
        limit: 3,
        minSlots: 2,
        maxSlots: 2,
      },
    });
    expect(result.isError).toBeFalsy();
    const content = result.content as { type: string; text?: string }[];
    const fallback = JSON.parse(content[0]!.text!);
    expect(result.structuredContent).toEqual(fallback);
    expect(fallback.schemaVersion).toBe(1);
    expect(fallback.suggestions[0].id).toBe('disappointed-black-guy');
    expect(fallback.suggestions[0].selectionGuide).toMatchObject({
      source: 'curated',
      previewRecommended: false,
    });
    expect(fallback.suggestions[0].reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'best-for' })]),
    );
  });

  it('measure_meme preflights safe text geometry without returning an image', async () => {
    const uniqueOutput = `mcp-measure-must-not-write-${String(Date.now())}.png`;
    expect(existsSync(join(process.cwd(), '.memes', uniqueOutput))).toBe(false);
    const result = await client.callTool({
      name: 'measure_meme',
      arguments: {
        base: { kind: 'template', id: 'disappointed-black-guy' },
        texts: [{ slot: 'expectation', text: 'BENCHMARKS' }],
        output: { path: uniqueOutput },
      },
    });
    expect(result.isError).toBeFalsy();
    const content = result.content as { type: string; text?: string }[];
    expect(content.every((item) => item.type === 'text')).toBe(true);
    const measured = JSON.parse(content[0]!.text!);
    expect(result.structuredContent).toEqual(measured);
    expect(measured).toMatchObject({
      schemaVersion: 1,
      status: 'ready',
      ok: true,
      width: 1000,
      height: 645,
    });
    expect(measured.boxes[0].rect).toEqual({ x: 47, y: 47, width: 516, height: 216 });
    expect(existsSync(join(process.cwd(), '.memes', uniqueOutput))).toBe(false);
  });

  it('list_templates returns the catalog', async () => {
    const result = await client.callTool({ name: 'list_templates', arguments: {} });
    const content = result.content as { type: string; text?: string }[];
    const list = JSON.parse(content[0]!.text!);
    expect(list.map((t: { id: string }) => t.id)).toContain('drake');
    expect(list.find((t: { id: string }) => t.id === 'drake')).toMatchObject({
      guideSource: 'curated',
    });
    expect(list[0]).not.toHaveProperty('selectionGuide');
  });

  it('get_template resolves the full selection guide', async () => {
    const result = await client.callTool({
      name: 'get_template',
      arguments: { id: 'disappointed-black-guy' },
    });
    const content = result.content as { type: string; text?: string }[];
    const template = JSON.parse(content[0]!.text!);
    expect(template.selectionGuide).toMatchObject({
      source: 'curated',
      previewRecommended: false,
    });
    expect(template.selectionGuide.bestFor.length).toBeGreaterThan(0);
    expect(template.example.base).toEqual({ kind: 'template', id: 'disappointed-black-guy' });
  });

  it('render_meme renders drake and returns an inline image', async () => {
    const result = await client.callTool({
      name: 'render_meme',
      arguments: {
        base: { kind: 'template', id: 'drake' },
        texts: [
          { slot: 'no', text: 'MANUAL EDITORS' },
          { slot: 'yes', text: 'AGENT CLIS' },
        ],
        output: { format: 'jpeg', maxWidth: 400 },
      },
    });
    expect(result.isError).toBeFalsy();
    const content = result.content as { type: string; text?: string; mimeType?: string }[];
    const meta = JSON.parse(content.find((c) => c.type === 'text')!.text!);
    expect(meta.width).toBe(400);
    const image = content.find((c) => c.type === 'image');
    expect(image?.mimeType).toBe('image/jpeg');
  });

  it('render_meme returns a typed error for a bad template', async () => {
    const result = await client.callTool({
      name: 'render_meme',
      arguments: { base: { kind: 'template', id: 'bogus' }, texts: [], output: {} },
    });
    expect(result.isError).toBe(true);
    const content = result.content as { type: string; text?: string }[];
    expect(JSON.parse(content[0]!.text!).error.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('applies a default maxWidth so results fit inline, and gates meta.base64', async () => {
    const result = await client.callTool({
      name: 'render_meme',
      arguments: {
        base: { kind: 'template', id: 'drake' },
        texts: [{ slot: 'yes', text: 'INLINE' }],
        output: {},
      },
    });
    expect(result.isError).toBeFalsy();
    const content = result.content as { type: string; text?: string }[];
    const meta = JSON.parse(content.find((c) => c.type === 'text')!.text!);
    expect(meta.width).toBeLessThanOrEqual(800);
    expect(meta.bytes).toBeLessThanOrEqual(1_000_000);
    if (meta.base64) expect(meta.bytes).toBeLessThanOrEqual(1_000_000);
    expect(content.some((c) => c.type === 'image')).toBe(true);
  });

  it('denies absolute output paths with PATH_DENIED (confined surface)', async () => {
    const result = await client.callTool({
      name: 'render_meme',
      arguments: {
        base: { kind: 'template', id: 'drake' },
        texts: [],
        output: { path: '/tmp/clobber.png' },
      },
    });
    expect(result.isError).toBe(true);
    const content = result.content as { type: string; text?: string }[];
    expect(JSON.parse(content[0]!.text!).error.code).toBe('PATH_DENIED');
  });

  it('denies filesystem image reads by default with PATH_DENIED', async () => {
    const result = await client.callTool({
      name: 'render_meme',
      arguments: { base: { kind: 'image', path: 'photo.png' }, texts: [], output: {} },
    });
    expect(result.isError).toBe(true);
    const content = result.content as { type: string; text?: string }[];
    expect(JSON.parse(content[0]!.text!).error.code).toBe('PATH_DENIED');
  });

  it('preview_template returns the blank template image', async () => {
    const result = await client.callTool({
      name: 'preview_template',
      arguments: { id: 'this-is-fine' },
    });
    expect(result.isError).toBeFalsy();
    const content = result.content as { type: string }[];
    expect(content.some((c) => c.type === 'image')).toBe(true);
  });
});
