# DESIGN — Agent Meme Maker

## 1. Product Overview

A meme editor **for agents**. Humans use GUI meme makers (drag text boxes onto templates, pick fonts, download). Agents need the same capability — pick a premade template, place captions, get back a real image or GIF — through machine-friendly interfaces: a CLI and an MCP server.

### Source / inspiration

The reference is the "Meme Maker" feature of SupaBird.io, demonstrated by @hustle_fred (tweet `2079146773012963578`). Observed UX from the demo video:

- A **template gallery** with two tabs: **Image Memes** and **GIF Memes**, plus a **Blank Canvas** starter.
- Classic templates: Distracted Boyfriend, Batman Slapping Robin, Anakin/Padmé 4-panel, Swole Doge vs. Cheems, "Is this a pigeon?", etc.
- **Layouts**: grid canvases (e.g. 2×2) with per-cell image upload slots.
- **Add Text**: draggable text boxes with font (Impact default), size, rotation, bold/italic/underline, alignment, outline/box styles, and text width control.
- **Background**: canvas color and canvas mode settings.
- **Download**: export the finished meme directly.

This project reproduces that feature set headlessly and deterministically: the "drag a text box" interaction becomes declarative coordinates/anchors; the gallery becomes a queryable JSON catalog; Download becomes a file path or base64 blob.

### Why agents need this

Agents increasingly produce social content, docs, PR comments, and chat replies where a meme is the right artifact. Screenshotting web meme generators is slow, flaky, and non-reproducible. This tool gives agents a one-shot, scriptable path from intent ("Drake meme: X bad, Y good") to a finished image file.

## 2. Features

### v1 (must-have)

1. **Template library**: ~30 curated meme templates (≥24 static images, ≥6 animated GIFs), stored in-repo with metadata.
2. **Template discovery**: list/search templates by name, tags, and panel/slot count; each template documents its named text slots with default styling and placement.
3. **Text overlay engine**: multiple text boxes per meme; classic meme styling by default (Impact-style bold, white fill, black stroke, auto-wrap, auto-shrink-to-fit); overrides for font size, color, stroke, alignment, rotation, opacity, max width.
4. **GIF support**: caption animated GIFs (text rendered across all frames, or a frame range), output as animated GIF.
5. **Blank canvas & layouts**: start from a solid-color canvas of any size; grid layouts (1×2, 2×1, 2×2, 3×1…) with per-cell images (local paths) — mirrors the SupaBird "Layouts" tool.
6. **Custom images**: use any local image file as the base instead of a built-in template.
7. **Output**: PNG / JPEG / GIF / WebP to a file path; optional base64 return (for MCP clients that want inline results); deterministic output for identical inputs.
8. **CLI** (`meme`): full feature parity, JSON-in/JSON-out mode for scripting.
9. **MCP server** (`meme-maker-mcp`): stdio transport, tools mirroring the CLI.
10. **Validation & errors**: precise, machine-readable errors (unknown template, missing slot, text overflow warnings) — never a corrupt image.

### v2 (nice-to-have, out of scope for v1)

- Image overlays/stickers on top of templates
- Video (MP4) meme output
- Template pack plugins (user-supplied template directories) — v1 has a minimal `--templates-dir` escape hatch
- HTTP API server mode

## 3. Tech Stack

**TypeScript / Node.js (≥20)** — chosen over Python because the MCP ecosystem's reference SDK (`@modelcontextprotocol/sdk`) is TypeScript-first, and a single language covers CLI + MCP + library cleanly.

| Concern | Choice | Rationale |
|---|---|---|
| Raster compositing | `sharp` (libvips) | Fast, headless, no native browser; reads/writes PNG/JPEG/WebP/GIF including **animated GIF** (libvips + cgif) |
| Text rendering | SVG text composited via sharp | Pixel-perfect stroke+fill, kerning, wrapping under our control; no canvas/GL dependency |
| Font | Bundled open font: **Anton** (Impact-alike, OFL) + Noto Sans fallback | Offline, license-clean, classic meme look |
| CLI | `commander` | Small, standard |
| MCP | `@modelcontextprotocol/sdk` (stdio) | Reference implementation |
| Schema/validation | `zod` | Shared between CLI JSON mode and MCP tool inputs |
| Tests | `vitest` + golden-image snapshot tests (pixel-diff tolerance) | Deterministic rendering verification |

Everything runs offline: templates and fonts ship in the repo/package; no network calls at render time.

## 4. Architecture

```
┌────────────┐   ┌──────────────┐
│  CLI (meme)│   │ MCP server   │
└─────┬──────┘   └──────┬───────┘
      │  zod-validated MemeSpec  │
      ▼                 ▼
┌──────────────────────────────┐
│        core library          │
│  ┌─────────┐  ┌───────────┐  │
│  │ catalog  │  │ renderer  │  │
│  │ (templates│ │ (sharp +  │  │
│  │  + search)│ │ SVG text) │  │
│  └─────────┘  └───────────┘  │
│  ┌─────────┐  ┌───────────┐  │
│  │ layouts  │  │ gif engine│  │
│  └─────────┘  └───────────┘  │
└──────────────────────────────┘
      │
      ▼
 assets/templates/**  (images, gifs, manifest.json)
```

