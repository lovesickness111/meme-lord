# Cross-Surface Stress Test Report

Date: 2026-07-21 · Commit: `d65ba81` (main, 609 templates) · Node 20.18.1

Stress test of cross-surface integration: CLI (`dist/cli.js`), HTTP API
(`meme ui`, `POST /api/render` etc.), and MCP (`dist/mcp.js` over stdio).
**Result: all green — no bugs found.** All observed cross-surface
differences are by design (documented below).

## Method

- Build from clean clone: `npm install && npm run build`.
- HTTP server on port 37003 (`node dist/cli.js ui --port 37003`), plus
  dedicated servers with custom env for env-var tests.
- MCP exercised via `@modelcontextprotocol/sdk` stdio client against
  `node dist/mcp.js`.
- Parity measured by output dimensions, warnings, and SHA-256 checksums
  of the produced bytes.

## Results

### 1. Catalog parity — PASS
- `templates list --json`, `GET /api/templates`, `list_templates` all
  return exactly 609 templates with identical id/name/type/dims/tags/slots.
- `templates show`, `GET /api/templates/:id`, `get_template` metadata
  identical for a 17-template sample (every 40th + last).

### 2. Render parity (10 representative templates) — PASS
8 images (1–4 slots, incl. tall/wide/multi-panel) + 2 GIFs, identical
`MemeSpec` on all three surfaces. Dimensions and SHA-256 checksums
**byte-identical** across CLI file output, HTTP base64, and MCP file
output for all 10 (including animated GIFs). Deterministic rendering
holds across surfaces.

### 3. Text edge cases — PASS
Unicode (CJK/RTL/Greek/Cyrillic), emoji (incl. ZWJ sequences), long text
(1500 chars / 300 words), HTML-special characters (`<script>`, quotes,
entities), empty/whitespace text, and zero texts: byte-identical outputs
and identical warnings (`UNSUPPORTED_GLYPHS`, `TEXT_OVERFLOW`,
`EMPTY_TEXT`) on all three surfaces.

### 4. Layout/grid — PASS
2x2 grid (4 cell images, gutter, width, band texts) with
`MEME_ALLOW_FS=1` + `MEME_INPUT_ROOT`: CLI `spec render`, HTTP
`/api/render`, MCP `render_layout` produce byte-identical 800x800 PNGs.
Canvas base with `top`/`middle`/`bottom` band slots also byte-identical.

### 5. GIF templates — PASS
`blinking-white-guy` rendered as animated GIF on all surfaces: 25 pages
on each, `format: gif` / `image/gif` mime, byte-identical.

### 6. Error parity — PASS (typed and consistent)
| Case | CLI | HTTP | MCP |
|---|---|---|---|
| Unknown template id | `TEMPLATE_NOT_FOUND` | `TEMPLATE_NOT_FOUND` (404) | `TEMPLATE_NOT_FOUND` |
| Invalid slot | `SLOT_NOT_FOUND` | `SLOT_NOT_FOUND` (404) | `SLOT_NOT_FOUND` |
| Missing base / bad kind | `INVALID_SPEC` | `INVALID_SPEC` (400) | protocol `-32602` (Zod, by design) |
| Per-text > 2000 chars | `RESOURCE_LIMIT` | `RESOURCE_LIMIT` (400) | `RESOURCE_LIMIT` |
| Total text > 8000 chars | `RESOURCE_LIMIT` | `RESOURCE_LIMIT` (400) | `RESOURCE_LIMIT` |
| Canvas > 16 MP | `RESOURCE_LIMIT` | `RESOURCE_LIMIT` (400) | `RESOURCE_LIMIT` |
| Input path traversal / absolute | `UNREADABLE_IMAGE`* | `PATH_DENIED` (403) | `PATH_DENIED` |
| Output path traversal | allowed* | `PATH_DENIED` (403) | `PATH_DENIED` |
| Invalid JSON body | `INVALID_JSON` | `INVALID_JSON` (400) | n/a (typed protocol) |
| History id traversal | n/a | `PATH_DENIED` (403) | n/a |

\* By design (DESIGN-v2 §3.5): the local CLI defaults to the
`permissive` path policy; setting `MEME_INPUT_ROOT`/`MEME_OUTPUT_ROOT`
switches it to confinement and it then returns `PATH_DENIED`
identically (verified). MCP argument-shape errors surface as MCP
protocol validation errors rather than `INVALID_SPEC`, which is
inherent to schema-validated tools.

### 7. Scale — PASS
- 100 sequential HTTP renders (rotating templates, 2 texts each,
  maxWidth 400): total 7.2 s, worst 138 ms, 0 errors.
- 50 parallel HTTP renders: 1.7 s total, 0 errors (semaphore cap 4).
- 50 parallel MCP renders to files: 2.0 s, 0 errors, exactly 50 distinct
  output files — no collisions.
- Server healthy after all runs.

### 8. Resource limits — PASS
- >16 MP canvas rejected with `RESOURCE_LIMIT` on all surfaces.
- Per-text (2000) and total-text (8000) length caps enforced identically.
- 500 short texts render successfully and identically on HTTP and MCP
  (within the total-length cap; there is deliberately no per-count cap).
- HTTP body cap (1 MB spec) returns `RESOURCE_LIMIT` without poisoning
  keep-alive.

### 9. History round-trip & isolation — PASS
- `POST /api/history` → list → `GET` → `DELETE` round-trips correctly.
- `MEME_HISTORY_DIR` respected; default `~/.meme-maker/history`
  untouched when overridden.
- History ids validated (`^[\w-]+$`); traversal names rejected with 403.

### 10. Environment variables — PASS
- `MEME_TEMPLATES_DIR`: empty custom dir yields 0 templates on CLI,
  HTTP, and MCP alike.
- `MEME_ALLOW_FS`: unset → filesystem image reads denied
  (`PATH_DENIED`) on HTTP and MCP; `=1` enables them, still confined to
  `MEME_INPUT_ROOT`.
- `MEME_INPUT_ROOT`: escapes (`..`, absolute) denied on all surfaces
  (CLI becomes confined once the var is set).
- `MEME_OUTPUT_ROOT`: outputs resolved under the root on all surfaces;
  escapes denied.

## Repo checks

`npm test` (90/90 passed) and `npm run lint` (eslint + prettier + tsc)
both green on the tested commit.

## Verdict

No cross-surface inconsistencies or bugs found. CLI, HTTP, and MCP are
byte-identical for rendering, share the same typed error taxonomy, and
honor resource limits and path confinement uniformly, with the only
divergences being the documented permissive CLI path policy and MCP
protocol-level schema validation.
