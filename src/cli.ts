#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, CommanderError } from 'commander';
import { getTemplate, listTemplates } from './catalog.js';
import { parseTextArgs } from './cli-args.js';
import { BUILTIN_FONTS } from './render/font.js';
import { defaultOutputName, measureMeme, renderMeme } from './render/renderer.js';
import { MemeError, type MemeSpec, type TextBox } from './spec.js';
import { suggestTemplates } from './suggest.js';
import { resolveTemplateSelectionGuide } from './template-guide.js';
import { VERSION } from './version.js';

// Exit cleanly when a downstream consumer closes stdout (e.g. `meme ... | head`).
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const jsonMode = process.argv.includes('--json');
const verboseMode = process.argv.includes('--verbose');

const program = new Command();
program
  .name('meme')
  .description(
    'Headless meme maker for agents: render classic meme templates, custom images,\n' +
      'blank canvases, and grid layouts to PNG/JPEG/GIF/WebP — no GUI required.',
  )
  .version(VERSION);
program.option('--templates-dir <dir>', 'load templates from a custom directory');
program.option('--verbose', 'print extra diagnostics and full warning details on stderr');
program.addHelpText(
  'after',
  `
Examples:
  $ meme templates list                                  # browse available templates
  $ meme templates show drake                            # inspect a template's text slots
  $ meme render --template drake --text no=BUGS --text yes=FEATURES
  $ meme render --canvas 800x600 --bg white --text "HELLO" -o hello.png
  $ meme layout --grid 2x2 --cell a.png --cell b.png --cell c.png --cell d.png
  $ meme spec render meme.json --json                    # render from a full MemeSpec

Run 'meme <command> --help' for command-specific options and examples.`,
);
program.exitOverride();
program.configureOutput({ writeErr: () => {} });
program.hook('preAction', () => {
  const dir = program.opts<{ templatesDir?: string }>().templatesDir;
  if (dir) process.env.MEME_TEMPLATES_DIR = dir;
});

function output(data: unknown, json: boolean, human: () => void): void {
  if (json) process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  else human();
}

function fail(err: unknown, json: boolean): never {
  const code = err instanceof MemeError ? err.code : 'IO_ERROR';
  const message = err instanceof Error ? err.message : String(err);
  const details = err instanceof MemeError ? err.details : undefined;
  if (json) process.stdout.write(JSON.stringify({ error: { code, message, details } }) + '\n');
  else process.stderr.write(`error [${code}]: ${message}\n`);
  process.exit(1);
}

interface RenderOpts {
  template?: string;
  image?: string;
  canvas?: string;
  bg?: string;
  text: string[];
  textFile?: string;
  out?: string;
  format?: 'png' | 'jpeg' | 'gif' | 'webp';
  quality?: string;
  maxWidth?: string;
  force?: boolean;
  strict?: boolean;
  json?: boolean;
}

function readJsonFile(path: string): unknown {
  const raw = readFileSync(path, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new MemeError('INVALID_JSON', `"${path}" is not valid JSON: ${(err as Error).message}`, {
      file: path,
    });
  }
}

function readSpecDocument(file: string): Record<string, unknown> {
  const raw = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new MemeError('INVALID_JSON', `"${file}" is not valid JSON: ${(err as Error).message}`, {
      file,
    });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new MemeError('INVALID_SPEC', `"${file}" must contain a MemeSpec JSON object`, { file });
  }
  return parsed as Record<string, unknown>;
}

