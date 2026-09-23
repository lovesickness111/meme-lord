# Changelog

## 0.4.0

- Added publish-ready npm/npx distribution with `agent-meme-maker`, `meme`, and `meme-maker-mcp` binaries plus a zero-browser `mcp` CLI subcommand.
- Added `suggest_templates` as deterministic metadata retrieval for host LLMs, with explainable ranking, explicit-template overrides, structural slot filters, rich per-template selection guides, and derived fallbacks for uncurated/custom catalogs. Removed brittle hard-coded phrase routing.
- Added read-only `measure_meme` preflight over MCP and `meme spec measure` over CLI so agents can revise captions before rasterizing.
- Added slot `safeRect` metadata and quality gates (`padding`, `minFontSize`, `maxLines`, `maxTextCoverage`) with structured strict-mode warnings.
- Corrected `disappointed-black-guy` and `change-my-mind` text geometry; added the Goodhart benchmark example.
- Added a clean-install package smoke test covering npm bin shims, packed assets, local stdio MCP, strict rendering, and production dependency audit.
- Updated Sharp to 0.35.4 and refreshed vulnerable transitive dependencies; npm-managed installs now refuse the standalone curl updater.

## 0.3.3

- Added `meme update` self-update command: checks the latest release and re-runs the curl installer in place (`--check` and `--json` flags supported).

## 0.3.2

- `curl | sh` installer is now truly dependency-free: auto-downloads the Node.js v20 runtime if missing, so no pre-installed Node or npm is required.
- Native Windows support (Git Bash / MSYS2 / Cygwin) with `.cmd` wrappers for Command Prompt.
- Release workflow now builds and ships `meme-maker-win32-x64.tar.gz`.
- Cross-OS install CI tests the curl installer on Linux, macOS, and Windows, plus a no-Node container leg.
- Portless local HTTPS instructions now default to non-privileged port 8443 (no sudo, no root-owned `~/.portless` files).

## 0.3.1

- Final production-readiness audit fixes:
  - CI/release hardening: updated action majors, fail-fast timeouts, concurrency controls, and missing-artifact guards.
  - Unified versioning: `src/version.ts` derives the version from `package.json`; CLI and MCP server no longer hardcode it.
  - Added `test/limits.test.ts` for environment parsing and `Semaphore` concurrency coverage.
  - Documentation consistency pass: fixed install one-liner, template pack `id` semantics, Docker example, and docs index links.
  - Security/packaging hardening: `.gitignore`/`.npmignore` coverage for secrets and placeholder/source-map exclusion from tarballs.
  - Fixed web UI slot-overlay scaling on downscaled preview images; verified live in Chrome.

## 0.3.0

- Template catalog expanded to 609 templates via themed template packs: animals & objects, animated GIFs, characters & celebrities, choices & decisions, gaming, reactions, work & tech, and multi-panel compositions.
- Template packs: parallel pack directories under `assets/templates/` with prefixed ids, merged into a single manifest.
- Stress-test hardening across all surfaces:
  - CLI: hardened error handling for malformed specs, bad paths, and invalid flags.
  - HTTP: bounded preview cache memory, 404 for unknown `/api` routes, hardened static-root path check.
  - Web UI: fixed key handler race, mobile overflow, and added a11y landmarks.
- CI now runs on a Node 20/22 matrix across Ubuntu, macOS, and Windows.
- Release workflow on `v*` tags creates a GitHub Release with notes extracted from `CHANGELOG.md` and attaches per-platform self-contained tarballs (`linux-x64`, `macos-x64`, `macos-arm64`), a source tarball, and `install.sh`. macOS tarballs build on the `macos-15-intel` (x64) and `macos-15` (arm64) runners.
- New install path: `curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh` (no npm registry distribution).

## 0.2.0

- Template catalog expanded to 118 templates (103 static images, 15 animated GIFs) with per-template provenance in manifest metadata.
- Generated catalog: `<id>.meta.json` sidecars + `npm run build:manifest` produce `manifest.json`; `npm run build:thumbs` renders webp thumbnails and the contact sheet.
- Font engine swapped to opentype.js with a per-codepoint fallback chain (Anton → Noto Sans → Noto Emoji) and kerning.
- `meme ui`: local web app (Vite + Preact SPA) — template gallery, editor with live preview and slot tuner, render history, and batch rendering; JSON API at `/api/templates`, `/api/measure`, `/api/render`, `/api/history`.
- Core hardening: path confinement (`MEME_INPUT_ROOT`/`MEME_OUTPUT_ROOT`, `MEME_ALLOW_FS`), resource limits (`MEME_MAX_*`, render timeout, concurrency caps), and `--strict` to fail on degraded renders.
- `measureMeme` for text-fit measurement without rendering.

## 0.1.0

Initial release.

- Template catalog: 37 templates (32 static images, 5 animated GIFs) with named text slots, hints, and provenance metadata.
- Deterministic text-overlay renderer: auto-fitting Impact-style text, outline, wrapping, and overflow warnings.
- Bases: templates, custom images, blank canvases, and grid layouts; output as PNG, JPEG, WebP, or GIF.
- `meme` CLI: `templates list/show`, `render`, `layout`, `spec render`, `fonts list`; `--json` everywhere for agents.
- `meme-maker-mcp` MCP server (stdio): `list_templates`, `get_template`, `render_meme`, `render_layout`, `preview_template`.
- Convenience `top`/`middle`/`bottom` slots on non-template bases (canvas, image, layout).
