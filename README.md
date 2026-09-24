# Meme Lord

> Local-first meme generation for Codex, Claude Code, and other AI agents.

Meme Lord renders deterministic PNG, WebP, and GIF memes from templates. It runs **entirely on the user's machine** — no server hosting required. The MCP server is a local `stdio` process spawned automatically by your AI agent.

## How to use with an AI Agent

There are **two ways** to give your AI agent the ability to cook memes:

---

### Way 1 — Clone the repo (recommended for developers)

Clone the repository and open it in your AI agent. The `meme-cook` skill is automatically discovered from `.agents/skills/meme-cook/SKILL.md` — no extra setup needed.

```sh
git clone https://github.com/lovesickness111/meme-lord.git
cd meme-lord
npm install
npm run build
```

Then simply ask your agent:
> *"Tạo meme trêu thằng bạn suốt ngày bị limit quota Claude"*

The agent will activate the `meme-cook` skill automatically and use the CLI (`npx tsx src/cli.ts render ...`) to render memes locally.

**Advantages:**
- Skill auto-loaded, no manual setup.
- Render via CLI — fast, direct, offline.
- Full source access for customization.

---

### Way 2 — Install via NPM + copy the meme-cook skill

For users who don't want to clone the full ~90 MB repo, install just the MCP server package and grab the skill file separately.

**Step 1 — Register the MCP server** (runs locally on user's machine via stdio):

```sh
# Claude Code
claude mcp add --scope user meme-lord -- cmd /c npx -y @nvcuong1/meme-lord mcp

# Codex
codex mcp add meme-lord -- cmd /c npx -y @nvcuong1/meme-lord mcp
```

> **How does the MCP server work?**
> When your agent needs to render a meme, it spawns a local Node.js process (`npx @nvcuong1/meme-lord mcp`) on the user's machine. The agent communicates with it via `stdin`/`stdout` (stdio). Nothing runs on the internet — all rendering happens locally, offline, on the user's machine. You (the developer) do not host anything.

**Step 2 — Copy the meme-cook skill** into your project:

Download the skill files from the GitHub repository and place them in your project:

```
your-project/
└── .agents/
    └── skills/
        └── meme-cook/
            ├── SKILL.md
            └── references/
                ├── WORKFLOW.md
                ├── GUIDE.md
                └── EXAMPLES.md
```

Skill files: [github.com/lovesickness111/meme-lord/tree/main/.agents/skills/meme-cook](https://github.com/lovesickness111/meme-lord/tree/main/.agents/skills/meme-cook)

Then restart your agent and ask:
> *"Tạo meme trêu thằng bạn suốt ngày bị limit quota Claude"*

The agent will call `render_meme` via MCP instead of the CLI.

**Advantages:**
- Works across any workspace on the user's machine.
- No need to clone the full repo.
- Rendering is still 100% local and offline.

---

## Verified MCP tools

After registering, restart the agent and verify `meme-lord` exposes:
`suggest_templates`, `list_templates`, `get_template`, `preview_template`,
`measure_meme`, `render_meme`, and `render_layout`.

## Recommended agent workflow (MCP mode)

1. Turn the user's request into a short brief: humor mechanic, tone, caption shape.
2. Call `suggest_templates`; compare each template's selection guide.
3. Inspect slots with `get_template`.
4. Call `measure_meme` and revise captions until the result is `ready`.
5. Call `render_meme` with `output.onDegrade: "error"`.

---

## Quick start (CLI)

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
npx -y @nvcuong1/meme-lord render --template drake \
  --text no="MANUAL MEME EDITORS" \
  --text yes="A CLI FOR AGENTS" \
  -o out.png
```

All commands support `--json`. Use `--strict` to turn overflow and missing-glyph warnings into errors.

---

## Local web UI and HTTP API

```sh
meme ui --port 8787
```

Open <http://127.0.0.1:8787/>. The UI includes template search, an editor, preview, render history, and batch rendering. The same server exposes `/api/templates`, `/api/measure`, `/api/render`, and `/api/history`.

---

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

---

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