async function runRender(opts: RenderOpts, base: MemeSpec['base']): Promise<void> {
  const slotNames = base.kind === 'template' ? getTemplate(base.id).slots.map((s) => s.name) : [];
  let texts: TextBox[] = parseTextArgs(opts.text, slotNames);
  if (opts.textFile) {
    const parsed = readJsonFile(opts.textFile) as { texts?: TextBox[] } | TextBox[] | null;
    if (typeof parsed !== 'object' || parsed === null) {
      throw new MemeError(
        'INVALID_SPEC',
        `"${opts.textFile}" must contain a JSON array or an object with a "texts" array`,
        { file: opts.textFile },
      );
    }
    texts = texts.concat(Array.isArray(parsed) ? parsed : (parsed.texts ?? []));
  }
  const spec: MemeSpec = {
    base,
    texts,
    output: {
      format: opts.format,
      quality: opts.quality ? parseInt(opts.quality, 10) : undefined,
      maxWidth: opts.maxWidth ? parseInt(opts.maxWidth, 10) : undefined,
      overwrite: opts.force,
      onDegrade: opts.strict ? 'error' : undefined,
    },
  };
  spec.output.path =
    opts.out ??
    defaultOutputName(
      spec,
      spec.output.format ??
        (base.kind === 'template' && getTemplateType(base) === 'gif' ? 'gif' : 'png'),
    );
  const result = await renderMeme(spec);
  output(
    {
      path: result.path,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      warnings: result.warnings,
    },
    opts.json ?? false,
    () => {
      process.stdout.write(
        `wrote ${result.path} (${result.width}x${result.height} ${result.format}, ${result.bytes} bytes)\n`,
      );
      for (const w of result.warnings) {
        process.stderr.write(
          verboseMode ? `warning: ${JSON.stringify(w)}\n` : `warning: ${w.code}\n`,
        );
      }
      if (result.warnings.length > 0 && !verboseMode) {
        process.stderr.write('(re-run with --verbose for warning details)\n');
      }
    },
  );
}

function getTemplateType(base: MemeSpec['base']): string {
  if (base.kind !== 'template') return 'image';
  try {
    return getTemplate(base.id).type;
  } catch {
    return 'image';
  }
}

function baseFromOpts(opts: RenderOpts): MemeSpec['base'] {
  const given = [opts.template, opts.image, opts.canvas].filter((v) => v !== undefined);
  if (given.length === 0) {
    throw new MemeError(
      'INVALID_SPEC',
      'a base is required: pass --template <id> (see `meme templates list`), --image <path>, or --canvas <WxH>',
    );
  }
  if (given.length > 1) {
    throw new MemeError(
      'INVALID_SPEC',
      'exactly one of --template, --image, --canvas is allowed; they are mutually exclusive base options',
    );
  }
  if (opts.template) return { kind: 'template', id: opts.template };
  if (opts.image) return { kind: 'image', path: opts.image };
  const m = /^(\d+)x(\d+)$/.exec(opts.canvas!);
  if (!m) {
    throw new MemeError(
      'INVALID_SPEC',
      `--canvas must be WxH (e.g. 800x600), got "${opts.canvas}"`,
    );
  }
  return {
    kind: 'canvas',
    width: parseInt(m[1]!, 10),
    height: parseInt(m[2]!, 10),
    color: opts.bg,
  };
}

const templates = program
  .command('templates')
  .description('browse the built-in template catalog (ids, sizes, text slots)')
  .addHelpText(
    'after',
    `
Examples:
  $ meme templates list
  $ meme templates show drake`,
  );

