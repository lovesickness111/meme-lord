# meme-maker — DESIGN v2

> This is the **v2 architecture doc** — the design that drove the v2 implementation now on
> `main`. Much of it has since been implemented; for the current implementation status see
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) (as-built summary) and [`ROADMAP.md`](./ROADMAP.md)
> (sequencing / remaining items). Kept intact as the design record.

**Status:** Design / recommendation phase at time of writing. No code in this document was implemented when written.
**Author:** design-synthesis sub-agent (synthesis of 8 parallel review reports + code read).
**Base under review:** `kartikkabadi/meme-maker` implementation branch `devin/polish` (v0.1.0);
default branch `devin/design` currently holds docs only. Cross-referenced against
`kartikkabadi/synara` (agent harness / MCP host).

This document is written to be **directly actionable**: every recommendation names concrete
files, schema shapes, CLI flags, and UI components so the parent orchestrator can spawn
implementation agents against a P0/P1/P2 list without further design work. A shorter,
sequencing-oriented view lives in [`ROADMAP.md`](./ROADMAP.md).

---

## 0. TL;DR — the simplest robust design

The v1 architecture is already close to right and should be **preserved, not rebuilt**:
one declarative `MemeSpec` (zod) at the center, a pure core (`renderMeme(spec)` + catalog),
and thin adapters (CLI, stdio MCP). The v2 work is **hardening + surfacing**, not
re-architecture:

1. **Fix the correctness/security bugs** that let the tool silently produce wrong output or
   touch arbitrary files (P0). These are cheap and high-value.
2. **Add exactly one new adapter** — a local HTTP server (`src/http.ts`) — and a small web
   UI that is nothing more than a friendly `MemeSpec` editor. No package split, no SSE, no
   config system, no DB.
3. **Replace the hand-rolled TrueType parser with `opentype.js`** and ship a fallback font
   so agent-generated emoji/CJK/curly-quotes stop vanishing silently.
4. **Ship a path-confinement + resource-limit layer** that both the MCP and HTTP surfaces
   share, turning the current "fully trusted" posture into "safe by default, opt-out for
   trusted local use."
5. **Grow the catalog to 100+ templates** via a manifest generator + licensing/QC pipeline,
   keeping assets bundled until package weight forces a split.
6. **Keep meme-maker a standalone npm package** whose stdio MCP server registers into each
   provider's native config; Synara needs **zero code changes** to benefit.

The single non-obvious asset to protect through all of this is the **deterministic SVG text
layer**: it is what makes golden tests, offline rendering, browser-side preview, and future
ffmpeg overlays all fall out for free. No change in v2 may reintroduce a platform text stack
(fontconfig/Pango).

---

## 1. Current architecture (as-built, grounded in code)

```
CLI (src/cli.ts) ─┐
                  ├─ MemeSpec (src/spec.ts, zod) ─→ renderMeme (src/render/renderer.ts)
MCP (src/mcp.ts) ─┘                                  ├─ catalog.ts        (manifest.json)
                                                     ├─ render/text.ts ← render/font.ts
                                                     ├─ render/gif.ts
                                                     └─ render/layout.ts
```

- **`MemeSpec`** (`src/spec.ts`): discriminated-union `base` (`template | image | canvas |
  layout`), `texts: TextBox[]`, `output` (`format/path/quality/maxWidth`). One zod schema
  set is shared by CLI, MCP, and library — this is the property to protect.
- **`renderMeme(spec)`** (`src/render/renderer.ts`): `buildBase` → per-text `resolveRect` +
  `renderTextLayer` (glyph outlines → SVG paths) → `sharp` composite → encode → optional
  `writeFile(spec.output.path)`.
- **Catalog** (`src/catalog.ts`): single `assets/templates/manifest.json`, zod-validated,
  process-cached; `listTemplates`/`getTemplate` linear scans. 37 templates today
  (32 image + 5 GIF), ~9 MB assets.
- **MCP** (`src/mcp.ts`): 5 tools — `list_templates`, `get_template`, `render_meme`,
  `render_layout`, `preview_template`. Inline `image` content block gated at
  `MAX_INLINE_BYTES = 1_000_000`; `meta.base64` is **not** gated (bug).
- **Errors**: `MemeError` with 4 codes (`TEMPLATE_NOT_FOUND`, `SLOT_NOT_FOUND`,
  `INVALID_SPEC`, `IO_ERROR`), surfaced identically in CLI `--json` and MCP `isError`.

**Verdict from the reviews:** functionally strong (41/41 tests, deterministic, <2 s renders),
but with a cluster of *silent-wrong-result* bugs, a *fully-trusted* security posture, an
*unbounded* resource profile, and *zero human UX*.

---

## 2. Consolidated defect register (from all 8 reviews)

Each row cites the originating review(s). "Silent" = succeeds but produces wrong/unsafe
output — the worst failure mode for an autonomous agent. Priority is assigned in §9.

