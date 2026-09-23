# meme-maker — Architecture

A concise summary of the code as it exists on `main` today. For the full design rationale and history, see [DESIGN-v2.md](./DESIGN-v2.md) (v2 plan) and [../DESIGN.md](../DESIGN.md) (v1).

## Overview

One declarative `MemeSpec` (zod schema) sits at the center; a pure core renders it; thin adapters expose the same core over four surfaces:

```
CLI  (src/cli.ts)  ─┐
MCP  (src/mcp.ts)  ─┼─ MemeSpec (src/spec.ts) ─→ renderMeme (src/render/renderer.ts)
HTTP (src/http.ts) ─┘                              ├─ catalog.ts   (assets/templates/manifest.json)
        │                                          ├─ render/text.ts ← render/font.ts
   Web UI (ui/)                                    ├─ render/gif.ts
                                                   └─ render/layout.ts
```

## `src/` map

| File | Role |
| --- | --- |
| `index.ts` | Library entrypoint: re-exports `renderMeme`, `listTemplates`, `getTemplate`, spec types |
| `spec.ts` | `MemeSpec` zod schemas: discriminated-union `base` (`template \| image \| canvas \| layout`), `texts: TextBox[]`, `output`; `MemeError` with typed codes |
| `catalog.ts` | Template registry: loads and validates `assets/templates/manifest.json` (generated — see [CONTRIBUTING.md](./CONTRIBUTING.md)), `listTemplates` / `getTemplate`, `MEME_TEMPLATES_DIR` override |
| `cli.ts` / `cli-args.ts` | Commander-based CLI (`meme`): templates, render, layout, spec, fonts, ui commands; `--json` / `--strict` |
| `mcp.ts` | Stdio MCP server (`meme-maker-mcp`): `list_templates`, `get_template`, `render_meme`, `render_layout`, `preview_template`; inline images capped at 1 MB |
| `http.ts` | Local HTTP server behind `meme ui`: serves the SPA and a JSON API (`/api/templates`, `/api/templates/:id`, `/api/measure`, `/api/render`, `/api/history`) |
| `paths.ts` | Path confinement: output writes under `MEME_OUTPUT_ROOT`, input reads under `MEME_INPUT_ROOT`, `MEME_ALLOW_FS` opt-in for MCP/HTTP |
| `limits.ts` | Resource caps (pixels, input bytes, GIF frames, text length, timeout, concurrency) via `MEME_MAX_*` env vars |

### Render pipeline (`src/render/`)

`renderMeme(spec)` in `renderer.ts` runs: **buildBase** (template media, user image, blank canvas, or grid layout via `layout.ts`) → per-text **resolveRect** (named slot or explicit rect) → **renderTextLayer** (`text.ts`: auto-fit, wrap, glyph outlines → SVG paths; `font.ts`: opentype.js with an Anton → Noto Sans → Noto Emoji per-codepoint fallback chain) → **sharp composite** → encode (png/jpeg/webp/gif) → optional file write. `gif.ts` handles multi-frame composition preserving animation timing. The SVG text layer is deterministic — identical input yields identical output — which is what golden-image tests rely on.

## Adapters and their contracts

- **CLI** — human- and script-friendly; every command supports `--json` (machine-readable stdout, errors as `{ "error": { "code", "message" } }`, exit 1) and `--strict` (degraded-render warnings become errors).
- **MCP** — the agent surface; trust boundary enforced by `paths.ts` + `limits.ts` (safe by default, opt-out via env vars).
- **HTTP** — same trust posture as MCP; consumed by the web UI but usable directly.
- **Web UI** (`ui/`, Preact + Vite) — a friendly `MemeSpec` editor: gallery, editor with live preview, render history, batch mode. Talks only to the HTTP API. Spec: [UI-DESIGN.md](./UI-DESIGN.md).

## Assets

`assets/templates/` holds template media (`images/`, `gifs/`, `packs/<pack>/`), one `<id>.meta.json` sidecar per template, and the generated `manifest.json` + `thumbs/`. `assets/fonts/` bundles the OFL-licensed fonts. Regeneration: `npm run build:manifest` and `npm run build:thumbs`.

## Tests

`test/` covers the catalog, CLI (including error contracts), golden-image rendering, GIF handling, and MCP/HTTP integration (`npm test`, vitest). Point-in-time stress-test reports live in this directory — see the [docs index](./README.md#stress-test-reports).
