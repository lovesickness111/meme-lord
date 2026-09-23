# API Surfaces

meme-maker exposes the same engine through three surfaces: the CLI (`meme`), the
local HTTP server (`meme ui`), and the MCP server (`meme-maker-mcp`). This doc maps
each feature across surfaces and defines the shared error and result contracts.

## Feature map

| Feature | CLI | HTTP | MCP tool |
| --- | --- | --- | --- |
| List templates | `meme templates list [--tag --type --search --json]` | `GET /api/templates?type=&tag=&search=` | `list_templates` |
| Template detail | `meme templates show <id> [--json]` | `GET /api/templates/:id` | `get_template` |
| Blank template preview | `meme templates show <id> --preview <path>` | `GET /api/preview/:id` | `preview_template` |
| Template thumbnail | — | `GET /thumbs/:id` | — |
| Render (template/image/canvas) | `meme render --template/--image/--canvas ...` | `POST /api/render` (MemeSpec body) | `render_meme` |
| Render grid layout | `meme layout --grid CxR --cell ...` | `POST /api/render` (layout base) | `render_layout` |
| Render full MemeSpec | `meme spec render <file>` | `POST /api/render` | `render_meme` |
| Measure (no raster) | — | `POST /api/measure` | — |
| List fonts | `meme fonts list [--json]` | — | — |
| History | — | `GET/POST /api/history`, `GET/DELETE /api/history/:file` | — |
| Start web UI | `meme ui [--port]` | (is the server) | — |

## Result schema

A successful render returns the same keys on every surface:

```json
{ "path": "...", "width": 800, "height": 600, "format": "png", "bytes": 12345, "warnings": [] }
```

- CLI `--json` prints exactly these keys.
- HTTP `POST /api/render` adds `base64` (the encoded image).
- MCP tools return this object as the text content block, plus `mimeType` and a
  gated `base64` field, and attach the image as an inline content block when it
  fits under `MEME_MAX_INLINE_BYTES`.

## Error contract

All surfaces report failures as the same JSON object:

```json
{ "error": { "code": "MEME_ERROR_CODE", "message": "human-readable", "details": { } } }
```

- CLI: printed to stdout with `--json` (exit code 1), otherwise
  `error [CODE]: message` on stderr.
- HTTP: the response body, with status mapped from the code (see below).
- MCP: the text content of a result with `isError: true`.

Unknown/unexpected errors map to `IO_ERROR` on every surface.

| Code | Meaning | HTTP status |
| --- | --- | --- |
| `TEMPLATE_NOT_FOUND` | unknown template id | 404 |
| `SLOT_NOT_FOUND` | unknown slot name/index | 404 |
| `INVALID_SPEC` | schema/argument validation failed | 400 |
| `INVALID_JSON` | body/file is not valid JSON | 400 |
| `RESOURCE_LIMIT` | pixel/byte/frame/text/time cap exceeded | 400 |
| `PATH_DENIED` | path confinement or overwrite refusal | 403 |
| `UNREADABLE_IMAGE` | input image missing/corrupt/unsupported | 500 |
| `UNSUPPORTED_OUTPUT` | requested output format not possible | 500 |
| `RENDER_ERROR` | unexpected render pipeline failure | 500 |
| `WRITE_FAILED` | cannot write the output file | 500 |
| `IO_ERROR` | other I/O or unknown failure | 500 |

## Environment variables

| Variable | Default | Surfaces | Effect |
| --- | --- | --- | --- |
| `MEME_TEMPLATES_DIR` | bundled `assets/templates` | all | template catalog root (CLI also via `--templates-dir`) |
| `MEME_ALLOW_FS` | unset | HTTP, MCP (confined) | `1` enables filesystem image reads on confined surfaces |
| `MEME_INPUT_ROOT` | cwd (confined) | all | root that input image paths are confined to |
| `MEME_OUTPUT_ROOT` | `./.memes` | all | root that output paths are confined to |
| `SYNARA_ARTIFACTS_DIR` | unset | all | output root fallback when `MEME_OUTPUT_ROOT` is unset |
| `MEME_HISTORY_DIR` | `~/.meme-maker/history` | HTTP | history storage directory |
| `MEME_MAX_INLINE_BYTES` | 1,000,000 | MCP | max bytes for inline image content |
| `MEME_MCP_DEFAULT_MAX_WIDTH` | 800 | MCP | default `output.maxWidth` |
| `MEME_MAX_PIXELS`, `MEME_MAX_INPUT_BYTES`, `MEME_MAX_GIF_FRAMES`, `MEME_MAX_TEXT_LEN`, `MEME_MAX_TOTAL_TEXT_LEN`, `MEME_RENDER_TIMEOUT_MS`, `MEME_MAX_CONCURRENCY`, `MEME_SHARP_CACHE_MB`, `MEME_SHARP_CONCURRENCY` | see `src/limits.ts` | all | resource limits (DESIGN-v2 §3.4) |

Path policy: the CLI is `permissive` (paths as given; `MEME_OUTPUT_ROOT` /
`SYNARA_ARTIFACTS_DIR` / `MEME_INPUT_ROOT` confine when set); HTTP and MCP are
`confined` (inputs under `MEME_INPUT_ROOT`, outputs under the output root,
absolute paths outside the root, `..`, and symlinks rejected). Output paths that
already resolve inside the output root are accepted as-is.
