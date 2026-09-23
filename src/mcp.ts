#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getTemplate, listTemplates } from './catalog.js';
import { limits, Semaphore } from './limits.js';
import { setPathPolicy } from './paths.js';
import { measureMeme, renderMeme } from './render/renderer.js';
import { suggestTemplates } from './suggest.js';
import { resolveTemplateSelectionGuide } from './template-guide.js';
import { VERSION } from './version.js';
import {
  BaseSchema,
  MemeError,
  type MemeErrorCode,
  OutputSchema,
  TextBoxSchema,
  type MemeSpec,
} from './spec.js';

// MCP is an untrusted surface: confine all file reads/writes (DESIGN-v2 §3.5).
setPathPolicy('confined');

const MAX_INLINE_BYTES = (() => {
  const n = parseInt(process.env.MEME_MAX_INLINE_BYTES ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1_000_000;
})();

// Default downscale so flagship templates fit the inline cap.
const DEFAULT_MAX_WIDTH = (() => {
  const n = parseInt(process.env.MEME_MCP_DEFAULT_MAX_WIDTH ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 800;
})();

const semaphore = new Semaphore(limits.maxConcurrency());

const server = new McpServer(
  { name: 'meme-maker', version: VERSION },
  {
    instructions:
      'You are the semantic template selector. Before calling tools, turn the user request into a concise English selection brief covering: humor mechanic, tone, visual relationship, number of beats/actors, and caption shape. Call suggest_templates for retrieval, then compare each selectionGuide.description, bestFor, avoidWhen, tone, and mechanics yourself; do not blindly accept the highest score. Inspect the finalist with get_template and preview_template when previewRecommended=true. Call measure_meme, rewrite until ok=true, then render_meme with output.onDegrade="error". Everything runs locally; browser use is optional.',
  },
);

type ToolResult = {
  content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

const FIX_HINTS: Partial<Record<MemeErrorCode, string>> = {
  TEMPLATE_NOT_FOUND: 'Call list_templates to see valid template ids.',
  SLOT_NOT_FOUND: 'Call get_template with this template id to see its slot names.',
  INVALID_SPEC: 'Check the field paths in details.issues against the tool input schema.',
  RESOURCE_LIMIT: 'Reduce the value below the limit shown in details.',
  PATH_DENIED:
    'Use a relative output path (written under the output root), or omit output.path to get the image inline.',
  UNSUPPORTED_OUTPUT: 'Animated (gif) bases require output.format "gif"; omit format to use it.',
};

function errorResult(err: unknown): ToolResult {
  const code = err instanceof MemeError ? err.code : 'IO_ERROR';
  const message = err instanceof Error ? err.message : String(err);
  const details = err instanceof MemeError ? err.details : undefined;
  const fix = FIX_HINTS[code];
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: { code, message, details, fix } }) }],
    isError: true,
  };
}

function mimeType(format: string): string {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
}

function textResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function warningFixes(warnings: { code: string }[]): string[] {
  const fixes = new Set<string>();
  for (const warning of warnings) {
    if (warning.code === 'TEXT_TOO_SMALL' || warning.code === 'TEXT_TOO_MANY_LINES') {
      fixes.add(
        'Shorten or rewrite the affected caption, or choose a template with a larger slot.',
      );
    } else if (warning.code === 'TEXT_TOO_DENSE' || warning.code === 'TEXT_OVERFLOW') {
      fixes.add('Reduce caption density or move the idea to a template with more text space.');
    } else if (warning.code === 'UNSUPPORTED_GLYPHS') {
      fixes.add('Replace unsupported characters while preserving the joke.');
    } else if (warning.code === 'EMPTY_TEXT') {
      fixes.add('Fill or remove the empty text box.');
    }
  }
  return [...fixes];
}

const ResolvedSelectionGuideOutputSchema = z.object({
  description: z.string(),
  bestFor: z.array(z.string()),
  avoidWhen: z.array(z.string()),
  tone: z.array(z.string()),
  mechanics: z.object({ visual: z.string(), text: z.string() }),
  source: z.enum(['curated', 'derived']),
  previewRecommended: z.boolean(),
});

const SuggestTemplatesOutputSchema = z.object({
  schemaVersion: z.literal(1),
  query: z.string(),
  suggestions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['image', 'gif']),
      width: z.number(),
      height: z.number(),
      category: z.string().optional(),
      tags: z.array(z.string()),
      slots: z.array(z.object({ name: z.string(), hint: z.string().optional() })),
      selectionGuide: ResolvedSelectionGuideOutputSchema,
      score: z.number(),
      reasons: z.array(
        z.object({
          kind: z.enum([
            'explicit',
            'name',
            'tag',
            'category',
            'description',
            'best-for',
            'tone',
            'mechanics',
            'slot',
            'quality',
          ]),
          term: z.string(),
          points: z.number(),
        }),
      ),
      qualityReady: z.boolean(),
    }),
  ),
});