templates
  .command('list')
  .description('list available templates, optionally filtered')
  .option('--tag <tag>', 'only templates with this tag')
  .option('--type <type>', 'only "image" or "gif" templates')
  .option('--search <q>', 'substring match on identity, tags, or semantic guide text')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme templates list
  $ meme templates list --type gif
  $ meme templates list --search drake --json`,
  )
  .action((opts: { tag?: string; type?: 'image' | 'gif'; search?: string; json?: boolean }) => {
    try {
      if (opts.type !== undefined && opts.type !== 'image' && opts.type !== 'gif') {
        throw new MemeError('INVALID_SPEC', `--type must be "image" or "gif", got "${opts.type}"`);
      }
      const list = listTemplates({ tag: opts.tag, type: opts.type, search: opts.search }).map(
        (t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          width: t.width,
          height: t.height,
          panels: t.slots.length,
          tags: t.tags,
          slots: t.slots.map((s) => ({ name: s.name, hint: s.hint })),
          guideSource: resolveTemplateSelectionGuide(t).source,
        }),
      );
      output(list, opts.json ?? false, () => {
        for (const t of list) {
          process.stdout.write(
            `${t.id.padEnd(24)} ${t.type.padEnd(6)} ${String(t.width) + 'x' + String(t.height)}  slots: ${t.slots.map((s) => s.name).join(', ')}\n`,
          );
        }
      });
    } catch (err) {
      fail(err, opts.json ?? false);
    }
  });

templates
  .command('suggest <query>')
  .description('retrieve templates from semantic guides using an LLM-prepared selection brief')
  .option('--limit <n>', 'maximum suggestions (1-20)', '5')
  .option('--type <type>', 'only "image" or "gif" templates')
  .option('--min-slots <n>', 'minimum caption slots required')
  .option('--max-slots <n>', 'maximum caption slots allowed')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme templates suggest "critical irony, stated standard contradicts actual behavior, two beats"
  $ meme templates suggest "mocking repetition, one quote transformed into a sarcastic reply" --json`,
  )
  .action(
    (
      query: string,
      opts: {
        limit?: string;
        type?: string;
        minSlots?: string;
        maxSlots?: string;
        json?: boolean;
      },
    ) => {
      try {
        if (opts.type !== undefined && opts.type !== 'image' && opts.type !== 'gif') {
          throw new MemeError(
            'INVALID_SPEC',
            `--type must be "image" or "gif", got "${opts.type}"`,
          );
        }
        const rawLimit = opts.limit ?? '5';
        const limit = /^\d+$/.test(rawLimit) ? Number(rawLimit) : Number.NaN;
        if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
          throw new MemeError('INVALID_SPEC', `--limit must be an integer from 1 to 20`);
        }
        const parseSlots = (value: string | undefined, flag: string): number | undefined => {
          if (value === undefined) return undefined;
          if (!/^\d+$/.test(value)) {
            throw new MemeError('INVALID_SPEC', `${flag} must be an integer from 0 to 20`);
          }
          const parsed = Number(value);
          if (parsed > 20) {
            throw new MemeError('INVALID_SPEC', `${flag} must be an integer from 0 to 20`);
          }
          return parsed;
        };
        const suggestions = suggestTemplates({
          query,
          limit,
          type: opts.type as 'image' | 'gif' | undefined,
          minSlots: parseSlots(opts.minSlots, '--min-slots'),
          maxSlots: parseSlots(opts.maxSlots, '--max-slots'),
        });
        output({ query, suggestions }, opts.json ?? false, () => {
          if (suggestions.length === 0) {
            process.stdout.write(
              'no matching templates; rewrite the brief with tone, visual relationship, beats, and caption shape\n',
            );
            return;
          }
          for (const suggestion of suggestions) {
            process.stdout.write(
              `${suggestion.id.padEnd(28)} score=${String(suggestion.score).padEnd(4)} slots: ${suggestion.slots.map((slot) => slot.name).join(', ')}\n`,
            );
          }
        });
      } catch (err) {
        fail(err, opts.json ?? false);
      }
    },
  );

templates
  .command('show <id>')
  .description("show a template's details: size, tags, and named text slots")
  .option('--json', 'machine-readable JSON output')
  .option('--preview <path>', 'write the blank template image to a file')
  .addHelpText(
    'after',
    `
Examples:
  $ meme templates show drake
  $ meme templates show drake --preview drake-blank.png`,
  )
  .action(async (id: string, opts: { json?: boolean; preview?: string }) => {
    try {
      const t = getTemplate(id);
      const selectionGuide = resolveTemplateSelectionGuide(t);
      if (opts.preview) {
        await renderMeme({
          base: { kind: 'template', id },
          texts: [],
          output: { path: opts.preview, format: t.type === 'gif' ? 'gif' : 'png' },
        });
      }
      output({ ...t, selectionGuide }, opts.json ?? false, () => {
        process.stdout.write(
          `${t.name} (${t.id}) — ${t.type} ${t.width}x${t.height}\ntags: ${t.tags.join(', ')}\nslots:\n`,
        );
        for (const s of t.slots) {
          process.stdout.write(
            `  ${s.name.padEnd(14)} rect=[${s.rect.join(', ')}]  ${s.hint ?? ''}\n`,
          );
        }
        process.stdout.write(
          `selection: ${selectionGuide.description}\nbest for: ${selectionGuide.bestFor.join('; ')}\n`,
        );
        if (t.source) process.stdout.write(`source: ${t.source.url} (${t.source.license})\n`);
      });
    } catch (err) {
      fail(err, opts.json ?? false);
    }
  });