| ID | Defect | Surface | Source review(s) | Prio |
|----|--------|---------|------------------|------|
| D1 | MCP `meta.base64` bypasses `MAX_INLINE_BYTES` — multi-MB base64 into agent context | MCP | perf, failure, live, happy | **P0** |
| D2 | Arbitrary file **write** via `output.path` (abs/`..`/symlink) | MCP+CLI | security F1 | **P0** |
| D3 | Arbitrary file **read**+exfil via `base.path` / `cells[].image` | MCP | security F2 | **P0** |
| D4 | SVG markup injection via unescaped `color`/`stroke`/`background` | all | security F3 | **P0** |
| D5 | DoS: unbounded canvas/layout dims, GIF frames, text length, no timeout/concurrency cap | all | security F4, perf | **P0** |
| D6 | Unmapped glyphs (emoji/CJK/curly quotes) render as blank `.notdef`, **no warning** | render | happy G2, failure S13, live B2, arch | **P0** |
| D7 | `--text N=` (index syntax) silently dropped → overlapping centered boxes | CLI | happy B4, failure S21, live B1 | **P0** |
| D8 | `frames:[a,b]` out-of-range/reversed silently renders text on zero frames | render | happy B6, failure S14 | P1 |
| D9 | `output.maxWidth` silently ignored for GIFs | render | happy B3, failure S15, live | P1 |
| D10 | `spec render` with no `output.path` discards the image silently | CLI | happy G3, failure S23 | P1 |
| D11 | EPIPE crash on closed stdout (`meme templates list \| head`) | CLI | happy B5 | P1 |
| D12 | Wrong error codes: `INVALID_JSON`/color/write folded into `IO_ERROR`; raw libvips leaks | all | failure §4 | P1 |
| D13 | GIF bytes written to `.png` path (extension/content mismatch), no warning | CLI | happy B2, live B4 | P1 |
| D14 | Commander arg errors bypass `--json` contract (plain text on stderr) | CLI | failure S18 | P1 |
| D15 | No `sharp.cache()` bound → RSS grows to 300 MB+ under sustained load | perf | perf §3 | P1 |
| D16 | Per-render template decode (no decoded-base cache) | perf | perf §4 | P2 |
| D17 | `--templates-dir` plumbed in `catalog.ts` but exposed by neither CLI nor MCP | catalog | happy G1, arch | P1 |
| D18 | Doc/spec drift: Noto fallback, `strokeWidth:'auto'`, band slots absent from MCP descriptions, `fonts list` has no consumer | docs | arch, live, happy | P2 |
| D19 | Latent manifest `file` path traversal (matters once template packs are third-party) | catalog | security F7, arch | P2 |
| D20 | Not published to npm; implementation unmerged to default branch | dist | synara, live, happy G6 | **P0 (unblock)** |
| D21 | `dimension`/`rotation`/`frames` schema allow negatives/nonsense; `parseDim("abc")→NaN` | spec | failure S22, perf | P1 |
| D22 | Hand-rolled TTF parser: Latin-only, no kerning/CFF/shaping, highest maintenance risk | render | arch risk 1 | P1 |
| D23 | Determinism overpromised — byte-identical only per pinned `sharp`/libvips build | test | arch risk 2 | P2 |
| D24 | No visual catalog browse, live preview, or history for humans | UX | ui-ux G1–G9 | P1 |
| D25 | Rendered files dirty worktree in Synara threads (no scratch/artifacts dir convention) | integ | synara §4/5 | P1 |

---

## 3. Core engine design (v2)

### 3.1 Typed, machine-readable error model (fixes D12, D14, D21)

Extend `MemeError` (do not replace it) with structured details, matching Synara's
`Schema.TaggedError` discipline:

```ts
// src/spec.ts
type MemeErrorCode =
  | 'TEMPLATE_NOT_FOUND'   // { id, available: string[] }
  | 'SLOT_NOT_FOUND'       // { template, slot, available: string[] }
  | 'INVALID_SPEC'         // { issues: { path, message }[] }
  | 'INVALID_JSON'         // { file?, position? }            (new; split from IO_ERROR)
  | 'UNREADABLE_IMAGE'     // { path, detail }                (new)
  | 'UNSUPPORTED_OUTPUT'   // { format, reason }  e.g. maxWidth on gif, png for animated base
  | 'RESOURCE_LIMIT'       // { limit, requested, kind }      (new; DoS rejections)
  | 'PATH_DENIED'          // { path, root }                  (new; confinement)
  | 'RENDER_ERROR'         // { detail }
  | 'WRITE_FAILED'         // { path, detail }
  | 'IO_ERROR';            // true catch-all only

class MemeError extends Error { code: MemeErrorCode; details?: Record<string, unknown> }
```

- CLI JSON failure shape becomes `{"error":{"code","message","details"}}`; keep exit 1 for
  now, document "branch on stdout `error.code`". Force commander's own errors through the
  same JSON shape via `program.exitOverride()` + `configureOutput()` (fixes D14).
- MCP: emit the same `{error:{code,message,details}}` in the `isError` text block and align
  the SDK's raw-zod rejection shape with a custom handler where the SDK allows.
- Wrap **every** `JSON.parse` and every bare `sharp()` at the boundary where the
  filename/template is known (`catalog.ts:23`, `renderer.ts:94` template branch).

### 3.2 Degraded-success warnings (fixes D6, D8, D10, D13)