const MeasureMemeOutputSchema = z.object({
  schemaVersion: z.literal(1),
  width: z.number(),
  height: z.number(),
  boxes: z.array(
    z.object({
      box: z.number(),
      slot: z.string().optional(),
      rect: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
      fittedSize: z.number(),
      lineCount: z.number(),
      coverage: z.number(),
      overflow: z.boolean(),
    }),
  ),
  warnings: z.array(z.object({ code: z.string() }).passthrough()),
  ok: z.boolean(),
  status: z.enum(['ready', 'needs_revision']),
  fixes: z.array(z.string()),
});

async function renderTool(spec: {
  base: MemeSpec['base'];
  texts: MemeSpec['texts'];
  output: MemeSpec['output'];
}): Promise<ToolResult> {
  try {
    const output = { ...spec.output };
    if (output.maxWidth === undefined) output.maxWidth = DEFAULT_MAX_WIDTH;
    const result = await semaphore.run(() => renderMeme({ ...spec, output }));
    const inline = result.bytes <= MAX_INLINE_BYTES;
    const meta = {
      path: result.path,
      format: result.format,
      mimeType: mimeType(result.format),
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      warnings: result.warnings,
      // meta.base64 is gated by the same inline cap as the image block (D1).
      base64: result.path || !inline ? undefined : result.buffer.toString('base64'),
    };
    const content: ToolResult['content'] = [{ type: 'text', text: JSON.stringify(meta) }];
    if (inline) {
      content.push({
        type: 'image',
        data: result.buffer.toString('base64'),
        mimeType: mimeType(result.format),
      });
    }
    return { content, structuredContent: meta };
  } catch (err) {
    return errorResult(err);
  }
}