templates
  .command('fetch')
  .description('download the template pack from GitHub (for installs without bundled templates)')
  .option('--dest <dir>', 'install directory (default: ~/.cache/meme-maker/templates)')
  .option('--ref <ref>', 'git branch/tag/sha to fetch', 'main')
  .option('--json', 'JSON output')
  .action(async (opts: { dest?: string; ref?: string; json?: boolean }) => {
    try {
      const { fetchTemplates } = await import('./templates-fetch.js');
      const dir = await fetchTemplates({ dest: opts.dest, ref: opts.ref });
      output({ dir }, opts.json ?? false, () => {
        process.stdout.write(`templates installed at ${dir}\n`);
      });
    } catch (err) {
      fail(err, opts.json ?? false);
    }
  });

program
  .command('render')
  .description('render a meme from a template, a custom image, or a blank canvas')
  .option('--template <id>', 'template id (see `meme templates list`)')
  .option('--image <path>', 'custom base image path')
  .option('--canvas <WxH>', 'blank canvas size, e.g. 800x600')
  .option('--bg <color>', 'canvas background color (default: white)')
  .option(
    '--text <slotOrIndex=content>',
    'text overlay, repeatable: "slot=content", "0=content" (slot index), or bare content for free placement; escape a literal = as \\=',
    (v: string, acc: string[]) => acc.concat(v),
    [],
  )
  .option('--text-file <path>', 'JSON file with a MemeSpec texts array')
  .option('-o, --out <path>', 'output path (default: derived from the base name)')
  .option('--format <fmt>', 'png|jpeg|gif|webp (default: gif for gif templates, else png)')
  .option('--quality <n>', 'jpeg/webp quality, 1-100')
  .option('--max-width <px>', 'downscale output to max width')
  .option('--force', 'overwrite an existing output file')
  .option('--strict', 'treat degraded-render warnings as errors')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme render --template drake --text no=BUGS --text yes=FEATURES
  $ meme render --template drake --text 0=BUGS --text 1=FEATURES --json
  $ meme render --image photo.jpg --text "TOP TEXT" -o out.png
  $ meme render --canvas 800x600 --bg '#222' --text "HELLO" --format jpeg --quality 90`,
  )
  .action(async (opts: RenderOpts) => {
    try {
      await runRender(opts, baseFromOpts(opts));
    } catch (err) {
      fail(err, opts.json ?? false);
    }
  });

program
  .command('layout')
  .description('compose a grid of images (e.g. 2x2 panels) with optional text overlays')
  .requiredOption('--grid <CxR>', 'grid size as columns x rows, e.g. 2x2')
  .option(
    '--cell <img>',
    'cell image path, repeatable (fills the grid left-to-right, top-to-bottom)',
    (v: string, acc: string[]) => acc.concat(v),
    [],
  )
  .option('--gutter <px>', 'spacing between cells')
  .option('--bg <color>', 'background/gutter color')
  .option('--width <px>', 'total output width')
  .option(
    '--text <slotOrIndex=content>',
    'text overlay, repeatable (same syntax as `meme render --text`)',
    (v: string, acc: string[]) => acc.concat(v),
    [],
  )
  .option('--text-file <path>', 'JSON file with a MemeSpec texts array')
  .option('-o, --out <path>', 'output path')
  .option('--format <fmt>', 'png|jpeg|webp (default: png)')
  .option('--quality <n>', 'jpeg/webp quality, 1-100')
  .option('--max-width <px>', 'downscale output to max width')
  .option('--force', 'overwrite an existing output file')
  .option('--strict', 'treat degraded-render warnings as errors')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme layout --grid 2x1 --cell before.png --cell after.png -o compare.png
  $ meme layout --grid 2x2 --cell a.png --cell b.png --cell c.png --cell d.png --gutter 8`,
  )
  .action(
    async (
      opts: RenderOpts & { grid: string; cell: string[]; gutter?: string; width?: string },
    ) => {
      try {
        const m = /^(\d+)x(\d+)$/.exec(opts.grid);
        if (!m) throw new MemeError('INVALID_SPEC', `--grid must be CxR, got "${opts.grid}"`);
        await runRender(opts, {
          kind: 'layout',
          grid: [parseInt(m[1]!, 10), parseInt(m[2]!, 10)],
          cells: opts.cell.map((image) => ({ image })),
          gutter: opts.gutter ? parseInt(opts.gutter, 10) : undefined,
          width: opts.width ? parseInt(opts.width, 10) : undefined,
          color: opts.bg,
        });
      } catch (err) {
        fail(err, opts.json ?? false);
      }
    },
  );