- **catalog**: loads `assets/templates/manifest.json`, exposes `listTemplates(filter)`, `getTemplate(id)`.
- **renderer**: builds the base raster (template image / blank canvas / layout grid), converts each text box into a measured, wrapped, auto-fitted SVG layer, composites with sharp.
- **gif engine**: decodes GIF frames via sharp pages, composites text onto each frame (or a range), re-encodes preserving timing/loop.
- **layouts**: computes grid cell rects, resizes/crops cell images (cover fit), draws gutters/background.
- **CLI / MCP** are thin adapters over one shared `renderMeme(spec)` entry point and one shared `MemeSpec` zod schema — no logic duplication.

### Core data model: `MemeSpec`

```ts
type MemeSpec = {
  base:
    | { kind: "template"; id: string }
    | { kind: "image"; path: string }
    | { kind: "canvas"; width: number; height: number; color?: string }   // default #ffffff
    | { kind: "layout"; grid: [cols: number, rows: number];
        cells: { image: string }[]; width?: number; gutter?: number; color?: string };
  texts: TextBox[];
  output: { format?: "png" | "jpeg" | "gif" | "webp"; path?: string;      // path omitted => base64 return
            quality?: number; maxWidth?: number };
};

type TextBox = {
  slot?: string;            // named template slot: inherits its rect + default style
  text: string;
  // free placement (required when no slot):
  x?: number; y?: number; width?: number; height?: number;   // px or "10%" strings
  anchor?: "top" | "middle" | "bottom";                        // vertical align in box
  align?: "left" | "center" | "right";
  style?: { font?: string; size?: number | "auto"; color?: string;
            stroke?: string; strokeWidth?: number; background?: string;
            bold?: boolean; italic?: boolean; underline?: boolean;
            rotation?: number; opacity?: number; lineHeight?: number;
            caps?: boolean };                                  // caps default: true (classic meme)
  frames?: [start: number, end: number];                       // GIF only; default all frames
};
```

Defaults produce the classic look: Anton, auto-size (fit box, capped), uppercase, white fill, black stroke, centered.

## 5. CLI Spec (`meme`)

Installed via `curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh` (see [docs/INSTALL.md](docs/INSTALL.md)). All commands support `--json` for machine-readable output on stdout; exit code 0/1; errors as `{ "error": { "code", "message" } }`.

```
meme templates list [--tag <tag>] [--type image|gif] [--search <q>] [--json]
    → id, name, type, size, panels, tags, text slots per template

meme templates show <id> [--json]
    → full metadata incl. slot rects + defaults; --preview <path> writes the blank template

meme render [options]
    --template <id> | --image <path> | --canvas <WxH> [--bg <color>]
    --text "<slotOrIndex>=<content>"        (repeatable; e.g. --text top="ME WRITING CODE")
    --text-file <spec.json>                 (full MemeSpec texts array for advanced styling)
    -o, --out <path>                        (default: ./meme-<template>-<hash>.<ext>)
    --format png|jpeg|gif|webp  --quality <n>  --max-width <px>
    --json                                  (result: { path, width, height, format, bytes })

meme layout [options]
    --grid 2x2 --cell <img> --cell <img> ... [--gutter <px>] [--bg <color>] [--width <px>]
    --text ... -o <path>                    (same text/output options as render)

meme spec render <memespec.json> [-o <path>]   # one-shot: full MemeSpec from file/stdin
meme fonts list
meme --version | --help
```

Example (agent one-liner):

```sh
meme render --template drake --text no="MANUAL MEME EDITORS" --text yes="A CLI FOR AGENTS" -o drake.png --json
```

## 6. MCP Tool Spec (`meme-maker-mcp`)

Stdio MCP server, launched via the installed `meme-maker-mcp` binary. Tools (zod schemas shared with the CLI):

| Tool | Input | Output |
|---|---|---|
| `list_templates` | `{ type?, tag?, search? }` | Array of `{ id, name, type, width, height, tags, slots: [{name, hint}] }` |
| `get_template` | `{ id }` | Full template metadata incl. slot rects, defaults, example usage |
| `render_meme` | `MemeSpec` (with `base.kind: "template" \| "image" \| "canvas"`) | `{ path?, base64?, mimeType, width, height }` + MCP image content block when small enough |
| `render_layout` | layout-flavored `MemeSpec` | same as `render_meme` |
| `preview_template` | `{ id }` | Blank template as MCP image content (lets the agent "see" it before captioning) |

Design notes:
- `render_meme` returns both a saved file path (when `output.path` given) and an inline MCP `image` content block (≤ ~1 MB) so chat-based agents can display results immediately.
- Errors are MCP tool errors with stable `code` strings (`TEMPLATE_NOT_FOUND`, `SLOT_NOT_FOUND`, `INVALID_SPEC`, `IO_ERROR`).
- Server is stateless; safe to run many instances.

