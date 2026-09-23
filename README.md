# Meme Lord

> Local-first meme generation for Codex, Claude Code, and other AI agents.

Meme Lord renders deterministic PNG, WebP, and GIF memes from templates. It runs entirely on the user's machine through MCP, CLI, HTTP, or a local web UI.

## Connect an agent

Requirements: Node.js `>=20.19.0`.

Install the package once:

```sh
npm install -g meme-lord@0.4.0
```

Register the local MCP server:

```sh
# Codex
codex mcp add meme-lord -- meme-lord-mcp

# Claude Code
claude mcp add --scope user meme-lord -- meme-lord-mcp
```

On native Windows, use `npx` through `cmd`:

```sh
codex mcp add meme-lord -- cmd /c npx -y meme-lord@0.4.0 mcp
claude mcp add --scope user meme-lord -- cmd /c npx -y meme-lord@0.4.0 mcp
```

Restart the agent and verify that the `meme-lord` MCP server exposes:
`suggest_templates`, `list_templates`, `get_template`, `preview_template`,
`measure_meme`, `render_meme`, and `render_layout`.

The recommended agent workflow is:

1. Turn the user's request into a short English brief describing the humor mechanic, tone, visual relationship, and caption shape.
2. Call `suggest_templates`; compare each template's selection guide instead of relying on phrase matching.
3. Preview the finalist when recommended, then inspect its slots with `get_template`.
4. Call `measure_meme` and revise captions until the result is `ready`.
5. Call `render_meme` with `output.onDegrade: "error"`.

## Quick start

```sh
# Browse and search the 610-template catalog
meme templates list
meme templates suggest "sarcastic comparison, expectation versus reality" --json

# Render a classic template
meme render --template drake \
  --text no="MANUAL MEME EDITORS" \
  --text yes="A CLI FOR AGENTS" \
  -o out.png
```

Without a global install:

```sh
npx -y meme-lord@0.4.0 render --template drake \
  --text no="MANUAL MEME EDITORS" \
  --text yes="A CLI FOR AGENTS" \
  -o out.png
```

All commands support `--json`. Use `--strict` to turn overflow and missing-glyph warnings into errors.

## Local web UI and HTTP API

```sh
meme ui --port 8787
```

Open <http://127.0.0.1:8787/>. The UI includes template search, an editor, preview, render history, and batch rendering. The same server exposes `/api/templates`, `/api/measure`, `/api/render`, and `/api/history`.

## MemeSpec

The MCP and HTTP APIs accept the same JSON shape:

```json
{
  "base": { "kind": "template", "id": "drake" },
  "texts": [
    { "slot": "no", "text": "MANUAL MEME EDITORS" },
    { "slot": "yes", "text": "AGENT CLIS" }
  ],
  "output": { "path": "out.png", "format": "png", "onDegrade": "error" }
}
```

Template metadata includes named slots, safe text regions, constraints, and semantic selection guides. `measure_meme` reports fitted font size, line count, coverage, and warnings before rendering.

## Development

```sh
git clone https://github.com/lovesickness111/meme-lord.git
cd meme-lord
npm install
npm run build
npm test
npm run lint
```

Package smoke test:

```sh
npm run test:package
```

Useful environment variables:

- `MEME_TEMPLATES_DIR` — use a custom template catalog.
- `MEME_OUTPUT_ROOT` — constrain MCP/HTTP output files.
- `MEME_HISTORY_DIR` — change the local UI history directory.
- `MEME_ALLOW_FS=1` — allow filesystem image inputs on MCP/HTTP surfaces.

See [`docs/`](docs/README.md) for API, template, UI, and deployment details.