const spec = program
  .command('spec')
  .description('render from a full MemeSpec JSON document (the most expressive input)');

spec
  .command('measure <file>')
  .description('preflight a MemeSpec without rasterizing or writing an output file')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme spec measure meme.json --json
  $ echo '{"base":{"kind":"template","id":"drake"},"texts":[]}' | meme spec measure - --json`,
  )
  .action(async (file: string, opts: { json?: boolean }) => {
    try {
      const measured = await measureMeme(readSpecDocument(file));
      const result = {
        ...measured,
        ok: measured.warnings.length === 0,
        status: measured.warnings.length === 0 ? 'ready' : 'needs_revision',
      };
      output(result, opts.json ?? false, () => {
        process.stdout.write(
          `${result.status}: ${result.boxes.length} text box(es), ${result.warnings.length} warning(s)\n`,
        );
        for (const box of result.boxes) {
          process.stdout.write(
            `  box ${box.box}: ${box.fittedSize}px, ${box.lineCount} line(s), coverage ${Math.round(box.coverage * 100)}%\n`,
          );
        }
        for (const warning of result.warnings) {
          process.stderr.write(`warning: ${JSON.stringify(warning)}\n`);
        }
      });
    } catch (err) {
      fail(err, opts.json ?? false);
    }
  });

spec
  .command('render <file>')
  .description('render a MemeSpec JSON file (pass "-" to read the spec from stdin)')
  .option('-o, --out <path>', "override the spec's output path")
  .option('--force', 'overwrite an existing output file')
  .option('--strict', 'treat degraded-render warnings as errors')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme spec render meme.json
  $ echo '{"base":{"kind":"template","id":"drake"},"texts":[]}' | meme spec render - --json`,
  )
  .action(
    async (
      file: string,
      opts: { out?: string; force?: boolean; strict?: boolean; json?: boolean },
    ) => {
      try {
        const parsed = readSpecDocument(file) as {
          output?: Record<string, unknown>;
          base?: { kind?: string };
        };
        parsed.output = { ...(parsed.output ?? {}) };
        if (opts.out) parsed.output.path = opts.out;
        if (opts.force) parsed.output.overwrite = true;
        if (opts.strict) parsed.output.onDegrade = 'error';
        if (!parsed.output.path && typeof parsed.base === 'object' && parsed.base !== null) {
          parsed.output.path = defaultOutputName(
            parsed as MemeSpec,
            (parsed.output.format as string | undefined) ??
              (parsed.base?.kind === 'template' &&
              getTemplateType(parsed.base as MemeSpec['base']) === 'gif'
                ? 'gif'
                : 'png'),
          );
        }
        const result = await renderMeme(parsed);
        output(
          {
            path: result.path,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            warnings: result.warnings,
          },
          opts.json ?? false,
          () =>
            process.stdout.write(
              `wrote ${result.path ?? '(buffer)'} (${result.width}x${result.height} ${result.format})\n`,
            ),
        );
      } catch (err) {
        fail(err, opts.json ?? false);
      }
    },
  );

program
  .command('mcp')
  .description('start the local MCP server over stdio (for Codex, Claude Code, and other hosts)')
  .action(async () => {
    await import('./mcp.js');
  });

program
  .command('ui')
  .description('start the local web UI (template gallery, editor, render history)')
  .option('--port <n>', 'port to listen on (auto-picks a free port on conflict)')
  .option('--json', 'suppress the human-readable stderr note; stdout is always a JSON {url} line')
  .addHelpText(
    'after',
    `
Examples:
  $ meme ui
  $ meme ui --port 8080`,
  )
  .action(async (opts: { port?: string }) => {
    try {
      const { startServer } = await import('./http.js');
      // Under portless, PORT carries the proxy-assigned port and
      // PORTLESS_URL the stable named URL (e.g. https://meme.localhost).
      const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
      const { url: localUrl } = await startServer({
        port: opts.port ? parseInt(opts.port, 10) : envPort,
        log: true,
        handleSignals: true,
      });
      const url = process.env.PORTLESS_URL ?? localUrl;
      // Machine-readable first line so agents/hosts can discover the port.
      process.stdout.write(JSON.stringify({ url }) + '\n');
      if (!jsonMode) process.stderr.write(`meme ui listening at ${url} (Ctrl+C to stop)\n`);
    } catch (err) {
      fail(err, jsonMode);
    }
  });