## 7. Library API (programmatic)

```ts
import { listTemplates, getTemplate, renderMeme } from "agent-meme-maker";
const out = await renderMeme({ base: { kind: "template", id: "drake" },
  texts: [{ slot: "no", text: "..." }, { slot: "yes", text: "..." }],
  output: { path: "out.png" } });
```

## 8. File Layout

```
meme-maker/
├── DESIGN.md, README.md, package.json, tsconfig.json
├── assets/
│   ├── fonts/                 # Anton, Noto Sans (OFL, licenses included)
│   └── templates/
│       ├── manifest.json      # catalog: all template metadata
│       ├── images/*.jpg|png   # static templates
│       └── gifs/*.gif         # animated templates
├── src/
│   ├── index.ts               # library exports
│   ├── spec.ts                # MemeSpec zod schemas + types
│   ├── catalog.ts             # template loading/search
│   ├── render/
│   │   ├── renderer.ts        # main pipeline
│   │   ├── text.ts            # measurement, wrapping, auto-fit, SVG generation
│   │   ├── gif.ts             # animated GIF pipeline
│   │   └── layout.ts          # grid layouts / blank canvas
│   ├── cli.ts                 # commander CLI (bin: meme)
│   └── mcp.ts                 # MCP server (bin: meme-maker-mcp)
├── test/
│   ├── golden/                # expected output images
│   └── *.test.ts
└── examples/                  # sample specs + rendered outputs for docs
```

## 9. Asset / Template Strategy

- **Curation**: ~30 iconic, agent-useful templates. Static: Drake, Distracted Boyfriend, Batman Slap, Two Buttons, Change My Mind, Expanding Brain, Woman Yelling at Cat, Swole Doge vs Cheems, This Is Fine, Galaxy Brain, Is This a Pigeon?, Anakin/Padmé 4-panel, Gru's Plan, Surprised Pikachu, One Does Not Simply, Success Kid, Hide the Pain Harold, Disaster Girl, Bike Fall (self-sabotage), Astronaut "Always Has Been", Clown Makeup, Trade Offer, Stonks, Bell Curve (midwit). GIFs: Michael Scott "No", Confused Math Lady, Blinking White Guy, Deal With It, Mind Blown, Homer backing into bushes (subject to sourcing, below).
- **Sourcing & licensing**: source from public meme-template repositories (e.g. imgflip's popular templates as reference). Meme templates are widely reproduced under de-facto fair-use; we ship reasonably sized copies (≤ 1200 px, GIFs ≤ 5 MB), document provenance per template in `manifest.json` (`source` field), and honor takedown requests. Any template that cannot be sourced cleanly gets dropped or replaced — quality bar over quantity.
- **Manifest** entry example:

```json
{ "id": "drake", "name": "Drake Hotline Bling", "type": "image",
  "file": "images/drake.jpg", "width": 1200, "height": 1200,
  "tags": ["choice", "preference", "two-panel"],
  "slots": [
    { "name": "no",  "rect": [600, 0, 600, 600],   "hint": "the rejected option" },
    { "name": "yes", "rect": [600, 600, 600, 600], "hint": "the preferred option" }
  ],
  "source": "https://imgflip.com/memetemplate/Drake-Hotline-Bling" }
```

- Slot rects are hand-tuned per template; `hint` fields teach agents correct usage without seeing the image.
- `manifest.json` is validated by a zod schema in CI; a CI check also verifies every referenced file exists and matches declared dimensions.

## 10. Implementation Plan

Small, focused PRs (one per step where practical):

1. **Scaffold**: package.json, tsconfig, lint (eslint+prettier), vitest, CI (build/lint/test).
2. **Spec + catalog**: `spec.ts`, `catalog.ts`, manifest schema, 3 seed templates, unit tests.
3. **Static renderer**: text measurement/wrap/auto-fit, SVG text layer, template + canvas bases, golden tests.
4. **CLI v1**: `templates list/show`, `render` for static images, `--json` mode.
5. **GIF engine**: animated captioning, GIF templates, golden tests.
6. **Layouts**: grid/blank-canvas rendering, `meme layout`.
7. **MCP server**: all 5 tools, integration test via MCP client SDK.
8. **Template library buildout**: remaining ~25 templates with tuned slots + provenance.
9. **Polish & release**: examples dir, README usage docs, npm publish workflow, version tag.

## 11. Success Criteria

- `meme render --template drake --text no=A --text yes=B -o out.png` produces a correct, classic-styled meme in < 2 s, fully offline.
- An MCP client (e.g. Claude/Devin) can list templates, pick one by tags/hints alone, render, and receive the image inline — end to end without human help.
- Animated GIF templates render with captions on all frames, preserving timing and loop count.
- Identical spec → byte-identical output (deterministic).
- All golden-image tests and manifest CI checks pass; catalog ships ≥ 30 templates each with slot hints.
- Invalid input never crashes or emits a broken file; every failure is a typed, documented error.