server.registerTool(
  'suggest_templates',
  {
    title: 'Suggest meme templates',
    description:
      'Retrieve candidate templates from semantic selection guides. First use your own language understanding to write an English brief containing the humor mechanic, tone, visual relationship, number of beats/actors, and caption shape. Scores are lexical retrieval signals, not the final decision: compare the returned bestFor, avoidWhen, and mechanics yourself before calling get_template.',
    inputSchema: {
      query: z
        .string()
        .min(2)
        .describe(
          'English retrieval brief prepared by the host LLM, for example: "critical irony, public claim contradicted by actual behavior, two-beat expectation then reality, short parallel captions".',
        ),
      limit: z.number().int().min(1).max(20).default(5).describe('Maximum candidates to return.'),
      type: z.enum(['image', 'gif']).optional().describe('Optional template media filter.'),
      minSlots: z
        .number()
        .int()
        .min(0)
        .max(20)
        .optional()
        .describe('Minimum independently labeled caption regions required by the joke.'),
      maxSlots: z
        .number()
        .int()
        .min(0)
        .max(20)
        .optional()
        .describe('Maximum caption regions the joke can use without becoming cluttered.'),
    },
    outputSchema: SuggestTemplatesOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ query, limit, type, minSlots, maxSlots }) => {
    try {
      const suggestions = suggestTemplates({ query, limit, type, minSlots, maxSlots });
      return textResult({ schemaVersion: 1, query, suggestions });
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  'list_templates',
  'List available meme templates compactly. Returns { id, name, type, width, height, tags, slots, guideSource }; full semantic guides are intentionally omitted to control context size. Prefer suggest_templates. If using this tool, pass search/tag/type rather than loading all 610 templates unless the user explicitly asks for the full catalog.',
  {
    type: z.enum(['image', 'gif']).optional().describe('Filter by template type.'),
    tag: z.string().optional().describe('Filter to templates carrying this tag (exact match).'),
    search: z
      .string()
      .optional()
      .describe('Case-insensitive substring match on template id, name, and tags.'),
  },
  async (args) => {
    try {
      const list = listTemplates(args).map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        width: t.width,
        height: t.height,
        tags: t.tags,
        slots: t.slots.map((s) => ({ name: s.name, hint: s.hint })),
        guideSource: resolveTemplateSelectionGuide(t).source,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(list) }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  'get_template',
  'Get full metadata for one template, including its resolved selectionGuide, slot rects, per-slot hints/styles, and an example. Reconsider the candidate when the intended joke matches avoidWhen or conflicts with mechanics. Preview it when previewRecommended=true.',
  { id: z.string().describe('Template id from list_templates (e.g. "drake").') },
  async ({ id }) => {
    try {
      const t = getTemplate(id);
      const example = {
        base: { kind: 'template', id: t.id },
        texts: t.slots.map((s) => ({
          slot: s.name,
          text: `REPLACE WITH ${(s.hint ?? s.name).toUpperCase()}`,
        })),
        output: {},
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...t,
              selectionGuide: resolveTemplateSelectionGuide(t),
              example,
            }),
          },
        ],
      };
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.registerTool(
  'measure_meme',
  {
    title: 'Measure meme quality',
    description:
      'Preflight a MemeSpec without rasterizing. Returns effective safe rectangles, fitted font sizes, line counts, text coverage, warnings, and ok. If ok=false, revise captions or choose another template before render_meme.',
    inputSchema: {
      base: BaseSchema.describe('Same base object accepted by render_meme.'),
      texts: z.array(TextBoxSchema).default([]).describe('Candidate captions to measure.'),
      output: OutputSchema.default({}).describe(
        'Optional output settings; onDegrade is ignored during measurement so warnings can be inspected.',
      ),
    },
    outputSchema: MeasureMemeOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (args) => {
    try {
      const measured = await semaphore.run(() => measureMeme(args));
      return textResult({
        schemaVersion: 1,
        ...measured,
        ok: measured.warnings.length === 0,
        status: measured.warnings.length === 0 ? 'ready' : 'needs_revision',
        fixes: warningFixes(measured.warnings),
      });
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  'render_meme',
  'Render a meme from a MemeSpec: template/image/canvas base plus text boxes. For template bases, use slot names from get_template (e.g. texts: [{ "slot": "top", "text": "MY CAPTION" }]); get_template returns a copy-paste-ready example. For non-template bases, the band slots "top", "middle", "bottom" position text automatically. Filesystem image paths are confined to MEME_INPUT_ROOT and disabled unless MEME_ALLOW_FS=1; relative output paths are written under the output root (default ./.memes). Returns JSON metadata { path, mimeType, width, height, bytes, warnings } plus the rendered image inline when small enough (output.maxWidth defaults to 800 so results fit inline).',
  {
    base: BaseSchema.describe(
      'What to draw on: { kind: "template", id } | { kind: "image", path } | { kind: "canvas", width, height, color? } | { kind: "layout", grid, cells, ... }.',
    ),
    texts: z
      .array(TextBoxSchema)
      .default([])
      .describe(
        'Text overlays. Each needs text plus either a slot name (preferred) or explicit x/y/width/height (numbers or "%" strings). Optional constraints { padding, minFontSize, maxLines, maxTextCoverage } enable machine-checkable quality gates.',
      ),
    output: OutputSchema.default({}).describe(
      'Output options: format (png|jpeg|gif|webp), path (relative; omit to get the image inline only), quality, maxWidth, overwrite, onDegrade.',
    ),
  },
  async (args) => renderTool(args),
);

server.tool(
  'render_layout',
  'Render a grid layout of images (cover-fit cells) with optional text overlays (band slots "top", "middle", "bottom" are supported). Cell image paths require MEME_ALLOW_FS=1 and are confined to MEME_INPUT_ROOT. Returns the same metadata + inline image as render_meme.',
  {
    grid: z
      .tuple([z.number().int().positive(), z.number().int().positive()])
      .describe('[columns, rows], e.g. [2, 2] for a 2x2 grid.'),
    cells: z
      .array(z.object({ image: z.string() }))
      .describe('Images filling the grid left-to-right, top-to-bottom; each cover-fits its cell.'),
    width: z.number().int().positive().optional().describe('Total layout width in pixels.'),
    gutter: z.number().int().min(0).optional().describe('Spacing between cells in pixels.'),
    color: z.string().optional().describe('Background/gutter color.'),
    texts: z
      .array(TextBoxSchema)
      .default([])
      .describe(
        'Text overlays; use band slots "top", "middle", "bottom" or explicit coordinates. Optional constraints provide the same quality gates as render_meme.',
      ),
    output: OutputSchema.default({}).describe('Output options; same as render_meme.'),
  },
  async ({ grid, cells, width, gutter, color, texts, output }) =>
    renderTool({ base: { kind: 'layout', grid, cells, width, gutter, color }, texts, output }),
);

server.tool(
  'preview_template',
  'Render a template with no text so the agent can verify its visual premise before captioning. Use this for finalists whose selectionGuide.previewRecommended is true. Returns the blank template as an inline image.',
  { id: z.string().describe('Template id from list_templates.') },
  async ({ id }) => renderTool({ base: { kind: 'template', id }, texts: [], output: {} }),
);

const transport = new StdioServerTransport();
// Malformed JSON on stdin surfaces here via the transport; log and keep serving.
server.server.onerror = (err) => {
  console.error(`[meme-maker-mcp] ${err instanceof Error ? err.message : String(err)}`);
};
await server.connect(transport);