const REPO = 'kartikkabadi/meme-maker';
const INSTALL_URL = `https://raw.githubusercontent.com/${REPO}/main/install.sh`;

async function latestReleaseTag(): Promise<string | undefined> {
  try {
    const res = await fetch(`https://github.com/${REPO}/releases/latest`, { redirect: 'follow' });
    const tag = res.url.split('/tag/')[1];
    return tag || undefined;
  } catch {
    return undefined;
  }
}

program
  .command('update')
  .description('update meme-maker to the latest release (re-runs the curl installer)')
  .option('--check', 'only check for a newer release; do not install')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme update            # install the latest release
  $ meme update --check    # just report whether an update is available`,
  )
  .action(async (opts: { check?: boolean; json?: boolean }) => {
    const json = opts.json ?? false;
    // npm/npx owns its install/cache directory. Never run the curl installer over it.
    const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
    if (appRoot.split(/[\\/]/).includes('node_modules')) {
      fail(
        new MemeError(
          'IO_ERROR',
          "this is an npm-managed install; use 'npm install -g agent-meme-maker@latest' to update a global install, while npx resolves the requested version automatically",
        ),
        json,
      );
    }
    const current = `v${VERSION}`;
    const latest = await latestReleaseTag();
    if (!latest) {
      fail(
        new MemeError('IO_ERROR', 'could not determine the latest release from github.com'),
        json,
      );
    }
    const upToDate = latest === current;
    if (opts.check || upToDate) {
      output({ current, latest, upToDate }, json, () =>
        process.stdout.write(
          upToDate
            ? `meme-maker ${current} is up to date\n`
            : `update available: ${current} -> ${latest} (run 'meme update' to install)\n`,
        ),
      );
      return;
    }
    // Root of the current install (dist/cli.js lives one level below it).
    if (existsSync(join(appRoot, '.git')) || existsSync(join(appRoot, 'src'))) {
      fail(
        new MemeError(
          'IO_ERROR',
          `this looks like a source checkout (${appRoot}); update it with 'git pull' instead`,
        ),
        json,
      );
    }
    process.stderr.write(`updating meme-maker ${current} -> ${latest}...\n`);
    const env = { ...process.env, MEME_MAKER_HOME: process.env.MEME_MAKER_HOME ?? appRoot };
    const cmd = `(command -v curl >/dev/null 2>&1 && curl -fsSL '${INSTALL_URL}' || wget -qO- '${INSTALL_URL}') | sh`;
    const res = spawnSync('sh', ['-c', cmd], { stdio: 'inherit', env });
    if (res.status !== 0) {
      fail(
        new MemeError('IO_ERROR', `installer exited with status ${res.status ?? 'unknown'}`),
        json,
      );
    }
  });

program
  .command('fonts')
  .description('font utilities')
  .command('list')
  .description('list the bundled font families usable in text styles')
  .option('--json', 'machine-readable JSON output')
  .addHelpText(
    'after',
    `
Examples:
  $ meme fonts list
  $ meme fonts list --json`,
  )
  .action((opts: { json?: boolean }) => {
    const fonts = Object.keys(BUILTIN_FONTS);
    output(fonts, opts.json ?? false, () => {
      for (const f of fonts) process.stdout.write(`${f}\n`);
    });
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof CommanderError) {
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
      process.exit(0);
    }
    if (err.code === 'commander.help') {
      // Help was requested implicitly (e.g. bare `meme`); print it instead of an error.
      program.outputHelp();
      process.exit(1);
    }
    fail(new MemeError('INVALID_SPEC', err.message.replace(/^error: /, '')), jsonMode);
  }
  fail(err, jsonMode);
});