The overflow-warning pattern already exists (`renderer.ts:150`). Extend `warnings[]` to a
structured shape and add these cases:

```ts
type Warning =
  | { code: 'TEXT_OVERFLOW'; box: number; fittedSize: number }
  | { code: 'UNSUPPORTED_GLYPHS'; box: number; codepoints: string[] }   // D6
  | { code: 'FRAMES_OUT_OF_RANGE'; box: number; frames: [number,number]; frameCount: number } // D8
  | { code: 'EXTENSION_MISMATCH'; path: string; actual: string }        // D13
  | { code: 'EMPTY_TEXT'; box: number };
```

- **D6 (highest agent-facing value):** `font.glyphIndex` returns 0 for missing glyphs;
  collect those codepoints and push `UNSUPPORTED_GLYPHS`. When the fallback font (§3.3)
  covers them, use it silently; only warn for the truly-uncovered.
- **Strict mode** (`--strict` / `output.onDegrade: "error"`): turns every warning into a
  hard `INVALID_SPEC`/`UNSUPPORTED_OUTPUT` for fully-deterministic pipelines.

### 3.3 Font stack (fixes D6, D22)

- **Replace `src/render/font.ts` (hand-rolled 287-LOC TTF parser) with `opentype.js`**
  (zero-dep, CFF/kerning/more cmap formats). Keep the exact same glyph-outline→SVG-path
  output so golden images barely move.
- **Ship a fallback chain**: `Anton` (display) → `Noto Sans` (Latin/punct/currency) →
  `Noto Emoji` (monochrome) as an *optional* covering font. `loadFont` resolves per-codepoint
  with fallback; `measureText` gains kerning for free from `opentype.js`.
- Add a real `--font` consumer (or delete the informational `fonts list`, D18). `BUILTIN_FONTS`
  becomes a registry that template packs can extend (§7).
- Emoji is the single most likely silent-quality failure for agent text; Noto Emoji covers it
  without a platform text stack, preserving determinism.

### 3.4 Resource limits + timeouts (fixes D5, D15, D16, D21)

A shared `src/limits.ts` module, configurable via env (`MEME_MAX_*`) with safe defaults:

| Limit | Default | Enforced in |
|-------|---------|-------------|
| `MEME_MAX_PIXELS` (output) | 16 MP (~4096×4096) | `spec.ts` refine + `buildBase` |
| `MEME_MAX_INPUT_BYTES` | 25 MB | `buildBase` stat before decode |
| `MEME_MAX_GIF_FRAMES` | 300 | `gif.ts` before decode |
| `MEME_MAX_TEXT_LEN` (per box / total) | 2 000 / 8 000 | `spec.ts` refine |
| `MEME_RENDER_TIMEOUT_MS` | 15 000 | `renderMeme` wrapper (AbortController) |
| `MEME_MAX_CONCURRENCY` (MCP/HTTP) | 4 | adapter semaphore |
| `sharp.cache({ memory })` | 200 MB | `renderer.ts` startup + `sharp.concurrency()` |

- Over-limit specs reject with `RESOURCE_LIMIT` **before** allocation (canvas dims, GIF
  frames, `maxWidth`).
- Tighten schema: `dimension` non-negative; `parseDim` rejects `NaN` (fixes D21); `frames`
  validated against `frameCount` (D8); `maxWidth` capped.
- Add a decoded-template-base LRU keyed by template id (D16) — 37 files ≈ a few MB, removes
  the per-render decode round-trip.

### 3.5 Path confinement (fixes D2, D3, D19)

A shared `src/paths.ts` with two roots, defaulting to **safe** on MCP/HTTP and **permissive**
on the local CLI:

```ts
resolveConfined(p: string, root: string): string  // path.resolve, reject if !startsWith(root+sep)
// reject absolute + ".." on confined surfaces; lstat + O_NOFOLLOW to refuse symlink targets
```

- **MCP/HTTP defaults:** input paths must resolve under `MEME_INPUT_ROOT` (default cwd),
  output under `MEME_OUTPUT_ROOT` (default `./.memes/`, see §6/§8). Prefer **inline/base64
  image inputs or template ids only**; `base.path` file reads are opt-in via
  `MEME_ALLOW_FS=1`. Refuse overwrite by default (`--force` / `output.overwrite`).
- **CLI default:** permissive (single-user local trust) but honors the same roots when set,
  so the same binary is safe when an agent drives it.
- Validate manifest `template.file` is relative + `..`-free under `templatesDir` (D19),
  closing the pack-traversal hole before packs ship.
- `limitInputPixels` on every `sharp()` input; **reject SVG inputs** on untrusted surfaces
  (raster allowlist png/jpeg/gif/webp) to shut the LFI/SSRF escalation of D4.

### 3.6 SVG attribute safety (fixes D4)

- Validate `color`/`stroke`/`background` at the schema level against
  `#rgb|#rrggbb|#rrggbbaa|rgb(a)()|<named-color allowlist>`; reject anything else with
  `INVALID_SPEC`.
- Defense-in-depth: XML-escape every interpolated attribute (`renderTextLayer`,
  `text.ts:271`) before building SVG strings.
