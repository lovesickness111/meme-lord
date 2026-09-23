# Contributing

New here? The [docs index](./README.md) describes the docs by reader; [ARCHITECTURE.md](./ARCHITECTURE.md) is the code map.

## Install from source

```sh
git clone https://github.com/kartikkabadi/meme-maker.git
cd meme-maker
npm install
npm run build   # tsc + vite (web UI)
```

Use `node dist/cli.js` wherever the docs say `meme` (or `npm link` to get the `meme` and `meme-maker-mcp` binaries on your PATH).

## Checks

```sh
npm test        # vitest (unit + golden-image + MCP + HTTP integration)
npm run lint    # eslint + prettier + ui typecheck
```

Run both before pushing. Larger behavioural changes have historically also been verified with per-surface stress tests — see the reports linked from the [docs index](./README.md#stress-test-reports) for the methodology.

## Reporting security issues

Please do not open public issues for security vulnerabilities. See
[SECURITY.md](../SECURITY.md) for how to report them privately.


## Adding a template

Full authoring guide (sidecar format, `pack.json`, adding a pack): [TEMPLATES.md](TEMPLATES.md).

1. Drop the media file under `assets/templates/images/` or `assets/templates/gifs/`.
   To avoid id conflicts when several contributors add templates in parallel, use a
   **template pack** instead: `assets/templates/packs/<pack>/{images,gifs}/` with an optional
   `pack.json` (see `assets/templates/packs/README.md`). Pack template ids are
   prefixed with the pack id (`<pack>-<filename>`).
2. Add a `<id>.meta.json` **sidecar** next to the media file — this is the source of truth
   for that template's metadata: name, tags, slots (rects + hints), and provenance.
3. Run `npm run build:manifest` — it scans `assets/templates/**`, derives paths/dimensions, validates against the schema, and regenerates `assets/templates/manifest.json`. Never edit `manifest.json` by hand.
4. Run `npm run build:thumbs` to regenerate `assets/templates/thumbs/` and `docs/contact-sheet.webp`.
5. Record the source and license in the sidecar `source` field, then regenerate the manifest.

## Releases

Releases are cut by tagging `vX.Y.Z`; the Release workflow
(`.github/workflows/release.yml`) then builds per-platform tarballs and
publishes the GitHub Release. Before tagging, bump the version in
`package.json`, `src/cli.ts`, `src/mcp.ts`, and add a `## X.Y.Z` section to
`CHANGELOG.md`. Full checklist: [RELEASE.md](./RELEASE.md).

## Pull requests

Prefer many small, focused PRs over one large one. Keep commits granular.
