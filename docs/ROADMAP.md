# meme-maker — v2 Roadmap

A sequencing view of [`DESIGN-v2.md`](./DESIGN-v2.md). Each item is scoped as one small,
focused PR (per the repo's small-PR convention). `[P0/P1/P2]` = priority; `[XS…L]` = effort.

## Milestone 0 — Unblock distribution
- `[P0][S]` Merge implementation (`devin/polish`) to the default branch. *(D20)*
- `[P0][S]` Publish `agent-meme-maker` to npm: pin `sharp` exactly, 2FA + `--provenance`,
  committed lockfile, `npm audit` in CI. Add per-provider MCP registration snippets to the
  README (Codex TOML, Claude `mcpServers`, ACP). *(D20 → unblocks all Synara/MCP paths)*

## Milestone 1 — Safety (P0 hardening)
- `[P0][M]` Shared path-confinement layer (`src/paths.ts`): roots for input/output, reject
  absolute/`..`/symlink, no-overwrite default; MCP FS-read opt-in (`MEME_ALLOW_FS`). *(D2,D3)*
- `[P0][S]` Validate + XML-escape SVG style fields; disable external SVG refs; raster-only
  input allowlist. *(D4)*
- `[P0][M]` Resource limits (`src/limits.ts`) + per-render timeout + MCP/HTTP concurrency cap
  + `sharp.cache()`/`concurrency()` bound. *(D5,D15)*
- `[P0][S]` Gate MCP `meta.base64` by `MAX_INLINE_BYTES`; default a `maxWidth`/auto-downscale
  so the flagship render fits inline. *(D1)*

## Milestone 2 — Correctness (P0/P1 bugs)
- `[P0][M]` Warn on unmapped glyphs + ship Noto (Latin+Emoji) fallback. *(D6)*
- `[P0][S]` Fix `--text N=` index semantics (map to slot N or reject) + literal-`=` escape. *(D7)*
- `[P1][M]` Structured error model (`INVALID_JSON`/`UNREADABLE_IMAGE`/`WRITE_FAILED`/
  `RESOURCE_LIMIT`/`PATH_DENIED` + `details`); wrap every `JSON.parse` / bare `sharp()`. *(D12)*
- `[P1][S]` Validate `frames` vs frame count. *(D8)*
- `[P1][S]` `maxWidth` for GIF (downscale) or explicit `UNSUPPORTED_OUTPUT`. *(D9)*
- `[P1][XS]` `spec render` default output path (never discard). *(D10)*
- `[P1][XS]` EPIPE handling on stdout. *(D11)*
- `[P1][S]` Commander errors through the `--json` contract. *(D14)*
- `[P1][XS]` Extension/content mismatch warning or rewrite. *(D13)*
- `[P1][S]` Tighten schema: non-negative dims, `NaN` reject, color validation. *(D21)*
- `[P1][M]` Replace hand-rolled TTF parser with `opentype.js` (keep SVG-path output). *(D22)*

## Milestone 3 — Human UX (web UI)
- `[P1][XS]` Expose `--templates-dir` / `MEME_TEMPLATES_DIR`. *(D17)*
- `[P1][S]` Thumbnails build step + README contact sheet. *(D24)*
- `[P1][L]` `src/http.ts` (`/api/templates|render|measure|preview`) + `measureMeme` +
  `meme ui`: gallery + slot editor + live preview, dark/light, keyboard a11y. *(D24)*
- `[P1][S]` Worktree hygiene: default output to `.memes/` / `SYNARA_ARTIFACTS_DIR`. *(D25)*

## Milestone 4 — Synara integration
- `[P1][S]` "Open in Meme Editor" deep link (`/edit#<spec>`) / `open_in_editor` MCP tool —
  human tweak without a model round-trip.
- `[P2][—]` (Synara-side, optional) generalize `mcpInjection.ts` into a registered-tool-servers
  table with meme-maker as pilot; verify inline `mcp_tool_call` image (incl. GIF) rendering.

## Milestone 5 — Scale & catalog
- `[P2][S]` Decoded-template-base LRU. *(D16)*
- `[P2][M]` Manifest generator + `Map<id,Template>` index + pack namespacing/`file`
  sanitization. *(D19)*
- `[P2][L]` Catalog buildout to 100+ image / 20+ GIF with licensing/QC pipeline + manifest provenance.
- `[P2][M]` Package-weight split into optional `agent-meme-maker-templates` once assets >20 MB.

## Milestone 6 — Polish
- `[P2][S]` Doc/spec drift cleanup (`strokeWidth:'auto'`, band slots in MCP desc, `--font`). *(D18)*
- `[P2][XS]` Restate determinism as version-scoped; pin `sharp`. *(D23)*
- `[P2][M]` Batch/contact-sheet UI + drag mode (doubles as manifest slot-tuner). *(D24)*
- `[P2][S]` Alt-text field in spec + MCP output. *(D24)*

## Blocking questions (must resolve before the relevant milestone)
See DESIGN-v2 §10. Summary: **B1** security posture (→ M1), **B2** output-root (→ M1/M3),
**B3** limit ceilings (→ M1), **B4** `opentype.js` (→ M2), **B5** UI scope/stack (→ M3),
**B6** npm publish ownership (→ M0), **B7** `--text N=` semantics (→ M2).
