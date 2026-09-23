# MCP Stress Test Report

Date: 2026-07-21 · Target: `dist/mcp.js` (stdio) at current `main` (609 templates) · Result: **all green — no bugs found**

## Method

A Node harness spawned `node dist/mcp.js` processes, spoke raw JSON-RPC over stdin/stdout (protocol `2024-11-05`), and checked every response for: valid JSON, correct `id` routing, structured tool errors, valid image bytes (PNG/GIF/JPEG/WebP magic numbers), stderr noise, and hangs (per-call timeouts). 176 tool calls total across 6 suites.

## Coverage & results

### list_templates (11 cases — all correct)
No args (609), `type=image` (546), `type=gif` (63), tag/search filters, empty search, unicode search, nonexistent tag, combined filters. `type=video` → clean `-32602` validation error. Extra unknown params are ignored (not an error) — acceptable for an LLM surface.

### get_template (6 cases — all correct)
Valid ids return full metadata plus a ready-to-use `example` spec. Unknown id, empty id, and `../../etc/passwd` all return `TEMPLATE_NOT_FOUND` with the available-ids hint; missing `id` → `-32602`.

### render_meme (49 cases — all correct)
- **Template bases**: correct slots, duplicate slots, empty text (`EMPTY_TEXT` warning), 2000-char words (`TEXT_OVERFLOW` warning), unicode/emoji/RTL (`UNSUPPORTED_GLYPHS` warning listing codepoints), wrong slot name → `SLOT_NOT_FOUND` listing valid slots.
- **Canvas bases**: 1x1 up to limits; 20000x20000 → `RESOURCE_LIMIT` (16 MP cap); zero/negative dims and bad colors → `-32602`.
- **Image-path bases** (`MEME_ALLOW_FS=1`, `MEME_INPUT_ROOT` set): relative paths render; absolute paths, `..` traversal, and `/etc/passwd` → `PATH_DENIED`; missing/non-image files → `UNREADABLE_IMAGE`.
- **Text boxes**: x/y/width/height (absolute + percent), off-canvas rects (no crash), 40 boxes at once, full style object (stroke, background, rotation, opacity, caps…), unknown font → `INVALID_SPEC` listing available fonts, `frames` on static images and GIFs (reversed/huge ranges handled).
- **Output**: `path` confined to output root (`..` escape → `PATH_DENIED`), overwrite refused without `overwrite:true`, subdir creation works, format conversions (gif↔png, webp, jpeg quality), `EXTENSION_MISMATCH` warning, `maxWidth:1` renders. 1,000,000-char text → `RESOURCE_LIMIT` (2000-char cap), no hang.

### render_layout (10 cases — all correct)
Grids 1x1, 2x2, 4x4, 10x10; gutter/color/width options; fewer cells than grid slots is allowed (remaining cells left as background); more cells than slots → `INVALID_SPEC`; zero grid dim → `-32602`; missing cell image → `UNREADABLE_IMAGE`; template ids are not accepted as cell images (paths only, as documented).

### preview_template (3 cases — all correct)
Image template → PNG, GIF template → animated GIF, unknown id → `TEMPLATE_NOT_FOUND`.

### Protocol robustness (9 cases — all correct)
Unknown method → `-32601`; unknown tool → `-32602` tool error; missing/null params → `-32603` with Zod detail; malformed JSON line and id-less requests do not kill or desync the server (later calls still answered); string ids echoed correctly; `tools/list` exposes exactly the 5 tools.

### Concurrency (60 calls — all correct)
6 simultaneous server processes × 10 concurrent renders each (mixed image/GIF templates): 60/60 valid responses, no timeouts, no stderr output, no cross-talk between request ids.

### Pack sweep (64 templates — all correct)
Every 12th template of the full catalog plus every 5th GIF, rendered with text in every slot: 64/64 produced valid images (correct magic bytes; over-cap results correctly returned path-only metadata without an inline image block).

## Verification

`npm test`: 90/90 passed. `npm run lint` (eslint + prettier + tsc): clean.

## Conclusion

No crashes, hangs, non-JSON output, protocol desyncs, path escapes, or invalid images were observed in 176 calls. Error handling is uniformly structured (`{error: {code, message, details}}`) with actionable hints. No fixes required.