- Configure the SVG rasterizer to disallow external/`<image href>` references.

### 3.7 CLI hardening (fixes D7, D10, D11, D13, D17)

- **D7:** decide `--text N=` semantics — recommended: map index → template slot N (needs the
  template's slot list in `parseTextArgs`), else reject numeric keys with `INVALID_SPEC`.
  Add an escape for literal `=` (e.g. `--text 'top:E\=mc2'` or a `--text-raw` form).
- **D10:** `spec render` with no `output.path` applies `defaultOutputName` like `render`
  does (one-liner) or errors — never discard.
- **D11:** handle `EPIPE` on stdout globally (`process.stdout.on('error')`), exit 0 on
  downstream close.
- **D13:** when derived/declared extension ≠ actual encoded format, either rewrite the
  extension or push `EXTENSION_MISMATCH`.
- **D17:** expose `--templates-dir` (CLI) + `MEME_TEMPLATES_DIR` (MCP/HTTP) — the whole v1
  plugin-pack story for near-zero code.

### 3.8 MCP surface (fixes D1, D18)

- **D1:** gate `meta.base64` by `MAX_INLINE_BYTES` too; for larger results require/return an
  `output.path` (or a temp path). Auto-downscale for the inline block, or default a
  `maxWidth` for MCP renders so the flagship Drake (~1.34 MB) fits the 1 MB cap.
- Add slot **hints + fitted font size** to `render_meme`/`preview_template` result metadata
  so agents self-correct long captions.
- Teach the band-slot convention (`top|middle|bottom`) in tool descriptions (D18).
- Keep the 5-tool surface; add a namespace note so `meme_*` results never collide with
  Synara's `synara_*` control tools.

---

## 4. New adapter: local HTTP + web UI

This is the **only** structural addition, and it is a third thin adapter, mirroring
CLI/MCP — the architecture review explicitly blesses this ("architecture passes this test
well; the only real cost is transport").

### 4.1 `src/http.ts` (~100 LOC, `node:http` or `hono`)

```
GET  /api/templates            → catalog listing (+ thumbnail URLs)
GET  /api/templates/:id        → full metadata (rects, hints, example)
POST /api/render               → MemeSpec → { path?, base64?, width, height, warnings }
POST /api/measure              → MemeSpec → layout boxes + fitted sizes + warnings, NO raster
GET  /api/preview/:id          → blank template render (cached by spec hash)
GET  /thumbs/:id               → pre-generated ~320px thumbnail
```

- Reuses `renderMeme(spec)` verbatim — the UI never re-implements layout, so **preview =
  truth**. Determinism means previews cache by spec hash (cheap live preview).
- `measureMeme(spec)` (a.k.a. `renderMeme(spec,{measureOnly:true})`) returns boxes+fitted
  sizes without rasterizing — powers instant overlay feedback and the slot-tuner (§5.6).
- Bind localhost only; print a machine-readable `{"url": "http://localhost:PORT"}` line so
  agents/Synara can discover the port (Synara AGENTS.md demands port hygiene). Support
  `--port` with auto-pick on conflict.
- Inherits §3.4/§3.5 limits and confinement — same safety layer as MCP.

### 4.2 `meme ui [--port N]` command + frontend

Small Vite + Preact/React SPA (matches the repo's minimalism), served static by `http.ts`.
State = `MemeSpec`. Save format = a `{json, png}` pair → **MemeSpec is the shared document
between humans and agents**.

**Screens**

1. **Gallery** — responsive card grid (2-col @640 → 6-col @1440), tabs
   `[Image] [GIF] [Blank Canvas] [Layouts]`, tag chips, `/`-focus search. GIF cards animate
   on hover only (never autoplay; respect `prefers-reduced-motion`). Card → editor.
2. **Editor** — preview left (~65%, checkered transparency board + drop shadow), inspector
   right (~35%, collapses to bottom sheet <900px). Slot regions render as dashed, labeled,
   focusable buttons (`aria-label="Text slot: no — the rejected option"`); focused text field
   highlights its region. Debounced live re-render via `/api/render` (spec-hash cached).
   Overflow shows a warning chip on the box (not a hidden array entry, fixes UX-G5).
   Disclosure sections: **Style**, **Output**, **Spec (live JSON + copy)** — the copy button
   is the agent-handoff affordance. **Advanced mode** toggles free drag/resize serialized to
   `x/y/width/height` with a "snap to %" toggle for resolution independence.
3. **My Memes** — grid over `~/.meme-maker/history/<ts>-<hash>.{json,png}` (filesystem as
   state, no DB); actions: re-edit, duplicate, copy spec, reveal file.
4. **Batch / contact sheet** (P2) — drop N spec files → grid of results with per-item
   overflow chips; `j/k` navigate, `Enter` edit, `e`/"Export all".

**Visual language** (from ui-ux §5.3)

- Palette: dark ink scale `#0d0e11 / #16181d / #1e2128`; light paper `#faf9f7 / #ffffff`;
  one accent **meme yellow `#ffd23f`** for primary/focus, `#e5484d` for destructive/overflow.
  All chrome contrast AA (≥4.5:1); never color-only signaling (icon + text on warnings).
- Type: **Inter/system** for UI; **Anton only** in the brand mark and empty states
  ("NO MEMES YET / MAKE ONE").
- Brand mark: white Anton "M" with black stroke on a yellow tile — works as 16px favicon and
  MCP server icon.
- Motion: 150–220 ms ease-out on hover/disclosure/preview swap; honor reduced-motion.
- **Dark/light + responsive from day one.** Accept `?theme=dark|light&accent=<hsl>` so an
  embedding host (Synara) can pass its theme tokens.

**Accessibility (baseline, not an afterthought)**

- Full keyboard operability: `/` search, `1–9` select card, `Enter` open, `Tab` cycle slots,
  `Ctrl+Enter` render, `Ctrl+S` save, `Ctrl+D` theme, `Esc` back, `?` shortcuts sheet.
- Visible focus rings (2px accent, 2px offset).
- **Alt-text field per meme** stored in the spec (`output.alt`) and returned via MCP — a
  meme tool that emits alt text with every render is a genuine accessibility differentiator.

---

## 5. Synara integration

**Key facts confirmed by code read of `kartikkabadi/synara`:**

- Synara injects **only its own `synara` gateway** MCP server into each provider's native
  config (`apps/server/src/agentGateway/mcpInjection.ts`: Codex `[mcp_servers.synara]` TOML
  with `bearer_token_env_var`, Claude `mcpServers` HTTP, ACP HTTP-or-stdio-proxy). It is both
  an MCP host and an MCP server.
- **There is no `/loop` in Synara.** (`/loop` lives in `chatgpt-yolo`'s `command-runtime.js`.)
  Synara's long-running-flow surfaces are **Studio** (autonomous tasks), **Automations**
  (`packages/contracts/src/automation.ts`, scheduled/heartbeat prompts), and **composer slash
  commands** (`packages/shared/src/composerSlashCommands.ts`: `/clear`, `/review`,
  `/automation`, `/fork`, …). Since there is no `/loop`, we design a **standalone UX that
  embeds cleanly later** rather than improving a `/loop` flow that does not exist.
- Synara transcripts already render inline images (`LocalImagePreview.tsx`,
  `ChatMarkdown.tsx`), so `render_meme`'s ≤1 MB inline `image` block appears in-chat **today**
  with zero Synara work.

**Recommended integration — standalone package, provider-native registration (no Synara
code changes for v1):**

| Exposure | How | When |
|----------|-----|------|
| **MCP (primary)** | `meme-maker-mcp` stdio server registered in each provider's native config. One registration serves all 9 providers. | v1 |
| **CLI** | Agents with shell access run `meme … --json` (or `meme spec render`) in Studio/Automation workspaces. Lowest friction today. | v1 |
| **Library** | `import { renderMeme } from 'agent-meme-maker'` — but **do not** bundle into `apps/server` (drags native `sharp` into Bun/Electron). | avoid |
| **Web view** | `meme ui` link-out: agent replies with `http://localhost:<port>/edit#<base64-spec>`; Synara's `InlineLinkChip` makes it one click. | v1.1 |
| **Embedded panel** | Synara right-dock/`BrowserPanel` hosts the editor (`?theme=…`). | later |

**Phased plan (from synara-integration §7, made concrete):**

- **Phase 0 — unblock (P0):** merge implementation to the default branch; publish
  `agent-meme-maker@0.1.x` to npm with `sharp` pinned, 2FA + `--provenance`, committed
  lockfile. Registration becomes one line: `npx -y agent-meme-maker meme-maker-mcp`. Add
  per-provider snippets to the README (Codex TOML, Claude `mcpServers`, ACP).
- **Phase 1 — worktree hygiene (P1, fixes D25):** default `output.path` to
  `$MEME_OUTPUT_ROOT` (honoring a Synara-provided `SYNARA_ARTIFACTS_DIR` if present) →
  `./.memes/` → OS temp, so rendered memes don't dirty `git status` in worktree-backed
  threads. Keep the ≤1 MB inline block for immediate visibility.
- **Phase 2 — optional Synara-side:** generalize `mcpInjection.ts` into a small
  "registered tool servers" table (name → command/URL) injected alongside `synara`, with
  meme-maker as the pilot; verify `mcp_tool_call` image content renders inline (incl. GIF).
  meme-maker needs **no** changes to benefit.

**Agent→human handoff primitive:** an "Open in Meme Editor" link on the rendered image block
(or an `open_in_editor(spec)` MCP tool returning `http://localhost:PORT/edit#<spec>`) lets a
human tweak the caption in the visual editor and save — **without a model round-trip**. Agent
and human edit the *same MemeSpec document*. This is the highest-leverage Synara UX win and it
only requires `meme ui` to exist.

**Explicitly rejected:** embedding as an `apps/server` library dependency; a meme web UI
built *inside* Synara; a mandatory sidecar service. Each adds coupling or native-binary risk
without improving what agents can already do over MCP.

---

## 6. Template expansion to 100+ (plus GIFs)

**Target:** a curated catalog of **100+ image templates + 20+ GIF templates**, high quality,
correctly licensed, discoverable by agents from metadata alone.

### 6.1 Sourcing

- Prioritize the imgflip/knowyourmeme "most-used" head — the templates agents actually
  request. Current 37 already covers the classics (drake, distracted-boyfriend, two-buttons,
  expanding-brain, this-is-fine, …). Expand along the existing tag taxonomy (choice,
  reaction, four-panel, galaxy-brain, panic, …).
- **Licensing/QC gate (per template) — required before merge:**
  - Source URL + license/attribution recorded in the manifest `source` field (make it
    structured: `{ url, license, attribution }`).
  - Prefer public-domain / permissively-licensed / self-captured frames; document each in
    the manifest `source` field.
  - Reject watermarked, low-res (<600 px min dim), or ambiguously-licensed images.
  - No trademarked logos as the meme subject; no content violating the project CoC.

### 6.2 Manifest management (fixes hand-editing pain at scale)

- Keep the **single `manifest.json`** (parse is ~ms even at 1000 entries) but add a
  **generator**: `scripts/build-manifest.ts` scans `assets/templates/**`, reads a small
  per-template sidecar (`<id>.meta.json`: name, tags, slots, source/license) and emits the
  merged, schema-validated manifest — so contributors edit one small file, not a 2000-line
  monolith.
- Build a startup **`Map<id, Template>` index** so `getTemplate` is O(1) (today it's a double
  linear scan in the error path).
- **Slot rects** are the hard part at scale: the editor's **advanced drag mode doubles as the
  maintainer tool** (§5.6 / ui-ux Scenario D) — drag/resize slot boxes on the image, export
  the manifest entry JSON. This removes the trial-and-error `rect:[x,y,w,h]` guessing.
- **Thumbnails:** `scripts/build-thumbs.ts` emits `assets/templates/thumbs/<id>.webp` (~320px)
  for the gallery; also generate a README **contact sheet** (a 30-minute "show, don't tell"
  win).

### 6.3 Categories, search, discovery

- Categories = the existing `tags` array + a coarse `type` (image/gif) + optional
  `category` (choice/reaction/panic/…) rolled up from tags for gallery tab grouping.
- Search stays a linear substring scan over id/name/tags (0.06 ms/query at 1000 templates —
  no index needed). Add a `nearest-match` suggestion to `TEMPLATE_NOT_FOUND` (truncate the
  long id list; suggest closest by edit distance).

### 6.4 Package-weight strategy (the real constraint)

- 9 MB / 37 templates → ~24 MB at 100. npm has no partial download; every `npx` pulls it all.
- **Plan:** keep bundled until ~20 MB. Beyond that, split into an optional
  `agent-meme-maker-templates` package (core ships a small starter set + the pack loader
  via `--templates-dir`), or fetch-on-demand GIF packs above a size threshold. The
  `--templates-dir`/`MEME_TEMPLATES_DIR` plumbing (D17) + manifest merge with `pack:id`
  namespacing (arch scenario B) makes this a ~1-day change when needed, not a rewrite.
- Font registration hook (§3.3) lets packs ship their own fonts.

---

## 7. Plugin / template-pack format (enables §6.4 split)

`--templates-dir <dir>` loads any directory containing a `manifest.json` + assets. For safe
third-party packs:

- Merge into the catalog with id namespacing (`pack:id`) and a collision rule.
- **Sanitize `template.file`** (relative, `..`-free, resolved under the pack dir — D19).
- Optional `fonts/` in the pack registered through the §3.3 font registry.
- Ship the already-plumbed `--templates-dir` first as the 80% solution before any pack
  marketplace.

---

## 8. Five end-to-end scenarios under the v2 design

### Scenario 1 — Happy path (agent renders a Drake meme over MCP)

`list_templates{search:"drake"}` → `render_meme{base:{kind:template,id:drake}, texts:[{slot:no,…},{slot:yes,…}], output:{maxWidth:800}}`.
**v1:** works, but the default 1.34 MB output exceeds the 1 MB inline cap so the agent gets
*no* inline image (D1/B1). **v2:** MCP defaults a `maxWidth` (or auto-downscales the inline
block), `meta.base64` is gated, and result metadata carries slot hints + fitted font size.
The agent sees its meme inline, first try, and can self-correct a too-long caption from the
returned fitted size. Determinism unchanged (same spec → same bytes for the pinned `sharp`).

### Scenario 2 — Failure mode (agent sends emoji + a stray `=`)

`render --template surprised-pikachu --text "top=Ship it 🚀 E=mc2"`.
**v1:** `🚀` renders as blank tofu with no warning (D6); `E=mc2` is misparsed as slot `E`
(D7 footgun) → `SLOT_NOT_FOUND`. **v2:** Noto Emoji covers `🚀`; the `=` footgun is handled by
the raw-text escape; if any glyph is still uncovered, a structured `UNSUPPORTED_GLYPHS`
warning names the exact codepoints. In `--strict` mode this is a hard `INVALID_SPEC` so a
deterministic pipeline never ships a broken meme.

### Scenario 3 — Security / attack (prompt-injected agent tries exfiltration + clobber)

Model emits `render_meme{base:{kind:image,path:"/home/user/.ssh/id_rsa.png"}, output:{path:"/home/user/.bashrc"}}`
and a `style.color` breakout injecting `<image href="/etc/hostname">`.
**v1:** arbitrary read→inline-exfil (D3/F2), arbitrary write clobber (D2/F1), SVG injection
rasterized into output (D4/F3) — all succeed. **v2:** `base.path` file reads are off by
default on MCP (`MEME_ALLOW_FS`); when on, both paths must resolve under
`MEME_INPUT_ROOT`/`MEME_OUTPUT_ROOT`, absolute/`..`/symlinks are rejected with `PATH_DENIED`,
overwrite requires `--force`, `color` fails color-regex validation, attributes are XML-escaped,
and the SVG rasterizer refuses external refs. The attack surface collapses to "render inside
the sandbox root," which is the intended local-agent use.

### Scenario 4 — Scale / performance (100 concurrent renders incl. a 10 MB/300-frame GIF)

**v1:** no `sharp.cache()` bound (RSS → 300 MB+, looks like a leak, D15); the 10 MB GIF is a
~10 s, ~300 MB op with no timeout or frame cap; 100 parallel renders have no backpressure →
OOM (D5). **v2:** `sharp.cache({memory:200})` + `sharp.concurrency()` bound memory; the GIF is
rejected up front by `MEME_MAX_GIF_FRAMES`/`MEME_MAX_INPUT_BYTES` with a clean
`RESOURCE_LIMIT` (or downscaled if `maxWidth` for GIF lands, fixing D9); a per-render timeout
+ a concurrency-4 semaphore on the MCP/HTTP adapters shed load with typed errors instead of an
unparseable OOM kill. Decoded-base LRU (D16) removes the per-render template decode.

### Scenario 5 — UI workflow (non-technical human reviews an agent's meme in Synara)

Agent posts a "this is fine" meme in a Synara thread (renders inline today). The message
carries an **"Open in Meme Editor"** chip → `meme ui` at `/edit#<spec>`. The human sees the
template with labeled slot regions, edits the caption in a side field, watches the debounced
live preview re-render, notices the overflow chip and shortens the text, hits `Ctrl+S` — the
`{json,png}` pair is written to history — and attaches the result. **No model round-trip, no
token cost;** agent and human edited the same `MemeSpec`. First-meme-in-<60s and
human-tweak-without-a-model-turn are both met.

---

## 9. Prioritized fix list

**P0 = bugs/security that block a fully built-out, safe, agent-facing app.**
**P1 = required for a polished v2 (correctness, UX, integration).**
**P2 = hardening, scale headroom, polish.**

### P0 — blockers

| # | Item | Defects | Effort |
|---|------|---------|--------|
| P0-1 | Publish to npm (pinned `sharp`, 2FA+provenance, lockfile) + merge impl to default branch | D20 | S |
| P0-2 | Path confinement for `output.path`/`base.path`/`cells[].image` (roots, no abs/`..`/symlink, no-overwrite default; FS-read opt-in on MCP) | D2,D3 | M |
| P0-3 | Validate + XML-escape SVG style fields; disable external SVG refs; raster-only input allowlist | D4 | S |
| P0-4 | Resource limits + per-render timeout + MCP/HTTP concurrency cap + `sharp.cache()` bound | D5,D15 | M |
| P0-5 | Warn on unmapped glyphs; ship Noto fallback (Latin + Emoji) | D6 | M |
| P0-6 | Fix `--text N=` index semantics (map to slot N or reject) | D7 | S |
| P0-7 | Gate MCP `meta.base64` by `MAX_INLINE_BYTES`; make flagship render fit inline (default maxWidth/auto-downscale) | D1 | S |

### P1 — polished v2

| # | Item | Defects | Effort |
|---|------|---------|--------|
| P1-1 | `opentype.js` swap (delete hand-rolled parser; gain kerning/CFF) | D22 | M |
| P1-2 | Structured error model (`INVALID_JSON`/`UNREADABLE_IMAGE`/`WRITE_FAILED`/`RESOURCE_LIMIT`/`PATH_DENIED` + details) | D12 | M |
| P1-3 | Validate `frames` vs frame count; reject/warn out-of-range/reversed | D8 | S |
| P1-4 | `maxWidth` for GIF (downscale frames) or explicit `UNSUPPORTED_OUTPUT` | D9 | S |
| P1-5 | `spec render` default output path (never discard) | D10 | XS |
| P1-6 | EPIPE handling on stdout | D11 | XS |
| P1-7 | Commander errors through `--json` contract | D14 | S |
| P1-8 | Extension/content mismatch warning or rewrite | D13 | XS |
| P1-9 | Tighten schema: non-negative dims, `NaN` reject, color validation | D21 | S |
| P1-10 | Expose `--templates-dir` (CLI) + `MEME_TEMPLATES_DIR` (MCP/HTTP) | D17 | XS |
| P1-11 | `src/http.ts` + `measureMeme` + `meme ui` gallery/editor/live-preview, dark/light, a11y | D24 | L |
| P1-12 | Worktree hygiene: default output to `.memes/`/`SYNARA_ARTIFACTS_DIR` | D25 | S |
| P1-13 | Thumbnails + README contact sheet | D24 | S |

### P2 — hardening & scale

| # | Item | Defects | Effort |
|---|------|---------|--------|
| P2-1 | Decoded-template-base LRU cache | D16 | S |
| P2-2 | Manifest generator + `Map` index + template-pack namespacing/sanitization | D19 | M |
| P2-3 | Catalog buildout to 100+ / 20+ GIF with licensing/QC pipeline + manifest provenance | — | L |
| P2-4 | Doc/spec drift cleanup (`strokeWidth:'auto'`, band slots in MCP desc, `--font` consumer) | D18 | S |
| P2-5 | Restate determinism as version-scoped; pin `sharp` exactly | D23 | XS |
| P2-6 | Batch/contact-sheet UI view + drag/slot-tuner mode | D24 | M |
| P2-7 | Alt-text field in spec + MCP output | D24 | S |
| P2-8 | Package-weight split (`agent-meme-maker-templates`) when assets >20 MB | — | M |

---

## 10. Questions for the user

**Blocking (need a user decision before implementation agents can proceed safely):**

1. **B1 — Security posture default.** Should the MCP surface default to *no arbitrary
   filesystem paths* (inline/base64 or template ids only; `base.path` reads opt-in via
   `MEME_ALLOW_FS`), or keep today's fully-trusted local model? This gates the entire P0-2
   design and the MCP tool schemas.
2. **B2 — Output-root convention.** What is the blessed default output directory for
   agent/MCP renders — `./.memes/`, OS temp, or a host-provided `SYNARA_ARTIFACTS_DIR`? This
   changes CLI/MCP defaults and Synara worktree hygiene (P1-12).
3. **B3 — Resource-limit ceilings.** Confirm defaults: max output pixels (16 MP?), max input
   bytes (25 MB?), max GIF frames (300?), render timeout (15 s?), MCP concurrency (4?). Are
   these acceptable, and should exceeding them be `RESOURCE_LIMIT` (hard) or auto-downscale?
4. **B4 — `opentype.js` swap.** Approve replacing the hand-rolled TTF parser with
   `opentype.js`? It deletes the riskiest 287 LOC and adds kerning/CFF but is a dependency
   addition and will nudge golden images.
5. **B5 — Web UI scope & stack.** Build the `meme ui` web UI in v2 (P1-11 is the single
   largest item), and if so: web (Vite+Preact, recommended) vs. desktop (Electron/Tauri)?
   Who is the primary human — review surface for agent memes (recommended), standalone editor,
   or maintainer slot-tuner?
6. **B6 — npm publish ownership.** Publish `agent-meme-maker` under which npm scope/account,
   and who owns release cadence relative to Synara? (P0-1 is the unblock for every MCP path.)
7. **B7 — `--text N=` semantics.** Should numeric index map to template slot N, or be
   rejected? (Affects CLI help, DESIGN §5, and P0-6.)

**Non-blocking (a sensible default is chosen unless the user objects):**

8. **N1 — Determinism contract.** Default: restate as "deterministic for a pinned
   `sharp`/libvips build" and pin `sharp` exactly. (Byte-identical across upgrades is not
   guaranteed by libvips.)
9. **N2 — Emoji/CJK policy in non-strict mode.** Default: cover with Noto fallback; warn on
   truly-uncovered codepoints; only hard-fail under `--strict`.
10. **N3 — Layout cell aspect ratio.** Default: keep square cells for v1; add `--cell-height`
    / aspect + per-cell captions to the P2 roadmap (happy-path Scenario C friction).
11. **N4 — Template catalog target.** Default: 100 image + 20 GIF, bundled until ~20 MB then
    split into an optional templates package.
12. **N5 — Alt-text field.** Default: add `output.alt` and echo it in MCP results (a11y
    differentiator) — non-breaking.
13. **N6 — Provider parity.** Default: target Codex/Claude/ACP MCP registration for v1;
    OpenCode/Kilo/Pi coverage deferred (their MCP paths are constrained).
14. **N7 — Batch CLI mode.** Default: add `meme spec render --many specs.jsonl` (P2) to
    amortize process startup for scripted bulk rendering.

---

## 11. What explicitly does NOT change

To keep the design minimal (per the "small, focused, minimalist" repo convention):

- **No package split** (`@meme/core` etc.) — single package with internal module boundaries.
- **No SSE/streaming MCP** — stdio stays; HTTP is a separate local adapter for the UI only.
- **No config-file system** — env vars + flags only.
- **No database** — filesystem is the history/state store.
- **No video/MP4** — deferred; if ever, an optional ffmpeg-dependent peer package
  (`agent-meme-maker-video`), never in core.
- **No fontconfig/Pango / platform text stack** — the deterministic SVG text layer is the
  crown jewel and must stay pure.
- **No embedding meme-maker inside Synara's `apps/server`** — it stays a standalone,
  provider-agnostic npm package.

---

*This design is a recommendation, not an implementation. Each P0/P1/P2 row is scoped to be a
small, focused PR (per the repo's small-PR convention) that an implementation agent can pick
up independently.*
